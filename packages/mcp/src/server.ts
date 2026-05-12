import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod/v4";

import {
  getBoardSnapshot,
  listBoards,
  listTasks,
  proposeStartWork,
  proposeTaskBreakdownFromTasks,
  proposeTaskDelete,
  proposeTaskUpdate,
  resolveTaskReference,
} from "@career-code/domain/kanban/store";
import {
  createJobApplicationRun,
  getJobSearchProfile,
  getLatestUnappliedJobBatch,
  listJobApplicationRuns,
  listJobDigests,
  listJobs,
  prepareJobSearchBrief,
  scoreJobCandidates,
  seedJobs,
  seedRankedJobs,
  updateJobApplicationAttempt,
} from "@career-code/domain/jobs/store";
import {
  buildApplicationFormDefaults,
  buildJobApplicationAdvice,
  classifyApplyUrl,
  generateJobApplicationRunReport,
  jobUrl,
} from "@career-code/domain/jobs/application-runner";
import {
  prepareTaskBreakdownPrompt,
  reviewTaskBreakdownProposal,
} from "@career-code/domain/kanban/prompt-preparation";
import { DEFAULT_BOARD_ID, SOLO_USER_ID } from "@career-code/domain/kanban/schema";
import {
  createProfileImport,
  getProfileSnapshot,
  listProfileImports,
} from "@career-code/domain/profile/store";

const mcpColumnIdSchema = z.enum([
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
]);

const mcpPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);

const mcpJobStatusSchema = z.enum([
  "not_applied",
  "applied",
  "interviewing",
  "rejected",
  "offer",
  "expired",
]);

const mcpJobApplicationAttemptStatusSchema = z.enum([
  "queued",
  "filled_waiting_user",
  "needs_manual_review",
  "failed",
  "submitted_detected",
]);

const mcpProfileItemTypeSchema = z.enum([
  "experience",
  "education",
  "project",
  "skill",
  "certification",
  "achievement",
]);

const mcpSeedJobSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(180)
    .describe("Job title or role name."),
  company: z
    .string()
    .max(140)
    .optional()
    .describe("Hiring company or organization."),
  location: z
    .string()
    .max(180)
    .optional()
    .describe("Job location, remote label, or region."),
  applyUrl: z
    .string()
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
    }, "Only http and https URLs are allowed.")
    .optional()
    .describe("HTTP or HTTPS application URL."),
  sourceJobId: z
    .string()
    .max(180)
    .optional()
    .describe("Stable job identifier from the external source."),
  status: mcpJobStatusSchema
    .optional()
    .describe("Initial status. Defaults to not_applied."),
  postedAt: z
    .string()
    .max(120)
    .optional()
    .describe("External posted date or relative posting age."),
  salary: z
    .string()
    .max(160)
    .optional()
    .describe("Salary text, if available."),
  description: z
    .string()
    .max(10000)
    .optional()
    .describe("Job description or notes."),
  fitScore: z
    .number()
    .nullable()
    .optional()
    .describe("Optional fit score calculated by the external app."),
  raw: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Optional raw source payload for debugging or future enrichment."),
});

const mcpReferenceLinkSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(140)
    .optional()
    .describe("Optional human-readable link label."),
  url: z
    .string()
    .url()
    .refine((value) => {
      try {
        const protocol = new URL(value).protocol;
        return protocol === "http:" || protocol === "https:";
      } catch {
        return false;
      }
    }, "Only http and https links are allowed.")
    .describe("HTTP or HTTPS reference URL."),
});

const mcpOptionalUrlSchema = z
  .string()
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
  }, "Only http and https URLs are allowed.")
  .optional();

const mcpOptionalFormUrlSchema = z
  .string()
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
  }, "Only http and https URLs are allowed.")
  .optional();

const mcpOptionalEmailSchema = z
  .string()
  .max(160)
  .refine((value) => !value || z.email().safeParse(value).success, {
    message: "Enter a valid email address.",
  })
  .optional();

