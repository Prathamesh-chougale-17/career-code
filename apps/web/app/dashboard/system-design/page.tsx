import { SystemDesignApp } from "@repo/ui/components/system-design/system-design-app";
import { requirePageSession } from "@/lib/auth/session";
import { getSystemDesignSnapshot } from "@careeright/domain/system-design/store";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardSystemDesignPage() {
  const session = await requirePageSession("/dashboard/system-design");
  const initialSnapshot = await loadInitialData("System Design snapshot", () =>
    getSystemDesignSnapshot(session.user.id),
  );

  return <SystemDesignApp initialSnapshot={initialSnapshot} />;
}
