import { ProposalApp } from "@/components/proposals/proposal-app";
import { requirePageSession } from "@/lib/auth/session";
import { getBoardSnapshot, listProposalHistory } from "@careeright/domain/kanban/store";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardProposalPage() {
  const session = await requirePageSession("/dashboard/proposal");
  const [initialSnapshot, initialProposals] = await Promise.all([
    loadInitialData("proposal board snapshot", () =>
      getBoardSnapshot(session.user.id),
    ),
    loadInitialData("proposal history", () =>
      listProposalHistory(session.user.id),
    ),
  ]);

  return (
    <ProposalApp
      initialSnapshot={initialSnapshot}
      initialProposals={initialProposals}
    />
  );
}
