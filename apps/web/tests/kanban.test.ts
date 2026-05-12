import { describe, expect, test } from "vitest";

import {
  TASK_BREAKDOWN_SYSTEM_PROMPT,
  createTaskBreakdown,
  taskBreakdownOutputSchema,
  type TaskBreakdownResult,
} from "@careeright/domain/ai/task-breakdown";
import { getAuthRuntimeConfig } from "@careeright/auth/server";
import { getMongoDatabaseName } from "@careeright/db";
import { POST as handleMcpPost } from "../app/mcp/route";
import {
  type AiProposal,
  type ProposedTask,
  SOLO_USER_ID,
  createTaskInputSchema,
  proposeTaskBreakdownFromTasksInputSchema,
  proposedTaskSchema,
  taskBreakdownPayloadSchema,
  taskReferenceSchema,
  taskSchema,
  taskUpdatePatchSchema,
} from "@careeright/domain/kanban/schema";
import {
  prepareTaskBreakdownPrompt,
  reviewTaskBreakdownProposal,
} from "@careeright/domain/kanban/prompt-preparation";
import { proposalTopic } from "@careeright/domain/kanban/proposal-topic";
import { taskFingerprint } from "@careeright/domain/kanban/task-fingerprint";
import {
  acceptProposal,
  createMcpToken,
  createTask,
  deleteProposal,
  deleteUserScopedData,
  getBoardSnapshot,
  getDashboardMetrics,
  listMcpTokens,
  listProposalHistory,
  proposeTaskBreakdown,
  proposeTaskBreakdownFromTasks,
  proposeStartWork,
  proposeTaskDelete,
  proposeTaskUpdate,
  rejectProposal,
  resolveMcpToken,
  resolveTaskReference,
  revokeMcpToken,
  revertTaskToProposal,
} from "@careeright/domain/kanban/store";
import {
  createKanbanMcpServer,
  mcpTaskReferenceSchema,
} from "@careeright/mcp/server";

process.env.MONGODB_URI = "";

describe("auth config", () => {
  test("uses Google OAuth without email and password", () => {
    const config = getAuthRuntimeConfig({
      BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
      BETTER_AUTH_URL: "http://localhost:3000",
      GOOGLE_CLIENT_ID: "google-client-id",
      GOOGLE_CLIENT_SECRET: "google-client-secret",
    });

    expect(config.socialProviders?.google.clientId).toBe("google-client-id");
    expect(config.socialProviders?.google.clientSecret).toBe(
      "google-client-secret",
    );
    expect("advanced" in config).toBe(false);
    expect("emailAndPassword" in config).toBe(false);
  });

  test("fails clearly in production without Google OAuth credentials", () => {
    expect(() =>
      getAuthRuntimeConfig({
        BETTER_AUTH_SECRET: "test-secret-with-at-least-32-characters",
        BETTER_AUTH_URL: "http://localhost:3000",
        NODE_ENV: "production",
      }),
    ).toThrow("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required");
  });
});

describe("db config", () => {
  test("prefers MONGODB_DB and supports legacy MONGODB_DB_NAME", () => {
    expect(
      getMongoDatabaseName({
        MONGODB_DB: "careeright-custom",
        MONGODB_DB_NAME: "legacy-name",
      }),
    ).toBe("careeright-custom");

    expect(
      getMongoDatabaseName({
        MONGODB_DB_NAME: "legacy-name",
      }),
    ).toBe("legacy-name");

    expect(getMongoDatabaseName({})).toBe("careeright");
  });
});

