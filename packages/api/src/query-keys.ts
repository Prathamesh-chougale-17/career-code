export const boardSnapshotQueryKey = ["board-snapshot"] as const;
export const dashboardAnalyticsQueryKey = ["dashboard-analytics"] as const;
export const dashboardMetricsQueryKey = ["dashboard-metrics"] as const;
export const diaryRecentQueryKey = ["diary-recent"] as const;
export const diaryDayQueryKey = (dateKey: string) =>
  ["diary-day", dateKey] as const;
export const dsaSnapshotQueryKey = ["dsa-snapshot"] as const;
export const historySnapshotQueryKey = ["history-snapshot"] as const;
export const jobDigestsQueryKey = ["job-digests"] as const;
export const jobApplicationRunsQueryKey = ["job-application-runs"] as const;
export const jobSearchProfileQueryKey = ["job-search-profile"] as const;
export const jobsQueryKey = ["jobs"] as const;
export const mcpTokensQueryKey = ["mcp-tokens"] as const;
export const profileImportsQueryKey = ["profile-imports"] as const;
export const profileSnapshotQueryKey = ["profile-snapshot"] as const;
export const proposalHistoryQueryKey = ["proposal-history"] as const;
