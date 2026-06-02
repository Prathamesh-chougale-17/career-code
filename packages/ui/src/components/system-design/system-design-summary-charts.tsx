"use client";

import { Cell, Pie, PieChart } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";

const SYSTEM_DESIGN_RATIO_CHART_CONFIG = {
  done: {
    label: "Done",
    color: "var(--chart-3)",
  },
  remaining: {
    label: "Remaining",
    color: "var(--muted)",
  },
  watched: {
    label: "Watched",
    color: "var(--chart-1)",
  },
  pending: {
    label: "Pending",
    color: "var(--muted)",
  },
} satisfies ChartConfig;

type SystemDesignRatioChartKey = keyof typeof SYSTEM_DESIGN_RATIO_CHART_CONFIG;

export function SystemDesignSummaryCharts({
  completedItems,
  remainingItems,
  watchedVideos,
  pendingLessons,
}: {
  completedItems: number;
  remainingItems: number;
  watchedVideos: number;
  pendingLessons: number;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SystemDesignRatioDonut
        title="Roadmap completion"
        description="Done vs waiting"
        primaryKey="done"
        remainderKey="remaining"
        primaryValue={completedItems}
        remainderValue={remainingItems}
      />
      <SystemDesignRatioDonut
        title="Video coverage"
        description="Watched vs queued"
        primaryKey="watched"
        remainderKey="pending"
        primaryValue={watchedVideos}
        remainderValue={pendingLessons}
      />
    </div>
  );
}

function SystemDesignRatioDonut({
  title,
  description,
  primaryKey,
  remainderKey,
  primaryValue,
  remainderValue,
}: {
  title: string;
  description: string;
  primaryKey: SystemDesignRatioChartKey;
  remainderKey: SystemDesignRatioChartKey;
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
          config={SYSTEM_DESIGN_RATIO_CHART_CONFIG}
          className="mx-auto h-[165px] w-full max-w-[240px]"
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
                    const key = String(name) as SystemDesignRatioChartKey;
                    const label =
                      SYSTEM_DESIGN_RATIO_CHART_CONFIG[key]?.label ?? name;

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
              innerRadius={50}
              outerRadius={74}
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
