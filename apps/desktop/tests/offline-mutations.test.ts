import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";

import {
  boardSnapshotQueryKey,
  dashboardMetricsQueryKey,
} from "@careeright/api/query-keys";
import type {
  BoardSnapshot,
  CreateTaskInput,
  DashboardMetrics,
  KanbanTask,
} from "@careeright/domain/kanban/schema";
import type {
  JobRecord,
  JobSearchProfile,
} from "@careeright/domain/jobs/schema";
import type { DiaryDay } from "@careeright/domain/diary/schema";
import type {
  ProfileItem,
  ProfileSnapshot,
} from "@careeright/domain/profile/schema";
import type {
  Project,
  ProjectDetail,
  ProjectNote,
  ProjectResource,
} from "@careeright/domain/projects/schema";

import {
  applyDiaryDelete,
  applyDiarySave,
  applyJobSearchProfileUpdate,
  applyJobWarmApplyUpdate,
  applyJobStatusUpdate,
  applyProjectArchive,
  applyProjectAttributeCreate,
  applyProjectAttributeUpdate,
  applyProjectCreate,
  applyProjectDelete,
  applyProjectNoteCreate,
  applyProjectNoteUpdate,
  applyProjectResourceCreate,
  applyProjectResourceUpdate,
  applyProjectUpdate,
  applyProfileApplicationDefaultsUpdate,
  applyProfileItemCreate,
  applyProfileItemUpdate,
  applyProfileUpdate,
  applyTaskCreate,
  applyTaskReorder,
  applyTaskUpdate,
  removeProjectAttributeFromDetail,
  removeProjectNoteFromDetail,
  removeProjectResourceFromDetail,
  removeProfileItemFromSnapshot,
  removeJobFromList,
  removeTaskFromSnapshot,
  setCachedBoardSnapshot,
} from "../src/lib/offline-mutations";

