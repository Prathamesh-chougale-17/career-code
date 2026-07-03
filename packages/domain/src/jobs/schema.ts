import { z } from "zod";

export const jobStatusSchema = z.enum([
  "not_applied",
  "applied",
  "interviewing",
  "rejected",
  "offer",
  "expired",
]);

export const jobStatusOptions = jobStatusSchema.options;

const jobTextSchema = (max: number) => z.string().trim().max(max);
const jobTextListSchema = z.array(z.string().trim().min(1).max(120)).default([]);

const optionalUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) {
      return true;
    }

    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Only http and https links are allowed.");

export const jobFitBandSchema = z.enum([
  "excellent",
  "strong",
  "needs_review",
  "rejected",
]);

export const jobFitBandOptions = jobFitBandSchema.options;

export const jobWarmApplyStatusSchema = z.enum([
  "not_started",
  "finding_contact",
  "draft_ready",
  "connection_sent",
  "message_sent",
  "follow_up_due",
  "replied",
  "referred",
  "applied",
  "interviewing",
  "no_contact_found",
  "no_response",
  "not_a_fit",
  "rejected",
]);

export const jobWarmApplyStatusOptions = jobWarmApplyStatusSchema.options;

export const jobReferralRelationshipSchema = z.enum([
  "job_poster",
  "recruiter",
  "founder",
  "engineering",
  "hr",
  "employee",
  "manual",
]);

export const jobReferralRelationshipOptions =
  jobReferralRelationshipSchema.options;

export const jobReferralPrioritySchema = z.enum([
  "best_first",
  "backup",
  "low_confidence",
]);

export const jobReferralPriorityOptions = jobReferralPrioritySchema.options;

export const jobReferralOutreachStatusSchema = z.enum([
  "not_started",
  "draft_ready",
  "connection_sent",
  "message_sent",
  "follow_up_due",
  "replied",
  "referred",
  "no_response",
  "not_a_fit",
]);

export const jobReferralOutreachStatusOptions =
  jobReferralOutreachStatusSchema.options;

export const jobReferralContactSchema = z.object({
  id: z.string().trim().min(1),
  name: jobTextSchema(140).default(""),
  title: jobTextSchema(180).default(""),
  company: jobTextSchema(140).default(""),
  linkedinUrl: optionalUrlSchema.default(""),
  relationship: jobReferralRelationshipSchema.default("manual"),
  priority: jobReferralPrioritySchema.default("backup"),
  outreachStatus: jobReferralOutreachStatusSchema.default("not_started"),
  draftMessage: jobTextSchema(2000).default(""),
  lastContactedAt: jobTextSchema(80).default(""),
  followUpDueAt: jobTextSchema(80).default(""),
  notes: jobTextSchema(2000).default(""),
});

export const jobReferralContactInputSchema = jobReferralContactSchema
  .partial({
    id: true,
  })
  .refine(
    (value) =>
      Boolean(
        value.name?.trim() ||
          value.title?.trim() ||
          value.company?.trim() ||
          value.linkedinUrl?.trim() ||
          value.draftMessage?.trim() ||
          value.lastContactedAt?.trim() ||
          value.followUpDueAt?.trim() ||
          value.notes?.trim(),
      ),
    {
      message: "At least one contact field must be provided.",
    },
  );

export const jobSearchProfileInputSchema = z.object({
  targetRoles: jobTextListSchema,
  primarySkills: jobTextListSchema,
  secondarySkills: jobTextListSchema,
  locations: jobTextListSchema,
  experienceLevel: z.string().trim().min(1).max(180),
  companyPreferences: jobTextListSchema,
  excludedKeywords: jobTextListSchema,
  minimumFitScore: z.number().int().min(0).max(100).default(75),
  maxSeededPerRun: z.number().int().min(1).max(100).default(25),
});

export const updateJobSearchProfileInputSchema =
  jobSearchProfileInputSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    {
      message: "At least one job search profile field must be provided.",
    },
  );

