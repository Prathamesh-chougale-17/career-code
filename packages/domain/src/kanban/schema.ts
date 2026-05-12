import { z } from "zod";

export const SOLO_USER_ID = "solo-user";
export const DEFAULT_BOARD_ID = "default-board";

export const columnIdSchema = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
]);

export const prioritySchema = z.enum(["low", "medium", "high", "urgent"]);

export const taskNumberSchema = z.number().int().positive();

export const referenceLinkSchema = z.object({
  title: z.string().trim().min(1).max(140).optional(),
  url: z
    .string()
    .trim()
    .url()
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "Only http and https links are allowed."),
});

export const referenceLinkArraySchema = z.array(referenceLinkSchema);
export const referenceLinksSchema = referenceLinkArraySchema.default([]);

export const clarificationSchema = z.object({
  question: z.string().trim().min(1).max(500),
  answer: z.string().trim().min(1).max(2000),
});

export const clarificationListSchema = z.array(clarificationSchema).default([]);

export const proposalStatusSchema = z.enum([
  "pending",
  "accepted",
  "rejected",
]);

export const proposalSourceSchema = z.enum(["app", "mcp", "ai"]);

export const boardSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const boardColumnSchema = z.object({
  id: columnIdSchema,
  boardId: z.string(),
  userId: z.string(),
  title: z.string(),
  order: z.number().int().nonnegative(),
  color: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const taskSchema = z.object({
  id: z.string(),
  taskNumber: taskNumberSchema,
  boardId: z.string(),
  userId: z.string(),
  columnId: columnIdSchema,
  title: z.string(),
  description: z.string(),
  priority: prioritySchema,
  acceptanceCriteria: z.array(z.string()),
  dependencies: z.array(z.string()),
  resourceLinks: referenceLinksSchema,
  helpfulLinks: referenceLinksSchema,
  problemLinks: referenceLinksSchema,
  sourceProposalId: z.string().optional(),
  sourceProposalItemFingerprint: z.string().optional(),
  sourceProposalTopic: z.string().optional(),
  order: z.number().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const proposedTaskSchema = z.object({
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(3000).default(""),
  priority: prioritySchema.default("medium"),
  acceptanceCriteria: z.array(z.string().trim().min(1)).default([]),
  suggestedColumn: columnIdSchema.default("todo"),
  dependencies: z.array(z.string().trim().min(1)).default([]),
  resourceLinks: referenceLinksSchema,
  helpfulLinks: referenceLinksSchema,
  problemLinks: referenceLinksSchema,
});

export const taskBreakdownPayloadSchema = z.object({
  prompt: z.string(),
  refinedPrompt: z.string().trim().min(1).max(8000).optional(),
  clarifications: clarificationListSchema,
  tasks: z.array(proposedTaskSchema).min(1),
});

export const taskUpdatePatchSchema = z
  .object({
    title: z.string().trim().min(1).max(140).optional(),
    description: z.string().trim().max(3000).optional(),
    priority: prioritySchema.optional(),
    acceptanceCriteria: z.array(z.string().trim().min(1)).optional(),
    dependencies: z.array(z.string().trim().min(1)).optional(),
    resourceLinks: referenceLinkArraySchema.optional(),
    helpfulLinks: referenceLinkArraySchema.optional(),
    problemLinks: referenceLinkArraySchema.optional(),
    columnId: columnIdSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field must be provided.",
  });

export const taskUpdatePayloadSchema = z.object({
  taskId: z.string(),
  taskNumber: taskNumberSchema.optional(),
  patch: taskUpdatePatchSchema,
  reason: z.string().optional(),
});

export const taskDeletePayloadSchema = z.object({
  taskId: z.string(),
  taskNumber: taskNumberSchema.optional(),
  reason: z.string().optional(),
});

export const startWorkPayloadSchema = z.object({
  taskId: z.string(),
  taskNumber: taskNumberSchema.optional(),
  targetColumnId: z.literal("in_progress").default("in_progress"),
  reason: z.string().optional(),
});

export const taskReferenceSchema = z
  .object({
    taskId: z.string().trim().min(1).optional(),
    taskNumber: taskNumberSchema.optional(),
  })
  .refine(
    (value) => Number(Boolean(value.taskId)) + Number(Boolean(value.taskNumber)) === 1,
    {
      message: "Provide exactly one of taskId or taskNumber.",
    },
  );

export const proposalTypeSchema = z.enum([
  "task_breakdown",
  "task_update",
  "task_delete",
  "start_work",
]);

export const proposalPayloadSchema = z.union([
  taskBreakdownPayloadSchema,
  taskUpdatePayloadSchema,
  taskDeletePayloadSchema,
  startWorkPayloadSchema,
]);

export const aiProposalSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  userId: z.string(),
  type: proposalTypeSchema,
  status: proposalStatusSchema,
  source: proposalSourceSchema,
  title: z.string(),
  summary: z.string(),
  payload: proposalPayloadSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable().optional(),
});

export const taskEventSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  userId: z.string(),
  taskId: z.string().optional(),
  type: z.string(),
  summary: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

export const aiRunSchema = z.object({
  id: z.string(),
  boardId: z.string(),
  userId: z.string(),
  prompt: z.string(),
  provider: z.string(),
  status: z.enum(["completed", "failed"]),
  proposalId: z.string().optional(),
  error: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const mcpConnectionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  clientName: z.string(),
  scopes: z.array(z.string()),
  createdAt: z.string(),
  lastSeenAt: z.string().optional(),
});

export const mcpTokenSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  tokenHash: z.string(),
  tokenPrefix: z.string(),
  createdAt: z.string(),
  lastUsedAt: z.string().optional(),
  revokedAt: z.string().optional(),
});

