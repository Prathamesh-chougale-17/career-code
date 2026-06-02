"use client";

import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  History,
  PlayCircle,
} from "lucide-react";

import { Badge } from "../ui/badge";
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
import type { HistorySnapshot } from "@careeright/domain/history/schema";
import { useCareerightUi } from "../../providers/careeright-ui-provider";
import { historySnapshotQueryKey } from "@careeright/api/query-keys";
import { scheduleIdleTask } from "../../lib/schedule-idle-task";

const HistoryCharts = lazy(() =>
  import("./history-charts").then((module) => ({
    default: module.HistoryCharts,
  })),
);

const historyDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatDay(value: string) {
  return historyDayFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

function formatRange(data: HistorySnapshot) {
  return `${formatDay(data.range.startDate)} - ${formatDay(data.range.endDate)}`;
}

export function HistoryApp({
  initialHistory,
}: {
  initialHistory?: HistorySnapshot;
}) {
  const { rpcClient } = useCareerightUi();
  const [shouldLoadCharts, setShouldLoadCharts] = useState(false);
  const historyQuery = useQuery({
    queryKey: historySnapshotQueryKey,
    queryFn: () => rpcClient.history.snapshot(),
    initialData: initialHistory,
    notifyOnChangeProps: ["data", "isPending", "isError"],
    staleTime: 0,
  });
  const data = historyQuery.data;

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
          <p className="truncate text-sm font-semibold">History</p>
          <p className="truncate text-xs text-muted-foreground">
            Monthly DSA and job pipeline activity
          </p>
        </div>
      </header>

      <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-5">
          {historyQuery.isPending ? (
            <HistorySkeleton />
          ) : historyQuery.isError || !data ? (
            <Empty className="min-h-[360px] border border-border bg-background">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <AlertCircle aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Could not load history</EmptyTitle>
                <EmptyDescription>
                  Refresh the page and try again. History is built from your DSA
                  progress, watched videos, and job status updates.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <HistorySummary data={data} />
              {shouldLoadCharts ? (
                <Suspense fallback={<HistoryChartsFallback />}>
                  <HistoryCharts data={data} />
                </Suspense>
              ) : (
                <HistoryChartsFallback />
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

function HistorySummary({ data }: { data: HistorySnapshot }) {
  return (
    <Card
      size="sm"
      className="border-primary/20 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_13%,transparent),transparent_42%),linear-gradient(315deg,color-mix(in_oklch,var(--chart-2)_11%,transparent),transparent_45%),var(--card)]"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History aria-hidden="true" />
          Last 30 days
        </CardTitle>
        <CardDescription>{formatRange(data)}</CardDescription>
        <CardAction>
          <Badge variant="outline">{data.range.days} days</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HistoryMetric
          label="Solved"
          value={data.summary.solvedQuestions}
          detail="LeetCode questions"
          icon={<CheckCircle2 aria-hidden="true" />}
        />
        <HistoryMetric
          label="Watched"
          value={data.summary.watchedVideos}
          detail="lesson videos"
          icon={<PlayCircle aria-hidden="true" />}
        />
        <HistoryMetric
          label="Applied"
          value={data.summary.appliedJobs}
          detail="job applications"
          icon={<BriefcaseBusiness aria-hidden="true" />}
        />
        <HistoryMetric
          label="Outcomes"
          value={
            data.summary.interviewingJobs +
            data.summary.rejectedJobs +
            data.summary.offerJobs
          }
          detail="interview, reject, offer"
          icon={<History aria-hidden="true" />}
        />
      </CardContent>
    </Card>
  );
}

function HistoryMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/80 bg-background/70 px-3 py-2 shadow-sm">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-xl font-medium">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function HistorySkeleton() {
  return (
    <>
      <Card size="sm" className="border-primary/20">
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-4 w-44 rounded-md" />
          </div>
          <CardAction>
            <Skeleton className="h-6 w-16 rounded-full" />
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-20 rounded-lg" />
          ))}
        </CardContent>
      </Card>
      <section className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-[385px] rounded-2xl" />
        <Skeleton className="h-[385px] rounded-2xl" />
      </section>
    </>
  );
}

function HistoryChartsFallback() {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <Skeleton className="h-[385px] rounded-2xl" />
      <Skeleton className="h-[385px] rounded-2xl" />
    </section>
  );
}
