import { z } from "zod";

const dsaTextSchema = (max: number) => z.string().trim().min(1).max(max);

const dsaHttpUrlSchema = z
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

const dsaYoutubeUrlSchema = dsaHttpUrlSchema.refine((value) => {
  try {
    const url = new URL(value);
    return url.hostname === "www.youtube.com" || url.hostname === "youtube.com";
  } catch {
    return false;
  }
}, "Only YouTube http and https links are allowed.");

const dsaLeetcodeUrlSchema = dsaHttpUrlSchema.refine((value) => {
  try {
    const url = new URL(value);
    return (
      url.hostname === "leetcode.com" || url.hostname === "www.leetcode.com"
    );
  } catch {
    return false;
  }
}, "Only LeetCode http and https links are allowed.");

export const dsaQuestionSourceSchema = z.enum(["lesson", "leetcode"]);
export const dsaDifficultySchema = z.enum(["EASY", "MEDIUM", "HARD"]);

export const dsaQuestionSchema = z.object({
  id: dsaTextSchema(120),
  trackId: dsaTextSchema(80),
  subtopicId: dsaTextSchema(80),
  sourceType: dsaQuestionSourceSchema.default("lesson"),
  order: z.number().int().nonnegative(),
  lessonNumber: z.number().int().min(1).max(999).optional(),
  lessonLabel: dsaTextSchema(24),
  title: dsaTextSchema(220),
  videoId: dsaTextSchema(40).optional(),
  videoUrl: dsaYoutubeUrlSchema.optional(),
  durationSeconds: z.number().int().positive().optional(),
  leetcodeSlug: dsaTextSchema(160).optional(),
  leetcodeUrl: dsaLeetcodeUrlSchema.optional(),
  difficulty: dsaDifficultySchema.optional(),
  affiliatedLessonId: dsaTextSchema(120).optional(),
  affiliatedLessonLabel: dsaTextSchema(24).optional(),
});

export const dsaSubtopicSchema = z.object({
  id: dsaTextSchema(80),
  title: dsaTextSchema(120),
  description: z.string().trim().max(500).default(""),
  questions: z.array(dsaQuestionSchema).min(1),
});

export const dsaSubtopicMetadataSchema = z.object({
  id: dsaTextSchema(80),
  title: dsaTextSchema(120),
  description: z.string().trim().max(500).default(""),
  order: z.number().int().nonnegative(),
});

export const dsaTrackSchema = z.object({
  id: dsaTextSchema(80),
  title: dsaTextSchema(120),
  sourceName: dsaTextSchema(120),
  playlistTitle: dsaTextSchema(220),
  playlistUrl: dsaYoutubeUrlSchema,
  subtopics: z.array(dsaSubtopicSchema).min(1),
});

export const dsaTrackMetadataSchema = z.object({
  id: dsaTextSchema(80),
  title: dsaTextSchema(120),
  sourceName: dsaTextSchema(120),
  playlistTitle: dsaTextSchema(220),
  playlistUrl: dsaYoutubeUrlSchema,
  order: z.number().int().nonnegative(),
  subtopics: z.array(dsaSubtopicMetadataSchema).min(1),
});

export const dsaCatalogSchema = z.object({
  tracks: z.array(dsaTrackSchema).min(1),
});

export const dsaQuestionProgressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  questionId: z.string(),
  completed: z.boolean(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const dsaVideoWatchEventSchema = z.object({
  id: z.string(),
  userId: z.string(),
  questionId: z.string(),
  watchedAt: z.string(),
  createdAt: z.string(),
});

export const dsaSummarySchema = z.object({
  totalQuestions: z.number().int().nonnegative(),
  completedQuestions: z.number().int().nonnegative(),
  completionPercentage: z.number().int().min(0).max(100),
});

export const dsaSnapshotSchema = z.object({
  catalog: dsaCatalogSchema,
  progress: z.array(dsaQuestionProgressSchema),
  videoWatches: z.array(dsaVideoWatchEventSchema).default([]),
  summary: dsaSummarySchema,
});

export const updateDsaQuestionProgressInputSchema = z.object({
  questionId: z.string().trim().min(1),
  completed: z.boolean(),
});

export const recordDsaVideoWatchInputSchema = z.object({
  questionId: z.string().trim().min(1),
});

export const dsaProgressUpdateResultSchema = z.object({
  progress: dsaQuestionProgressSchema,
  snapshot: dsaSnapshotSchema,
});

export type DsaQuestion = z.infer<typeof dsaQuestionSchema>;
export type DsaQuestionSource = z.infer<typeof dsaQuestionSourceSchema>;
export type DsaDifficulty = z.infer<typeof dsaDifficultySchema>;
export type DsaSubtopic = z.infer<typeof dsaSubtopicSchema>;
export type DsaSubtopicMetadata = z.infer<typeof dsaSubtopicMetadataSchema>;
export type DsaTrack = z.infer<typeof dsaTrackSchema>;
export type DsaTrackMetadata = z.infer<typeof dsaTrackMetadataSchema>;
export type DsaCatalog = z.infer<typeof dsaCatalogSchema>;
export type DsaQuestionProgress = z.infer<typeof dsaQuestionProgressSchema>;
export type DsaVideoWatchEvent = z.infer<typeof dsaVideoWatchEventSchema>;
export type DsaSnapshot = z.infer<typeof dsaSnapshotSchema>;
export type UpdateDsaQuestionProgressInput = z.input<
  typeof updateDsaQuestionProgressInputSchema
>;
export type RecordDsaVideoWatchInput = z.input<
  typeof recordDsaVideoWatchInputSchema
>;
export type DsaProgressUpdateResult = z.infer<
  typeof dsaProgressUpdateResultSchema
>;