export const mcpTokenViewSchema = mcpTokenSchema.omit({
  tokenHash: true,
});

export const createMcpTokenInputSchema = z.object({
  name: z.string().trim().min(1).max(80).default("MCP token"),
});

export const revokeMcpTokenInputSchema = z.object({
  tokenId: z.string().trim().min(1),
});

export const createTaskInputSchema = z.object({
  boardId: z.string().optional(),
  columnId: columnIdSchema.default("todo"),
  title: z.string().trim().min(1).max(140),
  description: z.string().trim().max(3000).default(""),
  priority: prioritySchema.default("medium"),
  acceptanceCriteria: z.array(z.string().trim().min(1)).default([]),
  dependencies: z.array(z.string().trim().min(1)).default([]),
  resourceLinks: referenceLinksSchema,
  helpfulLinks: referenceLinksSchema,
  problemLinks: referenceLinksSchema,
  sourceProposalId: z.string().trim().min(1).optional(),
  sourceProposalItemFingerprint: z.string().trim().min(1).optional(),
  sourceProposalTopic: z.string().trim().min(1).optional(),
});

export const updateTaskInputSchema = z.object({
  taskId: z.string(),
  patch: taskUpdatePatchSchema,
});

export const deleteTaskInputSchema = z.object({
  taskId: z.string(),
});

export const revertTaskToProposalInputSchema = z.object({
  taskId: z.string(),
});

export const reorderTaskInputSchema = z.object({
  taskId: z.string(),
  columnId: columnIdSchema,
  index: z.number().int().nonnegative(),
});

export const breakdownPromptInputSchema = z.object({
  boardId: z.string().optional(),
  prompt: z.string().trim().min(8).max(8000),
});

export const prepareTaskBreakdownPromptInputSchema = z.object({
  prompt: z.string().trim().min(1).max(8000),
  clarifications: clarificationListSchema,
});

export const proposalKindSchema = z.enum([
  "study_plan",
  "interview_prep",
  "implementation_plan",
  "operations_workflow",
  "general_plan",
]);

export const taskGenerationBriefSchema = z.object({
  proposalKind: proposalKindSchema,
  suggestedTitle: z.string().trim().min(1).max(140),
  suggestedSummary: z.string().trim().min(1).max(1000),
  detectedTopic: z.string().trim().min(1).max(140),
  audience: z.string().trim().min(1).max(240),
  constraints: z.array(z.string().trim().min(1).max(160)),
  recommendedTaskCount: z.string().trim().min(1).max(80),
  recommendedPhases: z.array(z.string().trim().min(1).max(160)).min(1),
  taskQualityChecklist: z.array(z.string().trim().min(1).max(240)).min(1),
  taskWritingRules: z.array(z.string().trim().min(1).max(240)).min(1),
  missingContext: z.array(z.string().trim().min(1).max(160)),
});

export const preparedTaskBreakdownPromptSchema = z.object({
  status: z.enum(["ready", "needs_clarification"]),
  round: z.number().int().min(1).max(2),
  maxRounds: z.literal(2),
  questions: z.array(z.string().trim().min(1).max(500)).max(5),
  assumptions: z.array(z.string().trim().min(1).max(500)),
  refinedPrompt: z.string().trim().min(1).max(8000).optional(),
  generationBrief: taskGenerationBriefSchema.optional(),
});