const mcpProfileBasicsSchema = z.object({
  displayName: z
    .string()
    .max(120)
    .optional()
    .describe("Person's full display name extracted from the resume."),
  headline: z
    .string()
    .max(180)
    .optional()
    .describe("Short professional headline or target role."),
  location: z
    .string()
    .max(120)
    .optional()
    .describe("Location from the resume, if present."),
  email: mcpOptionalEmailSchema.describe("Email address from the resume."),
  website: mcpOptionalUrlSchema.describe("Portfolio, LinkedIn, GitHub, or website URL."),
  summary: z
    .string()
    .max(2000)
    .optional()
    .describe("Concise profile summary extracted from the resume."),
});

const mcpProfileImportItemSchema = z.object({
  type: mcpProfileItemTypeSchema.describe("Profile section for this resume item."),
  title: z
    .string()
    .min(1)
    .max(140)
    .describe(
      "Role, degree, project name, skill name, certification, or achievement title.",
    ),
  organization: z
    .string()
    .max(140)
    .optional()
    .describe("Company, school, issuer, or project owner."),
  location: z
    .string()
    .max(120)
    .optional()
    .describe("Location associated with this item."),
  startDate: z
    .string()
    .max(80)
    .optional()
    .describe("Start date or period text, for example Jan 2024."),
  endDate: z
    .string()
    .max(80)
    .optional()
    .describe("End date or period text, for example Present."),
  description: z
    .string()
    .max(3000)
    .optional()
    .describe("Resume bullets or concise item description."),
  url: mcpOptionalUrlSchema.describe("Optional verification or project URL."),
  tags: z
    .array(z.string().min(1).max(40))
    .max(20)
    .optional()
    .describe("Technologies, domains, or keywords associated with this item."),
});

const mcpProposedTaskSchema = z.object({
  title: z
    .string()
    .min(1)
    .max(140)
    .describe("Generated task title."),
  description: z
    .string()
    .max(3000)
    .optional()
    .describe("Generated task description."),
  priority: mcpPrioritySchema
    .optional()
    .describe("Task priority. Defaults to medium."),
  acceptanceCriteria: z
    .array(z.string().min(1))
    .optional()
    .describe("Checklist items that define completion."),
  suggestedColumn: mcpColumnIdSchema
    .optional()
    .describe("Suggested Kanban column. Defaults to todo."),
  dependencies: z
    .array(z.string().min(1))
    .optional()
    .describe("Task titles or references this task depends on."),
  resourceLinks: z
    .array(mcpReferenceLinkSchema)
    .optional()
    .describe("General learning or reference links for this task."),
  helpfulLinks: z
    .array(mcpReferenceLinkSchema)
    .optional()
    .describe("Supporting articles, docs, videos, cheatsheets, or examples."),
  problemLinks: z
    .array(mcpReferenceLinkSchema)
    .optional()
    .describe("Practice problem or problem-set links when relevant."),
});

const mcpClarificationSchema = z.object({
  question: z
    .string()
    .min(1)
    .max(500)
    .describe("Follow-up question asked before task generation."),
  answer: z
    .string()
    .min(1)
    .max(2000)
    .describe("User answer that shaped the generated proposal."),
});

const mcpTaskReferenceFields = {
  boardId: z.string().optional().describe("Board ID to read."),
  taskId: z.string().optional().describe("Internal task UUID to reference."),
  taskNumber: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Human-facing task number, for example 7 for task #7."),
};

export const mcpTaskReferenceSchema = z
  .object(mcpTaskReferenceFields)
  .refine(
    (value) => Number(Boolean(value.taskId)) + Number(Boolean(value.taskNumber)) === 1,
    {
      message: "Provide exactly one of taskId or taskNumber.",
    },
  );

async function resolveMcpTaskReference(
  input: z.infer<typeof mcpTaskReferenceSchema>,
  userId: string,
) {
  const reference = mcpTaskReferenceSchema.parse(input);
  const boardId = reference.boardId ?? DEFAULT_BOARD_ID;
  const task = await resolveTaskReference(
    {
      taskId: reference.taskId,
      taskNumber: reference.taskNumber,
    },
    boardId,
    userId,
  );

  if (reference.boardId && task.boardId !== reference.boardId) {
    throw new Error(
      `Task ${reference.taskId ?? `#${reference.taskNumber}`} does not belong to board "${reference.boardId}".`,
    );
  }

  return task;
}

