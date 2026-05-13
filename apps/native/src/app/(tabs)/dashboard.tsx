import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  ClipboardList,
  Server,
  Sparkles,
  UserRound,
} from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { ChartCard, DonutChart, MiniBarChart } from "@/components/charts";
import {
  EmptyState,
  LoadingState,
  ScreenHeader,
  ScreenScroll,
  StatCard,
  spacing,
} from "@/components/ui";
import { rpcClient } from "@/lib/api";
import { formatShortDate, jobStatusLabel } from "@/lib/labels";
import { useAppTheme } from "@/lib/theme";
import { dashboardAnalyticsQueryKey } from "@careeright/api/query-keys";
import type { DashboardAnalytics } from "@careeright/domain/dashboard/schema";

function statusCount(data: DashboardAnalytics, status: string) {
  return data.jobs.statusCounts.find((item) => item.status === status)?.count ?? 0;
}

function columnCount(data: DashboardAnalytics, columnId: string) {
  return (
    data.board.columnCounts.find((item) => item.id === columnId)?.count ?? 0
  );
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

export default function DashboardScreen() {
  const { colors } = useAppTheme();
  const analyticsQuery = useQuery({
    queryKey: dashboardAnalyticsQueryKey,
    queryFn: () => rpcClient.dashboard.analytics(),
  });
  const data = analyticsQuery.data;

  return (
    <ScreenScroll>
      <ScreenHeader
        title="Today"
        subtitle="A focused pulse across your board, jobs, diary, profile, and AI tooling."
      />

      {analyticsQuery.isPending ? (
        <LoadingState message="Loading workspace analytics" />
      ) : analyticsQuery.isError || !data ? (
        <EmptyState
          title="Analytics unavailable"
          message="Careeright could not load your workspace health right now."
        />
      ) : (
        <>
          <View style={styles.hero}>
            <Text selectable style={[styles.heroNumber, { color: colors.text }]}>
              {readySignalCount(data)}/5
            </Text>
            <View style={styles.heroCopy}>
              <Text selectable style={[styles.heroTitle, { color: colors.text }]}>
                workspace systems ready
              </Text>
              <Text selectable style={[styles.heroText, { color: colors.textMuted }]}>
                {data.storage.status === "unavailable"
                  ? "Storage is unavailable; live analytics are paused."
                  : "Useful signals are active across your career workflow."}
              </Text>
            </View>
          </View>

          <View style={styles.statGrid}>
            <StatCard
              icon={ClipboardList}
              label="Tasks"
              value={data.board.taskCount}
              detail={`${data.board.completionRate}% complete`}
            />
            <StatCard
              icon={Briefcase}
              label="Jobs"
              value={data.jobs.totalCount}
              detail={`${statusCount(data, "applied")} applied`}
              tone="accent"
            />
            <StatCard
              icon={Sparkles}
              label="Proposals"
              value={data.proposals.totalCount}
              detail={`${data.proposals.pendingCount} pending`}
              tone="violet"
            />
            <StatCard
              icon={UserRound}
              label="Profile"
              value={`${data.profile.readinessScore}%`}
              detail="readiness"
              tone="success"
            />
            <StatCard
              icon={BookOpen}
              label="Diary"
              value={data.diary.totalCount}
              detail={formatShortDate(data.diary.latestDiaryDate)}
            />
            <StatCard
              icon={Server}
              label="MCP"
              value={data.mcp.activeTokenCount}
              detail="active tokens"
              tone="violet"
            />
          </View>

          <ChartCard title="Workspace footprint" subtitle="Where your data lives">
            <MiniBarChart
              data={[
                { label: "Tasks", value: data.board.taskCount },
                { label: "Jobs", value: data.jobs.totalCount },
                { label: "Proposals", value: data.proposals.totalCount },
                { label: "Profile items", value: data.profile.itemCount },
                { label: "Diary days", value: data.diary.totalCount },
              ]}
            />
          </ChartCard>

          <ChartCard title="Job pipeline" subtitle="Current application statuses">
            <DonutChart
              data={data.jobs.statusCounts.map((item, index) => ({
                label: jobStatusLabel(item.status),
                value: item.count,
                color: [
                  colors.textMuted,
                  colors.primary,
                  colors.accent,
                  colors.danger,
                  colors.success,
                  colors.violet,
                ][index % 6],
              }))}
            />
          </ChartCard>

          <ChartCard title="Board flow" subtitle="Task movement by status">
            <MiniBarChart
              data={[
                { label: "Todo", value: columnCount(data, "todo") },
                { label: "In progress", value: data.board.inProgressCount },
                { label: "Review", value: data.board.reviewCount },
                { label: "Done", value: columnCount(data, "done") },
              ]}
            />
          </ChartCard>

          <View style={styles.footerNote}>
            <BarChart3 color={colors.primary} size={18} />
            <Text selectable style={[styles.footerText, { color: colors.textMuted }]}>
              Metrics refresh automatically and stay scoped to your signed-in
              Careeright account.
            </Text>
          </View>
        </>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  footerNote: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.two,
  },
  footerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  hero: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.four,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.one,
  },
  heroNumber: {
    fontSize: 48,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  heroText: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.three,
  },
});
