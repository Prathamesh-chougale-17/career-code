"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { ProposalPayload } from "@/components/proposals/proposal-payload";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type AiProposal,
  type BoardSnapshot,
  type ProposedTask,
} from "@careeright/domain/kanban/schema";
import { proposalTopic, type ProposalTopic } from "@careeright/domain/kanban/proposal-topic";
import { taskFingerprint } from "@careeright/domain/kanban/task-fingerprint";
import { rpcClient } from "@careeright/api/client";
import {
  boardSnapshotQueryKey,
  dashboardAnalyticsQueryKey,
  dashboardMetricsQueryKey,
  proposalHistoryQueryKey,
} from "@careeright/api/query-keys";
import { cn } from "@/lib/utils";

type TopicGroup = {
  topic: ProposalTopic;
  proposals: AiProposal[];
  latestAt: string;
  latestStatus: AiProposal["status"];
  taskCount: number;
  addedTaskCount: number;
  remainingTaskCount: number;
};

type ProposedTaskAddInput = {
  proposal: AiProposal;
  task: ProposedTask;
  fingerprint: string;
};

type ProposedTaskAddManyInput = {
  proposal: AiProposal;
  tasks: Array<{
    task: ProposedTask;
    fingerprint: string;
  }>;
};

type ProposalDeleteTarget = {
  title: string;
  description: string;
  deleteKey: string;
  proposalIds: string[];
};

type ProposalDeleteInput = {
  deleteKey: string;
  proposalIds: string[];
};

