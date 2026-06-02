"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import type { DashboardAnalytics } from "@careeright/domain/dashboard/schema";
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";

const workspaceChartConfig = {
  count: {
    label: "Total",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const jobStatusChartConfig = {
  count: {
    label: "Jobs",
  },
  not_applied: {
    label: "Not applied",
    color: "var(--muted-foreground)",
  },
  applied: {
    label: "Applied",
    color: "var(--primary)",
  },
  interviewing: {
    label: "Interviewing",
    color: "var(--chart-1)",
  },
  rejected: {
    label: "Rejected",
    color: "var(--destructive)",
  },
  offer: {
    label: "Offer",
    color: "var(--chart-2)",
  },
  expired: {
    label: "Expired",
    color: "var(--muted-foreground)",
  },
  empty: {
    label: "No jobs",
    color: "var(--muted)",
  },
} satisfies ChartConfig;

const FOOTPRINT_COLORS = [
  "var(--primary)",
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const JOB_STATUS_COLORS: Record<string, string> = {
  not_applied: "var(--muted-foreground)",
  applied: "var(--primary)",
  interviewing: "var(--chart-1)",
  rejected: "var(--destructive)",
  offer: "var(--chart-2)",
  expired: "var(--muted-foreground)",
};

export function DashboardAnalyticsCharts({
  data,
}: {
  data: DashboardAnalytics;
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <WorkspaceFootprintChart data={data} />
      <JobsStatusDonut data={data} />
    </div>
  );
}

function WorkspaceFootprintChart({ data }: { data: DashboardAnalytics }) {
  const chartData = [
    { area: "Tasks", count: data.board.taskCount },
    { area: "Jobs", count: data.jobs.totalCount },
    { area: "Diary", count: data.diary.totalCount },
    { area: "Proposals", count: data.proposals.totalCount },
    { area: "Profile", count: data.profile.itemCount },
    { area: "MCP", count: data.mcp.totalTokenCount },
  ].map((item, index) => ({
    ...item,
    fill: FOOTPRINT_COLORS[index % FOOTPRINT_COLORS.length],
  }));
  const topArea = [...chartData].sort((a, b) => b.count - a.count)[0] ?? {
    area: "None",
    count: 0,
  };

  return (
    <Card size="sm">
      <CardHeader>
        <div>
          <CardTitle>Workspace footprint</CardTitle>
          <CardDescription>
            See where the most activity lives without reading every table.
          </CardDescription>
        </div>
        <CardAction>
          <Badge variant="outline">
            Top: {topArea.area} {topArea.count}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={workspaceChartConfig}
          className="h-[210px] w-full"
          initialDimension={{ width: 640, height: 210 }}
        >
          <BarChart accessibilityLayer data={chartData} barCategoryGap={12}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="area"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={34}
              allowDecimals={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="count" radius={[6, 6, 2, 2]}>
              {chartData.map((entry) => (
                <Cell key={entry.area} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function JobsStatusDonut({ data }: { data: DashboardAnalytics }) {
  const visibleStatuses = data.jobs.statusCounts
    .filter((item) => item.count > 0)
    .map((item) => ({
      ...item,
      fill: JOB_STATUS_COLORS[item.status] ?? "var(--chart-5)",
    }));
  const chartData =
    visibleStatuses.length === 0
      ? [{ label: "No jobs", status: "empty", count: 1, fill: "var(--muted)" }]
      : visibleStatuses;

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Jobs pipeline</CardTitle>
        <CardDescription>Status split for quick application context.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-1">
        <div className="relative mx-auto w-full max-w-[220px]">
          <ChartContainer
            config={jobStatusChartConfig}
            className="h-[190px] w-full"
            initialDimension={{ width: 220, height: 190 }}
          >
            <PieChart accessibilityLayer>
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey="label" />}
              />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="label"
                innerRadius={54}
                outerRadius={78}
                paddingAngle={2}
                strokeWidth={0}
              >
                {chartData.map((entry) => (
                  <Cell key={entry.status} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-heading text-2xl font-semibold">
                {data.jobs.totalCount}
              </p>
              <p className="text-xs text-muted-foreground">jobs</p>
            </div>
          </div>
        </div>
        <StatusDistributionList
          total={data.jobs.totalCount}
          items={data.jobs.statusCounts}
        />
      </CardContent>
    </Card>
  );
}

function StatusDistributionList({
  total,
  items,
}: {
  total: number;
  items: DashboardAnalytics["jobs"]["statusCounts"];
}) {
  const visibleItems = items.filter((item) => item.count > 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Status</p>
        <Badge variant="outline">{total}</Badge>
      </div>
      {visibleItems.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
          No job statuses yet
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleItems.map((item) => {
            const percent = total === 0 ? 0 : (item.count / total) * 100;

            return (
              <div key={item.label} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate text-xs text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="font-medium">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/80"
                    style={{
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