describe("desktop offline Kanban cache updates", () => {
  test("creates a local task with schema defaults and refreshes dashboard metrics", () => {
    const queryClient = new QueryClient();
    const snapshot = makeBoardSnapshot();
    const input = {
      columnId: "todo",
      description: "  Work while offline  ",
      priority: "high",
      title: "Queued desktop task",
    } satisfies CreateTaskInput;
    const { snapshot: nextSnapshot, task } = applyTaskCreate(
      snapshot,
      input,
      "user-1",
      "offline-task-1",
    );

    queryClient.setQueryData(boardSnapshotQueryKey, snapshot);
    queryClient.setQueryData<DashboardMetrics>(dashboardMetricsQueryKey, {
      boardTitle: "Execution board",
      doneCount: 0,
      inProgressCount: 1,
      proposalCount: 2,
      taskCount: 3,
    });
    setCachedBoardSnapshot(queryClient, nextSnapshot);

    expect(task).toMatchObject({
      acceptanceCriteria: [],
      columnId: "todo",
      description: "Work while offline",
      id: "offline-task-1",
      order: 2,
      priority: "high",
      taskNumber: 3,
      title: "Queued desktop task",
      userId: "user-1",
    });
    expect(queryClient.getQueryData<DashboardMetrics>(dashboardMetricsQueryKey))
      .toMatchObject({
        doneCount: 0,
        inProgressCount: 1,
        proposalCount: 2,
        taskCount: 4,
      });
  });

  test("rejects offline task creation for a board that is not cached", () => {
    expect(() =>
      applyTaskCreate(
        makeBoardSnapshot(),
        {
          boardId: "other-board",
          title: "Wrong board",
        },
        "user-1",
        "offline-task-1",
      ),
    ).toThrow("Task cannot be queued for a board that is not loaded.");
  });

  test("updates a cached task and refreshes dashboard metrics", () => {
    const queryClient = new QueryClient();
    const snapshot = makeBoardSnapshot();
    const { snapshot: nextSnapshot, task } = applyTaskUpdate(snapshot, {
      taskId: "task-1",
      patch: {
        columnId: "done",
        title: "Finished task",
      },
    });

    queryClient.setQueryData(boardSnapshotQueryKey, snapshot);
    queryClient.setQueryData<DashboardMetrics>(dashboardMetricsQueryKey, {
      boardTitle: "Execution board",
      doneCount: 0,
      inProgressCount: 1,
      proposalCount: 2,
      taskCount: 3,
    });
    setCachedBoardSnapshot(queryClient, nextSnapshot);

    expect(task.title).toBe("Finished task");
    expect(task.columnId).toBe("done");
    expect(task.order).toBe(0);
    expect(queryClient.getQueryData<BoardSnapshot>(boardSnapshotQueryKey)?.tasks)
      .toHaveLength(3);
    expect(queryClient.getQueryData<DashboardMetrics>(dashboardMetricsQueryKey))
      .toMatchObject({
        doneCount: 1,
        inProgressCount: 1,
        proposalCount: 2,
        taskCount: 3,
      });
  });

  test("reorders cached tasks across columns with stable local order", () => {
    const snapshot = makeBoardSnapshot();
    const { snapshot: nextSnapshot, task } = applyTaskReorder(snapshot, {
      columnId: "in_progress",
      index: 1,
      taskId: "task-2",
    });
    const inProgressTasks = nextSnapshot.tasks.filter(
      (item) => item.columnId === "in_progress",
    );

    expect(task.columnId).toBe("in_progress");
    expect(inProgressTasks.map((item) => item.id)).toEqual([
      "task-3",
      "task-2",
    ]);
    expect(inProgressTasks.map((item) => item.order)).toEqual([0, 1]);
  });

  test("removes cached tasks and rejects unknown task ids", () => {
    const snapshot = makeBoardSnapshot();
    const nextSnapshot = removeTaskFromSnapshot(snapshot, "task-2");

    expect(nextSnapshot.tasks.map((task) => task.id)).toEqual([
      "task-1",
      "task-3",
    ]);
    expect(() => removeTaskFromSnapshot(snapshot, "missing-task")).toThrow(
      "Task cannot be queued until it has loaded once.",
    );
  });

  test("updates cached job status and rejects unknown job ids", () => {
    const jobs = makeJobs();
    const { jobs: nextJobs, job } = applyJobStatusUpdate(jobs, {
      jobId: "job-1",
      status: "interviewing",
    });

    expect(job.status).toBe("interviewing");
    expect(nextJobs.find((item) => item.id === "job-1")?.status).toBe(
      "interviewing",
    );
    expect(() =>
      applyJobStatusUpdate(jobs, {
        jobId: "missing-job",
        status: "applied",
      }),
    ).toThrow("Job cannot be queued until it has loaded once.");
  });

  test("updates cached job warm apply data without changing application status", () => {
    const jobs = makeJobs();
    const { jobs: nextJobs, job } = applyJobWarmApplyUpdate(jobs, {
      jobId: "job-1",
      warmApplyStatus: "connection_sent",
      warmApplyFollowUpDueAt: "2026-07-07",
      referralContacts: [
        {
          name: "Priya Sharma",
          title: "Talent Partner",
          linkedinUrl: "https://www.linkedin.com/in/priya-sharma",
          relationship: "recruiter",
          priority: "best_first",
          outreachStatus: "connection_sent",
          draftMessage: "Hi Priya, I saw the Backend Engineer role.",
          followUpDueAt: "2026-07-07",
        },
      ],
    });

    expect(job.status).toBe("not_applied");
    expect(job.warmApplyStatus).toBe("connection_sent");
    expect(job.referralContacts[0]).toMatchObject({
      name: "Priya Sharma",
      priority: "best_first",
      relationship: "recruiter",
      outreachStatus: "connection_sent",
    });
    expect(job.referralContacts[0]?.id).toMatch(
      /^local-job-referral-contact-/,
    );
    expect(nextJobs.find((item) => item.id === "job-1")?.status).toBe(
      "not_applied",
    );
    expect(() =>
      applyJobWarmApplyUpdate(jobs, {
        jobId: "missing-job",
        warmApplyStatus: "message_sent",
      }),
    ).toThrow("Job cannot be queued until it has loaded once.");
  });

  test("removes cached jobs and returns the locally deleted row", () => {
    const jobs = makeJobs();
    const { jobs: nextJobs, job } = removeJobFromList(jobs, "job-2");

    expect(job.id).toBe("job-2");
    expect(job.deletedAt).toEqual(expect.any(String));
    expect(nextJobs.map((item) => item.id)).toEqual(["job-1"]);
  });

  test("updates cached job search profile fields", () => {
    const profile = makeJobSearchProfile();
    const nextProfile = applyJobSearchProfileUpdate(profile, {
      locations: ["Remote", "New York"],
      minimumFitScore: 82,
    });

    expect(nextProfile).toMatchObject({
      companyPreferences: ["Series B+"],
      locations: ["Remote", "New York"],
      minimumFitScore: 82,
      targetRoles: ["Backend Engineer"],
    });
    expect(nextProfile.updatedAt).not.toBe(profile.updatedAt);
  });

  test("saves cached diary days with stable ids and sorted intervals", () => {
    const currentDay = makeDiaryDay();
    const nextDay = applyDiarySave(
      currentDay,
      {
        dailySummary: "  Focused on desktop polish  ",
        dateKey: "2026-06-02",
        intervals: [
          {
            endTime: "11:00",
            notes: "  Queue implementation  ",
            startTime: "10:00",
            summary: "  Added offline queue coverage  ",
            title: "  Offline work  ",
          },
          {
            endTime: "09:30",
            id: "interval-1",
            notes: "Existing notes",
            startTime: "09:00",
            summary: "Kept existing interval",
            title: "Review",
          },
        ],
        status: "complete",
        tomorrowFocus: "  Validate Tauri replay  ",
      },
      "user-1",
      "2026-06-02T12:00:00.000Z",
    );

    expect(nextDay).toMatchObject({
      dailySummary: "Focused on desktop polish",
      id: "diary-day-1",
      status: "complete",
      tomorrowFocus: "Validate Tauri replay",
      updatedAt: "2026-06-02T12:00:00.000Z",
    });
    expect(nextDay.intervals.map((interval) => interval.id)).toEqual([
      "interval-1",
      expect.stringMatching(/^offline-diary-interval-/),
    ]);
    expect(nextDay.intervals.map((interval) => interval.startTime)).toEqual([
      "09:00",
      "10:00",
    ]);
    expect(nextDay.intervals[0]?.createdAt).toBe(
      "2026-06-02T00:00:00.000Z",
    );
  });

  test("creates offline diary days and removes dates from recent cache", () => {
    const created = applyDiarySave(
      null,
      {
        dateKey: "2026-06-03",
        intervals: [],
      },
      "user-1",
      "2026-06-03T08:00:00.000Z",
    );

    expect(created).toMatchObject({
      dailySummary: "",
      dateKey: "2026-06-03",
      id: "offline-diary-day-2026-06-03",
      status: "draft",
      tomorrowFocus: "",
    });
    expect(
      applyDiaryDelete([makeDiaryDay(), created], "2026-06-02")?.map(
        (day) => day.dateKey,
      ),
    ).toEqual(["2026-06-03"]);
  });
});

