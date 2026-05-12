import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createKanbanMcpServer } from "@careeright/mcp/server";
import { resolveMcpToken } from "@careeright/domain/kanban/store";

export const runtime = "nodejs";

function bearerToken(request: Request) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice("Bearer ".length).trim();
}

async function handle(request: Request) {
  const token = bearerToken(request);
  const tokenRecord = token ? await resolveMcpToken(token) : null;

  if (!tokenRecord) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const server = createKanbanMcpServer(tokenRecord.userId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}

export { handle as DELETE, handle as GET, handle as POST };