describe("kanban schemas", () => {
  test("rejects empty task titles", () => {
    expect(() =>
      createTaskInputSchema.parse({
        title: "",
      }),
    ).toThrow();
  });

  test("requires at least one update field", () => {
    expect(() => taskUpdatePatchSchema.parse({})).toThrow();
  });

  test("requires task numbers on stored tasks", () => {
    expect(() =>
      taskSchema.parse({
        id: "task-without-number",
        boardId: "default-board",
        userId: "solo-user",
        columnId: "todo",
        title: "Missing number",
        description: "",
        priority: "medium",
        acceptanceCriteria: [],
        dependencies: [],
        order: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    ).toThrow();
  });

  test("accepts exactly one task reference", () => {
    expect(taskReferenceSchema.parse({ taskNumber: 1 }).taskNumber).toBe(1);
    expect(taskReferenceSchema.parse({ taskId: "task-1" }).taskId).toBe(
      "task-1",
    );
    expect(() => taskReferenceSchema.parse({})).toThrow();
    expect(() =>
      taskReferenceSchema.parse({ taskId: "task-1", taskNumber: 1 }),
    ).toThrow();
    expect(mcpTaskReferenceSchema.parse({ taskNumber: 1 }).taskNumber).toBe(1);
  });

  test("accepts proposed task shape", () => {
    const task = proposedTaskSchema.parse({
      title: "Ship MCP proposal flow",
      description: "Expose safe write proposals to AI clients.",
      priority: "high",
      acceptanceCriteria: ["Creates proposals only"],
      suggestedColumn: "todo",
      dependencies: [],
      resourceLinks: [
        {
          title: "MCP docs",
          url: "https://modelcontextprotocol.io/docs",
        },
      ],
      helpfulLinks: [
        {
          url: "https://example.com/checklist",
        },
      ],
      problemLinks: [
        {
          title: "Practice set",
          url: "https://example.com/problems",
        },
      ],
    });

    expect(task.priority).toBe("high");
    expect(task.resourceLinks[0].title).toBe("MCP docs");
    expect(task.helpfulLinks[0].url).toBe("https://example.com/checklist");
  });

  test("defaults missing reference links to empty arrays", () => {
    const task = proposedTaskSchema.parse({
      title: "Default proposal links",
    });

    expect(task.resourceLinks).toEqual([]);
    expect(task.helpfulLinks).toEqual([]);
    expect(task.problemLinks).toEqual([]);
  });

  test("defaults missing task-breakdown clarification fields safely", () => {
    const payload = taskBreakdownPayloadSchema.parse({
      prompt: "Build a proposal",
      tasks: [taskFixture("Default clarification fields")],
    });

    expect(payload.clarifications).toEqual([]);
    expect(payload.refinedPrompt).toBeUndefined();
  });

  test("accepts structured proposal clarification context", () => {
    const input = proposeTaskBreakdownFromTasksInputSchema.parse({
      prompt: "Build AI chat",
      refinedPrompt: "Build AI chat for authenticated SaaS users.",
      clarifications: [
        {
          question: "Who is the target user?",
          answer: "Authenticated SaaS workspace members.",
        },
      ],
      tasks: [taskFixture("Design chat scope")],
    });

    expect(input.refinedPrompt).toContain("authenticated SaaS users");
    expect(input.clarifications[0].answer).toBe(
      "Authenticated SaaS workspace members.",
    );
  });

  test("accepts proposal task arrays beyond previous fixed caps", () => {
    const thirteenTasks = taskList(13, "AI generated plan task");
    const fiftyOneTasks = taskList(51, "MCP supplied plan task");

    expect(
      taskBreakdownOutputSchema.parse({ tasks: thirteenTasks }).tasks,
    ).toHaveLength(13);
    expect(
      proposeTaskBreakdownFromTasksInputSchema.parse({
        prompt: "Create a complete linked list practice plan",
        tasks: fiftyOneTasks,
      }).tasks,
    ).toHaveLength(51);
  });

  test("rejects unsafe reference link URLs", () => {
    expect(() =>
      proposedTaskSchema.parse({
        title: "Unsafe link",
        resourceLinks: [{ url: "javascript:alert(1)" }],
      }),
    ).toThrow();
  });

  test("accepts optional proposal source metadata on task creation", () => {
    const input = createTaskInputSchema.parse({
      title: "Source-aware card",
      sourceProposalId: "proposal-1",
      sourceProposalItemFingerprint: "fingerprint-1",
      sourceProposalTopic: "HLD",
    });

    expect(input.sourceProposalId).toBe("proposal-1");
    expect(input.sourceProposalItemFingerprint).toBe("fingerprint-1");
    expect(input.sourceProposalTopic).toBe("HLD");
  });
});

describe("prompt preparation", () => {
  test("weak prompts request useful clarification questions", () => {
    const result = prepareTaskBreakdownPrompt({ prompt: "Linked list" });

    expect(result.status).toBe("needs_clarification");
    expect(result.round).toBe(1);
    expect(result.maxRounds).toBe(2);
    expect(result.questions.length).toBeGreaterThan(0);
    expect(result.questions.length).toBeLessThanOrEqual(5);
    expect(result.questions.join(" ")).toContain("skill level");
    expect(result.refinedPrompt).toBeUndefined();
    expect(result.generationBrief?.proposalKind).toBe("study_plan");
    expect(result.generationBrief?.detectedTopic).toBe("Linked List");
    expect(result.generationBrief?.recommendedPhases).toContain(
      "Pointer tracing",
    );
  });

  test("clear prompts are ready with a refined prompt", () => {
    const prompt =
      "Build a production AI chat system for authenticated teams in a Next.js and MongoDB app over a two-week MVP with streaming responses, conversation persistence, rate limits, observability, and release tests.";
    const result = prepareTaskBreakdownPrompt({ prompt });

    expect(result.status).toBe("ready");
    expect(result.round).toBe(1);
    expect(result.maxRounds).toBe(2);
    expect(result.questions).toEqual([]);
    expect(result.refinedPrompt).toContain(prompt);
    expect(result.generationBrief?.proposalKind).toBe("implementation_plan");
    expect(result.generationBrief?.suggestedTitle).toBe(
      "AI Chat Implementation Plan",
    );
    expect(result.generationBrief?.constraints).toContain(
      "Use MongoDB-aware persistence tasks.",
    );
  });

  test("returns learner-context generation brief for linked list practice", () => {
    const result = prepareTaskBreakdownPrompt({
      prompt: "someone who already knows basic linked list c",
    });

    expect(result.generationBrief?.suggestedTitle).toBe(
      "Intermediate Linked List Practice in C",
    );
    expect(result.generationBrief?.audience).toContain("knows the basics");
    expect(result.generationBrief?.constraints).toContain(
      "Use C examples where code is needed.",
    );
  });

  test("returns operations generation brief for deployment checklists", () => {
    const result = prepareTaskBreakdownPrompt({
      prompt: "create deployment checklist",
    });

    expect(result.generationBrief?.proposalKind).toBe("operations_workflow");
    expect(result.generationBrief?.suggestedTitle).toBe(
      "Deployment Operations Workflow",
    );
    expect(result.generationBrief?.recommendedPhases).toContain("Rollback");
  });

  test("clarification questions are capped and deterministic", () => {
    const first = prepareTaskBreakdownPrompt({ prompt: "Make it better" });
    const second = prepareTaskBreakdownPrompt({ prompt: "Make it better" });

    expect(first.questions).toHaveLength(5);
    expect(second.questions).toEqual(first.questions);
  });

  test("uses a second clarification round when answers are still incomplete", () => {
    const result = prepareTaskBreakdownPrompt({
      prompt: "Build AI agent",
      clarifications: [
        {
          question: "Who are the primary users or stakeholders?",
          answer: "Developers.",
        },
      ],
    });

    expect(result.status).toBe("needs_clarification");
    expect(result.round).toBe(2);
    expect(result.maxRounds).toBe(2);
    expect(result.questions.length).toBeGreaterThan(0);
  });

  test("does not ask beyond two clarification rounds", () => {
    const result = prepareTaskBreakdownPrompt({
      prompt: "Build AI agent",
      clarifications: [
        {
          question: "Who are the primary users or stakeholders?",
          answer: "Developers.",
        },
        {
          question: "What timeline should the proposal assume?",
          answer: "No strict timeline.",
        },
      ],
    });

    expect(result.status).toBe("ready");
    expect(result.round).toBe(2);
    expect(result.questions).toEqual([]);
    expect(result.refinedPrompt).toContain("Clarifications:");
  });
});

describe("proposal review guidance", () => {
  test("detects weak generated proposal tasks before MCP submission", () => {
    const review = reviewTaskBreakdownProposal({
      prompt: "Linked list for interview prep",
      title: "Create 3 tasks",
      tasks: [
        { title: "Learn basics" },
        { title: "Learn basics" },
        {
          title: "Practice",
          description: "Do practice.",
          acceptanceCriteria: ["Done"],
        },
      ],
    });

    expect(review.verdict).toBe("needs_revision");
    expect(review.score).toBeLessThan(80);
    expect(review.issues.join(" ")).toContain("acceptance criteria");
    expect(review.issues.join(" ")).toContain("specific proposal title");
    expect(review.duplicateOrWeakTasks.join(" ")).toContain("Duplicate");
    expect(review.duplicateOrWeakTasks.join(" ")).toContain("Weak task title");
    expect(review.missingCoverage).toContain("Pointer tracing");
    expect(review.recommendedFixes.join(" ")).toContain("missing phases");
    expect(review.improvedTitle).toBe("Linked List Interview Prep");
  });
});

describe("proposal topics", () => {
  test("infers HLD and LLD topics from proposal text", () => {
    expect(
      proposalTopic(
        proposalFixture("I have to study about high-level design interviews"),
      ).name,
    ).toBe("HLD");
    expect(
      proposalTopic(
        proposalFixture("I have to study about low-level design interviews"),
      ).name,
    ).toBe("LLD");
  });

  test("derives a topic from the proposal prompt", () => {
    const topic = proposalTopic(
      proposalFixture("Please create proposal for GraphQL caching practice"),
    );

    expect(topic.name).toBe("GraphQL Caching Practice");
    expect(topic.slug).toBe("graphql-caching-practice");
  });

  test("creates concise study topic names from learner context", () => {
    expect(
      proposalTopic(
        proposalFixture("someone who already knows basic linked list c..."),
      ).name,
    ).toBe("Intermediate Linked List Practice in C");
    expect(
      proposalTopic(proposalFixture("linked list for MNC interview in Java"))
        .name,
    ).toBe("Linked List Interview Prep in Java");
    expect(proposalTopic(proposalFixture("graph bfs dfs practice")).name).toBe(
      "Graph BFS/DFS Practice",
    );
  });

  test("prefers meaningful proposal titles over generic task counts", () => {
    expect(
      proposalTopic(
        proposalFixture("linked list for interviews", {
          title: "Linked List Study Plan",
        }),
      ).name,
    ).toBe("Linked List Study Plan");
    expect(
      proposalTopic(
        proposalFixture("Please create proposal", {
          title: "Create 12 tasks",
        }),
      ).name,
    ).toBe("General");
  });
});

describe("AI task breakdown", () => {
  test("task breakdown system prompt keeps review-derived quality constraints", () => {
    expect(TASK_BREAKDOWN_SYSTEM_PROMPT).not.toContain("8 to 12");
    expect(TASK_BREAKDOWN_SYSTEM_PROMPT).toContain(
      "as many concise, actionable tasks as needed",
    );
    expect(TASK_BREAKDOWN_SYSTEM_PROMPT).toContain(
      "foundation-to-advanced progression",
    );
    expect(TASK_BREAKDOWN_SYSTEM_PROMPT).toContain(
      "measurable and action-oriented",
    );
    expect(TASK_BREAKDOWN_SYSTEM_PROMPT).toContain(
      "topic-specific subpatterns",
    );
    expect(TASK_BREAKDOWN_SYSTEM_PROMPT).toContain(
      "skill level, timeline, daily study time",
    );
    expect(TASK_BREAKDOWN_SYSTEM_PROMPT).toContain(
      "resourceLinks, helpfulLinks, or problemLinks",
    );
    expect(TASK_BREAKDOWN_SYSTEM_PROMPT).toContain(
      "You do not create direct Todo cards",
    );
  });

  test("fails without an AI model instead of creating dummy tasks", async () => {
    const originalModel = process.env.AI_TASK_MODEL;
    process.env.AI_TASK_MODEL = "";

    try {
      await expect(
        createTaskBreakdown("Build a Kanban board with MCP tools"),
      ).rejects.toThrow("AI_TASK_MODEL is required");
    } finally {
      process.env.AI_TASK_MODEL = originalModel;
    }
  });

  test("does not create a proposal when AI task breakdown is unconfigured", async () => {
    const originalModel = process.env.AI_TASK_MODEL;
    process.env.AI_TASK_MODEL = "";
    const before = await listProposalHistory();

    try {
      await expect(
        proposeTaskBreakdown(
          `No dummy proposal ${crypto.randomUUID()}`,
          "app",
          SOLO_USER_ID,
        ),
      ).rejects.toThrow("AI_TASK_MODEL is required");

      const after = await listProposalHistory();
      expect(after).toHaveLength(before.length);
    } finally {
      process.env.AI_TASK_MODEL = originalModel;
    }
  });

  test("creates AI proposals with more than twelve generated tasks", async () => {
    const proposal = await proposeTaskBreakdown(
      `Large study plan ${crypto.randomUUID()}`,
      "app",
      SOLO_USER_ID,
      stubBreakdown(taskList(13, "Generated app task")),
    );

    if (!("tasks" in proposal.payload)) {
      throw new Error("Expected a task breakdown proposal.");
    }

    expect(proposal.title).toBe("Create 13 tasks");
    expect(proposal.payload.tasks).toHaveLength(13);
  });

  test("creates structured MCP proposals without an AI model", async () => {
    const originalModel = process.env.AI_TASK_MODEL;
    process.env.AI_TASK_MODEL = "";
    const task = taskFixture(`Linked list basics ${crypto.randomUUID()}`, {
      resourceLinks: [
        {
          title: "Linked list notes",
          url: "https://example.com/linked-list-notes",
        },
      ],
      helpfulLinks: [
        {
          title: "Pointer tracing",
          url: "https://example.com/pointer-tracing",
        },
      ],
      problemLinks: [
        {
          title: "Linked list practice",
          url: "https://example.com/linked-list-practice",
        },
      ],
    });

    try {
      const proposal = await proposeTaskBreakdownFromTasks(
        {
          prompt: "Linked list",
          refinedPrompt: "Linked list study for MNC interview preparation.",
          clarifications: [
            {
              question: "What is the target outcome?",
              answer: "MNC interview preparation.",
            },
          ],
          title: "Linked List Study Plan",
          summary: "Client-generated tasks for linked list study.",
          tasks: [task],
        },
        "mcp",
        SOLO_USER_ID,
      );

      expect(proposal.status).toBe("pending");
      expect(proposal.source).toBe("mcp");
      expect(proposal.type).toBe("task_breakdown");
      expect(proposal.title).toBe("Linked List Study Plan");
      expect(proposal.summary).toBe(
        "Client-generated tasks for linked list study.",
      );

      if (!("tasks" in proposal.payload)) {
        throw new Error("Expected a task breakdown proposal.");
      }

      expect(proposal.payload.prompt).toBe("Linked list");
      expect(proposal.payload.refinedPrompt).toBe(
        "Linked list study for MNC interview preparation.",
      );
      expect(proposal.payload.clarifications[0]).toEqual({
        question: "What is the target outcome?",
        answer: "MNC interview preparation.",
      });
      expect(proposal.payload.tasks).toEqual([task]);
      expect(proposal.payload.tasks[0].problemLinks[0].title).toBe(
        "Linked list practice",
      );
      expect(
        (await listProposalHistory()).some((item) => item.id === proposal.id),
      ).toBe(true);
    } finally {
      process.env.AI_TASK_MODEL = originalModel;
    }
  });

  test("rejects invalid structured MCP proposal tasks", async () => {
    await expect(
      proposeTaskBreakdownFromTasks({
        prompt: "Linked list",
        tasks: [],
      }),
    ).rejects.toThrow();

    await expect(
      proposeTaskBreakdownFromTasks({
        prompt: "Linked list",
        tasks: [
          {
            title: "",
          },
        ],
      }),
    ).rejects.toThrow();
  });
});

describe("proposal flow", () => {
  test("starts with no preloaded tasks", async () => {
    const snapshot = await getBoardSnapshot();

    expect(snapshot.tasks).toHaveLength(0);
  });

  test("keeps board data isolated per user", async () => {
    const userA = `user-a-${crypto.randomUUID()}`;
    const userB = `user-b-${crypto.randomUUID()}`;

    const userATask = await createTask(
      {
        columnId: "todo",
        title: "User A private task",
        description: "",
        priority: "medium",
        acceptanceCriteria: [],
        dependencies: [],
      },
      userA,
    );

    const userAProposal = await proposeTaskBreakdownFromTasks(
      {
        prompt: "User A proposal",
        tasks: [taskFixture("User A proposal task")],
      },
      "mcp",
      userA,
    );

    const userASnapshot = await getBoardSnapshot(userA);
    const userBSnapshot = await getBoardSnapshot(userB);
    const userBHistory = await listProposalHistory(userB);

    expect(userASnapshot.tasks.some((task) => task.id === userATask.id)).toBe(
      true,
    );
    expect(userASnapshot.proposals.some((item) => item.id === userAProposal.id))
      .toBe(true);
    expect(userBSnapshot.tasks).toHaveLength(0);
    expect(userBHistory.some((item) => item.id === userAProposal.id)).toBe(
      false,
    );
  });

  test("assigns stable task numbers to user-created tasks", async () => {
    const before = await getBoardSnapshot();
    const highestTaskNumber = before.tasks.reduce(
      (highest, task) => Math.max(highest, task.taskNumber),
      0,
    );

    const created = await createTask({
      columnId: "todo",
      title: "Practice numbered task creation",
      description: "Verify human-facing task numbers are board-local.",
      priority: "medium",
      acceptanceCriteria: [],
      dependencies: [],
    });

    expect(created.taskNumber).toBe(highestTaskNumber + 1);

    const after = await getBoardSnapshot();
    expect(after.tasks.find((task) => task.id === created.id)?.taskNumber).toBe(
      created.taskNumber,
    );
  });

  test("accepting breakdown proposals only marks them accepted", async () => {
    const before = await getBoardSnapshot();
    const proposal = await proposeTaskBreakdown(
      "Add several LLD practice cards for design pattern study",
      "app",
      SOLO_USER_ID,
      stubBreakdown([
        taskFixture("Study one real LLD design problem", {
          resourceLinks: [
            {
              title: "Design patterns guide",
              url: "https://example.com/design-patterns",
            },
          ],
          helpfulLinks: [
            {
              title: "UML refresher",
              url: "https://example.com/uml",
            },
          ],
          problemLinks: [
            {
              title: "LLD practice",
              url: "https://example.com/lld-practice",
            },
          ],
        }),
        taskFixture("Review LLD design tradeoffs"),
      ]),
    );

    const accepted = await acceptProposal({ proposalId: proposal.id });

    const after = await getBoardSnapshot();
    const history = await listProposalHistory();

    expect(accepted.status).toBe("accepted");
    expect(after.tasks.map((task) => task.id).sort()).toEqual(
      before.tasks.map((task) => task.id).sort(),
    );
    expect(history.find((item) => item.id === proposal.id)?.status).toBe(
      "accepted",
    );
  });

  test("accepting breakdown proposals does not add remaining proposed tasks", async () => {
    const before = await getBoardSnapshot();
    const plannedTask = taskFixture("Avoid duplicate proposal task");
    const proposal = await proposeTaskBreakdown(
      `Plan duplicate skip flow ${crypto.randomUUID()}`,
      "app",
      SOLO_USER_ID,
      stubBreakdown([plannedTask, taskFixture("Add only the missing task")]),
    );

    if (!("tasks" in proposal.payload)) {
      throw new Error("Expected a task breakdown proposal.");
    }

    const individuallyAddedTask = proposal.payload.tasks[0];

    await createTask({
      columnId: "todo",
      title: individuallyAddedTask.title,
      description: individuallyAddedTask.description,
      priority: individuallyAddedTask.priority,
      acceptanceCriteria: individuallyAddedTask.acceptanceCriteria,
      dependencies: individuallyAddedTask.dependencies,
      resourceLinks: [
        {
          title: "Different link should not affect duplicate detection",
          url: "https://example.com/different",
        },
      ],
    });

    await acceptProposal({ proposalId: proposal.id });

    const duplicateFingerprint = taskFingerprint(individuallyAddedTask);
    const after = await getBoardSnapshot();
    const matchingTasks = after.tasks.filter(
      (task) => taskFingerprint(task) === duplicateFingerprint,
    );

    expect(matchingTasks).toHaveLength(1);
    expect(after.tasks).toHaveLength(before.tasks.length + 1);
    expect(
      after.tasks.some((task) => task.title === "Add only the missing task"),
    ).toBe(false);
  });

  test("lists proposal history across all statuses", async () => {
    const suffix = crypto.randomUUID();
    const accepted = await proposeTaskBreakdown(
      `Accepted history proposal ${suffix}`,
      "app",
      SOLO_USER_ID,
      stubBreakdown([taskFixture(`Accepted history task ${suffix}`)]),
    );
    const rejected = await proposeTaskBreakdown(
      `Rejected history proposal ${suffix}`,
      "app",
      SOLO_USER_ID,
      stubBreakdown([taskFixture(`Rejected history task ${suffix}`)]),
    );
    const pending = await proposeTaskBreakdown(
      `Pending history proposal ${suffix}`,
      "app",
      SOLO_USER_ID,
      stubBreakdown([taskFixture(`Pending history task ${suffix}`)]),
    );

    await acceptProposal({ proposalId: accepted.id });
    await rejectProposal({ proposalId: rejected.id });

    const history = await listProposalHistory();
    const statuses = new Map(
      history
        .filter((proposal) =>
          [accepted.id, rejected.id, pending.id].includes(proposal.id),
        )
        .map((proposal) => [proposal.id, proposal.status]),
    );

    expect(statuses.get(accepted.id)).toBe("accepted");
    expect(statuses.get(rejected.id)).toBe("rejected");
    expect(statuses.get(pending.id)).toBe("pending");
  });

  test("soft deletes proposals from history, snapshots, and metrics", async () => {
    const userId = `proposal-delete-${crypto.randomUUID()}`;
    const proposal = await proposeTaskBreakdownFromTasks(
      {
        prompt: "Soft-delete proposal",
        tasks: [taskFixture("Hidden proposal task")],
      },
      "mcp",
      userId,
    );

    const beforeMetrics = await getDashboardMetrics(userId);
    const deleted = await deleteProposal({ proposalId: proposal.id }, userId);

    expect(deleted.deletedAt).toBeDefined();
    expect(beforeMetrics.proposalCount).toBe(1);
    expect(
      (await listProposalHistory(userId)).some(
        (item) => item.id === proposal.id,
      ),
    ).toBe(false);
    expect(
      (await getBoardSnapshot(userId)).proposals.some(
        (item) => item.id === proposal.id,
      ),
    ).toBe(false);
    expect((await getDashboardMetrics(userId)).proposalCount).toBe(0);
    await expect(
      acceptProposal({ proposalId: proposal.id }, userId),
    ).rejects.toThrow("Proposal not found.");
  });

  test("dashboard metrics count all proposals without loading full history", async () => {
    const userId = `metrics-user-${crypto.randomUUID()}`;
    const suffix = crypto.randomUUID();

    await createTask(
      {
        columnId: "todo",
        title: `Metrics todo ${suffix}`,
      },
      userId,
    );
    await createTask(
      {
        columnId: "in_progress",
        title: `Metrics progress ${suffix}`,
      },
      userId,
    );
    await createTask(
      {
        columnId: "done",
        title: `Metrics done ${suffix}`,
      },
      userId,
    );

    const accepted = await proposeTaskBreakdownFromTasks(
      {
        prompt: `Accepted metrics proposal ${suffix}`,
        tasks: [taskFixture(`Accepted metrics task ${suffix}`)],
      },
      "mcp",
      userId,
    );
    const rejected = await proposeTaskBreakdownFromTasks(
      {
        prompt: `Rejected metrics proposal ${suffix}`,
        tasks: [taskFixture(`Rejected metrics task ${suffix}`)],
      },
      "mcp",
      userId,
    );
    const pending = await proposeTaskBreakdownFromTasks(
      {
        prompt: `Pending metrics proposal ${suffix}`,
        tasks: [taskFixture(`Pending metrics task ${suffix}`)],
      },
      "mcp",
      userId,
    );

    await acceptProposal({ proposalId: accepted.id }, userId);
    await rejectProposal({ proposalId: rejected.id }, userId);

    const snapshot = await getBoardSnapshot(userId);
    const metrics = await getDashboardMetrics(userId);

    expect(snapshot.proposals.map((proposal) => proposal.id)).toEqual([
      pending.id,
    ]);
    expect(metrics.proposalCount).toBe(3);
    expect(metrics.taskCount).toBe(3);
    expect(metrics.inProgressCount).toBe(1);
    expect(metrics.doneCount).toBe(1);
  });

  test("individual proposal adds keep source metadata", async () => {
    const plannedTask = taskFixture(
      `Track source metadata task ${crypto.randomUUID()}`,
      {
        resourceLinks: [
          {
            title: "Source resource",
            url: "https://example.com/source-resource",
          },
        ],
        helpfulLinks: [
          {
            url: "https://example.com/source-help",
          },
        ],
        problemLinks: [
          {
            title: "Source problem",
            url: "https://example.com/source-problem",
          },
        ],
      },
    );
    const proposal = await proposeTaskBreakdown(
      `Track source metadata for individual add ${crypto.randomUUID()}`,
      "app",
      SOLO_USER_ID,
      stubBreakdown([plannedTask]),
    );

    if (!("tasks" in proposal.payload)) {
      throw new Error("Expected a task breakdown proposal.");
    }

    const proposedTask = proposal.payload.tasks[0];
    const fingerprint = taskFingerprint(proposedTask);
    const created = await createTask({
      columnId: "todo",
      title: proposedTask.title,
      description: proposedTask.description,
      priority: proposedTask.priority,
      acceptanceCriteria: proposedTask.acceptanceCriteria,
      dependencies: proposedTask.dependencies,
      resourceLinks: proposedTask.resourceLinks,
      helpfulLinks: proposedTask.helpfulLinks,
      problemLinks: proposedTask.problemLinks,
      sourceProposalId: proposal.id,
      sourceProposalItemFingerprint: fingerprint,
      sourceProposalTopic: proposalTopic(proposal).name,
    });

    expect(created.sourceProposalId).toBe(proposal.id);
    expect(created.sourceProposalItemFingerprint).toBe(fingerprint);
    expect(created.sourceProposalTopic).toBe(proposalTopic(proposal).name);
    expect(created.resourceLinks[0].title).toBe("Source resource");
    expect(created.helpfulLinks[0].url).toBe("https://example.com/source-help");
    expect(created.problemLinks[0].title).toBe("Source problem");
  });

  test("reverts only Todo tasks created from proposals", async () => {
    const manual = await createTask({
      columnId: "todo",
      title: `Manual task ${crypto.randomUUID()}`,
      description: "",
      priority: "medium",
      acceptanceCriteria: [],
      dependencies: [],
    });

    await expect(
      revertTaskToProposal({ taskId: manual.id }),
    ).rejects.toThrow("Only Todo tasks created from a proposal can be reverted.");

    const proposal = await proposeTaskBreakdown(
      `Create reversible proposal task ${crypto.randomUUID()}`,
      "app",
      SOLO_USER_ID,
      stubBreakdown([taskFixture(`Reversible task ${crypto.randomUUID()}`)]),
    );

    if (!("tasks" in proposal.payload)) {
      throw new Error("Expected a task breakdown proposal.");
    }

    const proposedTask = proposal.payload.tasks[0];
    const fingerprint = taskFingerprint(proposedTask);
    const created = await createTask({
      columnId: "todo",
      title: proposedTask.title,
      description: proposedTask.description,
      priority: proposedTask.priority,
      acceptanceCriteria: proposedTask.acceptanceCriteria,
      dependencies: proposedTask.dependencies,
      sourceProposalId: proposal.id,
      sourceProposalItemFingerprint: fingerprint,
      sourceProposalTopic: proposalTopic(proposal).name,
    });

    await revertTaskToProposal({ taskId: created.id });

    const after = await getBoardSnapshot();
    expect(after.tasks.some((task) => task.id === created.id)).toBe(false);
  });

  test("accepting task update proposals applies the task patch", async () => {
    const task = await createTask({
      columnId: "todo",
      title: "Reference task",
      description: "",
      priority: "medium",
      acceptanceCriteria: [],
      dependencies: [],
    });

    const resolved = await resolveTaskReference(
      { taskNumber: task.taskNumber },
      task.boardId,
    );
    const proposal = await proposeTaskUpdate({
      taskId: resolved.id,
      patch: { priority: "urgent" },
      reason: "Escalate by numbered task reference.",
    });

    expect(resolved.id).toBe(task.id);
    expect(proposal.status).toBe("pending");
    expect("taskNumber" in proposal.payload && proposal.payload.taskNumber).toBe(
      task.taskNumber,
    );
    expect(
      (await getBoardSnapshot()).tasks.find((item) => item.id === task.id)
        ?.priority,
    ).toBe(task.priority);

    const accepted = await acceptProposal({ proposalId: proposal.id });
    const after = await getBoardSnapshot();

    expect(accepted.status).toBe("accepted");
    expect(after.tasks.find((item) => item.id === task.id)?.priority).toBe(
      "urgent",
    );
  });

  test("accepting task delete proposals deletes the task", async () => {
    const task = await createTask({
      columnId: "todo",
      title: `Delete proposal should delete ${crypto.randomUUID()}`,
      description: "",
      priority: "medium",
      acceptanceCriteria: [],
      dependencies: [],
    });
    const proposal = await proposeTaskDelete({
      taskId: task.id,
      reason: "Delete proposal should remove the task when accepted.",
    });

    expect(proposal.status).toBe("pending");

    const accepted = await acceptProposal({ proposalId: proposal.id });
    const after = await getBoardSnapshot();

    expect(accepted.status).toBe("accepted");
    expect(after.tasks.some((item) => item.id === task.id)).toBe(false);
  });

  test("accepting start work proposals moves the task to in progress", async () => {
    const task = await createTask({
      columnId: "todo",
      title: "Startable task",
      description: "",
      priority: "medium",
      acceptanceCriteria: [],
      dependencies: [],
    });

    const proposal = await proposeStartWork({
      taskId: task.id,
      targetColumnId: "in_progress",
    });

    expect(proposal.status).toBe("pending");

    const accepted = await acceptProposal({ proposalId: proposal.id });

    const after = await getBoardSnapshot();
    expect(accepted.status).toBe("accepted");
    expect(after.tasks.find((item) => item.id === task.id)?.columnId).toBe(
      "in_progress",
    );
  });
});

function proposalFixture(
  prompt: string,
  overrides: Partial<AiProposal> = {},
): AiProposal {
  const timestamp = new Date().toISOString();

  return {
    id: `proposal-${crypto.randomUUID()}`,
    boardId: "default-board",
    userId: "solo-user",
    type: "task_breakdown",
    status: "pending",
    source: "app",
    title: "Create 1 task",
    summary: "Fixture proposal.",
    payload: {
      prompt,
      clarifications: [],
      tasks: [
        {
          title: "Fixture task",
          description: "",
          priority: "medium",
          acceptanceCriteria: [],
          suggestedColumn: "todo",
          dependencies: [],
          resourceLinks: [],
          helpfulLinks: [],
          problemLinks: [],
        },
      ],
    },
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function taskList(count: number, titlePrefix: string): ProposedTask[] {
  return Array.from({ length: count }, (_, index) =>
    taskFixture(`${titlePrefix} ${index + 1}`),
  );
}

function taskFixture(
  title: string,
  overrides: Partial<ProposedTask> = {},
): ProposedTask {
  return {
    title,
    description: `Implementation notes for ${title}.`,
    priority: "medium",
    acceptanceCriteria: [`${title} is complete`],
    suggestedColumn: "todo",
    dependencies: [],
    resourceLinks: [],
    helpfulLinks: [],
    problemLinks: [],
    ...overrides,
  };
}

function stubBreakdown(tasks: ProposedTask[]) {
  return async (): Promise<TaskBreakdownResult> => ({
    tasks,
    provider: "test-model",
    status: "completed",
  });
}

describe("mcp permissions", () => {
  test("creates user MCP tokens without exposing hashes", async () => {
    const userId = `mcp-user-${crypto.randomUUID()}`;
    const created = await createMcpToken({ name: "Claude Code" }, userId);
    const tokens = await listMcpTokens(userId);

    expect(created.token.startsWith("hb_")).toBe(true);
    expect(created.tokenRecord.userId).toBe(userId);
    expect(created.tokenRecord.name).toBe("Claude Code");
    expect("tokenHash" in created.tokenRecord).toBe(false);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].tokenPrefix).toBe(created.tokenRecord.tokenPrefix);
  });

  test("resolves valid MCP tokens to the owning user and rejects revoked tokens", async () => {
    const userId = `mcp-owner-${crypto.randomUUID()}`;
    const created = await createMcpToken({ name: "Codex" }, userId);
    const resolved = await resolveMcpToken(created.token);

    expect(resolved?.userId).toBe(userId);
    expect(resolved?.lastUsedAt).toBeDefined();

    await revokeMcpToken({ tokenId: created.tokenRecord.id }, userId);

    expect(await resolveMcpToken(created.token)).toBeNull();
  });

  test("HTTP MCP rejects missing, invalid, and legacy global tokens", async () => {
    const originalLegacyToken = process.env.KANBAN_MCP_TOKEN;
    process.env.KANBAN_MCP_TOKEN = "legacy-global-token";

    try {
      const missing = await handleMcpPost(
        new Request("http://localhost:3000/mcp", {
          method: "POST",
        }),
      );
      const invalid = await handleMcpPost(
        new Request("http://localhost:3000/mcp", {
          method: "POST",
          headers: {
            authorization: "Bearer invalid-token",
          },
        }),
      );
      const legacy = await handleMcpPost(
        new Request("http://localhost:3000/mcp", {
          method: "POST",
          headers: {
            authorization: "Bearer legacy-global-token",
          },
        }),
      );

      expect(missing.status).toBe(401);
      expect(invalid.status).toBe(401);
      expect(legacy.status).toBe(401);
    } finally {
      if (originalLegacyToken === undefined) {
        delete process.env.KANBAN_MCP_TOKEN;
      } else {
        process.env.KANBAN_MCP_TOKEN = originalLegacyToken;
      }
    }
  });

  test("MCP token ownership scopes proposals to the token user", async () => {
    const userId = `mcp-scope-${crypto.randomUUID()}`;
    const created = await createMcpToken({ name: "Gemini" }, userId);
    const resolved = await resolveMcpToken(created.token);

    if (!resolved) {
      throw new Error("Expected MCP token to resolve.");
    }

    const proposal = await proposeTaskBreakdownFromTasks(
      {
        prompt: "Token-owned proposal",
        tasks: [taskFixture("Token-owned task")],
      },
      "mcp",
      resolved.userId,
    );

    const ownerHistory = await listProposalHistory(userId);
    const soloHistory = await listProposalHistory(SOLO_USER_ID);

    expect(ownerHistory.some((item) => item.id === proposal.id)).toBe(true);
    expect(soloHistory.some((item) => item.id === proposal.id)).toBe(false);
  });

  test("deletes only the targeted user data during legacy cleanup", async () => {
    const legacyUserId = `legacy-user-${crypto.randomUUID()}`;
    const userId = `cleanup-user-${crypto.randomUUID()}`;
    const legacyTask = await createTask(
      {
        columnId: "todo",
        title: `Legacy cleanup task ${crypto.randomUUID()}`,
        description: "",
        priority: "medium",
        acceptanceCriteria: [],
        dependencies: [],
      },
      legacyUserId,
    );
    const userTask = await createTask(
      {
        columnId: "todo",
        title: `User cleanup task ${crypto.randomUUID()}`,
        description: "",
        priority: "medium",
        acceptanceCriteria: [],
        dependencies: [],
      },
      userId,
    );

    const counts = await deleteUserScopedData(legacyUserId);

    expect(counts.tasks).toBeGreaterThan(0);
    expect(
      (await getBoardSnapshot(legacyUserId)).tasks.some(
        (task) => task.id === legacyTask.id,
      ),
    )
      .toBe(false);
    expect(
      (await getBoardSnapshot(userId)).tasks.some(
        (task) => task.id === userTask.id,
      ),
    ).toBe(true);
  });

  test("exposes proposal tools but not approval tools", () => {
    const server = createKanbanMcpServer();
    const tools = (
      server as unknown as { _registeredTools: Record<string, unknown> }
    )._registeredTools;

    expect(Object.keys(tools).sort()).toEqual([
      "create_job_application_run",
      "get_job_search_profile",
      "get_latest_unapplied_job_batch",
      "get_profile_snapshot",
      "get_task",
      "list_boards",
      "list_job_application_runs",
      "list_job_digests",
      "list_jobs",
      "list_tasks",
      "prepare_job_search_brief",
      "prepare_task_breakdown_prompt",
      "propose_profile_import",
      "propose_start_work",
      "propose_task_breakdown_from_tasks",
      "propose_task_delete",
      "propose_task_update",
      "review_task_breakdown_proposal",
      "score_job_candidates",
      "seed_jobs",
      "seed_ranked_jobs",
      "update_job_application_attempt",
    ]);
    expect(tools.accept_proposal).toBeUndefined();
    expect(tools.reject_proposal).toBeUndefined();
    expect(tools.propose_task_breakdown).toBeUndefined();
    expect(tools.apply_profile_import).toBeUndefined();
    expect(tools.reject_profile_import).toBeUndefined();
  });

  test("job tools seed and list jobs directly", async () => {
    const userId = `mcp-jobs-${crypto.randomUUID()}`;
    const server = createKanbanMcpServer(userId);
    const tools = (
      server as unknown as {
        _registeredTools: Record<
          string,
          {
            inputSchema?: { parse: (input: unknown) => unknown };
            handler: (input?: unknown) => Promise<{
              content: Array<{ type: "text"; text: string }>;
            }>;
          }
        >;
      }
    )._registeredTools;

    const manyJobPayload = tools.seed_jobs.inputSchema?.parse({
      source: "apify",
      jobs: Array.from({ length: 125 }, (_, index) => ({
        title: `Backend Engineer ${index + 1}`,
        sourceJobId: `mcp-fit-job-${index + 1}`,
      })),
    }) as { jobs: unknown[] };

    expect(manyJobPayload.jobs).toHaveLength(125);

    const seededResult = await tools.seed_jobs.handler({
      source: "apify",
      jobs: [
        {
          title: "Backend Engineer",
          company: "Weekday AI",
          applyUrl: "https://example.com/jobs/backend-engineer",
          status: "applied",
        },
      ],
    });
    const seededPayload = JSON.parse(seededResult.content[0].text) as {
      jobs: Array<{ title: string; status: string }>;
    };

    const listResult = await tools.list_jobs.handler();
    const listPayload = JSON.parse(listResult.content[0].text) as {
      jobs: Array<{ title: string; status: string }>;
    };

    expect(seededPayload.jobs[0]).toMatchObject({
      title: "Backend Engineer",
      status: "applied",
    });
    expect(listPayload.jobs).toHaveLength(1);
    expect(listPayload.jobs[0].title).toBe("Backend Engineer");
  });

  test("job application MCP tools fetch latest batch and track attempts", async () => {
    const userId = `mcp-apply-${crypto.randomUUID()}`;
    const server = createKanbanMcpServer(userId);
    const tools = (
      server as unknown as {
        _registeredTools: Record<
          string,
          {
            handler: (input?: unknown) => Promise<{
              content: Array<{ type: "text"; text: string }>;
            }>;
          }
        >;
      }
    )._registeredTools;

    const seedResult = await tools.seed_jobs.handler({
      source: "apify:test",
      jobs: [
        {
          title: "Google Form Backend Engineer",
          company: "Forms Co",
          applyUrl: "https://docs.google.com/forms/d/e/example/viewform",
          status: "not_applied",
          matchedSkills: ["TypeScript"],
          raw: { jobUrl: "https://example.com/jobs/forms-co" },
        },
        {
          title: "Already Applied Engineer",
          company: "Done Co",
          applyUrl: "https://example.com/jobs/done",
          status: "applied",
        },
      ],
    });
    const seedPayload = JSON.parse(seedResult.content[0].text) as {
      jobs: Array<{ id: string; title: string; status: string }>;
    };
    const openJob = seedPayload.jobs.find(
      (job) => job.title === "Google Form Backend Engineer",
    );

    expect(openJob).toBeDefined();

    const batchResult = await tools.get_latest_unapplied_job_batch.handler();
    const batchPayload = JSON.parse(batchResult.content[0].text) as {
      batch: {
        latestSeededDateKey: string;
        jobs: Array<{
          job: { id: string; title: string; source: string };
          source: string;
          sourceJobId: string;
          automation: { kind: string };
          advice: string;
        }>;
        formDefaults: { resumeLocalPath: string };
        report: string;
      };
    };

    expect(batchPayload.batch.latestSeededDateKey).toBeTruthy();
    expect(batchPayload.batch.jobs.map((item) => item.job.id)).toEqual([
      openJob!.id,
    ]);
    expect(batchPayload.batch.jobs[0].source).toBe("apify:test");
    expect(batchPayload.batch.jobs[0].job.source).toBe("apify:test");
    expect(batchPayload.batch.jobs[0].automation.kind).toBe("google_form");
    expect(batchPayload.batch.report).toContain("apify:test");
    expect(batchPayload.batch.report).toContain(openJob!.id);

    const runResult = await tools.create_job_application_run.handler();
    const runPayload = JSON.parse(runResult.content[0].text) as {
      run: { id: string; selectedJobIds: string[] };
    };

    expect(runPayload.run.selectedJobIds).toEqual([openJob!.id]);

    const updatedResult = await tools.update_job_application_attempt.handler({
      runId: runPayload.run.id,
      jobId: openJob!.id,
      status: "needs_manual_review",
      skipReason: "Portal asks for information not available in profile.",
      formUrl: "https://docs.google.com/forms/d/e/example/viewform",
    });
    const updatedPayload = JSON.parse(updatedResult.content[0].text) as {
      run: {
        attempts: Array<{ jobId: string; status: string; skipReason: string }>;
      };
    };
    const runsResult = await tools.list_job_application_runs.handler({ limit: 5 });
    const runsPayload = JSON.parse(runsResult.content[0].text) as {
      runs: Array<{ id: string }>;
    };
    const listResult = await tools.list_jobs.handler();
    const listPayload = JSON.parse(listResult.content[0].text) as {
      jobs: Array<{ id: string; status: string }>;
    };

    expect(updatedPayload.run.attempts[0]).toMatchObject({
      jobId: openJob!.id,
      status: "needs_manual_review",
      skipReason: "Portal asks for information not available in profile.",
    });
    expect(runsPayload.runs[0].id).toBe(runPayload.run.id);
    expect(listPayload.jobs.find((job) => job.id === openJob!.id)?.status).toBe(
      "not_applied",
    );
  });

  test("ranked job MCP tools score, seed, and list digests", async () => {
    const userId = `mcp-ranked-jobs-${crypto.randomUUID()}`;
    const server = createKanbanMcpServer(userId);
    const tools = (
      server as unknown as {
        _registeredTools: Record<
          string,
          {
            inputSchema?: { parse: (input: unknown) => unknown };
            handler: (input?: unknown) => Promise<{
              content: Array<{ type: "text"; text: string }>;
            }>;
          }
        >;
      }
    )._registeredTools;

    const profileResult = await tools.get_job_search_profile.handler();
    const profilePayload = JSON.parse(profileResult.content[0].text) as {
      searchProfile: { minimumFitScore: number; maxSeededPerRun: number };
    };
    const briefResult = await tools.prepare_job_search_brief.handler();
    const briefPayload = JSON.parse(briefResult.content[0].text) as {
      brief: { searchKeywords: string[]; minimumFitScore: number };
    };

    expect(profilePayload.searchProfile.minimumFitScore).toBe(75);
    expect(profilePayload.searchProfile.maxSeededPerRun).toBe(25);
    expect(briefPayload.brief.searchKeywords.length).toBeGreaterThan(0);

    const scoreResult = await tools.score_job_candidates.handler({
      source: "apify:test",
      jobs: [
        {
          title: "Backend Engineer",
          company: "AI Product Startup",
          location: "Remote India",
          applyUrl: "https://example.com/jobs/mcp-ranked",
          sourceJobId: "mcp-ranked-job",
          description:
            "Early-career Node.js TypeScript PostgreSQL API work for a SaaS startup.",
        },
      ],
    });
    const scorePayload = JSON.parse(scoreResult.content[0].text) as {
      scoredJobs: Array<{ fitScore: number; fitBand: string }>;
    };

    expect(scorePayload.scoredJobs[0].fitScore).toBeGreaterThanOrEqual(75);
    expect(scorePayload.scoredJobs[0].fitBand).not.toBe("rejected");

    const rankedResult = await tools.seed_ranked_jobs.handler({
      source: "apify:test",
      runKey: `mcp-ranked-${crypto.randomUUID()}`,
      jobs: [
        {
          title: "Backend Engineer",
          company: "AI Product Startup",
          location: "Remote India",
          applyUrl: "https://example.com/jobs/mcp-ranked",
          sourceJobId: "mcp-ranked-job",
          description:
            "Early-career Node.js TypeScript PostgreSQL API work for a SaaS startup.",
        },
      ],
    });
    const rankedPayload = JSON.parse(rankedResult.content[0].text) as {
      digest: { seededCount: number };
      seededJobs: Array<{ title: string; fitBand: string }>;
    };
    const digestResult = await tools.list_job_digests.handler({ limit: 5 });
    const digestPayload = JSON.parse(digestResult.content[0].text) as {
      digests: Array<{ seededCount: number }>;
    };

    expect(rankedPayload.digest.seededCount).toBe(1);
    expect(rankedPayload.seededJobs[0]).toMatchObject({
      title: "Backend Engineer",
      fitBand: "excellent",
    });
    expect(digestPayload.digests[0].seededCount).toBe(1);
  });

  test("prompt preparation tool validates raw prompts", () => {
    const server = createKanbanMcpServer();
    const tools = (
      server as unknown as {
        _registeredTools: Record<
          string,
          { inputSchema?: { parse: (input: unknown) => unknown } }
        >;
      }
    )._registeredTools;

    const tool = tools.prepare_task_breakdown_prompt;
    const parsed = tool.inputSchema?.parse({
      prompt: "Build an AI chat proposal",
      clarifications: [
        {
          question: "Who is this for?",
          answer: "Developers.",
        },
      ],
    }) as { prompt: string; clarifications: { question: string; answer: string }[] };

    expect(parsed.prompt).toBe("Build an AI chat proposal");
    expect(parsed.clarifications[0].answer).toBe("Developers.");
    expect(() => tool.inputSchema?.parse({ prompt: "" })).toThrow();
  });

  test("review proposal tool is read-only and validates task arrays", async () => {
    const server = createKanbanMcpServer();
    const tools = (
      server as unknown as {
        _registeredTools: Record<
          string,
          {
            annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean };
            inputSchema?: { parse: (input: unknown) => unknown };
            handler: (input: unknown) => Promise<{
              content: Array<{ type: "text"; text: string }>;
            }>;
          }
        >;
      }
    )._registeredTools;

    const tool = tools.review_task_breakdown_proposal;
    const parsed = tool.inputSchema?.parse({
      prompt: "Study linked lists",
      tasks: [{ title: "Practice reversal", acceptanceCriteria: ["Done"] }],
    }) as { tasks: ProposedTask[] };

    expect(tool.annotations?.readOnlyHint).toBe(true);
    expect(tool.annotations?.destructiveHint).toBe(false);
    expect(parsed.tasks).toHaveLength(1);
    expect(() =>
      tool.inputSchema?.parse({ prompt: "Study linked lists", tasks: [] }),
    ).toThrow();

    const result = await tool.handler({
      prompt: "Study linked lists",
      tasks: [{ title: "Practice reversal", acceptanceCriteria: ["Done"] }],
    });
    const payload = JSON.parse(result.content[0].text) as {
      review: { verdict: string; issues: string[] };
    };

    expect(payload.review.verdict).toBe("needs_revision");
    expect(payload.review.issues.join(" ")).toContain("vague");
  });

  test("structured proposal tool accepts reference link arrays", () => {
    const server = createKanbanMcpServer();
    const tools = (
      server as unknown as {
        _registeredTools: Record<
          string,
          { inputSchema?: { parse: (input: unknown) => unknown } }
        >;
      }
    )._registeredTools;

    const tool = tools.propose_task_breakdown_from_tasks;
    const parsed = tool.inputSchema?.parse({
      prompt: "Study linked lists",
      refinedPrompt: "Study linked lists for Java interviews.",
      clarifications: [
        {
          question: "Which language should examples use?",
          answer: "Java.",
        },
      ],
      tasks: [
        {
          title: "Practice linked list reversal",
          resourceLinks: [{ url: "https://example.com/resources" }],
          helpfulLinks: [{ title: "Guide", url: "https://example.com/guide" }],
          problemLinks: [
            { title: "Problems", url: "https://example.com/problems" },
          ],
        },
      ],
    }) as {
      refinedPrompt: string;
      clarifications: { question: string; answer: string }[];
      tasks: ProposedTask[];
    };

    expect(parsed.refinedPrompt).toBe("Study linked lists for Java interviews.");
    expect(parsed.clarifications[0].answer).toBe("Java.");
    expect(parsed.tasks[0].resourceLinks[0].url).toBe(
      "https://example.com/resources",
    );
    expect(parsed.tasks[0].helpfulLinks[0].title).toBe("Guide");
    expect(parsed.tasks[0].problemLinks[0].title).toBe("Problems");
  });

  test("structured proposal tool accepts more than fifty tasks", () => {
    const server = createKanbanMcpServer();
    const tools = (
      server as unknown as {
        _registeredTools: Record<
          string,
          { inputSchema?: { parse: (input: unknown) => unknown } }
        >;
      }
    )._registeredTools;

    const tool = tools.propose_task_breakdown_from_tasks;
    const parsed = tool.inputSchema?.parse({
      prompt: "Create a complete linked list interview plan",
      tasks: Array.from({ length: 51 }, (_, index) => ({
        title: `MCP generated task ${index + 1}`,
      })),
    }) as { tasks: ProposedTask[] };

    expect(parsed.tasks).toHaveLength(51);
  });

  test("profile import tool accepts structured resume data", () => {
    const server = createKanbanMcpServer();
    const tools = (
      server as unknown as {
        _registeredTools: Record<
          string,
          { inputSchema?: { parse: (input: unknown) => unknown } }
        >;
      }
    )._registeredTools;

    const tool = tools.propose_profile_import;
    const parsed = tool.inputSchema?.parse({
      profileBasics: {
        displayName: "Pratham",
        headline: "Full-stack developer",
        email: "pratham@example.com",
        website: "https://example.com",
      },
      summary: "Extracted by an external AI app.",
      items: [
        {
          type: "experience",
          title: "Frontend Developer",
          organization: "Careeright",
          startDate: "2025",
          endDate: "Present",
          description: "Built profile and MCP workflows.",
          tags: ["React", "MCP"],
        },
        {
          type: "achievement",
          title: "Hackathon Winner",
          description: "Won a product build challenge.",
        },
      ],
    }) as {
      profileBasics: { displayName: string };
      items: Array<{ type: string; title: string; tags: string[] }>;
    };

    expect(parsed.profileBasics.displayName).toBe("Pratham");
    expect(parsed.items[0].type).toBe("experience");
    expect(parsed.items[0].tags).toEqual(["React", "MCP"]);
    expect(parsed.items[1].type).toBe("achievement");
    expect(() =>
      tool.inputSchema?.parse({
        items: [
          {
            type: "skill",
            title: "Unsafe URL",
            url: "javascript:alert(1)",
          },
        ],
      }),
    ).toThrow();
  });
});
