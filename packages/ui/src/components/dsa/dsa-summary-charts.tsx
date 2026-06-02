"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";

const DSA_RATIO_CHART_CONFIG = {
  done: {
    label: "Done",
    color: "var(--chart-1)",
  },
  remaining: {
    label: "Remaining",
    color: "var(--muted)",
  },
  watched: {
    label: "Watched",
    color: "var(--chart-2)",
  },
  pending: {
    label: "Pending",
    color: "var(--muted)",
  },
  practice: {
    label: "Practice done",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

type DsaRatioChartKey = keyof typeof DSA_RATIO_CHART_CONFIG;

export function DsaSummaryCharts({
  completedPracticeQuestions,
  completedQuestions,
  pendingLessons,
  pendingPracticeQuestions,
  remainingQuestions,
  watchedVideos,
}: {
  completedPracticeQuestions: number;
  completedQuestions: number;
  pendingLessons: number;
  pendingPracticeQuestions: number;
  remainingQuestions: number;
  watchedVideos: number;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DsaRatioDonut
        title="Roadmap completion"
        description="Solved vs waiting"
        primaryKey="done"
        remainderKey="remaining"
        primaryValue={completedQuestions}
        remainderValue={remainingQuestions}
      />
      <DsaRatioDonut
        title="Video coverage"
        description="Watched vs queued"
        primaryKey="watched"
        remainderKey="pending"
        primaryValue={watchedVideos}
        remainderValue={pendingLessons}
      />
      <DsaRatioDonut
        title="Practice completion"
        description="LeetCode solved vs waiting"
        primaryKey="practice"
        remainderKey="remaining"
        primaryValue={completedPracticeQuestions}
        remainderValue={pendingPracticeQuestions}
      />
    </div>
  );
}

function DsaRatioDonut({
  title,
  description,
  primaryKey,
  remainderKey,
  primaryValue,
  remainderValue,
}: {
  title: string;
  description: string;
  primaryKey: DsaRatioChartKey;
  remainderKey: DsaRatioChartKey;
  primaryValue: number;
  remainderValue: number;
}) {
  const total = primaryValue + remainderValue;
  const percentage = percent(primaryValue, total);
  const chartData = [
    {
      key: primaryKey,
      value: primaryValue,
      fill: `var(--color-${primaryKey})`,
    },
    {
      key: remainderKey,
      value: remainderValue,
      fill: `var(--color-${remainderKey})`,
    },
  ];

  return (
    <div className="min-w-0">
      <div className="mb-2">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="relative">
        <ChartContainer
          config={DSA_RATIO_CHART_CONFIG}
          className="mx-auto h-[150px] w-full max-w-[220px]"
        >
          <PieChart accessibilityLayer>
            <ChartTooltip
              cursor={false}
              position={{ x: 8, y: 8 }}
              content={
                <ChartTooltipContent
                  hideLabel
                  nameKey="key"
                  formatter={(value, name) => {
                    const key = String(name) as DsaRatioChartKey;
                    const label = DSA_RATIO_CHART_CONFIG[key]?.label ?? name;

                    return (
                      <div className="flex min-w-28 items-center justify-between gap-3">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium text-foreground">
                          {Number(value).toLocaleString()}
                        </span>
                      </div>
                    );
                  }}
                />
              }
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="key"
              innerRadius={46}
              outerRadius={68}
              paddingAngle={2}
              strokeWidth={0}
            >
              {chartData.map((entry) => (
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-heading text-2xl font-semibold text-foreground">
            {percentage}%
          </span>
          <span className="text-xs text-muted-foreground">complete</span>
        </div>
      </div>
    </div>
  );
}

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}