describe("desktop offline Projects cache updates", () => {
  test("creates cached projects with normalized defaults", () => {
    const { project, projects } = applyProjectCreate(
      [makeProject()],
      {
        dateText: "  2026  ",
        summary: "  Native desktop performance pass  ",
        techStack: [" React ", "Tauri", "react", " "],
        title: "  Careeright Desktop  ",
      },
      "user-1",
      "offline-project-1",
      "2026-06-02T12:00:00.000Z",
    );

    expect(project).toMatchObject({
      attributes: [],
      dateText: "2026",
      id: "offline-project-1",
      resources: [],
      status: "active",
      summary: "Native desktop performance pass",
      techStack: ["React", "Tauri"],
      title: "Careeright Desktop",
      userId: "user-1",
    });
    expect(projects.map((item) => item.id)).toEqual([
      "offline-project-1",
      "project-1",
    ]);
  });

  test("updates, archives, and deletes cached projects", () => {
    const projects = [makeProject()];
    const { project: updatedProject, projects: updatedProjects } =
      applyProjectUpdate(
        projects,
        {
          projectId: "project-1",
          patch: {
            status: "paused",
            summary: "  Paused while offline  ",
            techStack: [" TypeScript ", "React", "typescript"],
          },
        },
        "2026-06-02T12:00:00.000Z",
      );

    expect(updatedProject).toMatchObject({
      status: "paused",
      summary: "Paused while offline",
      techStack: ["TypeScript", "React"],
      updatedAt: "2026-06-02T12:00:00.000Z",
    });

    const { project: archivedProject } = applyProjectArchive(
      updatedProjects,
      "project-1",
      "2026-06-02T13:00:00.000Z",
    );

    expect(archivedProject).toMatchObject({
      archivedAt: "2026-06-02T13:00:00.000Z",
      status: "archived",
    });

    const { project: deletedProject, projects: remainingProjects } =
      applyProjectDelete(updatedProjects, "project-1", "2026-06-02T14:00:00.000Z");

    expect(deletedProject).toMatchObject({
      archivedAt: "2026-06-02T14:00:00.000Z",
      deletedAt: "2026-06-02T14:00:00.000Z",
      status: "archived",
    });
    expect(remainingProjects).toEqual([]);
    expect(() =>
      applyProjectUpdate(projects, {
        projectId: "missing-project",
        patch: { title: "Missing" },
      }),
    ).toThrow("Project cannot be queued until it has loaded once.");
  });

  test("creates, updates, and removes cached project notes", () => {
    const detail = makeProjectDetail();
    const { detail: createdDetail, note } = applyProjectNoteCreate(
      detail,
      {
        content: "Offline markdown body",
        projectId: "project-1",
        title: "  Offline note  ",
      },
      "user-1",
      "offline-project-note-1",
      "2026-06-02T12:00:00.000Z",
    );

    expect(note).toMatchObject({
      content: "Offline markdown body",
      id: "offline-project-note-1",
      order: 1,
      projectId: "project-1",
      title: "Offline note",
    });
    expect(createdDetail.notes.map((item) => item.id)).toEqual([
      "project-note-1",
      "offline-project-note-1",
    ]);

    const { detail: updatedDetail, note: updatedNote } =
      applyProjectNoteUpdate(
        createdDetail,
        {
          noteId: "offline-project-note-1",
          patch: {
            content: "Updated while offline",
            title: "  Updated note  ",
          },
        },
        "2026-06-02T13:00:00.000Z",
      );

    expect(updatedNote).toMatchObject({
      content: "Updated while offline",
      title: "Updated note",
      updatedAt: "2026-06-02T13:00:00.000Z",
    });

    expect(
      removeProjectNoteFromDetail(updatedDetail, "offline-project-note-1").notes.map(
        (item) => item.id,
      ),
    ).toEqual(["project-note-1"]);
    expect(() =>
      applyProjectNoteCreate(
        detail,
        {
          projectId: "other-project",
          title: "Wrong project",
        },
        "user-1",
      ),
    ).toThrow("Project note cannot be queued for a project that is not loaded.");
    expect(() =>
      removeProjectNoteFromDetail(detail, "missing-project-note"),
    ).toThrow("Project note cannot be queued until it has loaded once.");
  });

  test("creates and updates cached project resources", () => {
    const detail = makeProjectDetail();
    const { detail: createdDetail, resource } = applyProjectResourceCreate(
      detail,
      {
        note: "  Local docs  ",
        projectId: "project-1",
        title: "  Desktop README  ",
        type: "documentation",
        url: "  https://example.com/readme  ",
      },
      "offline-project-resource-1",
      "2026-06-02T12:00:00.000Z",
    );

    expect(resource).toMatchObject({
      id: "offline-project-resource-1",
      note: "Local docs",
      title: "Desktop README",
      type: "documentation",
      url: "https://example.com/readme",
    });
    expect(createdDetail.project.resources.map((item) => item.id)).toEqual([
      "offline-project-resource-1",
    ]);

    const { detail: updatedDetail, resource: updatedResource } =
      applyProjectResourceUpdate(
        createdDetail,
        {
          projectId: "project-1",
          resourceId: "offline-project-resource-1",
          patch: {
            note: "  Updated docs  ",
            title: "  Updated README  ",
          },
        },
        "2026-06-02T13:00:00.000Z",
      );

    expect(updatedResource).toMatchObject({
      note: "Updated docs",
      title: "Updated README",
      updatedAt: "2026-06-02T13:00:00.000Z",
    });

    const { detail: detailWithAttribute } = applyProjectAttributeCreate(
      updatedDetail,
      {
        aliases: [],
        label: "Docs",
        projectId: "project-1",
        resourceIds: ["offline-project-resource-1"],
      },
      "offline-project-attribute-1",
      "2026-06-02T14:00:00.000Z",
    );
    const { detail: removedDetail, resource: removedResource } =
      removeProjectResourceFromDetail(
        detailWithAttribute,
        {
          projectId: "project-1",
          resourceId: "offline-project-resource-1",
        },
        "2026-06-02T15:00:00.000Z",
      );

    expect(removedResource.id).toBe("offline-project-resource-1");
    expect(removedDetail.project.resources).toEqual([]);
    expect(removedDetail.project.attributes[0]?.resourceIds).toEqual([]);
    expect(() =>
      applyProjectResourceUpdate(detail, {
        projectId: "project-1",
        resourceId: "missing-resource",
        patch: { title: "Missing" },
      }),
    ).toThrow("Project resource cannot be queued until it has loaded once.");
  });

  test("creates, updates, and removes cached project attributes", () => {
    const detail = makeProjectDetailWithResource();
    const { attribute, detail: createdDetail } = applyProjectAttributeCreate(
      detail,
      {
        aliases: ["  React  ", "Frontend", "react", "UI"],
        dateValue: "  2026  ",
        description: "  Interface work  ",
        label: "  React  ",
        projectId: "project-1",
        resourceIds: ["project-resource-1"],
        type: "technology",
      },
      "offline-project-attribute-1",
      "2026-06-02T12:00:00.000Z",
    );

    expect(attribute).toMatchObject({
      aliases: ["Frontend", "UI"],
      dateValue: "2026",
      description: "Interface work",
      id: "offline-project-attribute-1",
      label: "React",
      resourceIds: ["project-resource-1"],
      type: "technology",
    });

    const { attribute: updatedAttribute, detail: updatedDetail } =
      applyProjectAttributeUpdate(
        createdDetail,
        {
          attributeId: "offline-project-attribute-1",
          projectId: "project-1",
          patch: {
            aliases: ["Native", "Desktop"],
            label: "  Desktop  ",
            resourceIds: [],
          },
        },
        "2026-06-02T13:00:00.000Z",
      );

    expect(updatedAttribute).toMatchObject({
      aliases: ["Native"],
      label: "Desktop",
      resourceIds: [],
      updatedAt: "2026-06-02T13:00:00.000Z",
    });

    const { attribute: removedAttribute, detail: removedDetail } =
      removeProjectAttributeFromDetail(
        updatedDetail,
        {
          attributeId: "offline-project-attribute-1",
          projectId: "project-1",
        },
        "2026-06-02T14:00:00.000Z",
      );

    expect(removedAttribute.id).toBe("offline-project-attribute-1");
    expect(removedDetail.project.attributes).toEqual([]);
    expect(() =>
      applyProjectAttributeCreate(detail, {
        label: "Missing link",
        projectId: "project-1",
        resourceIds: ["missing-resource"],
      }),
    ).toThrow("Project resource missing-resource was not found.");
  });
});

