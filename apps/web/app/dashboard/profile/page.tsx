import { ProfileApp } from "@repo/ui/components/profile/profile-app";
import { requirePageSession } from "@/lib/auth/session";
import { getProfileSnapshot, listProfileImports } from "@careeright/domain/profile/store";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardProfilePage() {
  const session = await requirePageSession("/dashboard/profile");
  const [initialSnapshot, initialImports] = await Promise.all([
    loadInitialData("profile snapshot", () =>
      getProfileSnapshot(session.user.id),
    ),
    loadInitialData("profile imports", () =>
      listProfileImports(session.user.id),
    ),
  ]);

  return (
    <ProfileApp
      initialSnapshot={initialSnapshot}
      initialImports={initialImports}
    />
  );
}

