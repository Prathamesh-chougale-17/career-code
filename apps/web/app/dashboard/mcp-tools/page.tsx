import { McpToolsApp } from "@repo/ui/components/mcp/mcp-tools-app";
import { requirePageSession } from "@/lib/auth/session";
import { listMcpTokens } from "@careeright/domain/kanban/store";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardMcpToolsPage() {
  const session = await requirePageSession("/dashboard/mcp-tools");
  const initialTokens = await loadInitialData("MCP tokens", () =>
    listMcpTokens(session.user.id),
  );

  return <McpToolsApp initialTokens={initialTokens} />;
}