export const proposeTaskBreakdownFromTasksInputSchema = z.object({
  boardId: z.string().optional(),
  prompt: z.string().trim().min(1).max(8000),
  refinedPrompt: z.string().trim().min(1).max(8000).optional(),
  clarifications: clarificationListSchema,
  title: z.string().trim().min(1).max(140).optional(),
  summary: z.string().trim().min(1).max(1000).optional(),
  tasks: z.array(proposedTaskSchema).min(1),
});

export const taskBreakdownProposalReviewInputSchema = z.object({
  prompt: z.string().trim().min(1).max(8000),
  refinedPrompt: z.string().trim().min(1).max(8000).optional(),
  title: z.string().trim().min(1).max(140).optional(),
  summary: z.string().trim().min(1).max(1000).optional(),
  tasks: z.array(proposedTaskSchema).min(1),
});

export const taskBreakdownProposalReviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.enum(["ready", "needs_revision"]),
  issues: z.array(z.string().trim().min(1).max(300)),
  missingCoverage: z.array(z.string().trim().min(1).max(200)),
  duplicateOrWeakTasks: z.array(z.string().trim().min(1).max(200)),
  improvedTitle: z.string().trim().min(1).max(140),
  improvedSummary: z.string().trim().min(1).max(1000),
  recommendedFixes: z.array(z.string().trim().min(1).max(300)),
});

export const proposeTaskUpdateInputSchema = taskUpdatePayloadSchema.extend({
  boardId: z.string().optional(),
});

export const proposeTaskDeleteInputSchema = taskDeletePayloadSchema.extend({
  boardId: z.string().optional(),
});

export const proposeStartWorkInputSchema = startWorkPayloadSchema.extend({
  boardId: z.string().optional(),
});

export const proposalActionInputSchema = z.object({
  proposalId: z.string(),
});

export const snapshotSchema = z.object({
  board: boardSchema,
  columns: z.array(boardColumnSchema),
  tasks: z.array(taskSchema),
  proposals: z.array(aiProposalSchema),
  storageMode: z.enum(["mongodb", "demo"]),
});

export const dashboardMetricsSchema = z.object({
  boardTitle: z.string(),
  proposalCount: z.number().int().nonnegative(),
  taskCount: z.number().int().nonnegative(),
  inProgressCount: z.number().int().nonnegative(),
  doneCount: z.number().int().nonnegative(),
});

export const proposalListSchema = z.array(aiProposalSchema);

export type Board = z.infer<typeof boardSchema>;
export type BoardColumn = z.infer<typeof boardColumnSchema>;
export type KanbanTask = z.infer<typeof taskSchema>;
export type ProposedTask = z.infer<typeof proposedTaskSchema>;
export type ReferenceLink = z.infer<typeof referenceLinkSchema>;
export type Clarification = z.infer<typeof clarificationSchema>;
export type AiProposal = z.infer<typeof aiProposalSchema>;
export type TaskEvent = z.infer<typeof taskEventSchema>;
export type AiRun = z.infer<typeof aiRunSchema>;
export type McpConnection = z.infer<typeof mcpConnectionSchema>;
export type McpToken = z.infer<typeof mcpTokenSchema>;
export type McpTokenView = z.infer<typeof mcpTokenViewSchema>;
export type ProposalType = z.infer<typeof proposalTypeSchema>;
export type ProposalSource = z.infer<typeof proposalSourceSchema>;
export type TaskUpdatePatch = z.infer<typeof taskUpdatePatchSchema>;
export type TaskReference = z.infer<typeof taskReferenceSchema>;
export type BoardSnapshot = z.infer<typeof snapshotSchema>;
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;
export type CreateTaskInput = z.input<typeof createTaskInputSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskInputSchema>;
export type ReorderTaskInput = z.input<typeof reorderTaskInputSchema>;
export type BreakdownPromptInput = z.input<typeof breakdownPromptInputSchema>;
export type PreparedTaskBreakdownPrompt = z.infer<
  typeof preparedTaskBreakdownPromptSchema
>;
export type TaskGenerationBrief = z.infer<typeof taskGenerationBriefSchema>;
export type ProposeTaskBreakdownFromTasksInput = z.input<
  typeof proposeTaskBreakdownFromTasksInputSchema
>;
export type TaskBreakdownProposalReview = z.infer<
  typeof taskBreakdownProposalReviewSchema
>;
export type CreateMcpTokenInput = z.input<typeof createMcpTokenInputSchema>;
export type RevokeMcpTokenInput = z.input<typeof revokeMcpTokenInputSchema>;
