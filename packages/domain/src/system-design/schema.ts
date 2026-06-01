import { z } from "zod";

const systemDesignTextSchema = (max: number) =>
  z.string().trim().min(1).max(max);

const systemDesignHttpUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Only http and https links are allowed.");

const systemDesignYoutubeUrlSchema = systemDesignHttpUrlSchema.refine(
  (value) => {
    try {
      const url = new URL(value);
      return (
        url.hostname === "www.youtube.com" || url.hostname === "youtube.com"
      );
    } catch {
      return false;
    }
  },
  "Only YouTube http and https links are allowed.",
);

export const systemDesignItemSourceSchema = z.enum(["lesson", "drill"]);

export const systemDesignItemSchema = z.object({
  id: systemDesignTextSchema(140),
  trackId: systemDesignTextSchema(80),
  moduleId: systemDesignTextSchema(100),
  sourceType: systemDesignItemSourceSchema,
  order: z.number().int().nonnegative(),
  lessonNumber: z.number().int().min(1).max(999).optional(),
  lessonLabel: systemDesignTextSchema(24),
  title: systemDesignTextSchema(220),
  description: z.string().trim().max(700).default(""),
  sourceName: systemDesignTextSchema(120).optional(),
  playlistTitle: systemDesignTextSchema(220).optional(),
  playlistUrl: systemDesignYoutubeUrlSchema.optional(),
  videoId: systemDesignTextSchema(40).optional(),
  videoUrl: systemDesignYoutubeUrlSchema.optional(),
});

export const systemDesignModuleSchema = z.object({
  id: systemDesignTextSchema(100),
  title: systemDesignTextSchema(140),
  description: z.string().trim().max(700).default(""),
  items: z.array(systemDesignItemSchema).min(1),
});

export const systemDesignModuleMetadataSchema = z.object({
  id: systemDesignTextSchema(100),
  title: systemDesignTextSchema(140),
  description: z.string().trim().max(700).default(""),
  order: z.number().int().nonnegative(),
});

export const systemDesignTrackSchema = z.object({
  id: systemDesignTextSchema(80),
  title: systemDesignTextSchema(120),
  description: z.string().trim().max(700).default(""),
  modules: z.array(systemDesignModuleSchema).min(1),
});

export const systemDesignTrackMetadataSchema = z.object({
  id: systemDesignTextSchema(80),
  title: systemDesignTextSchema(120),
  description: z.string().trim().max(700).default(""),
  order: z.number().int().nonnegative(),
  modules: z.array(systemDesignModuleMetadataSchema).min(1),
});

export const systemDesignCatalogSchema = z.object({
  tracks: z.array(systemDesignTrackSchema).min(1),
});

export const systemDesignProgressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const systemDesignVideoWatchEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  itemId: z.string(),
  watchedAt: z.string(),
  createdAt: z.string(),
});

export const systemDesignSummarySchema = z.object({
  totalItems: z.number().int().nonnegative(),
  completedItems: z.number().int().nonnegative(),
  completionPercentage: z.number().int().min(0).max(100),
  totalLessons: z.number().int().nonnegative(),
  totalDrills: z.number().int().nonnegative(),
  watchedVideos: z.number().int().nonnegative(),
});

export const systemDesignSnapshotSchema = z.object({
  catalog: systemDesignCatalogSchema,
  progress: z.array(systemDesignProgressSchema),
  videoWatches: z.array(systemDesignVideoWatchEventSchema).default([]),
  summary: systemDesignSummarySchema,
});

export const updateSystemDesignItemProgressInputSchema = z.object({
  itemId: z.string().trim().min(1),
  completed: z.boolean(),
});

export const recordSystemDesignVideoWatchInputSchema = z.object({
  itemId: z.string().trim().min(1),
});

export const systemDesignProgressUpdateResultSchema = z.object({
  progress: systemDesignProgressSchema,
  snapshot: systemDesignSnapshotSchema,
});

export type SystemDesignItemSource = z.infer<
  typeof systemDesignItemSourceSchema
>;
export type SystemDesignItem = z.infer<typeof systemDesignItemSchema>;
export type SystemDesignModule = z.infer<typeof systemDesignModuleSchema>;
export type SystemDesignModuleMetadata = z.infer<
  typeof systemDesignModuleMetadataSchema
>;
export type SystemDesignTrack = z.infer<typeof systemDesignTrackSchema>;
export type SystemDesignTrackMetadata = z.infer<
  typeof systemDesignTrackMetadataSchema
>;
export type SystemDesignCatalog = z.infer<typeof systemDesignCatalogSchema>;
export type SystemDesignProgress = z.infer<
  typeof systemDesignProgressSchema
>;
export type SystemDesignVideoWatchEvent = z.infer<
  typeof systemDesignVideoWatchEventSchema
>;
export type SystemDesignSnapshot = z.infer<
  typeof systemDesignSnapshotSchema
>;
export type UpdateSystemDesignItemProgressInput = z.input<
  typeof updateSystemDesignItemProgressInputSchema
>;
export type RecordSystemDesignVideoWatchInput = z.input<
  typeof recordSystemDesignVideoWatchInputSchema
>;
export type SystemDesignProgressUpdateResult = z.infer<
  typeof systemDesignProgressUpdateResultSchema
>;
