import { createDefaultColumns } from "@careeright/domain/kanban/defaults";
import {
  columnIdSchema,
  prioritySchema,
  proposalSourceSchema,
  proposalStatusSchema,
  SOLO_USER_ID,
  type AiProposal,
  type BoardColumn,
  type BoardSnapshot,
  type KanbanTask,
} from "@careeright/domain/kanban/schema";
import {
  getBoardSnapshot,
  listMcpTokens,
  listProposalHistory,
} from "@careeright/domain/kanban/store";
import {
  dashboardAnalyticsSchema,
  type DashboardAnalytics,
  type DashboardCount,
} from "@careeright/domain/dashboard/schema";
import type { DiaryDay } from "@careeright/domain/diary/schema";
import { listDiaryDays } from "@careeright/domain/diary/store";
import { jobStatusSchema, type JobRecord } from "@careeright/domain/jobs/schema";
import { listJobs } from "@careeright/domain/jobs/store";
import {
  profileApplicationDefaultsSchema,
  type ProfileImportStatus,
  type ProfileSnapshot,
} from "@careeright/domain/profile/schema";
import { getProfileSnapshot, listProfileImports } from "@careeright/domain/profile/store";

const jobStatusLabels = {
  not_applied: "Not applied",
  applied: "Applied",
  interviewing: "Interviewing",
  rejected: "Rejected",
  offer: "Offer",
  expired: "Expired",
} satisfies Record<(typeof jobStatusSchema.options)[number], string>;

const priorityLabels = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
} satisfies Record<(typeof prioritySchema.options)[number], string>;

const proposalStatusLabels = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
} satisfies Record<(typeof proposalStatusSchema.options)[number], string>;

const proposalSourceLabels = {
  app: "App",
  mcp: "MCP",
  ai: "AI",
} satisfies Record<(typeof proposalSourceSchema.options)[number], string>;

function dateKey(value: string) {
  return value.slice(0, 10);
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function previousDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);

  return date.toISOString().slice(0, 10);
}

function unavailableSourceMessage(sources: string[]) {
  if (sources.length === 0) {
    return undefined;
  }

  return `Some analytics sections could not be loaded: ${sources.join(
    ", ",
  )}. Other dashboard pages may still work because they read one section at a time.`;
}

function countBy<T extends string>(values: T[], options: readonly T[]) {
  const counts = Object.fromEntries(options.map((value) => [value, 0])) as Record<
    T,
    number
  >;

  for (const value of values) {
    counts[value] += 1;
  }

  return counts;
}

function sourceCounts(records: string[]): Array<DashboardCount & { source: string }> {
  const counts = records.reduce<Record<string, number>>((current, source) => {
    const key = source.trim() || "Unknown";
    current[key] = (current[key] ?? 0) + 1;
    return current;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([source, count]) => ({
      source,
      label: source,
      count,
    }));
}

function boardAnalytics(
  title: string,
  columns: BoardColumn[],
  tasks: KanbanTask[],
): DashboardAnalytics["board"] {
  const visibleColumns = columns.filter((column) => column.id !== "review");
  const visibleTasks = tasks.map((task) =>
    task.columnId === "review"
      ? {
          ...task,
          columnId: "in_progress" as const,
        }
      : task,
  );
  const columnCounts = countBy(
    visibleTasks.map((task) => task.columnId),
    columnIdSchema.options,
  );
  const priorityCounts = countBy(
    visibleTasks.map((task) => task.priority),
    prioritySchema.options,
  );
  const doneCount = columnCounts.done;
  const completionRate =
    visibleTasks.length === 0
      ? 0
      : Math.round((doneCount / visibleTasks.length) * 100);
  return {
    title,
    taskCount: visibleTasks.length,
    completionRate,
    inProgressCount: columnCounts.in_progress,
    reviewCount: 0,
    columnCounts: visibleColumns.map((column) => ({
      id: column.id,
      label: column.title,
      color: column.color,
      count: columnCounts[column.id],
    })),
    priorityCounts: prioritySchema.options.map((priority) => ({
      priority,
      label: priorityLabels[priority],
      count: priorityCounts[priority],
    })),
    recentTasks: [...visibleTasks]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5)
      .map((task) => ({
        id: task.id,
        taskNumber: task.taskNumber,
        title: task.title,
        columnId: task.columnId,
        priority: task.priority,
        updatedAt: task.updatedAt,
      })),
  };
}

