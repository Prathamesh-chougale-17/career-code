import { DsaApp } from "@/components/dsa/dsa-app";
import { requirePageSession } from "@/lib/auth/session";
import { getDsaSnapshot } from "@careeright/domain/dsa/store";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardDsaPage() {
  const session = await requirePageSession("/dashboard/dsa");
  const initialSnapshot = await loadInitialData("DSA snapshot", () =>
    getDsaSnapshot(session.user.id),
  );

  return <DsaApp initialSnapshot={initialSnapshot} />;
}
