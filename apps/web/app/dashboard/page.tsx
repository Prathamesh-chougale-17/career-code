import { DashboardAnalyticsApp } from "@/components/dashboard/dashboard-analytics-app";
import { requirePageSession } from "@/lib/auth/session";
import { getDashboardAnalytics } from "@careeright/domain/dashboard/analytics";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardPage() {
  const session = await requirePageSession("/dashboard");
  const initialAnalytics = await loadInitialData("dashboard analytics", () =>
    getDashboardAnalytics(session.user.id),
  );

  return <DashboardAnalyticsApp initialAnalytics={initialAnalytics} />;
}