describe("desktop offline Profile cache updates", () => {
  test("updates cached profile basics and application defaults", () => {
    const snapshot = makeProfileSnapshot();
    const { snapshot: basicsSnapshot, profile } = applyProfileUpdate(
      snapshot,
      {
        displayName: "  Prath  ",
        email: "  prath@example.com  ",
        headline: "  Desktop engineer  ",
        location: "  Bengaluru  ",
        summary: "  Building a smoother app  ",
        website: "  https://example.com  ",
      },
      "2026-06-02T12:00:00.000Z",
    );

    expect(profile).toMatchObject({
      displayName: "Prath",
      email: "prath@example.com",
      headline: "Desktop engineer",
      location: "Bengaluru",
      summary: "Building a smoother app",
      updatedAt: "2026-06-02T12:00:00.000Z",
      website: "https://example.com",
    });

    const { profile: defaultsProfile } =
      applyProfileApplicationDefaultsUpdate(
        basicsSnapshot,
        {
          defaultSource: "  LinkedIn  ",
          joiningAvailabilityDays: 14,
          phone: "  +91 99999 99999  ",
          resumeLocalPath: "  C:/Users/prath/resume.pdf  ",
        },
        "2026-06-02T13:00:00.000Z",
      );

    expect(defaultsProfile.applicationDefaults).toMatchObject({
      college: "Existing College",
      defaultSource: "LinkedIn",
      joiningAvailabilityDays: 14,
      phone: "+91 99999 99999",
      resumeLocalPath: "C:/Users/prath/resume.pdf",
    });
    expect(defaultsProfile.updatedAt).toBe("2026-06-02T13:00:00.000Z");
  });

  test("creates, updates, and removes cached profile items", () => {
    const snapshot = makeProfileSnapshot();
    const { item, snapshot: createdSnapshot } = applyProfileItemCreate(
      snapshot,
      {
        description: "  Added native desktop offline support  ",
        tags: ["  React  ", " Tauri "],
        title: "  Careeright Desktop  ",
        type: "project",
      },
      "offline-profile-item-1",
      "2026-06-02T12:00:00.000Z",
    );

    expect(item).toMatchObject({
      description: "Added native desktop offline support",
      id: "offline-profile-item-1",
      organization: "",
      tags: ["React", "Tauri"],
      title: "Careeright Desktop",
      type: "project",
      userId: "user-1",
    });
    expect(createdSnapshot.items.map((currentItem) => currentItem.id)).toEqual([
      "profile-item-1",
      "offline-profile-item-1",
    ]);

    const { item: updatedItem, snapshot: updatedSnapshot } =
      applyProfileItemUpdate(
        createdSnapshot,
        {
          itemId: "offline-profile-item-1",
          patch: {
            organization: "  Careeright  ",
            tags: [" Offline "],
            title: "  Native-friendly desktop  ",
          },
        },
        "2026-06-02T13:00:00.000Z",
      );

    expect(updatedItem).toMatchObject({
      organization: "Careeright",
      tags: ["Offline"],
      title: "Native-friendly desktop",
      updatedAt: "2026-06-02T13:00:00.000Z",
    });

    const removedSnapshot = removeProfileItemFromSnapshot(
      updatedSnapshot,
      "offline-profile-item-1",
    );

    expect(removedSnapshot.items.map((currentItem) => currentItem.id)).toEqual([
      "profile-item-1",
    ]);
  });

  test("rejects profile item changes for unknown cached items", () => {
    const snapshot = makeProfileSnapshot();

    expect(() =>
      applyProfileItemUpdate(snapshot, {
        itemId: "missing-profile-item",
        patch: {
          title: "Missing",
        },
      }),
    ).toThrow("Profile item cannot be queued until it has loaded once.");
    expect(() =>
      removeProfileItemFromSnapshot(snapshot, "missing-profile-item"),
    ).toThrow("Profile item cannot be queued until it has loaded once.");
  });
});