function jobsAnalytics(jobs: JobRecord[]): DashboardAnalytics["jobs"] {
  const statusCounts = countBy(
    jobs.map((job) => job.status),
    jobStatusSchema.options,
  );
  const fitScores = jobs
    .map((job) => job.fitScore)
    .filter((fitScore): fitScore is number => typeof fitScore === "number")
    .map((fitScore) => Math.min(100, Math.max(0, fitScore)));
  const todayKey = dateKey(new Date().toISOString());
  const latestSeededDate = jobs[0]?.seededAt ? dateKey(jobs[0].seededAt) : null;
  const averageFitScore =
    fitScores.length === 0
      ? null
      : Math.round(
          fitScores.reduce((total, fitScore) => total + fitScore, 0) /
            fitScores.length,
        );

  return {
    totalCount: jobs.length,
    latestSeededDate,
    todaySeededCount: jobs.filter((job) => dateKey(job.seededAt) === todayKey)
      .length,
    averageFitScore,
    statusCounts: jobStatusSchema.options.map((status) => ({
      status,
      label: jobStatusLabels[status],
      count: statusCounts[status],
    })),
    sourceCounts: sourceCounts(jobs.map((job) => job.source)),
  };
}

function diaryAnalytics(days: DiaryDay[]): DashboardAnalytics["diary"] {
  const sortedDays = [...days].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  const completedDateKeys = new Set(
    days.filter((day) => day.status === "complete").map((day) => day.dateKey),
  );
  let currentKey = localDateKey();
  let currentStreak = 0;

  while (completedDateKeys.has(currentKey)) {
    currentStreak += 1;
    currentKey = previousDateKey(currentKey);
  }

  return {
    totalCount: days.length,
    completedCount: completedDateKeys.size,
    latestDiaryDate: sortedDays[0]?.dateKey ?? null,
    currentStreak,
  };
}

function generatedTaskCount(proposals: AiProposal[]) {
  return proposals.reduce((total, proposal) => {
    if (proposal.type !== "task_breakdown") {
      return total;
    }

    const payload = proposal.payload;

    if (!("tasks" in payload)) {
      return total;
    }

    return total + payload.tasks.length;
  }, 0);
}

function proposalsAnalytics(
  proposals: AiProposal[],
): DashboardAnalytics["proposals"] {
  const statusCounts = countBy(
    proposals.map((proposal) => proposal.status),
    proposalStatusSchema.options,
  );
  const sourceById = countBy(
    proposals.map((proposal) => proposal.source),
    proposalSourceSchema.options,
  );

  return {
    totalCount: proposals.length,
    pendingCount: statusCounts.pending,
    acceptedCount: statusCounts.accepted,
    rejectedCount: statusCounts.rejected,
    generatedTaskCount: generatedTaskCount(proposals),
    statusCounts: proposalStatusSchema.options.map((status) => ({
      status,
      label: proposalStatusLabels[status],
      count: statusCounts[status],
    })),
    sourceCounts: proposalSourceSchema.options.map((source) => ({
      source,
      label: proposalSourceLabels[source],
      count: sourceById[source],
    })),
  };
}

function profileReadinessScore(input: {
  displayName: string;
  headline: string;
  location: string;
  summary: string;
  itemCount: number;
}) {
  const basicsScore =
    [input.displayName, input.headline, input.location, input.summary].filter(
      (value) => value.trim().length > 0,
    ).length * 15;
  const itemScore = Math.min(input.itemCount, 5) * 8;

  return Math.min(100, basicsScore + itemScore);
}

