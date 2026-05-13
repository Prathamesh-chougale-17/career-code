import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Rect } from "react-native-svg";

import { Card, spacing } from "@/components/ui";
import { useAppTheme } from "@/lib/theme";

type ChartDatum = {
  label: string;
  value: number;
  color?: string;
};

export function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { colors } = useAppTheme();

  return (
    <Card>
      <View style={styles.header}>
        <Text selectable style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text selectable style={[styles.subtitle, { color: colors.textMuted }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {children}
    </Card>
  );
}

export function MiniBarChart({ data }: { data: ChartDatum[] }) {
  const { colors } = useAppTheme();
  const max = Math.max(1, ...data.map((item) => item.value));

  return (
    <View style={styles.barList}>
      {data.map((item, index) => {
        const width = `${Math.max(
          4,
          Math.round((item.value / max) * 100),
        )}%` as `${number}%`;
        const color =
          item.color ??
          [colors.primary, colors.accent, colors.violet, colors.success][
            index % 4
          ];

        return (
          <View key={item.label} style={styles.barRow}>
            <View style={styles.barLabelRow}>
              <Text selectable style={[styles.label, { color: colors.text }]}>
                {item.label}
              </Text>
              <Text selectable style={[styles.value, { color: colors.textMuted }]}>
                {item.value}
              </Text>
            </View>
            <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
              <View
                style={[
                  styles.bar,
                  {
                    backgroundColor: color,
                    width,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function DonutChart({ data }: { data: ChartDatum[] }) {
  const { colors } = useAppTheme();
  const total = Math.max(
    1,
    data.reduce((sum, item) => sum + item.value, 0),
  );
  const radius = 42;
  const strokeWidth = 13;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={styles.donutWrap}>
      <Svg width={112} height={112} viewBox="0 0 112 112">
        <Circle
          cx="56"
          cy="56"
          fill="none"
          r={radius}
          stroke={colors.surfaceMuted}
          strokeWidth={strokeWidth}
        />
        <G rotation="-90" origin="56,56">
          {data.map((item, index) => {
            const value = item.value / total;
            const dash = value * circumference;
            const circle = (
              <Circle
                key={item.label}
                cx="56"
                cy="56"
                fill="none"
                r={radius}
                stroke={
                  item.color ??
                  [colors.primary, colors.accent, colors.violet, colors.success][
                    index % 4
                  ]
                }
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                strokeWidth={strokeWidth}
              />
            );
            offset += dash;
            return circle;
          })}
        </G>
      </Svg>
      <View style={styles.legend}>
        {data.map((item, index) => (
          <View key={item.label} style={styles.legendRow}>
            <RectLabel
              color={
                item.color ??
                [colors.primary, colors.accent, colors.violet, colors.success][
                  index % 4
                ]
              }
            />
            <Text selectable style={[styles.label, { color: colors.text }]}>
              {item.label}
            </Text>
            <Text selectable style={[styles.value, { color: colors.textMuted }]}>
              {item.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function RectLabel({ color }: { color: string }) {
  return (
    <Svg width={12} height={12}>
      <Rect fill={color} height={12} rx={4} width={12} x={0} y={0} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderRadius: 999,
    height: "100%",
  },
  barLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.three,
    justifyContent: "space-between",
  },
  barList: {
    gap: spacing.three,
  },
  barRow: {
    gap: spacing.two,
  },
  donutWrap: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.four,
  },
  header: {
    gap: spacing.one,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  legend: {
    flex: 1,
    gap: spacing.two,
  },
  legendRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.two,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
  },
  track: {
    borderRadius: 999,
    height: 9,
    overflow: "hidden",
  },
  value: {
    fontSize: 13,
    fontVariant: ["tabular-nums"],
    fontWeight: "800",
  },
});
