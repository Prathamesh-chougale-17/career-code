import { z } from "zod";

export const profileItemTypeSchema = z.enum([
  "experience",
  "education",
  "project",
  "skill",
  "certification",
  "achievement",
]);

export const profileImportStatusSchema = z.enum([
  "pending",
  "applied",
  "rejected",
]);

export const profileImportSourceSchema = z.enum(["mcp", "pdf"]);

const profileTextSchema = (max: number) => z.string().trim().max(max);

const optionalUrlSchema = z
  .string()
  .trim()
  .max(300)
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

const optionalEmailSchema = z
  .string()
  .trim()
  .max(160)
  .refine((value) => !value || z.email().safeParse(value).success, {
    message: "Enter a valid email address.",
  });

export const profileBasicsInputSchema = z.object({
  displayName: profileTextSchema(120).default(""),
  headline: profileTextSchema(180).default(""),
  location: profileTextSchema(120).default(""),
  email: optionalEmailSchema.default(""),
  website: optionalUrlSchema.default(""),
  summary: profileTextSchema(2000).default(""),
});

export const profileApplicationDefaultsSchema = z.object({
  phone: profileTextSchema(40).default(""),
  gender: profileTextSchema(40).default(""),
  defaultSource: profileTextSchema(80).default(""),
  joiningAvailabilityDays: z.number().int().min(0).max(365).nullable().default(null),
  linkedinUrl: optionalUrlSchema.default(""),
  resumeLocalPath: profileTextSchema(500).default(""),
  college: profileTextSchema(180).default(""),
  branch: profileTextSchema(120).default(""),
  graduationYear: profileTextSchema(20).default(""),
  graduationPercentage: profileTextSchema(40).default(""),
  xiiBoard: profileTextSchema(120).default(""),
  xiiPercentage: profileTextSchema(40).default(""),
  xBoard: profileTextSchema(120).default(""),
  xPercentage: profileTextSchema(40).default(""),
});

export const updateProfileApplicationDefaultsInputSchema =
  profileApplicationDefaultsSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    {
      message: "At least one application default field must be provided.",
    },
  );

export const profileBasicsDraftSchema = z.object({
  displayName: profileTextSchema(120).optional(),
  headline: profileTextSchema(180).optional(),
  location: profileTextSchema(120).optional(),
  email: optionalEmailSchema.optional(),
  website: optionalUrlSchema.optional(),
  summary: profileTextSchema(2000).optional(),
});

const profileApplicationDefaultsFieldSchema = z
  .unknown()
  .optional()
  .transform((value) => profileApplicationDefaultsSchema.parse(value ?? {}));

export const profileSchema = profileBasicsInputSchema.extend({
  applicationDefaults: profileApplicationDefaultsFieldSchema,
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const profileTagListSchema = z
  .array(z.string().trim().min(1).max(40))
  .max(20)
  .default([]);

export const createProfileItemInputSchema = z.object({
  type: profileItemTypeSchema.default("experience"),
  title: z.string().trim().min(1).max(140),
  organization: profileTextSchema(140).default(""),
  location: profileTextSchema(120).default(""),
  startDate: profileTextSchema(80).default(""),
  endDate: profileTextSchema(80).default(""),
  description: profileTextSchema(3000).default(""),
  url: optionalUrlSchema.default(""),
  tags: profileTagListSchema,
});

export const profileItemPatchSchema = z
  .object({
    type: profileItemTypeSchema.optional(),
    title: z.string().trim().min(1).max(140).optional(),
    organization: profileTextSchema(140).optional(),
    location: profileTextSchema(120).optional(),
    startDate: profileTextSchema(80).optional(),
    endDate: profileTextSchema(80).optional(),
    description: profileTextSchema(3000).optional(),
    url: optionalUrlSchema.optional(),
    tags: profileTagListSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const updateProfileItemInputSchema = z.object({
  itemId: z.string().trim().min(1),
  patch: profileItemPatchSchema,
});

export const deleteProfileItemInputSchema = z.object({
  itemId: z.string().trim().min(1),
});

export const profileItemSchema = createProfileItemInputSchema.extend({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createProfileImportInputSchema = z.object({
  profileBasics: profileBasicsDraftSchema.default({}),
  items: z.array(createProfileItemInputSchema).min(1).max(100),
  summary: profileTextSchema(1000).default(""),
});

export const profileImportSchema = createProfileImportInputSchema.extend({
  id: z.string(),
  userId: z.string(),
  source: profileImportSourceSchema,
  status: profileImportStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  appliedAt: z.string().optional(),
  rejectedAt: z.string().optional(),
});

export const profileImportActionInputSchema = z.object({
  importId: z.string().trim().min(1),
});

export const profileImportApplyResultSchema = z.object({
  import: profileImportSchema,
  addedItemCount: z.number().int().nonnegative(),
  skippedItemCount: z.number().int().nonnegative(),
  updatedBasicFields: z.array(
    z.enum(["displayName", "headline", "location", "email", "website", "summary"]),
  ),
});

export const profileSnapshotSchema = z.object({
  profile: profileSchema,
  items: z.array(profileItemSchema),
});

export const profileImportListSchema = z.array(profileImportSchema);

export type ProfileItemType = z.infer<typeof profileItemTypeSchema>;
export type ProfileImportStatus = z.infer<typeof profileImportStatusSchema>;
export type ProfileImportSource = z.infer<typeof profileImportSourceSchema>;
export type UserProfile = z.infer<typeof profileSchema>;
export type ProfileItem = z.infer<typeof profileItemSchema>;
export type ProfileImport = z.infer<typeof profileImportSchema>;
export type ProfileSnapshot = z.infer<typeof profileSnapshotSchema>;
export type ProfileApplicationDefaults = z.infer<
  typeof profileApplicationDefaultsSchema
>;
export type ProfileBasicsInput = z.input<typeof profileBasicsInputSchema>;
export type UpdateProfileApplicationDefaultsInput = z.input<
  typeof updateProfileApplicationDefaultsInputSchema
>;
export type ProfileBasicsDraft = z.input<typeof profileBasicsDraftSchema>;
export type CreateProfileItemInput = z.input<
  typeof createProfileItemInputSchema
>;
export type UpdateProfileItemInput = z.input<
  typeof updateProfileItemInputSchema
>;
export type CreateProfileImportInput = z.input<
  typeof createProfileImportInputSchema
>;
