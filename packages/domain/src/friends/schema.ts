import { z } from "zod";

import { jobFitBandSchema, jobStatusSchema } from "@careeright/domain/jobs/schema";

const dateKeySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");
const exactEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const friendConnectionStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
  "removed",
]);

export const friendRelationshipStateSchema = z.enum([
  "none",
  "incoming_pending",
  "outgoing_pending",
  "accepted",
]);

export const friendUserSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
});

export const friendConnectionSchema = z.object({
  id: z.string(),
  requesterId: z.string(),
  recipientId: z.string(),
  pairKey: z.string(),
  status: friendConnectionStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  respondedAt: z.string().optional(),
  removedAt: z.string().optional(),
});

export const friendConnectionViewSchema = friendConnectionSchema.extend({
  otherUser: friendUserSchema,
});

export const friendUserSearchResultSchema = friendUserSchema.extend({
  relationship: friendRelationshipStateSchema,
  connection: friendConnectionSchema.nullable(),
});

export const jobShareScopeSchema = z.enum(["date", "latest", "all"]);

export const sharedJobSnapshotSchema = z.object({
  ownerJobId: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  applyUrl: z.string(),
  source: z.string(),
  sourceJobId: z.string(),
  status: jobStatusSchema,
  postedAt: z.string(),
  salary: z.string(),
  description: z.string(),
  fitScore: z.number().finite().nullable(),
  fitBand: jobFitBandSchema.nullable(),
  fitReasons: z.array(z.string()),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  riskFlags: z.array(z.string()),
  scoreVersion: z.string(),
  scoredAt: z.string(),
  seededAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const jobShareSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  recipientId: z.string(),
  connectionId: z.string(),
  scope: jobShareScopeSchema,
  dateKey: dateKeySchema.nullable(),
  note: z.string(),
  jobCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
  revokedAt: z.string().optional(),
});

export const jobShareItemSchema = z.object({
  id: z.string(),
  shareId: z.string(),
  ownerId: z.string(),
  recipientId: z.string(),
  ownerJobId: z.string(),
  snapshot: sharedJobSnapshotSchema,
  createdAt: z.string(),
});

export const jobShareSummarySchema = jobShareSchema.extend({
  otherUser: friendUserSchema,
});

export const jobShareDetailSchema = jobShareSchema.extend({
  owner: friendUserSchema,
  recipient: friendUserSchema,
  items: z.array(jobShareItemSchema),
});

export const friendJobDateOptionSchema = z.object({
  dateKey: dateKeySchema,
  count: z.number().int().nonnegative(),
});

export const friendsSummarySchema = z.object({
  friends: z.array(friendConnectionViewSchema),
  incomingRequests: z.array(friendConnectionViewSchema),
  outgoingRequests: z.array(friendConnectionViewSchema),
  receivedShares: z.array(jobShareSummarySchema),
  sentShares: z.array(jobShareSummarySchema),
  jobDateOptions: z.array(friendJobDateOptionSchema),
  latestDateKey: dateKeySchema.nullable(),
  totalShareableJobs: z.number().int().nonnegative(),
});

export const searchFriendUsersInputSchema = z.object({
  query: z
    .string()
    .trim()
    .min(3)
    .max(320)
    .refine((value) => exactEmailPattern.test(value), {
      message: "Enter an exact email address.",
    })
    .transform((value) => value.toLowerCase()),
});

export const sendFriendRequestInputSchema = z.object({
  recipientId: z.string().trim().min(1),
});

export const respondFriendRequestInputSchema = z.object({
  connectionId: z.string().trim().min(1),
  action: z.enum(["accept", "reject"]),
});

export const cancelFriendRequestInputSchema = z.object({
  connectionId: z.string().trim().min(1),
});

export const removeFriendInputSchema = z.object({
  connectionId: z.string().trim().min(1),
});

export const createJobShareInputSchema = z
  .object({
    recipientId: z.string().trim().min(1),
    scope: jobShareScopeSchema,
    dateKey: dateKeySchema.optional(),
    note: z.string().trim().max(500).default(""),
  })
  .refine((value) => value.scope !== "date" || Boolean(value.dateKey), {
    message: "A date is required when sharing jobs by date.",
    path: ["dateKey"],
  });

export const listJobSharesInputSchema = z.object({
  direction: z.enum(["received", "sent"]).default("received"),
});

export const getJobShareInputSchema = z.object({
  shareId: z.string().trim().min(1),
});

export const revokeJobShareInputSchema = z.object({
  shareId: z.string().trim().min(1),
});

export const copySharedJobsInputSchema = z.object({
  shareId: z.string().trim().min(1),
  itemIds: z.array(z.string().trim().min(1)).max(500).optional(),
});

export const friendUserSearchResultListSchema = z.array(
  friendUserSearchResultSchema,
);
export const jobShareSummaryListSchema = z.array(jobShareSummarySchema);

export type FriendConnectionStatus = z.infer<
  typeof friendConnectionStatusSchema
>;
export type FriendRelationshipState = z.infer<
  typeof friendRelationshipStateSchema
>;
export type FriendUser = z.infer<typeof friendUserSchema>;
export type FriendConnection = z.infer<typeof friendConnectionSchema>;
export type FriendConnectionView = z.infer<typeof friendConnectionViewSchema>;
export type FriendUserSearchResult = z.infer<
  typeof friendUserSearchResultSchema
>;
export type JobShareScope = z.infer<typeof jobShareScopeSchema>;
export type SharedJobSnapshot = z.infer<typeof sharedJobSnapshotSchema>;
export type JobShare = z.infer<typeof jobShareSchema>;
export type JobShareItem = z.infer<typeof jobShareItemSchema>;
export type JobShareSummary = z.infer<typeof jobShareSummarySchema>;
export type JobShareDetail = z.infer<typeof jobShareDetailSchema>;
export type FriendJobDateOption = z.infer<typeof friendJobDateOptionSchema>;
export type FriendsSummary = z.infer<typeof friendsSummarySchema>;
export type SearchFriendUsersInput = z.input<
  typeof searchFriendUsersInputSchema
>;
export type SendFriendRequestInput = z.input<
  typeof sendFriendRequestInputSchema
>;
export type RespondFriendRequestInput = z.input<
  typeof respondFriendRequestInputSchema
>;
export type CancelFriendRequestInput = z.input<
  typeof cancelFriendRequestInputSchema
>;
export type RemoveFriendInput = z.input<typeof removeFriendInputSchema>;
export type CreateJobShareInput = z.input<typeof createJobShareInputSchema>;
export type ListJobSharesInput = z.input<typeof listJobSharesInputSchema>;
export type GetJobShareInput = z.input<typeof getJobShareInputSchema>;
export type RevokeJobShareInput = z.input<typeof revokeJobShareInputSchema>;
export type CopySharedJobsInput = z.input<typeof copySharedJobsInputSchema>;