export const jobSearchProfileSchema = jobSearchProfileInputSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const jobSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  applyUrl: optionalUrlSchema,
  source: z.string(),
  sourceJobId: z.string(),
  status: jobStatusSchema,
  postedAt: z.string(),
  salary: z.string(),
  description: z.string(),
  fitScore: z.number().finite().nullable(),
  fitBand: jobFitBandSchema.nullable().default(null),
  fitReasons: z.array(z.string()).default([]),
  matchedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  riskFlags: z.array(z.string()).default([]),
  scoreVersion: z.string().default(""),
  scoredAt: z.string().default(""),
  warmApplyStatus: jobWarmApplyStatusSchema.default("not_started"),
  warmApplyFollowUpDueAt: jobTextSchema(80).default(""),
  referralContacts: z.array(jobReferralContactSchema).default([]),
  raw: z.record(z.string(), z.unknown()),
  seededAt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});

export const seedJobInputSchema = z.object({
  title: z.string().trim().min(1).max(180),
  company: jobTextSchema(140).default(""),
  location: jobTextSchema(180).default(""),
  applyUrl: optionalUrlSchema.default(""),
  sourceJobId: jobTextSchema(180).default(""),
  status: jobStatusSchema.optional(),
  postedAt: jobTextSchema(120).default(""),
  salary: jobTextSchema(160).default(""),
  description: jobTextSchema(10000).default(""),
  fitScore: z.number().finite().nullable().optional(),
  fitBand: jobFitBandSchema.nullable().optional(),
  fitReasons: z.array(z.string().trim().min(1).max(220)).default([]),
  matchedSkills: z.array(z.string().trim().min(1).max(80)).default([]),
  missingSkills: z.array(z.string().trim().min(1).max(80)).default([]),
  riskFlags: z.array(z.string().trim().min(1).max(160)).default([]),
  scoreVersion: jobTextSchema(80).default(""),
  scoredAt: jobTextSchema(80).default(""),
  raw: z.record(z.string(), z.unknown()).default({}),
});

export const seedJobsInputSchema = z.object({
  source: z.string().trim().min(1).max(80),
  jobs: z.array(seedJobInputSchema).min(1),
});

export const updateJobStatusInputSchema = z.object({
  jobId: z.string().trim().min(1),
  status: jobStatusSchema,
});

export const updateJobWarmApplyInputSchema = z
  .object({
    jobId: z.string().trim().min(1),
    warmApplyStatus: jobWarmApplyStatusSchema.optional(),
    warmApplyFollowUpDueAt: jobTextSchema(80).optional(),
    referralContacts: z.array(jobReferralContactInputSchema).max(20).optional(),
  })
  .refine(
    (value) =>
      value.warmApplyStatus !== undefined ||
      value.warmApplyFollowUpDueAt !== undefined ||
      value.referralContacts !== undefined,
    {
      message: "At least one warm-apply field must be provided.",
    },
  );

export const deleteJobInputSchema = z.object({
  jobId: z.string().trim().min(1),
});

export const scoreJobCandidatesInputSchema = z.object({
  source: z.string().trim().min(1).max(80).default("external"),
  jobs: z.array(seedJobInputSchema).min(1).max(500),
});

export const seedRankedJobsInputSchema = scoreJobCandidatesInputSchema.extend({
  source: z.string().trim().min(1).max(80),
  runKey: z.string().trim().min(1).max(160).optional(),
  summary: z.string().trim().max(1000).default(""),
});

export const jobSearchBriefSchema = z.object({
  searchProfile: jobSearchProfileSchema,
  searchKeywords: z.array(z.string()),
  locationStrategy: z.array(z.string()),
  exclusionFingerprints: z.object({
    sourceJobIds: z.array(z.string()),
    applyUrls: z.array(z.string()),
    titleCompanyLocations: z.array(z.string()),
  }),
  latestSeededDateKey: z.string().nullable(),
  latestSeededJobFingerprints: z.array(z.string()),
  minimumFitScore: z.number().int(),
  maxSeededPerRun: z.number().int(),
});

export const jobDigestMatchSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string(),
  applyUrl: z.string(),
  jobUrl: z.string(),
  salary: z.string(),
  fitScore: z.number().finite().nullable(),
  fitBand: jobFitBandSchema.nullable(),
  fitReasons: z.array(z.string()),
  riskFlags: z.array(z.string()),
});

