import { ProposalApp } from "@/components/proposals/proposal-app";
import { requirePageSession } from "@/lib/auth/session";
import { getBoardSnapshot, listProposalHistory } from "@career-code/domain/kanban/store";
import { loadInitialData } from "@/lib/server/initial-data";

export default async function DashboardProposalTopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  const session = await requirePageSession(`/dashboard/proposal/${topic}`);
  const [initialSnapshot, initialProposals] = await Promise.all([
    loadInitialData("proposal topic board snapshot", () =>
      getBoardSnapshot(session.user.id),
    ),
    loadInitialData("proposal topic history", () =>
      listProposalHistory(session.user.id),
    ),
  ]);

  return (
    <ProposalApp
      topicSlug={topic}
      initialSnapshot={initialSnapshot}
      initialProposals={initialProposals}
    />
  );
}