function jsonText(data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

async function latestJobApplicationPayload(userId: string) {
  const [batch, profile] = await Promise.all([
    getLatestUnappliedJobBatch(userId),
    getProfileSnapshot(userId),
  ]);
  const report = generateJobApplicationRunReport({
    jobs: batch.jobs,
    latestSeededDateKey: batch.latestSeededDateKey,
    profile,
  });

  return {
    latestSeededDateKey: batch.latestSeededDateKey,
    jobs: batch.jobs.map((job) => ({
      job,
      source: job.source,
      sourceJobId: job.sourceJobId,
      jobUrl: jobUrl(job),
      automation: classifyApplyUrl(job.applyUrl),
      advice: buildJobApplicationAdvice(job, profile),
    })),
    formDefaults: buildApplicationFormDefaults(profile),
    profile: profile.profile,
    profileItems: profile.items,
    report,
    safety: {
      onlyLatestSeededDate: true,
      onlyNotApplied: true,
      finalSubmitAllowed: false,
      manualReviewPortals: [
        "LinkedIn",
        "Workday",
        "Lever",
        "Greenhouse",
        "Workable",
        "SmartRecruiters",
        "Ashby",
        "CAPTCHA/login-heavy pages",
      ],
    },
  };
}

export function createKanbanMcpServer(userId = SOLO_USER_ID) {
  const server = new McpServer({
    name: "career-code-kanban",
    version: "0.1.0",
  });

  server.registerTool(
    "list_boards",
    {
      title: "List Boards",
      description: "List Kanban boards the connected user can access.",
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async () => jsonText({ boards: await listBoards(userId) }),
  );

  server.registerTool(
    "list_tasks",
    {
      title: "List Tasks",
      description: "List tasks for a board.",
      inputSchema: {
        boardId: z.string().optional().describe("Board ID to read."),
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async ({ boardId }) =>
      jsonText({
        tasks: await listTasks(boardId ?? DEFAULT_BOARD_ID, userId),
      }),
  );

  server.registerTool(
    "get_task",
    {
      title: "Get Task",
      description: "Fetch one task by task number or internal task ID.",
      inputSchema: mcpTaskReferenceFields,
      annotations: {
        readOnlyHint: true,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({ task: await resolveMcpTaskReference(input, userId) }),
  );

  server.registerTool(
    "get_profile_snapshot",
    {
      title: "Get Profile Snapshot",
      description:
        "Read the connected user's current profile basics, profile section items, and pending resume imports.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () =>
      jsonText({
        profile: await getProfileSnapshot(userId),
        profileImports: await listProfileImports(userId),
      }),
  );

  server.registerTool(
    "list_jobs",
    {
      title: "List Jobs",
      description:
        "List jobs seeded into the connected user's tracker, newest seeded date first.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () =>
      jsonText({
        jobs: await listJobs(userId),
      }),
  );

  server.registerTool(
    "get_latest_unapplied_job_batch",
    {
      title: "Get Latest Unapplied Job Batch",
      description:
        "Fetch the newest seeded date's active not_applied jobs, application URLs, job URLs, saved form defaults, profile items, automation classification, and resume/project advice for Chrome application filling.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () =>
      jsonText({
        batch: await latestJobApplicationPayload(userId),
      }),
  );

  server.registerTool(
    "create_job_application_run",
    {
      title: "Create Job Application Run",
      description:
        "Create a tracking run for the current latest seeded date's active not_applied jobs and return the same Chrome-ready batch payload. This does not submit applications or mark jobs applied.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      const batch = await latestJobApplicationPayload(userId);
      const run = await createJobApplicationRun({ report: batch.report }, userId);

      return jsonText({
        run,
        batch,
      });
    },
  );

  server.registerTool(
    "list_job_application_runs",
    {
      title: "List Job Application Runs",
      description:
        "Read recent latest-batch application automation runs and per-job attempt statuses.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Maximum number of application runs to return. Defaults to 10."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ limit }) =>
      jsonText({
        runs: await listJobApplicationRuns({ limit: limit ?? 10 }, userId),
      }),
  );

  server.registerTool(
    "update_job_application_attempt",
    {
      title: "Update Job Application Attempt",
      description:
        "Update one job's attempt status inside an application run after Chrome fills a form, pauses for review, marks a manual-review portal, detects a submission, or hits a failure. This does not change the job status.",
      inputSchema: {
        runId: z.string().min(1).describe("Application run ID."),
        jobId: z.string().min(1).describe("Job ID inside the run."),
        status: mcpJobApplicationAttemptStatusSchema.describe(
          "Attempt outcome. Use filled_waiting_user when the form is filled and paused before final submit.",
        ),
        advice: z
          .string()
          .max(8000)
          .optional()
          .describe("Short advice or notes used while filling this job."),
        skipReason: z
          .string()
          .max(1000)
          .optional()
          .describe("Why the job needs manual review or was skipped."),
        error: z
          .string()
          .max(1000)
          .optional()
          .describe("Failure summary when status is failed."),
        formUrl: mcpOptionalFormUrlSchema.describe(
          "Current application form URL or original apply URL.",
        ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        run: await updateJobApplicationAttempt(input, userId),
      }),
  );

  server.registerTool(
    "get_job_search_profile",
    {
      title: "Get Job Search Profile",
      description:
        "Read the connected user's profile-derived job search settings used for ranked job automation.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () =>
      jsonText({
        searchProfile: await getJobSearchProfile(userId),
      }),
  );

  server.registerTool(
    "prepare_job_search_brief",
    {
      title: "Prepare Job Search Brief",
      description:
        "Return profile-derived search keywords, locations, strict existing-job exclusions, and ranking thresholds for an external job-search automation.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () =>
      jsonText({
        brief: await prepareJobSearchBrief(userId),
      }),
  );

  server.registerTool(
    "score_job_candidates",
    {
      title: "Score Job Candidates",
      description:
        "Score normalized external job candidates against the connected user's job search profile without writing to the tracker.",
      inputSchema: {
        source: z
          .string()
          .min(1)
          .max(80)
          .optional()
          .describe("External app or scraper name."),
        jobs: z
          .array(mcpSeedJobSchema)
          .min(1)
          .max(500)
          .describe("Normalized candidate jobs to score."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (input) => jsonText(await scoreJobCandidates(input, userId)),
  );

  server.registerTool(
    "seed_ranked_jobs",
    {
      title: "Seed Ranked Jobs",
      description:
        "Re-score, strictly dedupe, apply the user's minimum fit score and max-per-run limits, seed accepted jobs, and create a curation digest.",
      inputSchema: {
        source: z
          .string()
          .min(1)
          .max(80)
          .describe(
            "External app or scraper name, for example apify:curious_coder/linkedin-jobs-scraper.",
          ),
        runKey: z
          .string()
          .min(1)
          .max(160)
          .optional()
          .describe("Optional idempotency key for this automation run."),
        summary: z
          .string()
          .max(1000)
          .optional()
          .describe("Optional human-readable run summary."),
        jobs: z
          .array(mcpSeedJobSchema)
          .min(1)
          .max(500)
          .describe("Normalized candidate jobs to score and seed if high-fit."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) => jsonText(await seedRankedJobs(input, userId)),
  );

  server.registerTool(
    "list_job_digests",
    {
      title: "List Job Digests",
      description:
        "Read recent ranked job curation digests for the connected user.",
      inputSchema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Maximum number of digests to return. Defaults to 10."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ limit }) =>
      jsonText({
        digests: await listJobDigests(userId, limit ?? 10),
      }),
  );

  server.registerTool(
    "seed_jobs",
    {
      title: "Seed Jobs",
      description:
        "Directly upsert external job listings into the connected user's job tracker. Existing rows are matched by sourceJobId, applyUrl, then title/company/location.",
      inputSchema: {
        source: z
          .string()
          .min(1)
          .max(80)
          .describe("External app or scraper name, for example apify."),
        jobs: z
          .array(mcpSeedJobSchema)
          .min(1)
          .describe("All well-fit jobs to upsert into Career Code."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        jobs: await seedJobs(input, userId),
      }),
  );

  server.registerTool(
    "prepare_task_breakdown_prompt",
    {
      title: "Prepare Task Breakdown Prompt",
      description:
        "Analyze a raw task-breakdown prompt and return clarification questions plus a generationBrief with title, summary, phases, task-count guidance, and quality rules. This does not create proposals or call AI_TASK_MODEL.",
      inputSchema: {
        prompt: z
          .string()
          .min(1)
          .max(8000)
          .describe("Raw user prompt to inspect before generating tasks."),
        clarifications: z
          .array(mcpClarificationSchema)
          .optional()
          .describe("Questions and answers already collected from earlier clarification rounds."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        preparation: prepareTaskBreakdownPrompt(input),
      }),
  );

  server.registerTool(
    "review_task_breakdown_proposal",
    {
      title: "Review Task Breakdown Proposal",
      description:
        "Read-only quality review for generated proposal tasks. Call this before propose_task_breakdown_from_tasks to find missing coverage, vague acceptance criteria, weak titles, duplicates, and dependency gaps. This does not create proposals or call AI_TASK_MODEL.",
      inputSchema: {
        prompt: z
          .string()
          .min(1)
          .max(8000)
          .describe("Original user prompt or study topic."),
        refinedPrompt: z
          .string()
          .min(1)
          .max(8000)
          .optional()
          .describe("Optional clarified prompt used to generate tasks."),
        title: z
          .string()
          .min(1)
          .max(140)
          .optional()
          .describe("Candidate proposal title to review."),
        summary: z
          .string()
          .min(1)
          .max(1000)
          .optional()
          .describe("Candidate proposal summary to review."),
        tasks: z
          .array(mcpProposedTaskSchema)
          .min(1)
          .describe("Generated tasks to review before creating a proposal."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        review: reviewTaskBreakdownProposal(input),
      }),
  );

  server.registerTool(
    "propose_task_breakdown_from_tasks",
    {
      title: "Propose Task Breakdown From Tasks",
      description:
        "Create a pending task-breakdown proposal from tasks already generated by the MCP client. Best workflow: call prepare_task_breakdown_prompt first, ask any returned questions, generate tasks using generationBrief, optionally call review_task_breakdown_proposal, then submit only specific, measurable, dependency-aware tasks. The user reviews the pending proposal in Career Code before tasks are added to the board.",
      inputSchema: {
        boardId: z.string().optional().describe("Board ID to write to."),
        prompt: z
          .string()
          .min(1)
          .max(8000)
          .describe("Original user prompt or study topic."),
        refinedPrompt: z
          .string()
          .min(1)
          .max(8000)
          .optional()
          .describe("Optional clarified prompt created after follow-up questions."),
        clarifications: z
          .array(mcpClarificationSchema)
          .optional()
          .describe("Optional follow-up questions and user answers used to generate the submitted tasks."),
        title: z
          .string()
          .min(1)
          .max(140)
          .optional()
          .describe("Specific proposal title. Prefer generationBrief.suggestedTitle over generic titles like Create 12 tasks."),
        summary: z
          .string()
          .min(1)
          .max(1000)
          .optional()
          .describe("Specific proposal summary. Prefer generationBrief.suggestedSummary when available."),
        tasks: z
          .array(mcpProposedTaskSchema)
          .min(1)
          .describe("Generated tasks to review as a pending proposal. Use measurable acceptanceCriteria and dependencies that reference earlier task titles when order matters."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        proposal: await proposeTaskBreakdownFromTasks(input, "mcp", userId),
      }),
  );

  server.registerTool(
    "propose_profile_import",
    {
      title: "Propose Profile Import",
      description:
        "Create a pending profile import from structured resume data already extracted by the MCP client. Career Code does not parse resume files or call an AI model here; the user reviews and applies the import in the profile UI.",
      inputSchema: {
        profileBasics: mcpProfileBasicsSchema
          .optional()
          .describe("Optional basic profile fields extracted from the resume."),
        items: z
          .array(mcpProfileImportItemSchema)
          .min(1)
          .max(100)
          .describe("Structured resume entries to review before importing."),
        summary: z
          .string()
          .max(1000)
          .optional()
          .describe("Short note summarizing what was extracted."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        profileImport: await createProfileImport(input, userId, "mcp"),
      }),
  );

  server.registerTool(
    "propose_task_update",
    {
      title: "Propose Task Update",
      description:
        "Create a pending proposal to update a task. The task is not changed until accepted.",
      inputSchema: {
        ...mcpTaskReferenceFields,
        title: z.string().optional(),
        description: z.string().optional(),
        priority: mcpPrioritySchema.optional(),
        columnId: mcpColumnIdSchema.optional(),
        reason: z.string().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ boardId, taskId, taskNumber, reason, ...patch }) => {
      const task = await resolveMcpTaskReference(
        { boardId, taskId, taskNumber },
        userId,
      );

      return jsonText({
        proposal: await proposeTaskUpdate(
          {
            boardId: task.boardId,
            taskId: task.id,
            patch,
            reason,
          },
          "mcp",
          userId,
        ),
      });
    },
  );

  server.registerTool(
    "propose_task_delete",
    {
      title: "Propose Task Delete",
      description:
        "Create a pending proposal to delete a task. The delete does not happen until accepted.",
      inputSchema: {
        ...mcpTaskReferenceFields,
        reason: z.string().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async ({ boardId, taskId, taskNumber, reason }) => {
      const task = await resolveMcpTaskReference(
        { boardId, taskId, taskNumber },
        userId,
      );

      return jsonText({
        proposal: await proposeTaskDelete(
          {
            boardId: task.boardId,
            taskId: task.id,
            reason,
          },
          "mcp",
          userId,
        ),
      });
    },
  );

  server.registerTool(
    "propose_start_work",
    {
      title: "Propose Start Work",
      description:
        "Create a pending proposal to move a task into In Progress when a user says they are taking it to work.",
      inputSchema: {
        ...mcpTaskReferenceFields,
        reason: z.string().optional(),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ boardId, taskId, taskNumber, reason }) => {
      const task = await resolveMcpTaskReference(
        { boardId, taskId, taskNumber },
        userId,
      );

      return jsonText({
        proposal: await proposeStartWork(
          {
            boardId: task.boardId,
            taskId: task.id,
            reason,
            targetColumnId: "in_progress",
          },
          "mcp",
          userId,
        ),
      });
    },
  );

  server.registerResource(
    "board_snapshot",
    "career-code://boards/default/snapshot",
    {
      title: "Current Board Snapshot",
      description: "Current board, columns, tasks, and pending proposals.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "career-code://boards/default/snapshot",
          mimeType: "application/json",
          text: JSON.stringify(await getBoardSnapshot(userId), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "profile_snapshot",
    "career-code://profile/snapshot",
    {
      title: "Current Profile Snapshot",
      description: "Current profile basics, profile items, and pending imports.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "career-code://profile/snapshot",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              profile: await getProfileSnapshot(userId),
              profileImports: await listProfileImports(userId),
            },
            null,
            2,
          ),
        },
      ],
    }),
  );

  server.registerResource(
    "job_search_profile",
    "career-code://jobs/search-profile",
    {
      title: "Job Search Profile",
      description: "Profile-derived job search settings and ranking limits.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "career-code://jobs/search-profile",
          mimeType: "application/json",
          text: JSON.stringify(await getJobSearchProfile(userId), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "latest_job_digest",
    "career-code://jobs/latest-digest",
    {
      title: "Latest Job Digest",
      description: "Latest ranked job curation digest.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "career-code://jobs/latest-digest",
          mimeType: "application/json",
          text: JSON.stringify((await listJobDigests(userId, 1))[0] ?? null, null, 2),
        },
      ],
    }),
  );

  return server;
}