function emptyBoardSnapshot(userId: string, generatedAt: string): BoardSnapshot {
  return {
    board: {
      id: "dashboard-unavailable",
      userId,
      title: "AI Work Board",
      description: "Analytics fallback board.",
      createdAt: generatedAt,
      updatedAt: generatedAt,
    },
    columns: createDefaultColumns(
      "dashboard-unavailable",
      userId,
      generatedAt,
    ),
    tasks: [],
    proposals: [],
    storageMode: "demo",
  };
}

function emptyProfileSnapshot(
  userId: string,
  generatedAt: string,
): ProfileSnapshot {
  return {
    profile: {
      id: "profile-unavailable",
      userId,
      displayName: "",
      headline: "",
      location: "",
      email: "",
      website: "",
      summary: "",
      applicationDefaults: profileApplicationDefaultsSchema.parse({}),
      createdAt: generatedAt,
      updatedAt: generatedAt,
    },
    items: [],
  };
}

async function safeLoad<T>(
  label: string,
  load: () => Promise<T>,
  fallback: T,
  failures: string[],
) {
  try {
    return await load();
  } catch (error) {
    console.error(`[dashboard.analytics] Failed to load ${label}.`, error);
    failures.push(label);
    return fallback;
  }
}

export async function getDashboardAnalytics(
  userId = SOLO_USER_ID,
): Promise<DashboardAnalytics> {
  const generatedAt = new Date().toISOString();
  const failures: string[] = [];
  const emptyImports: Awaited<ReturnType<typeof listProfileImports>> = [];
  const loadImports = (status: ProfileImportStatus) =>
    listProfileImports(userId, status);
  const [
    snapshot,
    jobs,
    proposals,
    profileSnapshot,
    pendingImports,
    appliedImports,
    rejectedImports,
    mcpTokens,
    diaryDays,
  ] = await Promise.all([
    safeLoad(
      "board",
      () => getBoardSnapshot(userId),
      emptyBoardSnapshot(userId, generatedAt),
      failures,
    ),
    safeLoad("jobs", () => listJobs(userId), [], failures),
    safeLoad("proposals", () => listProposalHistory(userId), [], failures),
    safeLoad(
      "profile",
      () => getProfileSnapshot(userId),
      emptyProfileSnapshot(userId, generatedAt),
      failures,
    ),
    safeLoad("pending profile imports", () => loadImports("pending"), emptyImports, failures),
    safeLoad("applied profile imports", () => loadImports("applied"), emptyImports, failures),
    safeLoad("rejected profile imports", () => loadImports("rejected"), emptyImports, failures),
    safeLoad("MCP tokens", () => listMcpTokens(userId), [], failures),
    safeLoad("diary", () => listDiaryDays(userId), [], failures),
  ]);

  const activeTokenCount = mcpTokens.filter((token) => !token.revokedAt).length;
  const latestTokenUsageAt =
    mcpTokens
      .map((token) => token.lastUsedAt)
      .filter((value): value is string => Boolean(value))
      .sort((a, b) => b.localeCompare(a))[0] ?? null;

  return dashboardAnalyticsSchema.parse({
    generatedAt,
    storage: {
      status: failures.length > 0 ? "unavailable" : "ready",
      message: unavailableSourceMessage(failures),
    },
    board: boardAnalytics(snapshot.board.title, snapshot.columns, snapshot.tasks),
    jobs: jobsAnalytics(jobs),
    proposals: proposalsAnalytics(proposals),
    profile: {
      displayName: profileSnapshot.profile.displayName,
      headline: profileSnapshot.profile.headline,
      location: profileSnapshot.profile.location,
      itemCount: profileSnapshot.items.length,
      pendingImportCount: pendingImports.length,
      completedImportCount: appliedImports.length + rejectedImports.length,
      readinessScore: profileReadinessScore({
        displayName: profileSnapshot.profile.displayName,
        headline: profileSnapshot.profile.headline,
        location: profileSnapshot.profile.location,
        summary: profileSnapshot.profile.summary,
        itemCount: profileSnapshot.items.length,
      }),
    },
    mcp: {
      totalTokenCount: mcpTokens.length,
      activeTokenCount,
      revokedTokenCount: mcpTokens.length - activeTokenCount,
      latestTokenUsageAt,
    },
    diary: diaryAnalytics(diaryDays),
  });
}