export const jobDigestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  runKey: z.string(),
  source: z.string(),
  status: z.enum(["completed", "failed"]),
  summary: z.string(),
  candidatesSeen: z.number().int().nonnegative(),
  scoredCount: z.number().int().nonnegative(),
  seededCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  rejectedCount: z.number().int().nonnegative(),
  minimumFitScore: z.number().int(),
  maxSeeded: z.number().int(),
  seededJobIds: z.array(z.string()),
  topMatches: z.array(jobDigestMatchSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const latestUnappliedJobBatchSchema = z.object({
  latestSeededDateKey: z.string().nullable(),
  jobs: z.array(jobSchema),
});

export const jobApplicationAttemptStatusSchema = z.enum([
  "queued",
  "filled_waiting_user",
  "needs_manual_review",
  "failed",
  "submitted_detected",
]);

export const jobApplicationAttemptSchema = z.object({
  jobId: z.string(),
  status: jobApplicationAttemptStatusSchema,
  advice: z.string().max(8000).default(""),
  skipReason: z.string().max(1000).default(""),
  error: z.string().max(1000).default(""),
  formUrl: optionalUrlSchema.default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().optional(),
});

export const jobApplicationRunSchema = z.object({
  id: z.string(),
  userId: z.string(),
  latestSeededDateKey: z.string().nullable(),
  selectedJobIds: z.array(z.string()),
  attempts: z.array(jobApplicationAttemptSchema),
  report: z.string().max(50000).default(""),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createJobApplicationRunInputSchema = z.object({
  report: z.string().max(50000).default(""),
});

export const updateJobApplicationAttemptInputSchema = z.object({
  runId: z.string().trim().min(1),
  jobId: z.string().trim().min(1),
  status: jobApplicationAttemptStatusSchema,
  advice: z.string().max(8000).optional(),
  skipReason: z.string().max(1000).optional(),
  error: z.string().max(1000).optional(),
  formUrl: optionalUrlSchema.optional(),
});

export const listJobApplicationRunsInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
});

export const jobListSchema = z.array(jobSchema);
export const jobDigestListSchema = z.array(jobDigestSchema);
export const jobApplicationRunListSchema = z.array(jobApplicationRunSchema);

export type JobStatus = z.infer<typeof jobStatusSchema>;
export type JobFitBand = z.infer<typeof jobFitBandSchema>;
export type JobWarmApplyStatus = z.infer<typeof jobWarmApplyStatusSchema>;
export type JobReferralRelationship = z.infer<
  typeof jobReferralRelationshipSchema
>;
export type JobReferralPriority = z.infer<typeof jobReferralPrioritySchema>;
export type JobReferralOutreachStatus = z.infer<
  typeof jobReferralOutreachStatusSchema
>;
export type JobReferralContact = z.infer<typeof jobReferralContactSchema>;
export type JobRecord = z.infer<typeof jobSchema>;
export type JobSearchProfile = z.infer<typeof jobSearchProfileSchema>;
export type JobSearchProfileInput = z.input<typeof jobSearchProfileInputSchema>;
export type UpdateJobSearchProfileInput = z.input<
  typeof updateJobSearchProfileInputSchema
>;
export type LatestUnappliedJobBatch = z.infer<typeof latestUnappliedJobBatchSchema>;
export type JobApplicationAttemptStatus = z.infer<
  typeof jobApplicationAttemptStatusSchema
>;
export type JobApplicationAttempt = z.infer<typeof jobApplicationAttemptSchema>;
export type JobApplicationRun = z.infer<typeof jobApplicationRunSchema>;
export type JobSearchBrief = z.infer<typeof jobSearchBriefSchema>;
export type JobDigest = z.infer<typeof jobDigestSchema>;
export type JobDigestMatch = z.infer<typeof jobDigestMatchSchema>;
export type SeedJobInput = z.input<typeof seedJobInputSchema>;
export type SeedJobsInput = z.input<typeof seedJobsInputSchema>;
export type ParsedSeedJob = z.output<typeof seedJobInputSchema>;
export type ScoreJobCandidatesInput = z.input<
  typeof scoreJobCandidatesInputSchema
>;
export type SeedRankedJobsInput = z.input<typeof seedRankedJobsInputSchema>;
export type UpdateJobStatusInput = z.input<typeof updateJobStatusInputSchema>;
export type UpdateJobWarmApplyInput = z.input<
  typeof updateJobWarmApplyInputSchema
>;
export type DeleteJobInput = z.input<typeof deleteJobInputSchema>;
export type CreateJobApplicationRunInput = z.input<
  typeof createJobApplicationRunInputSchema
>;
export type UpdateJobApplicationAttemptInput = z.input<
  typeof updateJobApplicationAttemptInputSchema
>;
export type ListJobApplicationRunsInput = z.input<
  typeof listJobApplicationRunsInputSchema
>;
