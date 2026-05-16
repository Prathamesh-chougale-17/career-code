import { HistoryApp } from "@repo/ui/components/history/history-app";
import { requirePageSession } from "@/lib/auth/session";
import { getHistorySnapshot } from "@careeright/domain/history/store";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardHistoryPage() {
  const session = await requirePageSession("/dashboard/history");
  const initialHistory = await loadInitialData("history", () =>
    getHistorySnapshot(session.user.id),
  );

  return <HistoryApp initialHistory={initialHistory} />;
}

