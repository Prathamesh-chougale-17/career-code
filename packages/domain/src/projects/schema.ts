import { z } from "zod";

const optionalTimestampSchema = z
  .preprocess(
    (value) => (value === null ? undefined : value),
    z.string().optional(),
  )
  .optional();

const optionalStringSchema = z
  .preprocess(
    (value) => (value === null ? undefined : value),
    z.string().optional(),
  )
  .optional();

const projectTextSchema = (max: number) => z.string().trim().max(max);

const httpUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Only http and https links are allowed.");

export const projectStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "archived",
]);

export const projectResourceTypeSchema = z.enum([
  "repository",
  "demo",
  "documentation",
  "article",
  "video",
  "design",
  "link",
  "other",
]);

export const projectAttributeTypeSchema = z.enum([
  "technology",
  "concept",
  "date",
  "person",
  "link",
  "other",
]);

export const projectTechStackSchema = z
  .array(z.string().trim().min(1).max(50))
  .max(30)
  .default([]);

export const projectAttributeAliasListSchema = z
  .array(z.string().trim().min(1).max(80))
  .max(20)
  .default([]);

export const projectAttributeResourceIdsSchema = z
  .array(z.string().trim().min(1))
  .max(50)
  .default([]);

export const projectResourceInputSchema = z.object({
  title: z.string().trim().min(1).max(140),
  url: httpUrlSchema,
  type: projectResourceTypeSchema.default("link"),
  note: projectTextSchema(1000).default(""),
});