function makeBoardSnapshot(): BoardSnapshot {
  const createdAt = "2026-06-02T00:00:00.000Z";

  return {
    board: {
      createdAt,
      description: "Desktop test board",
      id: "board-1",
      title: "Execution board",
      updatedAt: createdAt,
      userId: "user-1",
    },
    columns: [
      {
        boardId: "board-1",
        color: "bg-slate-500",
        createdAt,
        id: "todo",
        order: 0,
        title: "Todo",
        updatedAt: createdAt,
        userId: "user-1",
      },
      {
        boardId: "board-1",
        color: "bg-sky-500",
        createdAt,
        id: "in_progress",
        order: 1,
        title: "In progress",
        updatedAt: createdAt,
        userId: "user-1",
      },
      {
        boardId: "board-1",
        color: "bg-emerald-500",
        createdAt,
        id: "done",
        order: 2,
        title: "Done",
        updatedAt: createdAt,
        userId: "user-1",
      },
    ],
    proposals: [],
    storageMode: "mongodb",
    tasks: [
      makeTask("task-1", "Plan offline support", "todo", 0),
      makeTask("task-2", "Implement replay", "todo", 1),
      makeTask("task-3", "Verify cache", "in_progress", 0),
    ],
  };
}

function makeTask(
  id: string,
  title: string,
  columnId: KanbanTask["columnId"],
  order: number,
): KanbanTask {
  const createdAt = "2026-06-02T00:00:00.000Z";

  return {
    acceptanceCriteria: [],
    boardId: "board-1",
    columnId,
    createdAt,
    dependencies: [],
    description: "",
    helpfulLinks: [],
    id,
    order,
    priority: "medium",
    problemLinks: [],
    resourceLinks: [],
    taskNumber: order + 1,
    title,
    updatedAt: createdAt,
    userId: "user-1",
  };
}

