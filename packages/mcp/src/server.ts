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
} from "@careeright/domain/kanban/store";
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
} from "@careeright/domain/jobs/store";
import { getDsaSnapshot } from "@careeright/domain/dsa/store";
import {
  buildApplicationFormDefaults,
  buildJobApplicationAdvice,
  classifyApplyUrl,
  generateJobApplicationRunReport,
  jobUrl,
} from "@careeright/domain/jobs/application-runner";
import {
  prepareTaskBreakdownPrompt,
  reviewTaskBreakdownProposal,
} from "@careeright/domain/kanban/prompt-preparation";
import { DEFAULT_BOARD_ID, SOLO_USER_ID } from "@careeright/domain/kanban/schema";
import {
  createProfileImport,
  getProfileSnapshot,
  listProfileImports,
} from "@careeright/domain/profile/store";
import {
  archiveProject,
  createAttribute,
  createNote,
  createProject,
  createResource,
  deleteAttribute,
  deleteNote,
  deleteProject,
  deleteResource,
  getProject,
  getProjectsSummary,
  importFromProfileProjects,
  listProjects,
  reorderNotes,
  syncFromProfileProject,
  updateAttribute,
  updateNote,
  updateProject,
  updateResource,
} from "@careeright/domain/projects/store";

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

const mcpProjectStatusSchema = z.enum([
  "active",
  "paused",
  "completed",
  "archived",
]);

const mcpProjectResourceTypeSchema = z.enum([
  "repository",
  "demo",
  "documentation",
  "article",
  "video",
  "design",
  "link",
  "other",
]);

