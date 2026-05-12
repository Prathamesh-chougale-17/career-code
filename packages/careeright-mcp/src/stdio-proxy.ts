#!/usr/bin/env node
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

const DEFAULT_MCP_URL = "https://careeright.vercel.app/mcp";

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function logError(message: string, error?: unknown) {
  const suffix = error ? ` ${toError(error).message}` : "";
  process.stderr.write(`[careeright-mcp] ${message}${suffix}\n`);
}

function readMcpUrl() {
  const rawUrl =
    process.env.CAREERIGHT_MCP_URL?.trim() ||
    process.env.CAREER_CODE_MCP_URL?.trim() ||
    process.env.HABAGE_MCP_URL?.trim() ||
    DEFAULT_MCP_URL;

  try {
    const url = new URL(rawUrl);

    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("URL must use http or https.");
    }

    return url;
  } catch (error) {
    throw new Error(`Invalid CAREERIGHT_MCP_URL "${rawUrl}". ${toError(error).message}`);
  }
}

function readMcpToken() {
  const token =
    process.env.CAREERIGHT_MCP_TOKEN?.trim() ||
    process.env.CAREER_CODE_MCP_TOKEN?.trim() ||
    process.env.HABAGE_MCP_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "CAREERIGHT_MCP_TOKEN or CAREER_CODE_MCP_TOKEN is required. Create one in Careeright at /dashboard/mcp-tools.",
    );
  }

  return token;
}

async function main() {
  const url = readMcpUrl();
  const token = readMcpToken();
  const stdioTransport = new StdioServerTransport();
  const httpTransport = new StreamableHTTPClientTransport(url, {
    requestInit: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  let closing = false;

  async function closeTransports() {
    if (closing) {
      return;
    }

    closing = true;
    await Promise.allSettled([stdioTransport.close(), httpTransport.close()]);
  }

  async function forwardToHttp(message: JSONRPCMessage) {
    try {
      await httpTransport.send(message);
    } catch (error) {
      logError("Failed to forward stdio message to Careeright.", error);
      await closeTransports();
    }
  }

  async function forwardToStdio(message: JSONRPCMessage) {
    try {
      await stdioTransport.send(message);
    } catch (error) {
      logError("Failed to forward Careeright response to stdio.", error);
      await closeTransports();
    }
  }

  stdioTransport.onmessage = (message) => {
    void forwardToHttp(message);
  };
  httpTransport.onmessage = (message) => {
    void forwardToStdio(message);
  };
  stdioTransport.onerror = (error) => {
    logError("Stdio transport error.", error);
  };
  httpTransport.onerror = (error) => {
    logError("Careeright HTTP transport error.", error);
  };
  stdioTransport.onclose = () => {
    void closeTransports();
  };
  httpTransport.onclose = () => {
    void closeTransports();
  };

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      void closeTransports().finally(() => process.exit(0));
    });
  }

  await httpTransport.start();
  await stdioTransport.start();
}

main().catch(async (error) => {
  logError("Unable to start Careeright MCP bridge.", error);
  process.exitCode = 1;
});
