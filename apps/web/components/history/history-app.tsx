"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  History,
  PlayCircle,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
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
import type { HistorySnapshot } from "@careeright/domain/history/schema";
import { rpcClient } from "@careeright/api/client";
import { historySnapshotQueryKey } from "@careeright/api/query-keys";

const dsaChartConfig = {
  solvedQuestions: {
    label: "Solved questions",
    color: "var(--chart-2)",
  },
  watchedVideos: {
    label: "Watched videos",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const jobsChartConfig = {
  appliedJobs: {
    label: "Applied",
    color: "var(--primary)",
  },
  interviewingJobs: {
    label: "Interview",
    color: "var(--chart-1)",
  },
  rejectedJobs: {
    label: "Rejected",
    color: "var(--destructive)",
  },
  offerJobs: {
    label: "Offer",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function formatRange(data: HistorySnapshot) {
  return `${formatDay(data.range.startDate)} - ${formatDay(data.range.endDate)}`;
}

export function HistoryApp({
  initialHistory,
}: {
  initialHistory?: HistorySnapshot;
}) {
  const historyQuery = useQuery({
    queryKey: historySnapshotQueryKey,
    queryFn: () => rpcClient.history.snapshot(),
    initialData: initialHistory,
    staleTime: 0,
  });
  const data = historyQuery.data;

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
              <section className="grid min-w-0 gap-5 xl:grid-cols-2">
                <DsaHistoryChart data={data} />
                <JobsHistoryChart data={data} />
              </section>
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
  icon: React.ReactNode;
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

function DsaHistoryChart({ data }: { data: HistorySnapshot }) {
  return (
    <Card size="sm" className="min-w-0 pt-0">
      <CardHeader className="border-b py-5">
        <div className="grid flex-1 gap-1">
          <CardTitle>DSA activity</CardTitle>
          <CardDescription>
            Solved questions and watched videos in the same monthly chart.
          </CardDescription>
        </div>
        <CardAction>
          <Badge variant="secondary">
            {data.summary.solvedQuestions + data.summary.watchedVideos} total
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={dsaChartConfig}
          className="aspect-auto h-[280px] w-full"
          initialDimension={{ width: 640, height: 280 }}
        >
          <AreaChart accessibilityLayer data={data.days}>
            <defs>
              <linearGradient id="fillSolvedQuestions" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-solvedQuestions)"
                  stopOpacity={0.75}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-solvedQuestions)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillWatchedVideos" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-watchedVideos)"
                  stopOpacity={0.72}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-watchedVideos)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatDay}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={34}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDay(String(value))}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="watchedVideos"
              type="natural"
              fill="url(#fillWatchedVideos)"
              stroke="var(--color-watchedVideos)"
              stackId="dsa"
            />
            <Area
              dataKey="solvedQuestions"
              type="natural"
              fill="url(#fillSolvedQuestions)"
              stroke="var(--color-solvedQuestions)"
              stackId="dsa"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function JobsHistoryChart({ data }: { data: HistorySnapshot }) {
  return (
    <Card size="sm" className="min-w-0 pt-0">
      <CardHeader className="border-b py-5">
        <div className="grid flex-1 gap-1">
          <CardTitle>Job pipeline</CardTitle>
          <CardDescription>
            Applied, interview, rejected, and offer activity for the month.
          </CardDescription>
        </div>
        <CardAction>
          <Badge variant="secondary">
            {data.summary.appliedJobs +
              data.summary.interviewingJobs +
              data.summary.rejectedJobs +
              data.summary.offerJobs}{" "}
            events
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={jobsChartConfig}
          className="aspect-auto h-[280px] w-full"
          initialDimension={{ width: 640, height: 280 }}
        >
          <AreaChart accessibilityLayer data={data.days}>
            <defs>
              <linearGradient id="fillAppliedJobs" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-appliedJobs)"
                  stopOpacity={0.72}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-appliedJobs)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient
                id="fillInterviewingJobs"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-interviewingJobs)"
                  stopOpacity={0.72}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-interviewingJobs)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillRejectedJobs" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-rejectedJobs)"
                  stopOpacity={0.72}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-rejectedJobs)"
                  stopOpacity={0.08}
                />
              </linearGradient>
              <linearGradient id="fillOfferJobs" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-offerJobs)"
                  stopOpacity={0.72}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-offerJobs)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={formatDay}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={34}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDay(String(value))}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="offerJobs"
              type="natural"
              fill="url(#fillOfferJobs)"
              stroke="var(--color-offerJobs)"
              stackId="jobs"
            />
            <Area
              dataKey="rejectedJobs"
              type="natural"
              fill="url(#fillRejectedJobs)"
              stroke="var(--color-rejectedJobs)"
              stackId="jobs"
            />
            <Area
              dataKey="interviewingJobs"
              type="natural"
              fill="url(#fillInterviewingJobs)"
              stroke="var(--color-interviewingJobs)"
              stackId="jobs"
            />
            <Area
              dataKey="appliedJobs"
              type="natural"
              fill="url(#fillAppliedJobs)"
              stroke="var(--color-appliedJobs)"
              stackId="jobs"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
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
