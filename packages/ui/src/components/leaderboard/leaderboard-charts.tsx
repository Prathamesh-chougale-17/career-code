"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
  type ActiveDotProps,
  type DotItemDotProps,
} from "recharts";

import type {
  LeaderboardMember,
  LeaderboardSnapshot,
} from "@careeright/domain/leaderboard/schema";
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

const chartColors = [
  "var(--primary)",
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

function displayName(member: LeaderboardMember) {
  if (member.isCurrentUser) {
    return "You";
  }

  return member.user.name ?? member.user.email ?? "Careeright user";
}

function pointValue(value: unknown) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

export function LeaderboardCharts({ data }: { data: LeaderboardSnapshot }) {
  return (
    <section className="grid min-w-0 gap-5 xl:grid-cols-2">
      <LeaderboardLineChart
        data={data}
        metric="dsaDone"
        title="DSA done"
        description="Solved DSA questions over the last 30 days."
        totalLabel="solved"
      />
      <LeaderboardLineChart
        data={data}
        metric="jobsApplied"
        title="Jobs applied"
        description="Applied job updates over the last 30 days."
        totalLabel="applied"
      />
    </section>
  );
}

function LeaderboardLineChart({
  data,
  description,
  metric,
  title,
  totalLabel,
}: {
  data: LeaderboardSnapshot;
  description: string;
  metric: "dsaDone" | "jobsApplied";
  title: string;
  totalLabel: string;
}) {
  const series = useMemo(
    () =>
      data.members.map((member, index) => ({
        key: `member${index}`,
        member,
        color: chartColors[index % chartColors.length],
      })),
    [data.members],
  );
  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        series.map((item) => [
          item.key,
          {
            label: displayName(item.member),
            color: item.color,
          },
        ]),
      ) as ChartConfig,
    [series],
  );
  const chartData = useMemo(() => {
    const dates = data.members[0]?.days.map((day) => day.date) ?? [];

    return dates.map((date) => {
      const row: Record<string, number | string> = { date };

      for (const item of series) {
        const day = item.member.days.find((entry) => entry.date === date);
        row[item.key] = day?.[metric] ?? 0;
      }

      return row;
    });
  }, [data.members, metric, series]);
  const total = data.members.reduce((count, member) => count + member[metric], 0);

  return (
    <Card size="sm" className="min-w-0 pt-0">
      <CardHeader className="border-b py-5">
        <div className="grid flex-1 gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <CardAction>
          <Badge variant="secondary">
            {total} {totalLabel}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
          initialDimension={{ width: 640, height: 300 }}
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={30}
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
                  indicator="line"
                />
              }
            />
            {series.map((item) => (
              <Line
                key={item.key}
                dataKey={item.key}
                type="monotone"
                stroke={`var(--color-${item.key})`}
                strokeWidth={item.member.isCurrentUser ? 3 : 2}
                dot={(dotProps: DotItemDotProps) => (
                  <LeaderboardChartDot
                    {...dotProps}
                    isCurrentUser={item.member.isCurrentUser}
                  />
                )}
                activeDot={(dotProps: ActiveDotProps) => (
                  <LeaderboardActiveDot
                    {...dotProps}
                    isCurrentUser={item.member.isCurrentUser}
                  />
                )}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function LeaderboardChartDot({
  cx,
  cy,
  isCurrentUser,
  stroke,
  value,
}: DotItemDotProps & { isCurrentUser: boolean }) {
  if (typeof cx !== "number" || typeof cy !== "number") {
    return null;
  }

  if (pointValue(value) <= 0) {
    return null;
  }

  const radius = isCurrentUser ? 4 : 3;

  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r={radius + 4} fill={stroke} opacity={0.13} />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={stroke}
        stroke="var(--background)"
        strokeWidth={2}
      />
      {isCurrentUser ? (
        <circle cx={cx} cy={cy} r={1.35} fill="var(--background)" />
      ) : null}
    </g>
  );
}

function LeaderboardActiveDot({
  cx,
  cy,
  isCurrentUser,
  stroke,
  value,
}: ActiveDotProps & { isCurrentUser: boolean }) {
  if (typeof cx !== "number" || typeof cy !== "number") {
    return null;
  }

  const radius = isCurrentUser ? 5 : 4;
  const hasActivity = pointValue(value) > 0;

  return (
    <g pointerEvents="none">
      <circle cx={cx} cy={cy} r={radius + 8} fill={stroke} opacity={0.1} />
      <circle cx={cx} cy={cy} r={radius + 4} fill={stroke} opacity={0.18} />
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={hasActivity ? stroke : "var(--background)"}
        stroke={stroke}
        strokeWidth={hasActivity ? 2 : 2.5}
      />
      {isCurrentUser ? (
        <circle
          cx={cx}
          cy={cy}
          r={1.75}
          fill={hasActivity ? "var(--background)" : stroke}
        />
      ) : null}
    </g>
  );
}
