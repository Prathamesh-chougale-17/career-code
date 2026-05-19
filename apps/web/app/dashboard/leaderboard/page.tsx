import { getLeaderboardSnapshot } from "@careeright/domain/leaderboard/store";
import { LeaderboardApp } from "@repo/ui/components/leaderboard/leaderboard-app";

import { requirePageSession } from "@/lib/auth/session";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardLeaderboardPage() {
  const session = await requirePageSession("/dashboard/leaderboard");
  const initialLeaderboard = await loadInitialData("leaderboard", () =>
    getLeaderboardSnapshot(session.user.id),
  );

  return <LeaderboardApp initialLeaderboard={initialLeaderboard} />;
}