export const projectResourcePatchSchema = z
  .object({
    title: z.string().trim().min(1).max(140).optional(),
    url: httpUrlSchema.optional(),
    type: projectResourceTypeSchema.optional(),
    note: projectTextSchema(1000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one resource field must be provided.",
  });

export const projectAttributeInputSchema = z.object({
  label: z.string().trim().min(1).max(80),
  aliases: projectAttributeAliasListSchema,
  type: projectAttributeTypeSchema.default("concept"),
  dateValue: projectTextSchema(80).default(""),
  description: projectTextSchema(2000).default(""),
  resourceIds: projectAttributeResourceIdsSchema,
});

export const projectAttributePatchSchema = z
  .object({
    label: z.string().trim().min(1).max(80).optional(),
    aliases: projectAttributeAliasListSchema.optional(),
    type: projectAttributeTypeSchema.optional(),
    dateValue: projectTextSchema(80).optional(),
    description: projectTextSchema(2000).optional(),
    resourceIds: projectAttributeResourceIdsSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one attribute field must be provided.",
  });

export const projectResourceSchema = projectResourceInputSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectAttributeSchema = projectAttributeInputSchema.extend({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const createProjectInputSchema = z.object({
  title: z.string().trim().min(1).max(140),
  summary: projectTextSchema(3000).default(""),
  techStack: projectTechStackSchema,
  status: projectStatusSchema.default("active"),
  dateText: projectTextSchema(160).default(""),
});

export const projectPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(140).optional(),
    summary: projectTextSchema(3000).optional(),
    techStack: projectTechStackSchema.optional(),
    status: projectStatusSchema.optional(),
    dateText: projectTextSchema(160).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one project field must be provided.",
  });

export const projectSchema = createProjectInputSchema.extend({
  id: z.string(),
  userId: z.string(),
  sourceProfileItemId: optionalStringSchema,
  sourceProfileUpdatedAt: optionalStringSchema,
  resources: z.array(projectResourceSchema).default([]),
  attributes: z.array(projectAttributeSchema).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
  archivedAt: optionalTimestampSchema,
  deletedAt: optionalTimestampSchema,
});

export const createProjectNoteInputSchema = z.object({
  projectId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(140),
  content: z.string().max(100_000).default(""),
});

export const projectNotePatchSchema = z
  .object({
    title: z.string().trim().min(1).max(140).optional(),
    content: z.string().max(100_000).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one note field must be provided.",
  });

export const projectNoteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  projectId: z.string(),
  title: z.string(),
  content: z.string(),
  order: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const projectDetailSchema = z.object({
  project: projectSchema,
  notes: z.array(projectNoteSchema),
});

export const projectsSummarySchema = z.object({
  totalProjects: z.number().int().nonnegative(),
  activeProjects: z.number().int().nonnegative(),
  archivedProjects: z.number().int().nonnegative(),
  linkedProfileProjects: z.number().int().nonnegative(),
  unlinkedProfileProjects: z.number().int().nonnegative(),
  resourceCount: z.number().int().nonnegative(),
  attributeCount: z.number().int().nonnegative(),
  noteCount: z.number().int().nonnegative(),
  updatedAt: z.string().nullable(),
});

export const projectImportResultSchema = z.object({
  created: z.array(projectSchema),
  skipped: z.number().int().nonnegative(),
});

export const projectIdInputSchema = z.object({
  projectId: z.string().trim().min(1),
});

export const updateProjectInputSchema = z.object({
  projectId: z.string().trim().min(1),
  patch: projectPatchSchema,
});

export const syncFromProfileProjectInputSchema = z.object({
  projectId: z.string().trim().min(1),
});

export const updateProjectNoteInputSchema = z.object({
  noteId: z.string().trim().min(1),
  patch: projectNotePatchSchema,
});

export const deleteProjectNoteInputSchema = z.object({
  noteId: z.string().trim().min(1),
});

export const reorderProjectNotesInputSchema = z.object({
  projectId: z.string().trim().min(1),
  noteIds: z.array(z.string().trim().min(1)).max(200),
});

export const createProjectResourceInputSchema = projectResourceInputSchema.extend({
  projectId: z.string().trim().min(1),
});

export const updateProjectResourceInputSchema = z.object({
  projectId: z.string().trim().min(1),
  resourceId: z.string().trim().min(1),
  patch: projectResourcePatchSchema,
});

export const deleteProjectResourceInputSchema = z.object({
  projectId: z.string().trim().min(1),
  resourceId: z.string().trim().min(1),
});

export const createProjectAttributeInputSchema =
  projectAttributeInputSchema.extend({
    projectId: z.string().trim().min(1),
  });

export const updateProjectAttributeInputSchema = z.object({
  projectId: z.string().trim().min(1),
  attributeId: z.string().trim().min(1),
  patch: projectAttributePatchSchema,
});

export const deleteProjectAttributeInputSchema = z.object({
  projectId: z.string().trim().min(1),
  attributeId: z.string().trim().min(1),
});

export const projectListSchema = z.array(projectSchema);
export const projectNoteListSchema = z.array(projectNoteSchema);

export type ProjectStatus = z.infer<typeof projectStatusSchema>;
export type ProjectResourceType = z.infer<typeof projectResourceTypeSchema>;
export type ProjectAttributeType = z.infer<typeof projectAttributeTypeSchema>;
export type ProjectResource = z.infer<typeof projectResourceSchema>;
export type ProjectAttribute = z.infer<typeof projectAttributeSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectNote = z.infer<typeof projectNoteSchema>;
export type ProjectDetail = z.infer<typeof projectDetailSchema>;
export type ProjectsSummary = z.infer<typeof projectsSummarySchema>;
export type ProjectImportResult = z.infer<typeof projectImportResultSchema>;
export type CreateProjectInput = z.input<typeof createProjectInputSchema>;
export type UpdateProjectInput = z.input<typeof updateProjectInputSchema>;
export type CreateProjectNoteInput = z.input<
  typeof createProjectNoteInputSchema
>;
export type UpdateProjectNoteInput = z.input<
  typeof updateProjectNoteInputSchema
>;
export type ReorderProjectNotesInput = z.input<
  typeof reorderProjectNotesInputSchema
>;
export type CreateProjectResourceInput = z.input<
  typeof createProjectResourceInputSchema
>;
export type UpdateProjectResourceInput = z.input<
  typeof updateProjectResourceInputSchema
>;
export type CreateProjectAttributeInput = z.input<
  typeof createProjectAttributeInputSchema
>;
export type UpdateProjectAttributeInput = z.input<
  typeof updateProjectAttributeInputSchema
>;
