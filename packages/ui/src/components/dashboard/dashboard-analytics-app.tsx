"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  ClipboardList,
  Server,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";
import type {
  DashboardAnalytics,
  DashboardCount,
} from "@careeright/domain/dashboard/schema";
import {
  UiLink as Link,
  useCareerightUi,
} from "../../providers/careeright-ui-provider";
import { dashboardAnalyticsQueryKey } from "@careeright/api/query-keys";
import { scheduleIdleTask } from "../../lib/schedule-idle-task";

type CountWithMeta = DashboardCount & {
  color?: string;
};

const DashboardAnalyticsCharts = lazy(() =>
  import("./dashboard-analytics-charts").then((module) => ({
    default: module.DashboardAnalyticsCharts,
  })),
);

const dashboardDateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "UTC",
});

const dashboardDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null) {
  if (!value) {
    return "None yet";
  }

  return dashboardDateFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Never used";
  }

  return dashboardDateTimeFormatter.format(new Date(value));
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function readySignalCount(data: DashboardAnalytics) {
  return [
    data.board.taskCount > 0,
    data.jobs.totalCount > 0,
    data.diary.totalCount > 0,
    data.profile.readinessScore >= 60,
    data.mcp.activeTokenCount > 0,
  ].filter(Boolean).length;
}

function healthSubtitle(data?: DashboardAnalytics) {
  if (!data) {
    return "Workspace health across board, jobs, diary, proposals, profile, and MCP";
  }

  if (data.storage.status === "unavailable") {
    return "Workspace storage is unavailable; analytics are paused";
  }

  return `${readySignalCount(data)}/5 workspace systems have useful data right now`;
}

