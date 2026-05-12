import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { resolveMcpToken } from "@careeright/domain/kanban/store";
import { createKanbanMcpServer } from "@careeright/mcp/server";

const rawToken =
  process.env.CAREERIGHT_MCP_TOKEN?.trim() ||
  process.env.CAREER_CODE_MCP_TOKEN?.trim() ||
  process.env.HABAGE_MCP_TOKEN?.trim();

if (!rawToken) {
  throw new Error(
    "CAREERIGHT_MCP_TOKEN or CAREER_CODE_MCP_TOKEN is required for the stdio MCP server.",
  );
}

const token = await resolveMcpToken(rawToken);

if (!token) {
  throw new Error("CAREERIGHT_MCP_TOKEN or CAREER_CODE_MCP_TOKEN is invalid or revoked.");
}

const server = createKanbanMcpServer(token.userId);
const transport = new StdioServerTransport();

await server.connect(transport);