function makeJobs(): JobRecord[] {
  return [
    makeJob("job-1", "Backend Engineer", "not_applied"),
    makeJob("job-2", "Platform Engineer", "applied"),
  ];
}

function makeJob(
  id: string,
  title: string,
  status: JobRecord["status"],
): JobRecord {
  const createdAt = "2026-06-02T00:00:00.000Z";

  return {
    applyUrl: "https://example.com/apply",
    company: "Example Co",
    createdAt,
    description: "Build career tools.",
    fitBand: "strong",
    fitReasons: ["Relevant TypeScript experience"],
    fitScore: 88,
    id,
    location: "Remote",
    matchedSkills: ["TypeScript"],
    missingSkills: [],
    postedAt: createdAt,
    raw: {},
    riskFlags: [],
    salary: "",
    scoredAt: createdAt,
    scoreVersion: "test",
    seededAt: createdAt,
    source: "test",
    sourceJobId: id,
    status,
    title,
    updatedAt: createdAt,
    userId: "user-1",
    warmApplyFollowUpDueAt: "",
    warmApplyStatus: "not_started",
    referralContacts: [],
  };
}

function makeJobSearchProfile(): JobSearchProfile {
  const createdAt = "2026-06-02T00:00:00.000Z";

  return {
    companyPreferences: ["Series B+"],
    createdAt,
    excludedKeywords: ["unpaid"],
    experienceLevel: "Senior",
    id: "profile-1",
    locations: ["Remote"],
    maxSeededPerRun: 25,
    minimumFitScore: 75,
    primarySkills: ["TypeScript"],
    secondarySkills: ["React"],
    targetRoles: ["Backend Engineer"],
    updatedAt: createdAt,
    userId: "user-1",
  };
}