export function DashboardAnalyticsApp({
  initialAnalytics,
}: {
  initialAnalytics?: DashboardAnalytics;
}) {
  const { rpcClient } = useCareerightUi();
  const [shouldLoadCharts, setShouldLoadCharts] = useState(false);
  const analyticsQuery = useQuery({
    queryKey: dashboardAnalyticsQueryKey,
    queryFn: () => rpcClient.dashboard.analytics(),
    initialData: initialAnalytics,
    notifyOnChangeProps: ["data", "isPending", "isError"],
    retry: false,
    staleTime: 60_000,
  });
  const data = analyticsQuery.data;

  useEffect(() => {
    if (!data || shouldLoadCharts) {
      return;
    }

    return scheduleIdleTask(() => setShouldLoadCharts(true));
  }, [data, shouldLoadCharts]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Analytics</p>
          <p className="truncate text-xs text-muted-foreground">
            {healthSubtitle(data)}
          </p>
        </div>
      </header>

      <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-4">
          {analyticsQuery.isPending ? (
            <DashboardAnalyticsSkeleton />
          ) : analyticsQuery.isError || !data ? (
            <Empty className="min-h-[360px] border border-border bg-background">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <AlertCircle aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Could not load analytics</EmptyTitle>
                <EmptyDescription>
                  Refresh the page and try again. Analytics are derived from
                  your scoped Careeright stores.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              {data.storage.status === "unavailable" ? (
                <StorageUnavailableNotice
                  message={data.storage.message ?? "Storage is unavailable."}
                />
              ) : null}
              <DashboardHero data={data} />
              {shouldLoadCharts ? (
                <Suspense fallback={<DashboardChartsFallback />}>
                  <DashboardAnalyticsCharts data={data} />
                </Suspense>
              ) : (
                <DashboardChartsFallback />
              )}
              <InsightCards data={data} />
              <div className="grid gap-4 xl:grid-cols-2">
                <ExecutionPanel data={data} />
                <ProfileSystemsPanel data={data} />
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}

function DashboardHero({ data }: { data: DashboardAnalytics }) {
  const readiness = clampPercent(data.profile.readinessScore);
  const boardCompletion = clampPercent(data.board.completionRate);
  const diaryCompletion =
    data.diary.totalCount === 0
      ? 0
      : clampPercent((data.diary.completedCount / data.diary.totalCount) * 100);

  return (
    <Card
      size="sm"
      className="border-primary/20 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_13%,transparent),transparent_42%),var(--card)]"
    >
      <CardContent className="grid gap-5 py-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0 space-y-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-normal sm:text-3xl">
                Careeright at a glance
              </h1>
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10"
              >
                {readySignalCount(data)}/5 ready
              </Badge>
            </div>
            <p className="max-w-3xl text-sm text-muted-foreground">
              A compact view of your tasks, job pipeline, proposals, writing,
              profile readiness, and MCP access.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MiniStat
              label="Today"
              value={`${data.jobs.todaySeededCount} jobs`}
              detail="freshly seeded"
            />
            <MiniStat
              label="Average fit"
              value={
                data.jobs.averageFitScore === null
                  ? "Not scored"
                  : `${data.jobs.averageFitScore}%`
              }
              detail="job match quality"
            />
            <MiniStat
              label="Last refresh"
              value={formatDateTime(data.generatedAt)}
              detail="analytics snapshot"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 lg:w-[340px]">
          <ReadinessDial label="Profile" value={readiness} />
          <ReadinessDial label="Board" value={boardCompletion} />
          <ReadinessDial label="Diary" value={diaryCompletion} />
        </div>
      </CardContent>
    </Card>
  );
}

function ReadinessDial({ label, value }: { label: string; value: number }) {
  const percent = clampPercent(value);

  return (
    <div className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-2 py-3">
      <div
        className="grid size-16 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--primary) ${
            percent * 3.6
          }deg, color-mix(in oklch, var(--muted) 85%, transparent) 0deg)`,
        }}
      >
        <div className="grid size-12 place-items-center rounded-full bg-card">
          <span className="font-heading text-sm font-semibold">{percent}%</span>
        </div>
      </div>
      <span className="truncate text-xs font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function DashboardChartsFallback() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Skeleton className="h-[302px] rounded-2xl" />
      <Skeleton className="h-[302px] rounded-2xl" />
    </div>
  );
}

function StorageUnavailableNotice({ message }: { message: string }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle aria-hidden="true" />
          Storage unavailable
        </CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          The dashboard is showing empty placeholder counts until the MongoDB
          connection is reachable again.
        </p>
      </CardContent>
    </Card>
  );
}

function InsightCards({ data }: { data: DashboardAnalytics }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <InsightCard
        href="/dashboard/kanban"
        icon={<ClipboardList aria-hidden="true" />}
        title="Board"
        value={`${data.board.completionRate}%`}
        detail={`${data.board.inProgressCount} active, ${data.board.taskCount} total`}
        progress={data.board.completionRate}
        accent="var(--primary)"
      />
      <InsightCard
        href="/dashboard/jobs"
        icon={<Briefcase aria-hidden="true" />}
        title="Jobs"
        value={data.jobs.totalCount}
        detail={`Latest seed ${formatDate(data.jobs.latestSeededDate)}`}
        progress={data.jobs.averageFitScore ?? 0}
        accent="var(--chart-1)"
      />
      <InsightCard
        href="/dashboard/proposal"
        icon={<Sparkles aria-hidden="true" />}
        title="Proposals"
        value={data.proposals.pendingCount}
        detail={`${data.proposals.acceptedCount} accepted, ${data.proposals.generatedTaskCount} tasks`}
        progress={
          data.proposals.totalCount === 0
            ? 0
            : (data.proposals.acceptedCount / data.proposals.totalCount) * 100
        }
        accent="var(--chart-2)"
      />
      <InsightCard
        href="/dashboard/profile"
        icon={<UserRound aria-hidden="true" />}
        title="Profile"
        value={`${data.profile.readinessScore}%`}
        detail={`${data.profile.itemCount} items, ${data.profile.pendingImportCount} pending`}
        progress={data.profile.readinessScore}
        accent="var(--chart-3)"
      />
    </div>
  );
}

function InsightCard({
  href,
  icon,
  title,
  value,
  detail,
  progress,
  accent,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  value: number | string;
  detail: string;
  progress: number;
  accent: string;
}) {
  const safeProgress = clampPercent(progress);

  return (
    <Card size="sm" className="border-border/80">
      <CardHeader className="grid-cols-[1fr_auto]">
        <div className="flex min-w-0 flex-col gap-3">
          <div
            className="flex size-9 items-center justify-center rounded-lg text-background"
            style={{ backgroundColor: accent }}
          >
            {icon}
          </div>
          <div className="min-w-0">
            <CardDescription>{title}</CardDescription>
            <CardTitle className="truncate text-3xl">{value}</CardTitle>
          </div>
        </div>
        <CardAction>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={href} />}
          >
            Open
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: accent,
              width: `${Math.max(safeProgress, safeProgress > 0 ? 5 : 0)}%`,
            }}
          />
        </div>
        <p className="truncate text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  );
}

function ExecutionPanel({ data }: { data: DashboardAnalytics }) {
  return (
    <Card size="sm">
      <CardHeader>
        <div>
          <CardTitle>Execution snapshot</CardTitle>
          <CardDescription>
            Tasks and proposal flow in one short working view.
          </CardDescription>
        </div>
        <CardAction>
          <Badge variant="outline">{data.board.taskCount} tasks</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-5">
          <ProgressStat
            label="Board completion"
            value={data.board.completionRate}
            detail={`${data.board.inProgressCount} in progress, ${data.board.taskCount} total`}
          />
          <DistributionList
            title="Columns"
            total={data.board.taskCount}
            items={data.board.columnCounts}
            compact
          />
        </div>
        <div className="space-y-5">
          <DistributionList
            title="Proposal status"
            total={data.proposals.totalCount}
            items={data.proposals.statusCounts}
            emptyLabel="No proposals yet"
            compact
          />
          <RecentTaskList tasks={data.board.recentTasks.slice(0, 3)} />
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileSystemsPanel({ data }: { data: DashboardAnalytics }) {
  const diaryCompletion =
    data.diary.totalCount === 0
      ? 0
      : clampPercent((data.diary.completedCount / data.diary.totalCount) * 100);

  return (
    <Card size="sm">
      <CardHeader>
        <div>
          <CardTitle>Profile, diary, and tools</CardTitle>
          <CardDescription>
            The context Careeright uses to keep work and job matching useful.
          </CardDescription>
        </div>
        <CardAction className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/profile" />}
          >
            Profile
            <UserRound data-icon="inline-end" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/mcp-tools" />}
          >
            MCP
            <Server data-icon="inline-end" aria-hidden="true" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-5">
          <ProgressStat
            label="Profile readiness"
            value={data.profile.readinessScore}
            detail={`${data.profile.completedImportCount} imports completed`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat
              label="Name"
              value={data.profile.displayName || "Not set"}
              detail="profile identity"
            />
            <MiniStat
              label="Location"
              value={data.profile.location || "Not set"}
              detail="matching region"
            />
          </div>
        </div>
        <div className="space-y-5">
          <ProgressStat
            label="Diary completion"
            value={diaryCompletion}
            detail={`${data.diary.currentStreak} day streak, ${data.diary.completedCount} complete`}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat
              label="Active MCP"
              value={data.mcp.activeTokenCount}
              detail={`${data.mcp.revokedTokenCount} revoked`}
            />
            <MiniStat
              label="Last token use"
              value={formatDateTime(data.mcp.latestTokenUsageAt)}
              detail="tool access"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  const percent = clampPercent(value);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-sm text-muted-foreground">{percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function DistributionList({
  title,
  total,
  items,
  emptyLabel = "No data yet",
  compact = false,
}: {
  title: string;
  total: number;
  items: CountWithMeta[];
  emptyLabel?: string;
  compact?: boolean;
}) {
  const visibleItems = items.filter((item) => item.count > 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <Badge variant="outline">{total}</Badge>
      </div>
      {visibleItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleItems.map((item) => {
            const percent = total === 0 ? 0 : (item.count / total) * 100;

            return (
              <div key={item.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span
                    className={
                      compact
                        ? "truncate text-xs text-muted-foreground"
                        : "truncate text-muted-foreground"
                    }
                  >
                    {item.label}
                  </span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{
                      backgroundColor: item.color || undefined,
                      width: `${Math.max(percent, item.count > 0 ? 4 : 0)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecentTaskList({
  tasks,
}: {
  tasks: DashboardAnalytics["board"]["recentTasks"];
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">Recent updates</p>
      {tasks.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          No task updates yet
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  #{task.taskNumber} {task.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {task.columnId.replace("_", " ")}
                </p>
              </div>
              <Badge variant="secondary">{task.priority}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string;
  detail: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background/65 px-3 py-2">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="truncate font-heading text-base font-semibold">{value}</p>
      <p className="truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function DashboardAnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Card size="sm">
        <CardContent className="grid gap-5 py-1 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-4">
            <Skeleton className="h-8 w-64 rounded-lg" />
            <Skeleton className="h-4 w-full max-w-xl rounded-lg" />
            <div className="grid gap-3 sm:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:w-[340px]">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-28 rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <Skeleton className="h-[300px] rounded-2xl" />
        <Skeleton className="h-[300px] rounded-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-[170px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[330px] rounded-2xl" />
        <Skeleton className="h-[330px] rounded-2xl" />
      </div>
    </div>
  );
}
