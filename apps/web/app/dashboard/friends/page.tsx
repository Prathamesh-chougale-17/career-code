import { FriendsApp } from "@repo/ui/components/friends/friends-app";
import { requirePageSession } from "@/lib/auth/session";
import { getFriendsSummary } from "@careeright/domain/friends/store";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardFriendsPage() {
  const session = await requirePageSession("/dashboard/friends");
  const initialSummary = await loadInitialData("friends summary", () =>
    getFriendsSummary(session.user.id),
  );

  return <FriendsApp initialSummary={initialSummary} />;
}
