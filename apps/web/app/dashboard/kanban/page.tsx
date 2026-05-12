import { KanbanApp } from "@/components/kanban/kanban-app";
import { requirePageSession } from "@/lib/auth/session";
import { getBoardSnapshot } from "@career-code/domain/kanban/store";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardKanbanPage() {
  const session = await requirePageSession("/dashboard/kanban");
  const initialSnapshot = await loadInitialData("board snapshot", () =>
    getBoardSnapshot(session.user.id),
  );

  return <KanbanApp initialSnapshot={initialSnapshot} />;
}
