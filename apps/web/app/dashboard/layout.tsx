import { DashboardProviders } from "@/components/providers/dashboard-providers";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardProviders>{children}</DashboardProviders>
  );
}


