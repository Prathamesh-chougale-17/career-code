import { z } from "zod";

import {
  columnIdSchema,
  prioritySchema,
  proposalSourceSchema,
  proposalStatusSchema,
} from "@career-code/domain/kanban/schema";
import { jobStatusSchema } from "@career-code/domain/jobs/schema";

export const dashboardCountSchema = z.object({
  label: z.string(),
  count: z.number().int().nonnegative(),
});

export const dashboardBoardColumnCountSchema = dashboardCountSchema.extend({
  id: columnIdSchema,
  color: z.string(),
});

export const dashboardBoardPriorityCountSchema = dashboardCountSchema.extend({
  priority: prioritySchema,
});

export const dashboardRecentTaskSchema = z.object({
  id: z.string(),
  taskNumber: z.number().int().positive(),
  title: z.string(),
  columnId: columnIdSchema,
  priority: prioritySchema,
  updatedAt: z.string(),
});

export const dashboardBoardAnalyticsSchema = z.object({
  title: z.string(),
  taskCount: z.number().int().nonnegative(),
  completionRate: z.number().int().min(0).max(100),
  inProgressCount: z.number().int().nonnegative(),
  reviewCount: z.number().int().nonnegative(),
  columnCounts: z.array(dashboardBoardColumnCountSchema),
  priorityCounts: z.array(dashboardBoardPriorityCountSchema),
  recentTasks: z.array(dashboardRecentTaskSchema),
});

export const dashboardJobStatusCountSchema = dashboardCountSchema.extend({
  status: jobStatusSchema,
});

export const dashboardSourceCountSchema = dashboardCountSchema.extend({
  source: z.string(),
});

export const dashboardJobsAnalyticsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  latestSeededDate: z.string().nullable(),
  todaySeededCount: z.number().int().nonnegative(),
  averageFitScore: z.number().int().min(0).max(100).nullable(),
  statusCounts: z.array(dashboardJobStatusCountSchema),
  sourceCounts: z.array(dashboardSourceCountSchema),
});

export const dashboardProposalStatusCountSchema = dashboardCountSchema.extend({
  status: proposalStatusSchema,
});

export const dashboardProposalSourceCountSchema = dashboardCountSchema.extend({
  source: proposalSourceSchema,
});

export const dashboardProposalsAnalyticsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  pendingCount: z.number().int().nonnegative(),
  acceptedCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  generatedTaskCount: z.number().int().nonnegative(),
  statusCounts: z.array(dashboardProposalStatusCountSchema),
  sourceCounts: z.array(dashboardProposalSourceCountSchema),
});

export const dashboardProfileAnalyticsSchema = z.object({
  displayName: z.string(),
  headline: z.string(),
  location: z.string(),
  itemCount: z.number().int().nonnegative(),
  pendingImportCount: z.number().int().nonnegative(),
  completedImportCount: z.number().int().nonnegative(),
  readinessScore: z.number().int().min(0).max(100),
});

export const dashboardMcpAnalyticsSchema = z.object({
  totalTokenCount: z.number().int().nonnegative(),
  activeTokenCount: z.number().int().nonnegative(),
  revokedTokenCount: z.number().int().nonnegative(),
  latestTokenUsageAt: z.string().nullable(),
});

export const dashboardDiaryAnalyticsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  latestDiaryDate: z.string().nullable(),
  currentStreak: z.number().int().nonnegative(),
});

export const dashboardStorageAnalyticsSchema = z.object({
  status: z.enum(["ready", "unavailable"]),
  message: z.string().optional(),
});

export const dashboardAnalyticsSchema = z.object({
  generatedAt: z.string(),
  storage: dashboardStorageAnalyticsSchema,
  board: dashboardBoardAnalyticsSchema,
  jobs: dashboardJobsAnalyticsSchema,
  proposals: dashboardProposalsAnalyticsSchema,
  profile: dashboardProfileAnalyticsSchema,
  mcp: dashboardMcpAnalyticsSchema,
  diary: dashboardDiaryAnalyticsSchema,
});

export type DashboardAnalytics = z.infer<typeof dashboardAnalyticsSchema>;
export type DashboardCount = z.infer<typeof dashboardCountSchema>;