const mcpProjectAttributeTypeSchema = z.enum([
  "technology",
  "concept",
  "date",
  "person",
  "link",
  "other",
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

const mcpHttpUrlSchema = z
  .string()
  .min(1)
  .max(500)
  .url()
  .refine((value) => {
    try {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    } catch {
      return false;
    }
  }, "Only http and https URLs are allowed.");

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

function definedPatch<T extends Record<string, unknown>>(input: T) {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
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

async function dsaQuestionsPayload(userId: string) {
  const snapshot = await getDsaSnapshot(userId);
  const completedQuestionIds = new Set(
    snapshot.progress
      .filter((item) => item.completed)
      .map((item) => item.questionId),
  );

  const tracks = snapshot.catalog.tracks.map((track) => {
    const subtopics = track.subtopics.map((subtopic) => {
      const questions = subtopic.questions.map((question) => ({
        ...question,
        completed: completedQuestionIds.has(question.id),
      }));
      const completedQuestions = questions.filter((question) => question.completed).length;
      const totalQuestions = questions.length;

      return {
        id: subtopic.id,
        title: subtopic.title,
        description: subtopic.description,
        totalQuestions,
        completedQuestions,
        pendingQuestions: totalQuestions - completedQuestions,
        questions,
      };
    });
    const totalQuestions = subtopics.reduce(
      (count, subtopic) => count + subtopic.totalQuestions,
      0,
    );
    const completedQuestions = subtopics.reduce(
      (count, subtopic) => count + subtopic.completedQuestions,
      0,
    );

    return {
      id: track.id,
      title: track.title,
      sourceName: track.sourceName,
      playlistTitle: track.playlistTitle,
      playlistUrl: track.playlistUrl,
      totalQuestions,
      completedQuestions,
      pendingQuestions: totalQuestions - completedQuestions,
      subtopics,
    };
  });

  return {
    summary: {
      ...snapshot.summary,
      pendingQuestions:
        snapshot.summary.totalQuestions - snapshot.summary.completedQuestions,
    },
    tracks,
  };
}

export function createKanbanMcpServer(userId = SOLO_USER_ID) {
  const server = new McpServer({
    name: "careeright-kanban",
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
    "list_dsa_questions",
    {
      title: "List DSA Questions",
      description:
        "List DSA questions grouped by topic/subtopic with completed and pending counts for the connected user.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => jsonText(await dsaQuestionsPayload(userId)),
  );

  server.registerTool(
    "get_projects_summary",
    {
      title: "Get Projects Summary",
      description:
        "Read counts for the connected user's project workspaces, notebook pages, resources, clickable references, and resume-project import readiness.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () =>
      jsonText({
        summary: await getProjectsSummary(userId),
      }),
  );

  server.registerTool(
    "list_projects",
    {
      title: "List Projects",
      description:
        "List the connected user's project workspaces with metadata, resources, and clickable reference attributes. Notes are fetched with get_project.",
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () =>
      jsonText({
        projects: await listProjects(userId),
      }),
  );

  server.registerTool(
    "get_project",
    {
      title: "Get Project",
      description:
        "Fetch one project workspace with all notebook pages, resources, and clickable reference attributes.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        project: await getProject(input, userId),
      }),
  );

  server.registerTool(
    "create_project",
    {
      title: "Create Project",
      description:
        "Create a private project workspace for markdown notes, Mermaid diagrams, resources, and project-scoped references.",
      inputSchema: {
        title: z.string().min(1).max(140).describe("Project name."),
        summary: z.string().max(3000).optional().describe("Project summary."),
        techStack: z
          .array(z.string().min(1).max(50))
          .max(30)
          .optional()
          .describe("Technologies used by the project."),
        status: mcpProjectStatusSchema.optional().describe("Project status."),
        dateText: z
          .string()
          .max(160)
          .optional()
          .describe("Timeline text, for example Jan 2026 - Present."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ title, summary, techStack, status, dateText }) =>
      jsonText({
        project: await createProject(
          {
            title,
            ...definedPatch({ summary, techStack, status, dateText }),
          },
          userId,
        ),
      }),
  );

  server.registerTool(
    "update_project",
    {
      title: "Update Project",
      description:
        "Update project metadata such as title, summary, tech stack, status, or timeline. This does not overwrite notes, resources, or references.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
        title: z.string().min(1).max(140).optional().describe("New project name."),
        summary: z.string().max(3000).optional().describe("New project summary."),
        techStack: z
          .array(z.string().min(1).max(50))
          .max(30)
          .optional()
          .describe("Replacement technology list."),
        status: mcpProjectStatusSchema.optional().describe("Replacement status."),
        dateText: z.string().max(160).optional().describe("Replacement timeline text."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, title, summary, techStack, status, dateText }) =>
      jsonText({
        project: await updateProject(
          {
            projectId,
            patch: definedPatch({ title, summary, techStack, status, dateText }),
          },
          userId,
        ),
      }),
  );

  server.registerTool(
    "archive_project",
    {
      title: "Archive Project",
      description:
        "Archive a project workspace while keeping it recoverable in stored project data.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        project: await archiveProject(input, userId),
      }),
  );

  server.registerTool(
    "delete_project",
    {
      title: "Delete Project",
      description:
        "Soft-delete a project workspace from the user's project tab. Use only after explicit user confirmation.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        project: await deleteProject(input, userId),
      }),
  );

  server.registerTool(
    "import_projects_from_profile",
    {
      title: "Import Projects From Profile",
      description:
        "Create project workspaces for resume profile items of type project that have not already been imported.",
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async () =>
      jsonText({
        result: await importFromProfileProjects(userId),
      }),
  );

  server.registerTool(
    "sync_project_from_profile",
    {
      title: "Sync Project From Profile",
      description:
        "One-way sync linked resume project metadata into a project workspace. Notes, resources, and references are preserved.",
      inputSchema: {
        projectId: z.string().min(1).describe("Linked project workspace ID."),
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
        project: await syncFromProfileProject(input, userId),
      }),
  );

  server.registerTool(
    "create_project_note",
    {
      title: "Create Project Note",
      description:
        "Create a markdown notebook page for a project. GitHub-flavored markdown and fenced mermaid blocks render in Careeright.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
        title: z.string().min(1).max(140).describe("Notebook page title."),
        content: z
          .string()
          .max(100_000)
          .optional()
          .describe("Markdown content. Use ```mermaid fences for diagrams."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, title, content }) =>
      jsonText({
        note: await createNote(
          {
            projectId,
            title,
            ...definedPatch({ content }),
          },
          userId,
        ),
      }),
  );

  server.registerTool(
    "update_project_note",
    {
      title: "Update Project Note",
      description:
        "Update a project notebook page's title and/or markdown content.",
      inputSchema: {
        noteId: z.string().min(1).describe("Project note ID."),
        title: z.string().min(1).max(140).optional().describe("New note title."),
        content: z
          .string()
          .max(100_000)
          .optional()
          .describe("Replacement markdown content."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ noteId, title, content }) =>
      jsonText({
        note: await updateNote(
          {
            noteId,
            patch: definedPatch({ title, content }),
          },
          userId,
        ),
      }),
  );

  server.registerTool(
    "delete_project_note",
    {
      title: "Delete Project Note",
      description:
        "Delete a notebook page from a project. Use only after explicit user confirmation.",
      inputSchema: {
        noteId: z.string().min(1).describe("Project note ID."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        note: await deleteNote(input, userId),
      }),
  );

  server.registerTool(
    "reorder_project_notes",
    {
      title: "Reorder Project Notes",
      description:
        "Replace a project's notebook page order. The noteIds array must include every note in the project exactly once.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
        noteIds: z
          .array(z.string().min(1))
          .max(200)
          .describe("All note IDs in the desired order."),
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
        notes: await reorderNotes(input, userId),
      }),
  );

  server.registerTool(
    "create_project_resource",
    {
      title: "Create Project Resource",
      description:
        "Add an HTTP/HTTPS resource link to a project, such as a repository, demo, docs page, article, video, or design link.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
        title: z.string().min(1).max(140).describe("Resource title."),
        url: mcpHttpUrlSchema.describe("HTTP or HTTPS resource URL."),
        type: mcpProjectResourceTypeSchema
          .optional()
          .describe("Resource category. Defaults to link."),
        note: z.string().max(1000).optional().describe("Why this link matters."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, title, url, type, note }) =>
      jsonText({
        resource: await createResource(
          {
            projectId,
            title,
            url,
            ...definedPatch({ type, note }),
          },
          userId,
        ),
      }),
  );

  server.registerTool(
    "update_project_resource",
    {
      title: "Update Project Resource",
      description:
        "Update a project resource's title, URL, type, or note.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
        resourceId: z.string().min(1).describe("Project resource ID."),
        title: z.string().min(1).max(140).optional().describe("New resource title."),
        url: mcpHttpUrlSchema.optional().describe("New HTTP or HTTPS resource URL."),
        type: mcpProjectResourceTypeSchema.optional().describe("New resource type."),
        note: z.string().max(1000).optional().describe("New resource note."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, resourceId, title, url, type, note }) =>
      jsonText({
        resource: await updateResource(
          {
            projectId,
            resourceId,
            patch: definedPatch({ title, url, type, note }),
          },
          userId,
        ),
      }),
  );

  server.registerTool(
    "delete_project_resource",
    {
      title: "Delete Project Resource",
      description:
        "Delete a project resource and unlink it from project references. Use only after explicit user confirmation.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
        resourceId: z.string().min(1).describe("Project resource ID."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        resource: await deleteResource(input, userId),
      }),
  );

  server.registerTool(
    "create_project_attribute",
    {
      title: "Create Project Attribute",
      description:
        "Create a project-scoped clickable reference term. Matching labels and aliases become clickable inside project markdown preview.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
        label: z.string().min(1).max(80).describe("Primary clickable term, for example Kafka."),
        aliases: z
          .array(z.string().min(1).max(80))
          .max(20)
          .optional()
          .describe("Other terms that should open the same reference."),
        type: mcpProjectAttributeTypeSchema
          .optional()
          .describe("Reference type. Defaults to concept."),
        dateValue: z
          .string()
          .max(80)
          .optional()
          .describe("Date details when type is date."),
        description: z
          .string()
          .max(2000)
          .optional()
          .describe("Reference explanation in the context of this project."),
        resourceIds: z
          .array(z.string().min(1))
          .max(50)
          .optional()
          .describe("Project resource IDs related to this reference."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ projectId, label, aliases, type, dateValue, description, resourceIds }) =>
      jsonText({
        attribute: await createAttribute(
          {
            projectId,
            label,
            ...definedPatch({ aliases, type, dateValue, description, resourceIds }),
          },
          userId,
        ),
      }),
  );

  server.registerTool(
    "update_project_attribute",
    {
      title: "Update Project Attribute",
      description:
        "Update a project reference term, aliases, type, date details, description, or related resources.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
        attributeId: z.string().min(1).describe("Project attribute ID."),
        label: z.string().min(1).max(80).optional().describe("New clickable term."),
        aliases: z
          .array(z.string().min(1).max(80))
          .max(20)
          .optional()
          .describe("Replacement aliases."),
        type: mcpProjectAttributeTypeSchema.optional().describe("New reference type."),
        dateValue: z.string().max(80).optional().describe("New date details."),
        description: z.string().max(2000).optional().describe("New explanation."),
        resourceIds: z
          .array(z.string().min(1))
          .max(50)
          .optional()
          .describe("Replacement related resource IDs."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({
      projectId,
      attributeId,
      label,
      aliases,
      type,
      dateValue,
      description,
      resourceIds,
    }) =>
      jsonText({
        attribute: await updateAttribute(
          {
            projectId,
            attributeId,
            patch: definedPatch({
              label,
              aliases,
              type,
              dateValue,
              description,
              resourceIds,
            }),
          },
          userId,
        ),
      }),
  );

  server.registerTool(
    "delete_project_attribute",
    {
      title: "Delete Project Attribute",
      description:
        "Delete a clickable project reference term. Use only after explicit user confirmation.",
      inputSchema: {
        projectId: z.string().min(1).describe("Project workspace ID."),
        attributeId: z.string().min(1).describe("Project attribute ID."),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        openWorldHint: false,
      },
    },
    async (input) =>
      jsonText({
        attribute: await deleteAttribute(input, userId),
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
          .describe("All well-fit jobs to upsert into Careeright."),
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
        "Create a pending task-breakdown proposal from tasks already generated by the MCP client. Best workflow: call prepare_task_breakdown_prompt first, ask any returned questions, generate tasks using generationBrief, optionally call review_task_breakdown_proposal, then submit only specific, measurable, dependency-aware tasks. The user reviews the pending proposal in Careeright before tasks are added to the board.",
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
        "Create a pending profile import from structured resume data already extracted by the MCP client. Careeright does not parse resume files or call an AI model here; the user reviews and applies the import in the profile UI.",
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
    "careeright://boards/default/snapshot",
    {
      title: "Current Board Snapshot",
      description: "Current board, columns, tasks, and pending proposals.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "careeright://boards/default/snapshot",
          mimeType: "application/json",
          text: JSON.stringify(await getBoardSnapshot(userId), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "profile_snapshot",
    "careeright://profile/snapshot",
    {
      title: "Current Profile Snapshot",
      description: "Current profile basics, profile items, and pending imports.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "careeright://profile/snapshot",
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
    "projects_overview",
    "careeright://projects/overview",
    {
      title: "Projects Overview",
      description:
        "Project workspace summary plus project metadata, resources, and clickable references. Use get_project for notebook pages.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "careeright://projects/overview",
          mimeType: "application/json",
          text: JSON.stringify(
            {
              summary: await getProjectsSummary(userId),
              projects: await listProjects(userId),
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
    "careeright://jobs/search-profile",
    {
      title: "Job Search Profile",
      description: "Profile-derived job search settings and ranking limits.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "careeright://jobs/search-profile",
          mimeType: "application/json",
          text: JSON.stringify(await getJobSearchProfile(userId), null, 2),
        },
      ],
    }),
  );

  server.registerResource(
    "latest_job_digest",
    "careeright://jobs/latest-digest",
    {
      title: "Latest Job Digest",
      description: "Latest ranked job curation digest.",
      mimeType: "application/json",
    },
    async () => ({
      contents: [
        {
          uri: "careeright://jobs/latest-digest",
          mimeType: "application/json",
          text: JSON.stringify((await listJobDigests(userId, 1))[0] ?? null, null, 2),
        },
      ],
    }),
  );

  return server;
}