const statusStyles: Record<AiProposal["status"], string> = {
  pending: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  accepted:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  rejected: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const statusLabels: Record<AiProposal["status"], string> = {
  pending: "Pending review",
  accepted: "Marked accepted",
  rejected: "Rejected",
};

function proposalDeleteKey(proposalId: string) {
  return `proposal:${proposalId}`;
}

function topicDeleteKey(topicSlug: string) {
  return `topic:${topicSlug}`;
}

export function ProposalApp({
  topicSlug,
  initialSnapshot,
  initialProposals,
}: {
  topicSlug?: string;
  initialSnapshot?: BoardSnapshot;
  initialProposals?: AiProposal[];
}) {
  const queryClient = useQueryClient();
  const [deleteProposalTarget, setDeleteProposalTarget] =
    useState<ProposalDeleteTarget | null>(null);
  const [pendingDeleteKeys, setPendingDeleteKeys] = useState<Set<string>>(
    () => new Set(),
  );

  const snapshotQuery = useQuery({
    queryKey: boardSnapshotQueryKey,
    queryFn: () => rpcClient.board.snapshot(),
    initialData: initialSnapshot,
    staleTime: 60_000,
  });

  const proposalsQuery = useQuery({
    queryKey: proposalHistoryQueryKey,
    queryFn: () => rpcClient.proposal.list(),
    initialData: initialProposals,
    staleTime: 60_000,
  });

  const invalidateProposalWorkspace = () => {
    void queryClient.invalidateQueries({ queryKey: boardSnapshotQueryKey });
    void queryClient.invalidateQueries({ queryKey: dashboardAnalyticsQueryKey });
    void queryClient.invalidateQueries({ queryKey: proposalHistoryQueryKey });
    void queryClient.invalidateQueries({ queryKey: dashboardMetricsQueryKey });
  };

  const addProposedTaskMutation = useMutation({
    mutationFn: ({ proposal, task, fingerprint }: ProposedTaskAddInput) =>
      rpcClient.task.create(
        proposedTaskCreateInput(proposal, task, fingerprint),
      ),
    onSuccess: invalidateProposalWorkspace,
  });

  const addRemainingTasksMutation = useMutation({
    mutationFn: ({ proposal, tasks }: ProposedTaskAddManyInput) =>
      Promise.all(
        tasks.map(({ task, fingerprint }) =>
          rpcClient.task.create(
            proposedTaskCreateInput(proposal, task, fingerprint),
          ),
        ),
      ),
    onSuccess: invalidateProposalWorkspace,
  });

  const acceptMutation = useMutation({
    mutationFn: (proposalId: string) =>
      rpcClient.proposal.accept({ proposalId }),
    onSuccess: invalidateProposalWorkspace,
  });

  const rejectMutation = useMutation({
    mutationFn: (proposalId: string) =>
      rpcClient.proposal.reject({ proposalId }),
    onSuccess: invalidateProposalWorkspace,
  });

  const deleteProposalsMutation = useMutation({
    mutationFn: ({ proposalIds }: ProposalDeleteInput) =>
      Promise.all(
        proposalIds.map((proposalId) =>
          rpcClient.proposal.delete({ proposalId }),
        ),
      ),
    onMutate: ({ deleteKey }) => {
      setPendingDeleteKeys((currentKeys) => {
        const nextKeys = new Set(currentKeys);
        nextKeys.add(deleteKey);
        return nextKeys;
      });
    },
    onSuccess: invalidateProposalWorkspace,
    onSettled: (_data, _error, variables) => {
      setPendingDeleteKeys((currentKeys) => {
        const nextKeys = new Set(currentKeys);
        nextKeys.delete(variables.deleteKey);
        return nextKeys;
      });
    },
  });

  const onDeleteProposal = useCallback((proposal: AiProposal) => {
    setDeleteProposalTarget({
      title: "Delete proposal?",
      description: `This will remove "${proposal.title}" from the proposal library. The proposal is soft deleted and kept in storage.`,
      deleteKey: proposalDeleteKey(proposal.id),
      proposalIds: [proposal.id],
    });
  }, []);

  const onDeleteTopic = useCallback(
    (topic: TopicGroup) => {
      const proposalLabel =
        topic.proposals.length === 1 ? "proposal" : "proposals";
      setDeleteProposalTarget({
        title: "Delete proposal topic?",
        description: `This will remove "${topic.topic.name}" and its ${topic.proposals.length} ${proposalLabel} from the proposal library. The proposals are soft deleted and kept in storage.`,
        deleteKey: topicDeleteKey(topic.topic.slug),
        proposalIds: topic.proposals.map((proposal) => proposal.id),
      });
    },
    [],
  );

  const onConfirmDeleteProposals = useCallback(() => {
    if (!deleteProposalTarget) {
      return;
    }

    const deleteInput = {
      deleteKey: deleteProposalTarget.deleteKey,
      proposalIds: deleteProposalTarget.proposalIds,
    };
    setDeleteProposalTarget(null);
    deleteProposalsMutation.mutate(deleteInput);
  }, [deleteProposalTarget, deleteProposalsMutation]);

  const onDeleteProposalDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDeleteProposalTarget(null);
    }
  }, []);

  const snapshot = snapshotQuery.data;
  const proposals = useMemo(
    () => proposalsQuery.data ?? [],
    [proposalsQuery.data],
  );
  const existingTaskFingerprints = useMemo(
    () => new Set((snapshot?.tasks ?? []).map(taskFingerprint)),
    [snapshot?.tasks],
  );
  const topics = useMemo(
    () => groupProposalsByTopic(proposals, existingTaskFingerprints),
    [existingTaskFingerprints, proposals],
  );
  const selectedTopic = topicSlug
    ? topics.find((topic) => topic.topic.slug === topicSlug)
    : undefined;
  const addingTaskFingerprint = addProposedTaskMutation.isPending
    ? addProposedTaskMutation.variables?.fingerprint
    : undefined;
  const busyProposalId = acceptMutation.isPending
    ? acceptMutation.variables
    : rejectMutation.isPending
      ? rejectMutation.variables
      : undefined;
  const deleteDialogPending = deleteProposalTarget
    ? pendingDeleteKeys.has(deleteProposalTarget.deleteKey)
    : false;

  if (snapshotQuery.isPending || proposalsQuery.isPending) {
    return <ProposalLoading topicSlug={topicSlug} />;
  }

  if (snapshotQuery.isError || proposalsQuery.isError || !snapshot) {
    const error =
      snapshotQuery.error instanceof Error
        ? snapshotQuery.error
        : proposalsQuery.error instanceof Error
          ? proposalsQuery.error
          : undefined;

    return (
      <ProposalShell proposalCount={proposals.length}>
        <div className="flex min-h-svh items-center justify-center px-6 text-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Proposals could not load</CardTitle>
              <CardDescription>
                {error?.message ?? "Something went wrong while loading proposals."}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </ProposalShell>
    );
  }

  return (
    <>
      <ProposalShell proposalCount={proposals.length}>
        {topicSlug ? (
          <ProposalTopicDetail
            topicSlug={topicSlug}
            topic={selectedTopic}
            existingTaskFingerprints={existingTaskFingerprints}
            addingTaskFingerprint={addingTaskFingerprint}
            onAddTask={(proposal, task, fingerprint) =>
              addProposedTaskMutation.mutate({ proposal, task, fingerprint })
            }
            onAddRemainingTasks={(proposal, tasks) =>
              addRemainingTasksMutation.mutate({ proposal, tasks })
            }
            onAccept={(proposalId) => acceptMutation.mutate(proposalId)}
            onReject={(proposalId) => rejectMutation.mutate(proposalId)}
            onDelete={onDeleteProposal}
            busyProposalId={busyProposalId}
            busyBulkProposalId={
              addRemainingTasksMutation.isPending
                ? addRemainingTasksMutation.variables?.proposal.id
                : undefined
            }
            pendingDeleteKeys={pendingDeleteKeys}
          />
        ) : (
          <ProposalTopicIndex
            topics={topics}
            proposalCount={proposals.length}
            pendingDeleteKeys={pendingDeleteKeys}
            onDeleteTopic={onDeleteTopic}
          />
        )}
      </ProposalShell>

      <AlertDialog
        open={Boolean(deleteProposalTarget)}
        onOpenChange={onDeleteProposalDialogOpenChange}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteProposalTarget?.title ?? "Delete proposal?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteProposalTarget?.description ??
                "This proposal will be soft deleted and kept in storage."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDialogPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={deleteDialogPending}
              onClick={onConfirmDeleteProposals}
            >
              <Trash2 data-icon="inline-start" aria-hidden="true" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function ProposalTopicIndex({
  topics,
  proposalCount,
  pendingDeleteKeys,
  onDeleteTopic,
}: {
  topics: TopicGroup[];
  proposalCount: number;
  pendingDeleteKeys: Set<string>;
  onDeleteTopic: (topic: TopicGroup) => void;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-primary">Proposal library</p>
          <h1 className="font-heading text-2xl font-semibold tracking-normal sm:text-3xl">
            Proposal topics
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Review every study proposal by topic, then add only the cards you
            want on the execution board.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{topics.length} topics</Badge>
          <Badge variant="outline">{proposalCount} proposals</Badge>
        </div>
      </section>

      {topics.length === 0 ? (
        <Empty className="min-h-[24rem] border border-dashed bg-muted/30">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Sparkles aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No proposals yet</EmptyTitle>
            <EmptyDescription>
              Create a study breakdown from the board and it will appear here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {topics.map((topic) => {
            const isDeleting = pendingDeleteKeys.has(
              topicDeleteKey(topic.topic.slug),
            );

            return (
              <Card key={topic.topic.slug} size="sm" className="rounded-xl">
                <CardHeader>
                  <CardTitle className="text-xl">{topic.topic.name}</CardTitle>
                  <CardDescription>
                    Latest proposal {formatDate(topic.latestAt)}
                  </CardDescription>
                  <CardAction className="flex flex-wrap justify-end gap-2">
                    <Badge variant="outline">
                      {topic.proposals.length} proposals
                    </Badge>
                    <StatusBadge status={topic.latestStatus} />
                  </CardAction>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 text-sm">
                  <Metric label="Proposal tasks" value={topic.taskCount} />
                  <Metric label="Added to board" value={topic.addedTaskCount} />
                  <Metric label="Remaining" value={topic.remainingTaskCount} />
                  <StatusMetric status={topic.latestStatus} />
                </CardContent>
                <CardFooter className="flex-wrap justify-between gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => onDeleteTopic(topic)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Trash2 data-icon="inline-start" aria-hidden="true" />
                    )}
                    Delete
                  </Button>
                  <Button
                    nativeButton={false}
                    render={
                      <Link href={`/dashboard/proposal/${topic.topic.slug}`} />
                    }
                  >
                    Open topic
                    <ArrowRight data-icon="inline-end" aria-hidden="true" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}

function ProposalTopicDetail({
  topicSlug,
  topic,
  existingTaskFingerprints,
  addingTaskFingerprint,
  onAddTask,
  onAddRemainingTasks,
  onAccept,
  onReject,
  onDelete,
  busyProposalId,
  busyBulkProposalId,
  pendingDeleteKeys,
}: {
  topicSlug: string;
  topic?: TopicGroup;
  existingTaskFingerprints: Set<string>;
  addingTaskFingerprint?: string;
  onAddTask: (proposal: AiProposal, task: ProposedTask, fingerprint: string) => void;
  onAddRemainingTasks: (
    proposal: AiProposal,
    tasks: Array<{ task: ProposedTask; fingerprint: string }>,
  ) => void;
  onAccept: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  onDelete: (proposal: AiProposal) => void;
  busyProposalId?: string;
  busyBulkProposalId?: string;
  pendingDeleteKeys: Set<string>;
}) {
  if (!topic) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <Button
          variant="outline"
          className="w-fit"
          nativeButton={false}
          render={<Link href="/dashboard/proposal" />}
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Topics
        </Button>
        <Empty className="min-h-[22rem] border border-dashed bg-muted/30">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Sparkles aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Topic not found</EmptyTitle>
            <EmptyDescription>
              No proposal topic matches <code>{topicSlug}</code>.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <Button
            variant="outline"
            size="sm"
            className="mb-3"
            nativeButton={false}
            render={<Link href="/dashboard/proposal" />}
          >
            <ArrowLeft data-icon="inline-start" aria-hidden="true" />
            Topics
          </Button>
          <h1 className="font-heading text-2xl font-semibold tracking-normal sm:text-3xl">
            {topic.topic.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Add proposal tasks to Todo one by one. Accepted and rejected
            proposals stay visible for reference.
          </p>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[24rem]">
          <Metric label="Proposal tasks" value={topic.taskCount} />
          <Metric label="Added" value={topic.addedTaskCount} />
          <Metric label="Remaining" value={topic.remainingTaskCount} />
        </div>
      </section>

      <section className="grid gap-5">
        {topic.proposals.map((proposal) => {
          const progress = proposalProgress(proposal, existingTaskFingerprints);
          const isBusy = busyProposalId === proposal.id;
          const isBulkAdding = busyBulkProposalId === proposal.id;
          const remainingTasks = remainingProposalTasks(
            proposal,
            existingTaskFingerprints,
          );
          const isDeleting = pendingDeleteKeys.has(
            proposalDeleteKey(proposal.id),
          );

          return (
            <Card key={proposal.id} size="sm" className="min-w-0 rounded-xl">
              <CardHeader>
                <CardTitle className="break-words text-base">
                  {proposal.title}
                </CardTitle>
                <CardDescription className="flex flex-wrap items-center gap-2 text-xs uppercase">
                  <span>{proposal.source}</span>
                  <span>/</span>
                  <span>{proposal.type.replaceAll("_", " ")}</span>
                  <span>/</span>
                  <span>{formatDate(proposal.createdAt)}</span>
                </CardDescription>
                <CardAction className="flex flex-wrap justify-end gap-2">
                  {progress.totalTasks > 0 ? (
                    <>
                      <Badge variant="outline">
                        {progress.addedTasks}/{progress.totalTasks} added
                      </Badge>
                      <Badge variant="outline">
                        {progress.remainingTasks} remaining
                      </Badge>
                    </>
                  ) : null}
                  <StatusBadge status={proposal.status} />
                </CardAction>
              </CardHeader>
              <CardContent className="text-sm leading-6 text-muted-foreground">
                <p>{proposal.summary}</p>
                {remainingTasks.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/70 p-3">
                    <p className="text-xs text-muted-foreground">
                      {remainingTasks.length} proposal{" "}
                      {remainingTasks.length === 1 ? "task is" : "tasks are"}{" "}
                      still not on the board.
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onAddRemainingTasks(proposal, remainingTasks)}
                      disabled={
                        isBulkAdding ||
                        Boolean(addingTaskFingerprint) ||
                        isBusy ||
                        isDeleting
                      }
                    >
                      {isBulkAdding ? (
                        <Loader2
                          data-icon="inline-start"
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Plus data-icon="inline-start" aria-hidden="true" />
                      )}
                      Add remaining
                    </Button>
                  </div>
                ) : null}
                <ProposalPayload
                  proposal={proposal}
                  existingTaskFingerprints={existingTaskFingerprints}
                  addingTaskFingerprint={addingTaskFingerprint}
                  onAddTask={onAddTask}
                />
              </CardContent>
              <CardFooter className="flex-wrap justify-between gap-2 border-t bg-background/95 pt-3">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => onDelete(proposal)}
                  disabled={isBusy || isDeleting}
                >
                  {isDeleting ? (
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Trash2 data-icon="inline-start" aria-hidden="true" />
                  )}
                  Delete
                </Button>
                {proposal.status === "pending" ? (
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => onAccept(proposal.id)}
                      disabled={isBusy || isDeleting}
                    >
                      {isBusy ? (
                        <Loader2
                          data-icon="inline-start"
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Check data-icon="inline-start" aria-hidden="true" />
                      )}
                      {acceptButtonLabel(proposal)}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onReject(proposal.id)}
                      disabled={isBusy || isDeleting}
                    >
                      <X data-icon="inline-start" aria-hidden="true" />
                      Reject
                    </Button>
                  </div>
                ) : null}
              </CardFooter>
            </Card>
          );
        })}
      </section>
    </div>
  );
}

function ProposalShell({
  proposalCount,
  children,
}: {
  proposalCount: number;
  children: ReactNode;
}) {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Proposal library</p>
          <p className="truncate text-xs text-muted-foreground">
            {proposalCount} proposals grouped by topic
          </p>
        </div>
      </header>

      <main className="w-full min-w-0 max-w-full overflow-x-hidden">
        {children}
      </main>
    </>
  );
}

