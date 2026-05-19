import { z } from "zod";

import { friendUserSchema } from "@careeright/domain/friends/schema";

export const leaderboardActivityDaySchema = z.object({
  date: z.string(),
  dsaDone: z.number().int().nonnegative(),
  jobsApplied: z.number().int().nonnegative(),
});

export const leaderboardMemberSchema = z.object({
  userId: z.string(),
  user: friendUserSchema,
  isCurrentUser: z.boolean(),
  rank: z.number().int().positive(),
  dsaDone: z.number().int().nonnegative(),
  jobsApplied: z.number().int().nonnegative(),
  score: z.number().int().nonnegative(),
  days: z.array(leaderboardActivityDaySchema),
});

export const leaderboardSnapshotSchema = z.object({
  generatedAt: z.string(),
  range: z.object({
    startDate: z.string(),
    endDate: z.string(),
    days: z.number().int().positive(),
  }),
  members: z.array(leaderboardMemberSchema),
});

export type LeaderboardActivityDay = z.infer<
  typeof leaderboardActivityDaySchema
>;
export type LeaderboardMember = z.infer<typeof leaderboardMemberSchema>;
export type LeaderboardSnapshot = z.infer<typeof leaderboardSnapshotSchema>;
