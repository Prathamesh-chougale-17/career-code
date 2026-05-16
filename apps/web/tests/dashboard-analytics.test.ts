import { readFile } from "node:fs/promises";

import { describe, expect, test } from "vitest";

import { getDashboardAnalytics } from "@careeright/domain/dashboard/analytics";
import { saveDiaryDay } from "@careeright/domain/diary/store";
import {
  acceptProposal,
  createMcpToken,
  createTask,
  proposeTaskBreakdownFromTasks,
  rejectProposal,
  resolveMcpToken,
  revokeMcpToken,
} from "@careeright/domain/kanban/store";
import { seedJobs, updateJobStatus } from "@careeright/domain/jobs/store";
import {
  createProfileImport,
  createProfileItem,
  rejectProfileImport,
  updateProfileBasics,
} from "@careeright/domain/profile/store";

process.env.MONGODB_URI = "";

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  return date.toISOString().slice(0, 10);
}

describe("dashboard analytics", () => {
  test("aggregates user-scoped workspace data without exposing MCP secrets", async () => {
    const suffix = crypto.randomUUID();
    const userA = `analytics-a-${suffix}`;
    const userB = `analytics-b-${suffix}`;

    await Promise.all([
      createTask(
        {
          columnId: "todo",
          title: `Todo analytics task ${suffix}`,
          priority: "low",
        },
        userA,
      ),
      createTask(
        {
          columnId: "in_progress",
          title: `Progress analytics task ${suffix}`,
          priority: "high",
        },
        userA,
      ),
      createTask(
        {
          columnId: "review",
          title: `Review analytics task ${suffix}`,
          priority: "urgent",
        },
        userA,
      ),
      createTask(
        {
          columnId: "done",
          title: `Done analytics task ${suffix}`,
          priority: "medium",
        },
        userA,
      ),
      createTask(
        {
          columnId: "done",
          title: `Other user task ${suffix}`,
          priority: "urgent",
        },
        userB,
      ),
    ]);

    const accepted = await proposeTaskBreakdownFromTasks(
      {
        prompt: `Accepted analytics proposal ${suffix}`,
        tasks: [{ title: `Generated accepted task ${suffix}` }],
      },
      "mcp",
      userA,
    );
    const rejected = await proposeTaskBreakdownFromTasks(
      {
        prompt: `Rejected analytics proposal ${suffix}`,
        tasks: [
          { title: `Generated rejected task one ${suffix}` },
          { title: `Generated rejected task two ${suffix}` },
        ],
      },
      "ai",
      userA,
    );
    await proposeTaskBreakdownFromTasks(
      {
        prompt: `Pending analytics proposal ${suffix}`,
        tasks: [{ title: `Generated pending task ${suffix}` }],
      },
      "app",
      userA,
    );
    await proposeTaskBreakdownFromTasks(
      {
        prompt: `Other user proposal ${suffix}`,
        tasks: [{ title: `Other user generated task ${suffix}` }],
      },
      "mcp",
      userB,
    );
    await acceptProposal({ proposalId: accepted.id }, userA);
    await rejectProposal({ proposalId: rejected.id }, userA);

    const [backendJob, fullStackJob] = await seedJobs(
      {
        source: `apify:linkedin-${suffix}`,
        jobs: [
          {
            sourceJobId: `backend-${suffix}`,
            title: "Backend Engineer",
            company: "Careeright Labs",
            location: "Pune",
            applyUrl: "https://example.com/backend",
            fitScore: 80,
          },
          {
            sourceJobId: `fullstack-${suffix}`,
            title: "Full Stack Engineer",
            company: "Build Co",
            location: "Remote India",
            applyUrl: "https://example.com/full-stack",
            fitScore: 100,
          },
        ],
      },
      userA,
    );
    await seedJobs(
      {
        source: `apify:career-${suffix}`,
        jobs: [
          {
            sourceJobId: `qa-${suffix}`,
            title: "QA Engineer",
            company: "Quality Co",
            location: "Bengaluru",
            applyUrl: "https://example.com/qa",
            status: "rejected",
            fitScore: null,
          },
        ],
      },
      userA,
    );
    await updateJobStatus(
      {
        jobId: fullStackJob.id,
        status: "applied",
      },
      userA,
    );
    await seedJobs(
      {
        source: `apify:other-${suffix}`,
        jobs: [
          {
            sourceJobId: `other-${suffix}`,
            title: "Other User Engineer",
            applyUrl: "https://example.com/other",
            fitScore: 40,
          },
        ],
      },
      userB,
    );

    await updateProfileBasics(
      {
        displayName: "Prathamesh Chougale",
        headline: "Full-stack developer",
        location: "India",
        summary: "Builds TypeScript, Node.js, React, and MCP workflows.",
      },
      userA,
    );
    await Promise.all([
      createProfileItem(
        {
          type: "skill",
          title: "TypeScript",
        },
        userA,
      ),
      createProfileItem(
        {
          type: "project",
          title: "Careeright",
          description: "AI-safe Kanban and job workflow.",
          tags: ["Next.js", "MongoDB"],
        },
        userA,
      ),
      createProfileItem(
        {
          type: "skill",
          title: "Not scoped",
        },
        userB,
      ),
    ]);
    await createProfileImport(
      {
        items: [{ type: "skill", title: "Pending import skill" }],
      },
      userA,
    );
    const handledImport = await createProfileImport(
      {
        items: [{ type: "skill", title: "Handled import skill" }],
      },
      userA,
    );
    await rejectProfileImport({ importId: handledImport.id }, userA);
    await createProfileImport(
      {
        items: [{ type: "skill", title: "Other user import skill" }],
      },
      userB,
    );

    const activeToken = await createMcpToken({ name: "Codex" }, userA);
    const revokedToken = await createMcpToken({ name: "Old client" }, userA);
    await resolveMcpToken(activeToken.token);
    await revokeMcpToken({ tokenId: revokedToken.tokenRecord.id }, userA);
    await createMcpToken({ name: "Other user token" }, userB);

    const today = localDateKey();
    const yesterday = addDays(today, -1);
    await Promise.all([
      saveDiaryDay(
        {
          dateKey: today,
          dailySummary: "Finished a focused day.",
          status: "complete",
        },
        userA,
      ),
      saveDiaryDay(
        {
          dateKey: yesterday,
          dailySummary: "Prepared the dashboard work.",
          status: "complete",
        },
        userA,
      ),
      saveDiaryDay(
        {
          dateKey: addDays(today, -2),
          dailySummary: "Other user diary.",
          status: "complete",
        },
        userB,
      ),
    ]);

    const analytics = await getDashboardAnalytics(userA);
    const columns = Object.fromEntries(
      analytics.board.columnCounts.map((item) => [item.id, item.count]),
    );
    const priorities = Object.fromEntries(
      analytics.board.priorityCounts.map((item) => [item.priority, item.count]),
    );
    const jobStatuses = Object.fromEntries(
      analytics.jobs.statusCounts.map((item) => [item.status, item.count]),
    );
    const proposalStatuses = Object.fromEntries(
      analytics.proposals.statusCounts.map((item) => [item.status, item.count]),
    );
    const proposalSources = Object.fromEntries(
      analytics.proposals.sourceCounts.map((item) => [item.source, item.count]),
    );

    expect(backendJob.status).toBe("not_applied");
    expect(analytics.board.taskCount).toBe(4);
    expect(analytics.board.completionRate).toBe(25);
    expect(columns.todo).toBe(1);
    expect(columns.in_progress).toBe(2);
    expect(columns.review).toBeUndefined();
    expect(columns.done).toBe(1);
    expect(analytics.board.reviewCount).toBe(0);
    expect(priorities.low).toBe(1);
    expect(priorities.medium).toBe(1);
    expect(priorities.high).toBe(1);
    expect(priorities.urgent).toBe(1);

    expect(analytics.jobs.totalCount).toBe(3);
    expect(analytics.jobs.todaySeededCount).toBe(3);
    expect(analytics.jobs.latestSeededDate).toBe(
      new Date().toISOString().slice(0, 10),
    );
    expect(analytics.jobs.averageFitScore).toBe(90);
    expect(jobStatuses.not_applied).toBe(1);
    expect(jobStatuses.applied).toBe(1);
    expect(jobStatuses.rejected).toBe(1);
    expect(analytics.jobs.sourceCounts).toEqual([
      { source: `apify:linkedin-${suffix}`, label: `apify:linkedin-${suffix}`, count: 2 },
      { source: `apify:career-${suffix}`, label: `apify:career-${suffix}`, count: 1 },
    ]);

    expect(analytics.proposals.totalCount).toBe(3);
    expect(analytics.proposals.generatedTaskCount).toBe(4);
    expect(proposalStatuses.pending).toBe(1);
    expect(proposalStatuses.accepted).toBe(1);
    expect(proposalStatuses.rejected).toBe(1);
    expect(proposalSources.app).toBe(1);
    expect(proposalSources.mcp).toBe(1);
    expect(proposalSources.ai).toBe(1);

    expect(analytics.profile.itemCount).toBe(2);
    expect(analytics.profile.pendingImportCount).toBe(1);
    expect(analytics.profile.completedImportCount).toBe(1);
    expect(analytics.profile.readinessScore).toBeGreaterThan(0);
    expect(analytics.mcp.totalTokenCount).toBe(2);
    expect(analytics.mcp.activeTokenCount).toBe(1);
    expect(analytics.mcp.revokedTokenCount).toBe(1);
    expect(analytics.mcp.latestTokenUsageAt).toBeDefined();
    expect(analytics.diary.totalCount).toBe(2);
    expect(analytics.diary.completedCount).toBe(2);
    expect(analytics.diary.latestDiaryDate).toBe(today);
    expect(analytics.diary.currentStreak).toBe(2);

    const serialized = JSON.stringify(analytics);
    expect(serialized).not.toContain("tokenHash");
    expect(serialized).not.toContain(activeToken.token);
    expect(serialized).not.toContain(revokedToken.token);
  });

  test("routes and sidebar point analytics and board to separate dashboard paths", async () => {
    const [dashboardPage, kanbanPage, aiPage, sidebar] = await Promise.all([
      readFile("app/dashboard/page.tsx", "utf8"),
      readFile("app/dashboard/kanban/page.tsx", "utf8"),
      readFile("app/dashboard/ai/page.tsx", "utf8"),
      readFile("../../packages/ui/src/components/dashboard-sidebar.tsx", "utf8"),
    ]);

    expect(dashboardPage).toContain("DashboardAnalyticsApp");
    expect(kanbanPage).toContain("KanbanApp");
    expect(aiPage).toContain('redirect("/dashboard/kanban")');
    expect(sidebar).toContain('render={<Link href="/dashboard" />}');
    expect(sidebar).toContain('render={<Link href="/dashboard/kanban" />}');
    expect(sidebar).toContain('render={<Link href="/dashboard/diary" />}');
    expect(sidebar).toContain('route="board"');
    expect(sidebar).toContain('route="diary"');
  });

  test("clamps out-of-range job fit scores before averaging", async () => {
    const userId = `analytics-fit-${crypto.randomUUID()}`;

    await seedJobs(
      {
        source: "apify:test",
        jobs: [
          {
            sourceJobId: "fit-high",
            title: "Backend Engineer",
            applyUrl: "https://example.com/high",
            fitScore: 140,
          },
          {
            sourceJobId: "fit-low",
            title: "Software Engineer",
            applyUrl: "https://example.com/low",
            fitScore: -20,
          },
        ],
      },
      userId,
    );

    const analytics = await getDashboardAnalytics(userId);

    expect(analytics.jobs.averageFitScore).toBe(50);
  });
});