function ProposalLoading({ topicSlug }: { topicSlug?: string }) {
  return (
    <ProposalShell proposalCount={0}>
      {topicSlug ? <ProposalTopicDetailSkeleton /> : <ProposalIndexSkeleton />}
    </ProposalShell>
  );
}

function ProposalIndexSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} size="sm" className="rounded-xl">
            <CardHeader>
              <div className="space-y-2">
                <Skeleton className="h-6 w-52 max-w-full rounded-md" />
                <Skeleton className="h-4 w-36 rounded-md" />
              </div>
              <CardAction className="flex flex-wrap justify-end gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </CardAction>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              {Array.from({ length: 4 }, (_, metricIndex) => (
                <div
                  key={metricIndex}
                  className="rounded-lg border border-border bg-background/60 px-3 py-2"
                >
                  <Skeleton className="h-3 w-16 rounded-md" />
                  <Skeleton className="mt-2 h-6 w-12 rounded-md" />
                </div>
              ))}
            </CardContent>
            <CardFooter className="flex-wrap justify-between gap-2">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </CardFooter>
          </Card>
        ))}
      </section>
    </div>
  );
}

function ProposalTopicDetailSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-80 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
          <Skeleton className="h-4 w-3/5 max-w-xl rounded-md" />
        </div>
        <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[24rem]">
          {Array.from({ length: 3 }, (_, metricIndex) => (
            <div
              key={metricIndex}
              className="rounded-lg border border-border bg-background/60 px-3 py-2"
            >
              <Skeleton className="h-3 w-16 rounded-md" />
              <Skeleton className="mt-2 h-6 w-12 rounded-md" />
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-5">
        {Array.from({ length: 3 }, (_, index) => (
          <Card key={index} size="sm" className="min-w-0 rounded-xl">
            <CardHeader>
              <div className="space-y-2">
                <Skeleton className="h-5 w-2/5 min-w-56 rounded-md" />
                <Skeleton className="h-4 w-72 rounded-md" />
              </div>
              <CardAction className="flex flex-wrap justify-end gap-2">
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </CardAction>
            </CardHeader>
            <CardContent className="grid gap-4">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <div className="grid gap-3">
                {Array.from({ length: 4 }, (_, taskIndex) => (
                  <div
                    key={taskIndex}
                    className="rounded-xl border border-border bg-background/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/5 rounded-md" />
                        <Skeleton className="h-3 w-full rounded-md" />
                        <Skeleton className="h-3 w-4/5 rounded-md" />
                      </div>
                      <Skeleton className="h-8 w-24 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex-wrap justify-between gap-2 border-t bg-background/95 pt-3">
              <Skeleton className="h-9 w-20 rounded-md" />
              <div className="flex flex-wrap justify-end gap-2">
                <Skeleton className="h-9 w-32 rounded-md" />
                <Skeleton className="h-9 w-20 rounded-md" />
              </div>
            </CardFooter>
          </Card>
        ))}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl font-medium">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: AiProposal["status"] }) {
  return (
    <Badge
      variant="outline"
      className={cn("capitalize", statusStyles[status])}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function StatusMetric({ status }: { status: AiProposal["status"] }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <p className="text-xs text-muted-foreground">Status</p>
      <p className="truncate text-sm font-medium text-foreground">
        {statusLabels[status]}
      </p>
    </div>
  );
}

function acceptButtonLabel(proposal: AiProposal) {
  if (proposal.type === "task_breakdown") {
    return "Mark accepted";
  }

  return "Accept and apply";
}

function proposalProgress(
  proposal: AiProposal,
  existingTaskFingerprints: Set<string>,
) {
  if (proposal.type !== "task_breakdown" || !("tasks" in proposal.payload)) {
    return {
      totalTasks: 0,
      addedTasks: 0,
      remainingTasks: 0,
    };
  }

  const totalTasks = proposal.payload.tasks.length;
  const addedTasks = proposal.payload.tasks.filter((task) =>
    existingTaskFingerprints.has(taskFingerprint(task)),
  ).length;

  return {
    totalTasks,
    addedTasks,
    remainingTasks: totalTasks - addedTasks,
  };
}

function remainingProposalTasks(
  proposal: AiProposal,
  existingTaskFingerprints: Set<string>,
) {
  if (proposal.type !== "task_breakdown" || !("tasks" in proposal.payload)) {
    return [];
  }

  return proposal.payload.tasks
    .map((task) => ({
      task,
      fingerprint: taskFingerprint(task),
    }))
    .filter(({ fingerprint }) => !existingTaskFingerprints.has(fingerprint));
}

function proposedTaskCreateInput(
  proposal: AiProposal,
  task: ProposedTask,
  fingerprint: string,
) {
  return {
    columnId: "todo" as const,
    title: task.title,
    description: task.description,
    priority: task.priority,
    acceptanceCriteria: task.acceptanceCriteria,
    dependencies: task.dependencies,
    resourceLinks: task.resourceLinks,
    helpfulLinks: task.helpfulLinks,
    problemLinks: task.problemLinks,
    sourceProposalId: proposal.id,
    sourceProposalItemFingerprint: fingerprint,
    sourceProposalTopic: proposalTopic(proposal).name,
  };
}

function groupProposalsByTopic(
  proposals: AiProposal[],
  existingTaskFingerprints: Set<string>,
) {
  const groups = new Map<string, TopicGroup>();

  for (const proposal of proposals) {
    const topic = proposalTopic(proposal);
    const existing = groups.get(topic.slug);
    const progress = proposalProgress(proposal, existingTaskFingerprints);

    if (!existing) {
      groups.set(topic.slug, {
        topic,
        proposals: [proposal],
        latestAt: proposal.createdAt,
        latestStatus: proposal.status,
        taskCount: progress.totalTasks,
        addedTaskCount: progress.addedTasks,
        remainingTaskCount: progress.remainingTasks,
      });
      continue;
    }

    existing.proposals.push(proposal);
    if (proposal.createdAt > existing.latestAt) {
      existing.latestAt = proposal.createdAt;
      existing.latestStatus = proposal.status;
    }
    existing.taskCount += progress.totalTasks;
    existing.addedTaskCount += progress.addedTasks;
    existing.remainingTaskCount += progress.remainingTasks;
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      proposals: [...group.proposals].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    }))
    .sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