function makeDiaryDay(): DiaryDay {
  const createdAt = "2026-06-02T00:00:00.000Z";

  return {
    createdAt,
    dailySummary: "Initial summary",
    dateKey: "2026-06-02",
    id: "diary-day-1",
    intervals: [
      {
        createdAt,
        endTime: "09:30",
        id: "interval-1",
        notes: "",
        startTime: "09:00",
        summary: "Initial interval",
        title: "Review",
        updatedAt: createdAt,
      },
    ],
    status: "draft",
    tomorrowFocus: "",
    updatedAt: createdAt,
    userId: "user-1",
  };
}

function makeProfileSnapshot(): ProfileSnapshot {
  const createdAt = "2026-06-02T00:00:00.000Z";

  return {
    items: [makeProfileItem()],
    profile: {
      applicationDefaults: {
        branch: "Computer Science",
        college: "Existing College",
        defaultSource: "Referral",
        gender: "",
        graduationPercentage: "85",
        graduationYear: "2024",
        joiningAvailabilityDays: null,
        linkedinUrl: "",
        phone: "",
        resumeLocalPath: "",
        xBoard: "CBSE",
        xPercentage: "90",
        xiiBoard: "CBSE",
        xiiPercentage: "88",
      },
      createdAt,
      displayName: "Existing User",
      email: "",
      headline: "",
      id: "profile-1",
      location: "",
      summary: "",
      updatedAt: createdAt,
      userId: "user-1",
      website: "",
    },
  };
}

function makeProfileItem(): ProfileItem {
  const createdAt = "2026-06-02T00:00:00.000Z";

  return {
    createdAt,
    description: "Existing role",
    endDate: "",
    id: "profile-item-1",
    location: "Remote",
    organization: "Example Co",
    startDate: "2024",
    tags: ["TypeScript"],
    title: "Engineer",
    type: "experience",
    updatedAt: createdAt,
    url: "",
    userId: "user-1",
  };
}

function makeProjectDetail(): ProjectDetail {
  return {
    notes: [makeProjectNote()],
    project: makeProject(),
  };
}

function makeProjectDetailWithResource(): ProjectDetail {
  return {
    notes: [makeProjectNote()],
    project: {
      ...makeProject(),
      resources: [makeProjectResource()],
    },
  };
}

function makeProject(): Project {
  const createdAt = "2026-06-02T00:00:00.000Z";

  return {
    archivedAt: undefined,
    attributes: [],
    createdAt,
    dateText: "2025",
    deletedAt: undefined,
    id: "project-1",
    resources: [],
    sourceProfileItemId: undefined,
    sourceProfileUpdatedAt: undefined,
    status: "active",
    summary: "Existing project",
    techStack: ["TypeScript"],
    title: "Existing Project",
    updatedAt: createdAt,
    userId: "user-1",
  };
}

function makeProjectResource(): ProjectResource {
  const createdAt = "2026-06-02T00:00:00.000Z";

  return {
    createdAt,
    id: "project-resource-1",
    note: "",
    title: "Repository",
    type: "repository",
    updatedAt: createdAt,
    url: "https://example.com/repo",
  };
}

function makeProjectNote(): ProjectNote {
  const createdAt = "2026-06-02T00:00:00.000Z";

  return {
    content: "Existing note",
    createdAt,
    id: "project-note-1",
    order: 0,
    projectId: "project-1",
    title: "Overview",
    updatedAt: createdAt,
    userId: "user-1",
  };
}
