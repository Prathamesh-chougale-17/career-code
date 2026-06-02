"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import type { HistorySnapshot } from "@careeright/domain/history/schema";
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
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";

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

export function HistoryCharts({ data }: { data: HistorySnapshot }) {
  return (
    <section className="grid min-w-0 gap-5 xl:grid-cols-2">
      <DsaHistoryChart data={data} />
      <JobsHistoryChart data={data} />
    </section>
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
