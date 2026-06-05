"use client";

import type { ReactNode } from "react";
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
    label: "Watched time",
    color: "var(--chart-1)",
  },
  pending: {
    label: "Remaining time",
    color: "var(--muted)",
  },
} satisfies ChartConfig;

type SystemDesignRatioChartKey = keyof typeof SYSTEM_DESIGN_RATIO_CHART_CONFIG;

export function SystemDesignSummaryCharts({
  completedItems,
  remainingItems,
  watchedVideoSeconds,
  remainingVideoSeconds,
}: {
  completedItems: number;
  remainingItems: number;
  watchedVideoSeconds: number;
  remainingVideoSeconds: number;
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
        title="Video time"
        description="Watched vs remaining"
        primaryKey="watched"
        remainderKey="pending"
        primaryValue={watchedVideoSeconds}
        remainderValue={remainingVideoSeconds}
        valueFormatter={formatVideoDuration}
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
  valueFormatter,
}: {
  title: string;
  description: string;
  primaryKey: SystemDesignRatioChartKey;
  remainderKey: SystemDesignRatioChartKey;
  primaryValue: number;
  remainderValue: number;
  valueFormatter?: (value: number) => string;
}) {
  const total = primaryValue + remainderValue;
  const percentage = percent(primaryValue, total);
  const formatValue = valueFormatter ?? formatNumber;
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
                          {formatValue(Number(value))}
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
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <SystemDesignDonutMetric
          label={
            SYSTEM_DESIGN_RATIO_CHART_CONFIG[primaryKey]?.label ?? primaryKey
          }
          value={formatValue(primaryValue)}
        />
        <SystemDesignDonutMetric
          label={
            SYSTEM_DESIGN_RATIO_CHART_CONFIG[remainderKey]?.label ??
            remainderKey
          }
          value={formatValue(remainderValue)}
        />
      </div>
    </div>
  );
}

function SystemDesignDonutMetric({
  label,
  value,
}: {
  label: ReactNode;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-background/60 px-2 py-1.5">
      <p className="truncate text-muted-foreground">{label}</p>
      <p className="truncate font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatVideoDuration(value: number) {
  if (value <= 0) {
    return "0m";
  }

  const totalMinutes = Math.max(1, Math.round(value / 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}
