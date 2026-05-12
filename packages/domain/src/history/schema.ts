import { z } from "zod";

export const historyDaySchema = z.object({
  date: z.string(),
  solvedQuestions: z.number().int().nonnegative(),
  watchedVideos: z.number().int().nonnegative(),
  appliedJobs: z.number().int().nonnegative(),
  interviewingJobs: z.number().int().nonnegative(),
  rejectedJobs: z.number().int().nonnegative(),
  offerJobs: z.number().int().nonnegative(),
});

export const historySummarySchema = z.object({
  solvedQuestions: z.number().int().nonnegative(),
  watchedVideos: z.number().int().nonnegative(),
  appliedJobs: z.number().int().nonnegative(),
  interviewingJobs: z.number().int().nonnegative(),
  rejectedJobs: z.number().int().nonnegative(),
  offerJobs: z.number().int().nonnegative(),
});

export const historySnapshotSchema = z.object({
  generatedAt: z.string(),
  range: z.object({
    startDate: z.string(),
    endDate: z.string(),
    days: z.number().int().positive(),
  }),
  days: z.array(historyDaySchema),
  summary: historySummarySchema,
});

export type HistoryDay = z.infer<typeof historyDaySchema>;
export type HistorySnapshot = z.infer<typeof historySnapshotSchema>;
