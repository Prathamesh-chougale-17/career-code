import type { QueryClient } from "@tanstack/react-query";
import type { rpcClient as careerightRpcClient } from "@careeright/api/client";
import type { Store } from "@tauri-apps/plugin-store";
import {
  boardSnapshotQueryKey,
  dashboardAnalyticsQueryKey,
  dashboardMetricsQueryKey,
  diaryDayQueryKey,
  diaryRecentQueryKey,
  dsaSnapshotQueryKey,
  historySnapshotQueryKey,
  jobSearchProfileQueryKey,
  jobsQueryKey,
  projectDetailQueryKey,
  projectsListQueryKey,
  projectsSummaryQueryKey,
  profileImportsQueryKey,
  profileSnapshotQueryKey,
  proposalHistoryQueryKey,
  systemDesignSnapshotQueryKey,
} from "@careeright/api/query-keys";
import type {
  BoardSnapshot,
  CreateTaskInput,
  DashboardMetrics,
  KanbanTask,
  ReorderTaskInput,
  UpdateTaskInput,
} from "@careeright/domain/kanban/schema";
import type {
  DsaProgressUpdateResult,
  DsaSnapshot,
  DsaVideoWatchEvent,
  RecordDsaVideoWatchInput,
  UpdateDsaQuestionProgressInput,
} from "@careeright/domain/dsa/schema";
import type {
  RecordSystemDesignVideoWatchInput,
  SystemDesignProgressUpdateResult,
  SystemDesignSnapshot,
  SystemDesignVideoWatchEvent,
  UpdateSystemDesignItemProgressInput,
} from "@careeright/domain/system-design/schema";
import type {
  DeleteJobInput,
  JobRecord,
  JobSearchProfile,
  UpdateJobSearchProfileInput,
  UpdateJobStatusInput,
} from "@careeright/domain/jobs/schema";
import type {
  DeleteDiaryDayInput,
  DiaryDay,
  DiaryInterval,
  SaveDiaryDayInput,
} from "@careeright/domain/diary/schema";
import type {
  CreateProfileItemInput,
  ProfileApplicationDefaults,
  ProfileItem,
  ProfileSnapshot,
  ProfileBasicsInput,
  UpdateProfileApplicationDefaultsInput,
  UpdateProfileItemInput,
  UserProfile,
} from "@careeright/domain/profile/schema";
import type {
  CreateProjectInput,
  CreateProjectAttributeInput,
  CreateProjectNoteInput,
  CreateProjectResourceInput,
  Project,
  ProjectAttribute,
  ProjectDetail,
  ProjectNote,
  ProjectResource,
  ProjectsSummary,
  UpdateProjectAttributeInput,
  UpdateProjectInput,
  UpdateProjectNoteInput,
  UpdateProjectResourceInput,
} from "@careeright/domain/projects/schema";

import { loadDesktopSession } from "./auth";

type CareerightRpcClient = typeof careerightRpcClient;
type DeleteTaskInput = { taskId: string };
type RevertTaskToProposalInput = { taskId: string };
type DeleteProfileItemInput = { itemId: string };
type DeleteProjectAttributeInput = { attributeId: string; projectId: string };
type DeleteProjectNoteInput = { noteId: string };
type DeleteProjectResourceInput = { projectId: string; resourceId: string };
type ProjectIdInput = { projectId: string };
type EnqueueOperationOptions = {
  id?: string;
  localProjectAttributeId?: string;
  localProjectId?: string;
  localProjectNoteId?: string;
  localProjectResourceId?: string;
  localProfileItemId?: string;
  localTaskId?: string;
};

type OfflineOperation =
  | {
      createdAt: string;
      id: string;
      input: CreateTaskInput;
      kind: "task.create";
      localTaskId: string;
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: UpdateTaskInput;
      kind: "task.update";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: DeleteTaskInput;
      kind: "task.delete";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: RevertTaskToProposalInput;
      kind: "task.revertToProposal";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: ReorderTaskInput;
      kind: "task.reorder";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: UpdateJobStatusInput;
      kind: "jobs.updateStatus";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: DeleteJobInput;
      kind: "jobs.delete";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: UpdateJobSearchProfileInput;
      kind: "jobs.updateSearchProfile";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: SaveDiaryDayInput;
      kind: "diary.saveDay";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: DeleteDiaryDayInput;
      kind: "diary.deleteDay";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: ProfileBasicsInput;
      kind: "profile.update";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: UpdateProfileApplicationDefaultsInput;
      kind: "profile.updateApplicationDefaults";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: CreateProfileItemInput;
      kind: "profile.createItem";
      localProfileItemId: string;
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: UpdateProfileItemInput;
      kind: "profile.updateItem";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: DeleteProfileItemInput;
      kind: "profile.deleteItem";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: CreateProjectInput;
      kind: "projects.create";
      localProjectId: string;
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: UpdateProjectInput;
      kind: "projects.update";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: ProjectIdInput;
      kind: "projects.archive";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: ProjectIdInput;
      kind: "projects.delete";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: CreateProjectNoteInput;
      kind: "projects.createNote";
      localProjectNoteId: string;
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: UpdateProjectNoteInput;
      kind: "projects.updateNote";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: DeleteProjectNoteInput;
      kind: "projects.deleteNote";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: CreateProjectResourceInput;
      kind: "projects.createResource";
      localProjectResourceId: string;
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: UpdateProjectResourceInput;
      kind: "projects.updateResource";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: DeleteProjectResourceInput;
      kind: "projects.deleteResource";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: CreateProjectAttributeInput;
      kind: "projects.createAttribute";
      localProjectAttributeId: string;
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: UpdateProjectAttributeInput;
      kind: "projects.updateAttribute";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: DeleteProjectAttributeInput;
      kind: "projects.deleteAttribute";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: UpdateDsaQuestionProgressInput;
      kind: "dsa.updateQuestionProgress";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: RecordDsaVideoWatchInput;
      kind: "dsa.recordVideoWatch";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: UpdateSystemDesignItemProgressInput;
      kind: "systemDesign.updateItemProgress";
      updatedAt: string;
    }
  | {
      createdAt: string;
      id: string;
      input: RecordSystemDesignVideoWatchInput;
      kind: "systemDesign.recordVideoWatch";
      updatedAt: string;
    };

type OperationKind = OfflineOperation["kind"];

const storePath = "careeright-desktop-offline-mutations.json";
const storeVersion = 1;
const flushDelayMs = 600;
const queueChangedEventName = "careeright:offline-queue-changed";
const statusChangedEventName = "careeright:offline-status-changed";

let storePromise: Promise<Store> | undefined;
let isFlushing = false;

function getStore() {
  storePromise ??= import("@tauri-apps/plugin-store").then(({ Store }) =>
    Store.load(storePath, {
      autoSave: 250,
      defaults: {},
    }),
  );

  return storePromise;
}

export function createOfflineCapableRpcClient(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
) {
  const task = new Proxy(remoteRpcClient.task, {
    get(target, property, receiver) {
      if (property === "create") {
        return (input: CreateTaskInput) =>
          createTask(remoteRpcClient, queryClient, input);
      }

      if (property === "update") {
        return (input: UpdateTaskInput) =>
          updateTask(remoteRpcClient, queryClient, input);
      }

      if (property === "delete") {
        return (input: DeleteTaskInput) =>
          deleteTask(remoteRpcClient, queryClient, input);
      }

      if (property === "revertToProposal") {
        return (input: RevertTaskToProposalInput) =>
          revertTaskToProposal(remoteRpcClient, queryClient, input);
      }

      if (property === "reorder") {
        return (input: ReorderTaskInput) =>
          reorderTask(remoteRpcClient, queryClient, input);
      }

      return Reflect.get(target, property, receiver);
    },
  });

  const jobs = new Proxy(remoteRpcClient.jobs, {
    get(target, property, receiver) {
      if (property === "updateStatus") {
        return (input: UpdateJobStatusInput) =>
          updateJobStatus(remoteRpcClient, queryClient, input);
      }

      if (property === "delete") {
        return (input: DeleteJobInput) =>
          deleteJob(remoteRpcClient, queryClient, input);
      }

      if (property === "updateSearchProfile") {
        return (input: UpdateJobSearchProfileInput) =>
          updateJobSearchProfile(remoteRpcClient, queryClient, input);
      }

      return Reflect.get(target, property, receiver);
    },
  });

  const diary = new Proxy(remoteRpcClient.diary, {
    get(target, property, receiver) {
      if (property === "saveDay") {
        return (input: SaveDiaryDayInput) =>
          saveDiaryDay(remoteRpcClient, queryClient, input);
      }

      if (property === "deleteDay") {
        return (input: DeleteDiaryDayInput) =>
          deleteDiaryDay(remoteRpcClient, queryClient, input);
      }

      return Reflect.get(target, property, receiver);
    },
  });

  const profile = new Proxy(remoteRpcClient.profile, {
    get(target, property, receiver) {
      if (property === "update") {
        return (input: ProfileBasicsInput) =>
          updateProfile(remoteRpcClient, queryClient, input);
      }

      if (property === "updateApplicationDefaults") {
        return (input: UpdateProfileApplicationDefaultsInput) =>
          updateProfileApplicationDefaults(remoteRpcClient, queryClient, input);
      }

      if (property === "createItem") {
        return (input: CreateProfileItemInput) =>
          createProfileItem(remoteRpcClient, queryClient, input);
      }

      if (property === "updateItem") {
        return (input: UpdateProfileItemInput) =>
          updateProfileItem(remoteRpcClient, queryClient, input);
      }

      if (property === "deleteItem") {
        return (input: DeleteProfileItemInput) =>
          deleteProfileItem(remoteRpcClient, queryClient, input);
      }

      return Reflect.get(target, property, receiver);
    },
  });

  const projects = new Proxy(remoteRpcClient.projects, {
    get(target, property, receiver) {
      if (property === "create") {
        return (input: CreateProjectInput) =>
          createProject(remoteRpcClient, queryClient, input);
      }

      if (property === "update") {
        return (input: UpdateProjectInput) =>
          updateProject(remoteRpcClient, queryClient, input);
      }

      if (property === "archive") {
        return (input: ProjectIdInput) =>
          archiveProject(remoteRpcClient, queryClient, input);
      }

      if (property === "delete") {
        return (input: ProjectIdInput) =>
          deleteProject(remoteRpcClient, queryClient, input);
      }

      if (property === "createNote") {
        return (input: CreateProjectNoteInput) =>
          createProjectNote(remoteRpcClient, queryClient, input);
      }

      if (property === "updateNote") {
        return (input: UpdateProjectNoteInput) =>
          updateProjectNote(remoteRpcClient, queryClient, input);
      }

      if (property === "deleteNote") {
        return (input: DeleteProjectNoteInput) =>
          deleteProjectNote(remoteRpcClient, queryClient, input);
      }

      if (property === "createResource") {
        return (input: CreateProjectResourceInput) =>
          createProjectResource(remoteRpcClient, queryClient, input);
      }

      if (property === "updateResource") {
        return (input: UpdateProjectResourceInput) =>
          updateProjectResource(remoteRpcClient, queryClient, input);
      }

      if (property === "deleteResource") {
        return (input: DeleteProjectResourceInput) =>
          deleteProjectResource(remoteRpcClient, queryClient, input);
      }

      if (property === "createAttribute") {
        return (input: CreateProjectAttributeInput) =>
          createProjectAttribute(remoteRpcClient, queryClient, input);
      }

      if (property === "updateAttribute") {
        return (input: UpdateProjectAttributeInput) =>
          updateProjectAttribute(remoteRpcClient, queryClient, input);
      }

      if (property === "deleteAttribute") {
        return (input: DeleteProjectAttributeInput) =>
          deleteProjectAttribute(remoteRpcClient, queryClient, input);
      }

      return Reflect.get(target, property, receiver);
    },
  });

  const dsa = new Proxy(remoteRpcClient.dsa, {
    get(target, property, receiver) {
      if (property === "updateQuestionProgress") {
        return (input: UpdateDsaQuestionProgressInput) =>
          updateDsaQuestionProgress(remoteRpcClient, queryClient, input);
      }

      if (property === "recordVideoWatch") {
        return (input: RecordDsaVideoWatchInput) =>
          recordDsaVideoWatch(remoteRpcClient, input);
      }

      return Reflect.get(target, property, receiver);
    },
  });

  const systemDesign = new Proxy(remoteRpcClient.systemDesign, {
    get(target, property, receiver) {
      if (property === "updateItemProgress") {
        return (input: UpdateSystemDesignItemProgressInput) =>
          updateSystemDesignItemProgress(remoteRpcClient, queryClient, input);
      }

      if (property === "recordVideoWatch") {
        return (input: RecordSystemDesignVideoWatchInput) =>
          recordSystemDesignVideoWatch(remoteRpcClient, input);
      }

      return Reflect.get(target, property, receiver);
    },
  });

  return new Proxy(remoteRpcClient, {
    get(target, property, receiver) {
      if (property === "task") {
        return task;
      }

      if (property === "jobs") {
        return jobs;
      }

      if (property === "diary") {
        return diary;
      }

      if (property === "profile") {
        return profile;
      }

      if (property === "projects") {
        return projects;
      }

      if (property === "dsa") {
        return dsa;
      }

      if (property === "systemDesign") {
        return systemDesign;
      }

      return Reflect.get(target, property, receiver);
    },
  }) as CareerightRpcClient;
}

async function createTask(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: CreateTaskInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.task.create(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const session = await loadDesktopSession();

    if (!session) {
      throw new Error("Sign in before queuing offline desktop changes.");
    }

    const snapshot = requireCachedSnapshot<BoardSnapshot>(
      queryClient,
      boardSnapshotQueryKey,
      "Board",
    );
    const { snapshot: nextSnapshot, task } = applyTaskCreate(
      snapshot,
      input,
      session.user.id,
    );

    await enqueueOperation("task.create", input, {
      id: `task.create:${task.id}`,
      localTaskId: task.id,
    });
    setCachedBoardSnapshot(queryClient, nextSnapshot);

    return task;
  }
}

export function installDesktopOfflineMutationReplay(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  userId: string,
) {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  let flushTimer: number | undefined;

  function flushSoon() {
    window.clearTimeout(flushTimer);
    flushTimer = window.setTimeout(() => {
      void flushDesktopOfflineMutations(remoteRpcClient, queryClient, userId);
    }, flushDelayMs);
  }

  window.addEventListener("online", flushSoon);
  window.addEventListener("focus", flushSoon);
  window.addEventListener(queueChangedEventName, flushSoon);
  flushSoon();

  return () => {
    window.clearTimeout(flushTimer);
    window.removeEventListener("online", flushSoon);
    window.removeEventListener("focus", flushSoon);
    window.removeEventListener(queueChangedEventName, flushSoon);
  };
}

export function subscribeDesktopOfflineMutationStatus(listener: () => void) {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  window.addEventListener(statusChangedEventName, listener);
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  window.addEventListener("focus", listener);

  return () => {
    window.removeEventListener(statusChangedEventName, listener);
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
    window.removeEventListener("focus", listener);
  };
}

export async function getDesktopOfflineMutationQueueSize(userId: string) {
  if (!isTauriRuntime()) {
    return 0;
  }

  const store = await getStore();
  const queue = readQueue(await store.get<unknown>(queueKey(userId)));

  return queue.length;
}

export function isDesktopOfflineMutationReplayActive() {
  return isFlushing;
}

export async function clearDesktopOfflineMutationQueue(userId: string) {
  if (!isTauriRuntime()) {
    return;
  }

  const store = await getStore();
  await store.delete(queueKey(userId));
  await store.save();
  dispatchQueueChanged();
}

async function updateTask(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: UpdateTaskInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.task.update(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const snapshot = requireCachedSnapshot<BoardSnapshot>(
      queryClient,
      boardSnapshotQueryKey,
      "Board",
    );
    const { snapshot: nextSnapshot, task } = applyTaskUpdate(snapshot, input);

    await enqueueOperation("task.update", input);
    setCachedBoardSnapshot(queryClient, nextSnapshot);

    return task;
  }
}

async function deleteTask(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: DeleteTaskInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.task.delete(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const snapshot = requireCachedSnapshot<BoardSnapshot>(
      queryClient,
      boardSnapshotQueryKey,
      "Board",
    );
    const nextSnapshot = removeTaskFromSnapshot(snapshot, input.taskId);

    await enqueueOperation("task.delete", input);
    setCachedBoardSnapshot(queryClient, nextSnapshot);

    return { ok: true } as const;
  }
}

async function revertTaskToProposal(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: RevertTaskToProposalInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.task.revertToProposal(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const snapshot = requireCachedSnapshot<BoardSnapshot>(
      queryClient,
      boardSnapshotQueryKey,
      "Board",
    );
    const task = requireCachedTask(snapshot, input.taskId);

    if (
      task.columnId !== "todo" ||
      !task.sourceProposalId ||
      !task.sourceProposalItemFingerprint
    ) {
      throw new Error("Only Todo tasks created from a proposal can be reverted.");
    }

    const nextSnapshot = removeTaskFromSnapshot(snapshot, input.taskId);

    await enqueueOperation("task.revertToProposal", input);
    setCachedBoardSnapshot(queryClient, nextSnapshot);

    return { ok: true } as const;
  }
}

async function reorderTask(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: ReorderTaskInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.task.reorder(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const snapshot = requireCachedSnapshot<BoardSnapshot>(
      queryClient,
      boardSnapshotQueryKey,
      "Board",
    );
    const { snapshot: nextSnapshot, task } = applyTaskReorder(snapshot, input);

    await enqueueOperation("task.reorder", input);
    setCachedBoardSnapshot(queryClient, nextSnapshot);

    return task;
  }
}

async function updateJobStatus(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: UpdateJobStatusInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.jobs.updateStatus(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const jobs = requireCachedSnapshot<JobRecord[]>(
      queryClient,
      jobsQueryKey,
      "Jobs",
    );
    const { jobs: nextJobs, job } = applyJobStatusUpdate(jobs, input);

    await enqueueOperation("jobs.updateStatus", input);
    setCachedJobs(queryClient, nextJobs);

    return job;
  }
}

async function deleteJob(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: DeleteJobInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.jobs.delete(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const jobs = requireCachedSnapshot<JobRecord[]>(
      queryClient,
      jobsQueryKey,
      "Jobs",
    );
    const { jobs: nextJobs, job } = removeJobFromList(jobs, input.jobId);

    await enqueueOperation("jobs.delete", input);
    setCachedJobs(queryClient, nextJobs);

    return job;
  }
}

async function updateJobSearchProfile(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: UpdateJobSearchProfileInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.jobs.updateSearchProfile(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const profile = requireCachedSnapshot<JobSearchProfile>(
      queryClient,
      jobSearchProfileQueryKey,
      "Job search profile",
    );
    const nextProfile = applyJobSearchProfileUpdate(profile, input);

    await enqueueOperation("jobs.updateSearchProfile", input);
    queryClient.setQueryData(jobSearchProfileQueryKey, nextProfile);

    return nextProfile;
  }
}

async function saveDiaryDay(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: SaveDiaryDayInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.diary.saveDay(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const session = await loadDesktopSession();

    if (!session) {
      throw new Error("Sign in before queuing offline desktop changes.");
    }

    const currentDay = requireCachedDiaryDay(queryClient, input.dateKey);
    const day = applyDiarySave(currentDay, input, session.user.id);

    await enqueueOperation("diary.saveDay", input);
    setCachedDiaryDay(queryClient, day);

    return day;
  }
}

async function deleteDiaryDay(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: DeleteDiaryDayInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.diary.deleteDay(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const currentDay = requireCachedDiaryDay(queryClient, input.dateKey);

    await enqueueOperation("diary.deleteDay", input);
    removeCachedDiaryDay(queryClient, input.dateKey);

    return { deleted: Boolean(currentDay) };
  }
}

async function updateProfile(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: ProfileBasicsInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.profile.update(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const snapshot = requireCachedSnapshot<ProfileSnapshot>(
      queryClient,
      profileSnapshotQueryKey,
      "Profile",
    );
    const { snapshot: nextSnapshot, profile } = applyProfileUpdate(
      snapshot,
      input,
    );

    await enqueueOperation("profile.update", input);
    setCachedProfileSnapshot(queryClient, nextSnapshot);

    return profile;
  }
}

async function updateProfileApplicationDefaults(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: UpdateProfileApplicationDefaultsInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.profile.updateApplicationDefaults(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const snapshot = requireCachedSnapshot<ProfileSnapshot>(
      queryClient,
      profileSnapshotQueryKey,
      "Profile",
    );
    const { snapshot: nextSnapshot, profile } =
      applyProfileApplicationDefaultsUpdate(snapshot, input);

    await enqueueOperation("profile.updateApplicationDefaults", input);
    setCachedProfileSnapshot(queryClient, nextSnapshot);

    return profile;
  }
}

async function createProfileItem(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: CreateProfileItemInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.profile.createItem(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const snapshot = requireCachedSnapshot<ProfileSnapshot>(
      queryClient,
      profileSnapshotQueryKey,
      "Profile",
    );
    const { snapshot: nextSnapshot, item } = applyProfileItemCreate(
      snapshot,
      input,
    );

    await enqueueOperation("profile.createItem", input, {
      id: `profile.createItem:${item.id}`,
      localProfileItemId: item.id,
    });
    setCachedProfileSnapshot(queryClient, nextSnapshot);

    return item;
  }
}

async function updateProfileItem(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: UpdateProfileItemInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.profile.updateItem(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const snapshot = requireCachedSnapshot<ProfileSnapshot>(
      queryClient,
      profileSnapshotQueryKey,
      "Profile",
    );
    const { snapshot: nextSnapshot, item } = applyProfileItemUpdate(
      snapshot,
      input,
    );

    await enqueueOperation("profile.updateItem", input);
    setCachedProfileSnapshot(queryClient, nextSnapshot);

    return item;
  }
}

async function deleteProfileItem(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: DeleteProfileItemInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.profile.deleteItem(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const snapshot = requireCachedSnapshot<ProfileSnapshot>(
      queryClient,
      profileSnapshotQueryKey,
      "Profile",
    );
    const nextSnapshot = removeProfileItemFromSnapshot(snapshot, input.itemId);

    await enqueueOperation("profile.deleteItem", input);
    setCachedProfileSnapshot(queryClient, nextSnapshot);

    return { ok: true } as const;
  }
}

async function createProject(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: CreateProjectInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.create(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const session = await loadDesktopSession();

    if (!session) {
      throw new Error("Sign in before queuing offline desktop changes.");
    }

    const projects = requireCachedSnapshot<Project[]>(
      queryClient,
      projectsListQueryKey,
      "Projects",
    );
    const { project, projects: nextProjects } = applyProjectCreate(
      projects,
      input,
      session.user.id,
    );

    await enqueueOperation("projects.create", input, {
      id: `projects.create:${project.id}`,
      localProjectId: project.id,
    });
    setCachedProjects(queryClient, nextProjects);
    setCachedProjectDetail(queryClient, { notes: [], project });

    return project;
  }
}

async function updateProject(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: UpdateProjectInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.update(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const projects = requireCachedSnapshot<Project[]>(
      queryClient,
      projectsListQueryKey,
      "Projects",
    );
    const { project, projects: nextProjects } = applyProjectUpdate(
      projects,
      input,
    );

    await enqueueOperation("projects.update", input);
    setCachedProjects(queryClient, nextProjects);
    updateCachedProjectDetail(queryClient, project);

    return project;
  }
}

async function archiveProject(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: ProjectIdInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.archive(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const projects = requireCachedSnapshot<Project[]>(
      queryClient,
      projectsListQueryKey,
      "Projects",
    );
    const { project, projects: nextProjects } = applyProjectArchive(
      projects,
      input.projectId,
    );

    await enqueueOperation("projects.archive", input);
    setCachedProjects(queryClient, nextProjects);
    updateCachedProjectDetail(queryClient, project);

    return project;
  }
}

async function deleteProject(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: ProjectIdInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.delete(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const projects = requireCachedSnapshot<Project[]>(
      queryClient,
      projectsListQueryKey,
      "Projects",
    );
    const detail = queryClient.getQueryData<ProjectDetail>(
      projectDetailQueryKey(input.projectId),
    );
    const { project, projects: nextProjects } = applyProjectDelete(
      projects,
      input.projectId,
    );

    await enqueueOperation("projects.delete", input);
    setCachedProjects(queryClient, nextProjects);
    queryClient.removeQueries({ queryKey: projectDetailQueryKey(input.projectId) });
    adjustCachedProjectNoteCount(queryClient, -(detail?.notes.length ?? 0));

    return project;
  }
}

async function createProjectNote(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: CreateProjectNoteInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.createNote(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const session = await loadDesktopSession();

    if (!session) {
      throw new Error("Sign in before queuing offline desktop changes.");
    }

    const detail = requireCachedSnapshot<ProjectDetail>(
      queryClient,
      projectDetailQueryKey(input.projectId),
      "Project detail",
    );
    const { detail: nextDetail, note } = applyProjectNoteCreate(
      detail,
      input,
      session.user.id,
    );

    await enqueueOperation("projects.createNote", input, {
      id: `projects.createNote:${note.id}`,
      localProjectNoteId: note.id,
    });
    setCachedProjectDetail(queryClient, nextDetail);
    adjustCachedProjectNoteCount(queryClient, 1);

    return note;
  }
}

async function updateProjectNote(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: UpdateProjectNoteInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.updateNote(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const detail = requireCachedProjectDetailForNote(queryClient, input.noteId);
    const { detail: nextDetail, note } = applyProjectNoteUpdate(detail, input);

    await enqueueOperation("projects.updateNote", input);
    setCachedProjectDetail(queryClient, nextDetail);

    return note;
  }
}

async function deleteProjectNote(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: DeleteProjectNoteInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.deleteNote(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const detail = requireCachedProjectDetailForNote(queryClient, input.noteId);
    const note = requireCachedProjectNote(detail, input.noteId);
    const nextDetail = removeProjectNoteFromDetail(detail, input.noteId);

    await enqueueOperation("projects.deleteNote", input);
    setCachedProjectDetail(queryClient, nextDetail);
    adjustCachedProjectNoteCount(queryClient, -1);

    return note;
  }
}

async function createProjectResource(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: CreateProjectResourceInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.createResource(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const detail = requireCachedProjectDetail(queryClient, input.projectId);
    const { detail: nextDetail, resource } = applyProjectResourceCreate(
      detail,
      input,
    );

    await enqueueOperation("projects.createResource", input, {
      id: `projects.createResource:${resource.id}`,
      localProjectResourceId: resource.id,
    });
    setCachedProjectDetail(queryClient, nextDetail);
    updateCachedProjectListItem(queryClient, nextDetail.project);

    return resource;
  }
}

async function updateProjectResource(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: UpdateProjectResourceInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.updateResource(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const detail = requireCachedProjectDetail(queryClient, input.projectId);
    const { detail: nextDetail, resource } = applyProjectResourceUpdate(
      detail,
      input,
    );

    await enqueueOperation("projects.updateResource", input);
    setCachedProjectDetail(queryClient, nextDetail);
    updateCachedProjectListItem(queryClient, nextDetail.project);

    return resource;
  }
}

async function deleteProjectResource(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: DeleteProjectResourceInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.deleteResource(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const detail = requireCachedProjectDetail(queryClient, input.projectId);
    const { detail: nextDetail, resource } = removeProjectResourceFromDetail(
      detail,
      input,
    );

    await enqueueOperation("projects.deleteResource", input);
    setCachedProjectDetail(queryClient, nextDetail);
    updateCachedProjectListItem(queryClient, nextDetail.project);

    return resource;
  }
}

async function createProjectAttribute(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: CreateProjectAttributeInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.createAttribute(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const detail = requireCachedProjectDetail(queryClient, input.projectId);
    const { attribute, detail: nextDetail } = applyProjectAttributeCreate(
      detail,
      input,
    );

    await enqueueOperation("projects.createAttribute", input, {
      id: `projects.createAttribute:${attribute.id}`,
      localProjectAttributeId: attribute.id,
    });
    setCachedProjectDetail(queryClient, nextDetail);
    updateCachedProjectListItem(queryClient, nextDetail.project);

    return attribute;
  }
}

async function updateProjectAttribute(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: UpdateProjectAttributeInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.updateAttribute(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const detail = requireCachedProjectDetail(queryClient, input.projectId);
    const { attribute, detail: nextDetail } = applyProjectAttributeUpdate(
      detail,
      input,
    );

    await enqueueOperation("projects.updateAttribute", input);
    setCachedProjectDetail(queryClient, nextDetail);
    updateCachedProjectListItem(queryClient, nextDetail.project);

    return attribute;
  }
}

async function deleteProjectAttribute(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: DeleteProjectAttributeInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.projects.deleteAttribute(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    const detail = requireCachedProjectDetail(queryClient, input.projectId);
    const { attribute, detail: nextDetail } = removeProjectAttributeFromDetail(
      detail,
      input,
    );

    await enqueueOperation("projects.deleteAttribute", input);
    setCachedProjectDetail(queryClient, nextDetail);
    updateCachedProjectListItem(queryClient, nextDetail.project);

    return attribute;
  }
}

async function updateDsaQuestionProgress(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: UpdateDsaQuestionProgressInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.dsa.updateQuestionProgress(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    await enqueueOperation("dsa.updateQuestionProgress", input);

    const snapshot = requireCachedSnapshot<DsaSnapshot>(
      queryClient,
      dsaSnapshotQueryKey,
      "DSA progress",
    );
    const progress = snapshot.progress.find(
      (item) => item.questionId === input.questionId,
    );

    if (!progress) {
      throw new Error("Queued DSA progress, but no cached progress row exists.");
    }

    return {
      progress,
      snapshot,
    } satisfies DsaProgressUpdateResult;
  }
}

async function recordDsaVideoWatch(
  remoteRpcClient: CareerightRpcClient,
  input: RecordDsaVideoWatchInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.dsa.recordVideoWatch(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    await enqueueOperation("dsa.recordVideoWatch", input);
    const timestamp = new Date().toISOString();
    const session = await loadDesktopSession();

    return {
      id: `offline-dsa-video-watch-${input.questionId}`,
      userId: session?.user.id ?? "offline",
      questionId: input.questionId,
      watchedAt: timestamp,
      createdAt: timestamp,
    } satisfies DsaVideoWatchEvent;
  }
}

async function updateSystemDesignItemProgress(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  input: UpdateSystemDesignItemProgressInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.systemDesign.updateItemProgress(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    await enqueueOperation("systemDesign.updateItemProgress", input);

    const snapshot = requireCachedSnapshot<SystemDesignSnapshot>(
      queryClient,
      systemDesignSnapshotQueryKey,
      "System Design progress",
    );
    const progress = snapshot.progress.find(
      (item) => item.itemId === input.itemId,
    );

    if (!progress) {
      throw new Error(
        "Queued System Design progress, but no cached progress row exists.",
      );
    }

    return {
      progress,
      snapshot,
    } satisfies SystemDesignProgressUpdateResult;
  }
}

async function recordSystemDesignVideoWatch(
  remoteRpcClient: CareerightRpcClient,
  input: RecordSystemDesignVideoWatchInput,
) {
  try {
    if (isOffline()) {
      throw new OfflineReplayError();
    }

    return await remoteRpcClient.systemDesign.recordVideoWatch(input);
  } catch (error) {
    if (!shouldQueue(error)) {
      throw error;
    }

    await enqueueOperation("systemDesign.recordVideoWatch", input);
    const timestamp = new Date().toISOString();
    const session = await loadDesktopSession();

    return {
      id: `offline-system-design-video-watch-${input.itemId}`,
      userId: session?.user.id ?? "offline",
      itemId: input.itemId,
      watchedAt: timestamp,
      createdAt: timestamp,
    } satisfies SystemDesignVideoWatchEvent;
  }
}

async function enqueueOperation(
  kind: "task.create",
  input: CreateTaskInput,
  options: Required<Pick<EnqueueOperationOptions, "id" | "localTaskId">>,
): Promise<void>;
async function enqueueOperation(
  kind: "task.update",
  input: UpdateTaskInput,
): Promise<void>;
async function enqueueOperation(
  kind: "task.delete",
  input: DeleteTaskInput,
): Promise<void>;
async function enqueueOperation(
  kind: "task.revertToProposal",
  input: RevertTaskToProposalInput,
): Promise<void>;
async function enqueueOperation(
  kind: "task.reorder",
  input: ReorderTaskInput,
): Promise<void>;
async function enqueueOperation(
  kind: "jobs.updateStatus",
  input: UpdateJobStatusInput,
): Promise<void>;
async function enqueueOperation(
  kind: "jobs.delete",
  input: DeleteJobInput,
): Promise<void>;
async function enqueueOperation(
  kind: "jobs.updateSearchProfile",
  input: UpdateJobSearchProfileInput,
): Promise<void>;
async function enqueueOperation(
  kind: "diary.saveDay",
  input: SaveDiaryDayInput,
): Promise<void>;
async function enqueueOperation(
  kind: "diary.deleteDay",
  input: DeleteDiaryDayInput,
): Promise<void>;
async function enqueueOperation(
  kind: "profile.update",
  input: ProfileBasicsInput,
): Promise<void>;
async function enqueueOperation(
  kind: "profile.updateApplicationDefaults",
  input: UpdateProfileApplicationDefaultsInput,
): Promise<void>;
async function enqueueOperation(
  kind: "profile.createItem",
  input: CreateProfileItemInput,
  options: Required<Pick<EnqueueOperationOptions, "id" | "localProfileItemId">>,
): Promise<void>;
async function enqueueOperation(
  kind: "profile.updateItem",
  input: UpdateProfileItemInput,
): Promise<void>;
async function enqueueOperation(
  kind: "profile.deleteItem",
  input: DeleteProfileItemInput,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.create",
  input: CreateProjectInput,
  options: Required<Pick<EnqueueOperationOptions, "id" | "localProjectId">>,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.update",
  input: UpdateProjectInput,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.archive",
  input: ProjectIdInput,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.delete",
  input: ProjectIdInput,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.createNote",
  input: CreateProjectNoteInput,
  options: Required<
    Pick<EnqueueOperationOptions, "id" | "localProjectNoteId">
  >,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.updateNote",
  input: UpdateProjectNoteInput,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.deleteNote",
  input: DeleteProjectNoteInput,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.createResource",
  input: CreateProjectResourceInput,
  options: Required<
    Pick<EnqueueOperationOptions, "id" | "localProjectResourceId">
  >,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.updateResource",
  input: UpdateProjectResourceInput,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.deleteResource",
  input: DeleteProjectResourceInput,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.createAttribute",
  input: CreateProjectAttributeInput,
  options: Required<
    Pick<EnqueueOperationOptions, "id" | "localProjectAttributeId">
  >,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.updateAttribute",
  input: UpdateProjectAttributeInput,
): Promise<void>;
async function enqueueOperation(
  kind: "projects.deleteAttribute",
  input: DeleteProjectAttributeInput,
): Promise<void>;
async function enqueueOperation(
  kind: "dsa.updateQuestionProgress",
  input: UpdateDsaQuestionProgressInput,
): Promise<void>;
async function enqueueOperation(
  kind: "dsa.recordVideoWatch",
  input: RecordDsaVideoWatchInput,
): Promise<void>;
async function enqueueOperation(
  kind: "systemDesign.updateItemProgress",
  input: UpdateSystemDesignItemProgressInput,
): Promise<void>;
async function enqueueOperation(
  kind: "systemDesign.recordVideoWatch",
  input: RecordSystemDesignVideoWatchInput,
): Promise<void>;
async function enqueueOperation(
  kind: OperationKind,
  input:
    | CreateTaskInput
    | UpdateTaskInput
    | DeleteTaskInput
    | RevertTaskToProposalInput
    | ReorderTaskInput
    | UpdateJobStatusInput
    | DeleteJobInput
    | UpdateJobSearchProfileInput
    | SaveDiaryDayInput
    | DeleteDiaryDayInput
    | ProfileBasicsInput
    | UpdateProfileApplicationDefaultsInput
    | CreateProfileItemInput
    | UpdateProfileItemInput
    | DeleteProfileItemInput
    | CreateProjectInput
    | UpdateProjectInput
    | ProjectIdInput
    | CreateProjectNoteInput
    | UpdateProjectNoteInput
    | DeleteProjectNoteInput
    | CreateProjectResourceInput
    | UpdateProjectResourceInput
    | DeleteProjectResourceInput
    | CreateProjectAttributeInput
    | UpdateProjectAttributeInput
    | DeleteProjectAttributeInput
    | UpdateDsaQuestionProgressInput
    | RecordDsaVideoWatchInput
    | UpdateSystemDesignItemProgressInput
    | RecordSystemDesignVideoWatchInput,
  options: EnqueueOperationOptions = {},
) {
  if (!isTauriRuntime()) {
    throw new OfflineReplayError();
  }

  const session = await loadDesktopSession();

  if (!session) {
    throw new Error("Sign in before queuing offline desktop changes.");
  }

  const store = await getStore();
  const key = queueKey(session.user.id);
  const queue = readQueue(await store.get<unknown>(key));
  const now = new Date().toISOString();
  const id = operationId(kind, input, options.id);
  const existing = queue.find((operation) => operation.id === id);
  const operation = {
    createdAt: existing?.createdAt ?? now,
    id,
    input,
    kind,
    ...(kind === "task.create" && options.localTaskId
      ? { localTaskId: options.localTaskId }
      : {}),
    ...(kind === "profile.createItem" && options.localProfileItemId
      ? { localProfileItemId: options.localProfileItemId }
      : {}),
    ...(kind === "projects.create" && options.localProjectId
      ? { localProjectId: options.localProjectId }
      : {}),
    ...(kind === "projects.createNote" && options.localProjectNoteId
      ? { localProjectNoteId: options.localProjectNoteId }
      : {}),
    ...(kind === "projects.createResource" && options.localProjectResourceId
      ? { localProjectResourceId: options.localProjectResourceId }
      : {}),
    ...(kind === "projects.createAttribute" && options.localProjectAttributeId
      ? { localProjectAttributeId: options.localProjectAttributeId }
      : {}),
    updatedAt: now,
  } as OfflineOperation;
  const nextQueue = [...queue.filter((item) => item.id !== id), operation].sort(
    (a, b) => a.createdAt.localeCompare(b.createdAt),
  );

  await store.set(key, {
    operations: nextQueue,
    updatedAt: now,
    version: storeVersion,
  });
  await store.save();
  dispatchQueueChanged();
}

async function flushDesktopOfflineMutations(
  remoteRpcClient: CareerightRpcClient,
  queryClient: QueryClient,
  userId: string,
) {
  if (isFlushing || isOffline() || !isTauriRuntime()) {
    return;
  }

  isFlushing = true;
  dispatchStatusChanged();

  try {
    const store = await getStore();
    const key = queueKey(userId);
    let queue = readQueue(await store.get<unknown>(key));
    let replayed = false;
    const taskIdMap = new Map<string, string>();
    const profileItemIdMap = new Map<string, string>();
    const projectAttributeIdMap = new Map<string, string>();
    const projectIdMap = new Map<string, string>();
    const projectNoteIdMap = new Map<string, string>();
    const projectResourceIdMap = new Map<string, string>();

    if (queue.length === 0) {
      return;
    }

    for (const operation of queue) {
      if (isOffline()) {
        return;
      }

      await replayOperation(
        remoteRpcClient,
        operation,
        taskIdMap,
        profileItemIdMap,
        projectAttributeIdMap,
        projectIdMap,
        projectNoteIdMap,
        projectResourceIdMap,
      );
      replayed = true;
      queue = queue.filter((item) => item.id !== operation.id);
      await store.set(key, {
        operations: queue,
        updatedAt: new Date().toISOString(),
        version: storeVersion,
      });
      await store.save();
      dispatchStatusChanged();
    }

    if (queue.length === 0) {
      await store.delete(key);
      await store.save();
      dispatchStatusChanged();
    }

    if (replayed) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: boardSnapshotQueryKey }),
        queryClient.invalidateQueries({ queryKey: dashboardAnalyticsQueryKey }),
        queryClient.invalidateQueries({ queryKey: dashboardMetricsQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["diary-day"] }),
        queryClient.invalidateQueries({ queryKey: diaryRecentQueryKey }),
        queryClient.invalidateQueries({ queryKey: dsaSnapshotQueryKey }),
        queryClient.invalidateQueries({ queryKey: systemDesignSnapshotQueryKey }),
        queryClient.invalidateQueries({ queryKey: historySnapshotQueryKey }),
        queryClient.invalidateQueries({ queryKey: jobsQueryKey }),
        queryClient.invalidateQueries({ queryKey: jobSearchProfileQueryKey }),
        queryClient.invalidateQueries({ queryKey: profileImportsQueryKey }),
        queryClient.invalidateQueries({ queryKey: profileSnapshotQueryKey }),
        queryClient.invalidateQueries({ queryKey: projectsListQueryKey }),
        queryClient.invalidateQueries({ queryKey: projectsSummaryQueryKey }),
        queryClient.invalidateQueries({ queryKey: ["project-detail"] }),
        queryClient.invalidateQueries({ queryKey: proposalHistoryQueryKey }),
      ]);
    }
  } catch (error) {
    console.info("Careeright offline mutation replay paused", error);
  } finally {
    isFlushing = false;
    dispatchStatusChanged();
  }
}

async function replayOperation(
  remoteRpcClient: CareerightRpcClient,
  operation: OfflineOperation,
  taskIdMap: Map<string, string>,
  profileItemIdMap: Map<string, string>,
  projectAttributeIdMap: Map<string, string>,
  projectIdMap: Map<string, string>,
  projectNoteIdMap: Map<string, string>,
  projectResourceIdMap: Map<string, string>,
) {
  if (operation.kind === "task.create") {
    const task = await remoteRpcClient.task.create(operation.input);
    taskIdMap.set(operation.localTaskId, task.id);
    return;
  }

  if (operation.kind === "task.update") {
    await remoteRpcClient.task.update(remapTaskInput(operation.input, taskIdMap));
    return;
  }

  if (operation.kind === "task.delete") {
    await remoteRpcClient.task.delete(remapTaskInput(operation.input, taskIdMap));
    return;
  }

  if (operation.kind === "task.revertToProposal") {
    await remoteRpcClient.task.revertToProposal(
      remapTaskInput(operation.input, taskIdMap),
    );
    return;
  }

  if (operation.kind === "task.reorder") {
    await remoteRpcClient.task.reorder(
      remapTaskInput(operation.input, taskIdMap),
    );
    return;
  }

  if (operation.kind === "jobs.updateStatus") {
    await remoteRpcClient.jobs.updateStatus(operation.input);
    return;
  }

  if (operation.kind === "jobs.delete") {
    await remoteRpcClient.jobs.delete(operation.input);
    return;
  }

  if (operation.kind === "jobs.updateSearchProfile") {
    await remoteRpcClient.jobs.updateSearchProfile(operation.input);
    return;
  }

  if (operation.kind === "diary.saveDay") {
    await remoteRpcClient.diary.saveDay(operation.input);
    return;
  }

  if (operation.kind === "diary.deleteDay") {
    await remoteRpcClient.diary.deleteDay(operation.input);
    return;
  }

  if (operation.kind === "profile.update") {
    await remoteRpcClient.profile.update(operation.input);
    return;
  }

  if (operation.kind === "profile.updateApplicationDefaults") {
    await remoteRpcClient.profile.updateApplicationDefaults(operation.input);
    return;
  }

  if (operation.kind === "profile.createItem") {
    const item = await remoteRpcClient.profile.createItem(operation.input);
    profileItemIdMap.set(operation.localProfileItemId, item.id);
    return;
  }

  if (operation.kind === "profile.updateItem") {
    await remoteRpcClient.profile.updateItem(
      remapProfileItemInput(operation.input, profileItemIdMap),
    );
    return;
  }

  if (operation.kind === "profile.deleteItem") {
    await remoteRpcClient.profile.deleteItem(
      remapProfileItemInput(operation.input, profileItemIdMap),
    );
    return;
  }

  if (operation.kind === "projects.create") {
    const project = await remoteRpcClient.projects.create(operation.input);
    projectIdMap.set(operation.localProjectId, project.id);
    return;
  }

  if (operation.kind === "projects.update") {
    await remoteRpcClient.projects.update(
      remapProjectInput(operation.input, projectIdMap),
    );
    return;
  }

  if (operation.kind === "projects.archive") {
    await remoteRpcClient.projects.archive(
      remapProjectInput(operation.input, projectIdMap),
    );
    return;
  }

  if (operation.kind === "projects.delete") {
    await remoteRpcClient.projects.delete(
      remapProjectInput(operation.input, projectIdMap),
    );
    return;
  }

  if (operation.kind === "projects.createNote") {
    const note = await remoteRpcClient.projects.createNote(
      remapProjectInput(operation.input, projectIdMap),
    );
    projectNoteIdMap.set(operation.localProjectNoteId, note.id);
    return;
  }

  if (operation.kind === "projects.updateNote") {
    await remoteRpcClient.projects.updateNote(
      remapProjectNoteInput(operation.input, projectNoteIdMap),
    );
    return;
  }

  if (operation.kind === "projects.deleteNote") {
    await remoteRpcClient.projects.deleteNote(
      remapProjectNoteInput(operation.input, projectNoteIdMap),
    );
    return;
  }

  if (operation.kind === "projects.createResource") {
    const resource = await remoteRpcClient.projects.createResource(
      remapProjectInput(operation.input, projectIdMap),
    );
    projectResourceIdMap.set(operation.localProjectResourceId, resource.id);
    return;
  }

  if (operation.kind === "projects.updateResource") {
    await remoteRpcClient.projects.updateResource(
      remapProjectResourceInput(operation.input, projectIdMap, projectResourceIdMap),
    );
    return;
  }

  if (operation.kind === "projects.deleteResource") {
    await remoteRpcClient.projects.deleteResource(
      remapProjectResourceInput(operation.input, projectIdMap, projectResourceIdMap),
    );
    return;
  }

  if (operation.kind === "projects.createAttribute") {
    const attribute = await remoteRpcClient.projects.createAttribute(
      remapProjectAttributeInput(
        operation.input,
        projectAttributeIdMap,
        projectIdMap,
        projectResourceIdMap,
      ),
    );
    projectAttributeIdMap.set(
      operation.localProjectAttributeId,
      attribute.id,
    );
    return;
  }

  if (operation.kind === "projects.updateAttribute") {
    await remoteRpcClient.projects.updateAttribute(
      remapProjectAttributeInput(
        operation.input,
        projectAttributeIdMap,
        projectIdMap,
        projectResourceIdMap,
      ),
    );
    return;
  }

  if (operation.kind === "projects.deleteAttribute") {
    await remoteRpcClient.projects.deleteAttribute(
      remapProjectAttributeInput(
        operation.input,
        projectAttributeIdMap,
        projectIdMap,
        projectResourceIdMap,
      ),
    );
    return;
  }

  if (operation.kind === "dsa.updateQuestionProgress") {
    await remoteRpcClient.dsa.updateQuestionProgress(operation.input);
    return;
  }

  if (operation.kind === "dsa.recordVideoWatch") {
    await remoteRpcClient.dsa.recordVideoWatch(operation.input);
    return;
  }

  if (operation.kind === "systemDesign.updateItemProgress") {
    await remoteRpcClient.systemDesign.updateItemProgress(operation.input);
    return;
  }

  await remoteRpcClient.systemDesign.recordVideoWatch(operation.input);
}

export function applyTaskCreate(
  snapshot: BoardSnapshot,
  input: CreateTaskInput,
  userId: string,
  localTaskId = createOfflineTaskId(),
) {
  const boardId = input.boardId ?? snapshot.board.id;

  if (boardId !== snapshot.board.id) {
    throw new Error("Task cannot be queued for a board that is not loaded.");
  }

  const columnId = input.columnId ?? "todo";
  const createdAt = new Date().toISOString();
  const task: KanbanTask = {
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    boardId,
    columnId,
    createdAt,
    dependencies: input.dependencies ?? [],
    description: input.description?.trim() ?? "",
    helpfulLinks: input.helpfulLinks ?? [],
    id: localTaskId,
    order: nextColumnOrder(snapshot.tasks, columnId, localTaskId),
    priority: input.priority ?? "medium",
    problemLinks: input.problemLinks ?? [],
    resourceLinks: input.resourceLinks ?? [],
    ...(input.sourceProposalId
      ? { sourceProposalId: input.sourceProposalId }
      : {}),
    ...(input.sourceProposalItemFingerprint
      ? { sourceProposalItemFingerprint: input.sourceProposalItemFingerprint }
      : {}),
    ...(input.sourceProposalTopic
      ? { sourceProposalTopic: input.sourceProposalTopic }
      : {}),
    taskNumber: nextTaskNumber(snapshot.tasks),
    title: input.title.trim(),
    updatedAt: createdAt,
    userId,
  };

  return {
    snapshot: {
      ...snapshot,
      tasks: [...snapshot.tasks, task],
    },
    task,
  };
}

export function applyTaskUpdate(snapshot: BoardSnapshot, input: UpdateTaskInput) {
  const task = requireCachedTask(snapshot, input.taskId);
  const updatedAt = new Date().toISOString();
  let order = task.order;

  if (input.patch.columnId && input.patch.columnId !== task.columnId) {
    order = nextColumnOrder(snapshot.tasks, input.patch.columnId, task.id);
  }

  const updatedTask = {
    ...task,
    ...input.patch,
    order,
    updatedAt,
  };

  return {
    snapshot: {
      ...snapshot,
      tasks: snapshot.tasks.map((item) =>
        item.id === input.taskId ? updatedTask : item,
      ),
    },
    task: updatedTask,
  };
}

export function applyTaskReorder(
  snapshot: BoardSnapshot,
  input: ReorderTaskInput,
) {
  requireCachedTask(snapshot, input.taskId);

  const tasks = reorderTaskListForSnapshot(
    snapshot.tasks,
    input.taskId,
    input.columnId,
    input.index,
  );
  const task = tasks.find((item) => item.id === input.taskId);

  if (!task) {
    throw new Error("Task not found.");
  }

  return {
    snapshot: {
      ...snapshot,
      tasks,
    },
    task,
  };
}

export function removeTaskFromSnapshot(
  snapshot: BoardSnapshot,
  taskId: string,
) {
  requireCachedTask(snapshot, taskId);

  return {
    ...snapshot,
    tasks: snapshot.tasks.filter((task) => task.id !== taskId),
  };
}

export function applyJobStatusUpdate(
  jobs: JobRecord[],
  input: UpdateJobStatusInput,
) {
  const job = requireCachedJob(jobs, input.jobId);
  const updatedAt = new Date().toISOString();
  const updatedJob = {
    ...job,
    status: input.status,
    updatedAt,
  };

  return {
    job: updatedJob,
    jobs: jobs.map((item) => (item.id === input.jobId ? updatedJob : item)),
  };
}

export function removeJobFromList(jobs: JobRecord[], jobId: string) {
  const job = requireCachedJob(jobs, jobId);
  const deletedAt = new Date().toISOString();
  const deletedJob = {
    ...job,
    deletedAt,
    updatedAt: deletedAt,
  };

  return {
    job: deletedJob,
    jobs: jobs.filter((item) => item.id !== jobId),
  };
}

export function applyJobSearchProfileUpdate(
  profile: JobSearchProfile,
  input: UpdateJobSearchProfileInput,
) {
  return {
    ...profile,
    ...input,
    updatedAt: new Date().toISOString(),
  };
}

export function applyDiarySave(
  currentDay: DiaryDay | null,
  input: SaveDiaryDayInput,
  userId: string,
  updatedAt = new Date().toISOString(),
) {
  const intervals = sortDiaryIntervals(
    (input.intervals ?? []).map((interval) => {
      const existing = currentDay?.intervals.find(
        (item) => interval.id && item.id === interval.id,
      );

      return {
        createdAt: existing?.createdAt ?? updatedAt,
        endTime: interval.endTime,
        id: existing?.id ?? interval.id ?? createOfflineDiaryIntervalId(),
        notes: interval.notes?.trim() ?? "",
        startTime: interval.startTime,
        summary: interval.summary?.trim() ?? "",
        title: interval.title?.trim() ?? "",
        updatedAt,
      } satisfies DiaryInterval;
    }),
  );

  return {
    createdAt: currentDay?.createdAt ?? updatedAt,
    dailySummary: input.dailySummary?.trim() ?? "",
    dateKey: input.dateKey,
    id: currentDay?.id ?? createOfflineDiaryDayId(input.dateKey),
    intervals,
    status: input.status ?? "draft",
    tomorrowFocus: input.tomorrowFocus?.trim() ?? "",
    updatedAt,
    userId,
  } satisfies DiaryDay;
}

export function applyDiaryDelete(
  days: DiaryDay[] | undefined,
  dateKey: string,
) {
  return days?.filter((day) => day.dateKey !== dateKey) ?? days;
}

export function applyProfileUpdate(
  snapshot: ProfileSnapshot,
  input: ProfileBasicsInput,
  updatedAt = new Date().toISOString(),
) {
  const profile: UserProfile = {
    ...snapshot.profile,
    displayName: input.displayName?.trim() ?? "",
    email: input.email?.trim() ?? "",
    headline: input.headline?.trim() ?? "",
    location: input.location?.trim() ?? "",
    summary: input.summary?.trim() ?? "",
    updatedAt,
    website: input.website?.trim() ?? "",
  };

  return {
    profile,
    snapshot: {
      ...snapshot,
      profile,
    },
  };
}

export function applyProfileApplicationDefaultsUpdate(
  snapshot: ProfileSnapshot,
  input: UpdateProfileApplicationDefaultsInput,
  updatedAt = new Date().toISOString(),
) {
  const profile: UserProfile = {
    ...snapshot.profile,
    applicationDefaults: {
      ...snapshot.profile.applicationDefaults,
      ...normalizeProfileApplicationDefaultsPatch(input),
    },
    updatedAt,
  };

  return {
    profile,
    snapshot: {
      ...snapshot,
      profile,
    },
  };
}

export function applyProfileItemCreate(
  snapshot: ProfileSnapshot,
  input: CreateProfileItemInput,
  localItemId = createOfflineProfileItemId(),
  createdAt = new Date().toISOString(),
) {
  const item: ProfileItem = {
    ...normalizeProfileItemInput(input),
    createdAt,
    id: localItemId,
    updatedAt: createdAt,
    userId: snapshot.profile.userId,
  };

  return {
    item,
    snapshot: {
      ...snapshot,
      items: [...snapshot.items, item],
    },
  };
}

export function applyProfileItemUpdate(
  snapshot: ProfileSnapshot,
  input: UpdateProfileItemInput,
  updatedAt = new Date().toISOString(),
) {
  const item = requireCachedProfileItem(snapshot, input.itemId);
  const updatedItem: ProfileItem = {
    ...item,
    ...normalizeProfileItemPatch(input.patch),
    updatedAt,
  };

  return {
    item: updatedItem,
    snapshot: {
      ...snapshot,
      items: snapshot.items.map((currentItem) =>
        currentItem.id === input.itemId ? updatedItem : currentItem,
      ),
    },
  };
}

export function removeProfileItemFromSnapshot(
  snapshot: ProfileSnapshot,
  itemId: string,
) {
  requireCachedProfileItem(snapshot, itemId);

  return {
    ...snapshot,
    items: snapshot.items.filter((item) => item.id !== itemId),
  };
}

export function applyProjectCreate(
  projects: Project[],
  input: CreateProjectInput,
  userId: string,
  localProjectId = createOfflineProjectId(),
  createdAt = new Date().toISOString(),
) {
  const project: Project = {
    archivedAt: undefined,
    attributes: [],
    createdAt,
    dateText: input.dateText?.trim() ?? "",
    deletedAt: undefined,
    id: localProjectId,
    resources: [],
    sourceProfileItemId: undefined,
    sourceProfileUpdatedAt: undefined,
    status: input.status ?? "active",
    summary: input.summary?.trim() ?? "",
    techStack: normalizeProjectList(input.techStack ?? []),
    title: input.title.trim(),
    updatedAt: createdAt,
    userId,
  };

  return {
    project,
    projects: sortProjectsForCache([...projects, project]),
  };
}

export function applyProjectUpdate(
  projects: Project[],
  input: UpdateProjectInput,
  updatedAt = new Date().toISOString(),
) {
  const current = requireCachedProject(projects, input.projectId);
  const patch = normalizeProjectPatch(input.patch);
  const project: Project = {
    ...current,
    ...patch,
    archivedAt:
      patch.status === "archived"
        ? current.archivedAt ?? updatedAt
        : current.archivedAt,
    updatedAt,
  };

  return {
    project,
    projects: sortProjectsForCache(
      projects.map((item) => (item.id === input.projectId ? project : item)),
    ),
  };
}

export function applyProjectArchive(
  projects: Project[],
  projectId: string,
  updatedAt = new Date().toISOString(),
) {
  const current = requireCachedProject(projects, projectId);
  const project: Project = {
    ...current,
    archivedAt: current.archivedAt ?? updatedAt,
    status: "archived",
    updatedAt,
  };

  return {
    project,
    projects: sortProjectsForCache(
      projects.map((item) => (item.id === projectId ? project : item)),
    ),
  };
}

export function applyProjectDelete(
  projects: Project[],
  projectId: string,
  updatedAt = new Date().toISOString(),
) {
  const current = requireCachedProject(projects, projectId);
  const project: Project = {
    ...current,
    archivedAt: current.archivedAt ?? updatedAt,
    deletedAt: updatedAt,
    status: "archived",
    updatedAt,
  };

  return {
    project,
    projects: projects.filter((item) => item.id !== projectId),
  };
}

export function applyProjectNoteCreate(
  detail: ProjectDetail,
  input: CreateProjectNoteInput,
  userId: string,
  localNoteId = createOfflineProjectNoteId(),
  createdAt = new Date().toISOString(),
) {
  if (input.projectId !== detail.project.id) {
    throw new Error("Project note cannot be queued for a project that is not loaded.");
  }

  const note: ProjectNote = {
    content: input.content ?? "",
    createdAt,
    id: localNoteId,
    order: detail.notes.length,
    projectId: input.projectId,
    title: input.title.trim(),
    updatedAt: createdAt,
    userId,
  };

  return {
    detail: {
      ...detail,
      notes: sortProjectNotesForCache([...detail.notes, note]),
    },
    note,
  };
}

export function applyProjectNoteUpdate(
  detail: ProjectDetail,
  input: UpdateProjectNoteInput,
  updatedAt = new Date().toISOString(),
) {
  const current = requireCachedProjectNote(detail, input.noteId);
  const note: ProjectNote = {
    ...current,
    ...normalizeProjectNotePatch(input.patch),
    updatedAt,
  };

  return {
    detail: {
      ...detail,
      notes: sortProjectNotesForCache(
        detail.notes.map((item) => (item.id === input.noteId ? note : item)),
      ),
    },
    note,
  };
}

export function removeProjectNoteFromDetail(
  detail: ProjectDetail,
  noteId: string,
) {
  requireCachedProjectNote(detail, noteId);

  return {
    ...detail,
    notes: detail.notes.filter((note) => note.id !== noteId),
  };
}

export function applyProjectResourceCreate(
  detail: ProjectDetail,
  input: CreateProjectResourceInput,
  localResourceId = createOfflineProjectResourceId(),
  createdAt = new Date().toISOString(),
) {
  requireProjectDetailMatches(detail, input.projectId);

  const resource: ProjectResource = {
    createdAt,
    id: localResourceId,
    note: input.note?.trim() ?? "",
    title: input.title.trim(),
    type: input.type ?? "link",
    updatedAt: createdAt,
    url: input.url.trim(),
  };
  const project: Project = {
    ...detail.project,
    resources: [...detail.project.resources, resource],
    updatedAt: createdAt,
  };

  return {
    detail: {
      ...detail,
      project,
    },
    resource,
  };
}

export function applyProjectResourceUpdate(
  detail: ProjectDetail,
  input: UpdateProjectResourceInput,
  updatedAt = new Date().toISOString(),
) {
  requireProjectDetailMatches(detail, input.projectId);
  const current = requireCachedProjectResource(detail.project, input.resourceId);
  const resource: ProjectResource = {
    ...current,
    ...normalizeProjectResourcePatch(input.patch),
    updatedAt,
  };
  const project: Project = {
    ...detail.project,
    resources: detail.project.resources.map((item) =>
      item.id === input.resourceId ? resource : item,
    ),
    updatedAt,
  };

  return {
    detail: {
      ...detail,
      project,
    },
    resource,
  };
}

export function removeProjectResourceFromDetail(
  detail: ProjectDetail,
  input: DeleteProjectResourceInput,
  updatedAt = new Date().toISOString(),
) {
  requireProjectDetailMatches(detail, input.projectId);
  const resource = requireCachedProjectResource(
    detail.project,
    input.resourceId,
  );
  const project: Project = {
    ...detail.project,
    attributes: detail.project.attributes.map((attribute) => ({
      ...attribute,
      resourceIds: attribute.resourceIds.filter(
        (resourceId) => resourceId !== input.resourceId,
      ),
    })),
    resources: detail.project.resources.filter(
      (item) => item.id !== input.resourceId,
    ),
    updatedAt,
  };

  return {
    detail: {
      ...detail,
      project,
    },
    resource,
  };
}

export function applyProjectAttributeCreate(
  detail: ProjectDetail,
  input: CreateProjectAttributeInput,
  localAttributeId = createOfflineProjectAttributeId(),
  createdAt = new Date().toISOString(),
) {
  requireProjectDetailMatches(detail, input.projectId);
  const resourceIds = normalizeProjectList(input.resourceIds ?? []);
  ensureProjectResourceIds(detail.project, resourceIds);
  const label = input.label.trim();
  const attribute: ProjectAttribute = {
    aliases: normalizeProjectAttributeAliases(label, input.aliases ?? []),
    createdAt,
    dateValue: input.dateValue?.trim() ?? "",
    description: input.description?.trim() ?? "",
    id: localAttributeId,
    label,
    resourceIds,
    type: input.type ?? "concept",
    updatedAt: createdAt,
  };
  const project: Project = {
    ...detail.project,
    attributes: [...detail.project.attributes, attribute],
    updatedAt: createdAt,
  };

  return {
    attribute,
    detail: {
      ...detail,
      project,
    },
  };
}

export function applyProjectAttributeUpdate(
  detail: ProjectDetail,
  input: UpdateProjectAttributeInput,
  updatedAt = new Date().toISOString(),
) {
  requireProjectDetailMatches(detail, input.projectId);
  const current = requireCachedProjectAttribute(
    detail.project,
    input.attributeId,
  );
  const label = input.patch.label?.trim() ?? current.label;
  const resourceIds = normalizeProjectList(
    input.patch.resourceIds ?? current.resourceIds,
  );
  ensureProjectResourceIds(detail.project, resourceIds);
  const attribute: ProjectAttribute = {
    ...current,
    ...normalizeProjectAttributePatch(input.patch),
    aliases: normalizeProjectAttributeAliases(
      label,
      input.patch.aliases ?? current.aliases,
    ),
    label,
    resourceIds,
    updatedAt,
  };
  const project: Project = {
    ...detail.project,
    attributes: detail.project.attributes.map((item) =>
      item.id === input.attributeId ? attribute : item,
    ),
    updatedAt,
  };

  return {
    attribute,
    detail: {
      ...detail,
      project,
    },
  };
}

export function removeProjectAttributeFromDetail(
  detail: ProjectDetail,
  input: DeleteProjectAttributeInput,
  updatedAt = new Date().toISOString(),
) {
  requireProjectDetailMatches(detail, input.projectId);
  const attribute = requireCachedProjectAttribute(
    detail.project,
    input.attributeId,
  );
  const project: Project = {
    ...detail.project,
    attributes: detail.project.attributes.filter(
      (item) => item.id !== input.attributeId,
    ),
    updatedAt,
  };

  return {
    attribute,
    detail: {
      ...detail,
      project,
    },
  };
}

function reorderTaskListForSnapshot(
  tasks: KanbanTask[],
  taskId: string,
  columnId: KanbanTask["columnId"],
  index: number,
) {
  const movingTask = tasks.find((task) => task.id === taskId);

  if (!movingTask) {
    throw new Error("Task not found.");
  }

  const updatedAt = new Date().toISOString();
  const withoutMovingTask = tasks.filter((task) => task.id !== taskId);
  const columnIds = Array.from(
    new Set([...withoutMovingTask.map((task) => task.columnId), columnId]),
  );
  const reorderedTasks: KanbanTask[] = [];

  for (const currentColumnId of columnIds) {
    const columnTasks = withoutMovingTask
      .filter((task) => task.columnId === currentColumnId)
      .sort((a, b) => a.order - b.order);

    if (currentColumnId === columnId) {
      columnTasks.splice(Math.min(index, columnTasks.length), 0, {
        ...movingTask,
        columnId,
        updatedAt,
      });
    }

    reorderedTasks.push(
      ...columnTasks.map((task, order) => ({
        ...task,
        order,
      })),
    );
  }

  return reorderedTasks.sort((a, b) => {
    if (a.columnId === b.columnId) {
      return a.order - b.order;
    }

    return a.columnId.localeCompare(b.columnId);
  });
}

function nextColumnOrder(
  tasks: KanbanTask[],
  columnId: KanbanTask["columnId"],
  ignoredTaskId: string,
) {
  const columnOrders = tasks
    .filter((task) => task.id !== ignoredTaskId && task.columnId === columnId)
    .map((task) => task.order);

  return columnOrders.length === 0 ? 0 : Math.max(...columnOrders) + 1;
}

function nextTaskNumber(tasks: KanbanTask[]) {
  const taskNumbers = tasks.map((task) => task.taskNumber);

  return taskNumbers.length === 0 ? 1 : Math.max(...taskNumbers) + 1;
}

function remapTaskInput<T extends { taskId: string }>(
  input: T,
  taskIdMap: Map<string, string>,
) {
  const mappedTaskId = taskIdMap.get(input.taskId);

  if (!mappedTaskId) {
    return input;
  }

  return {
    ...input,
    taskId: mappedTaskId,
  };
}

function remapProfileItemInput<T extends { itemId: string }>(
  input: T,
  profileItemIdMap: Map<string, string>,
) {
  const mappedItemId = profileItemIdMap.get(input.itemId);

  if (!mappedItemId) {
    return input;
  }

  return {
    ...input,
    itemId: mappedItemId,
  };
}

function remapProjectInput<T extends { projectId: string }>(
  input: T,
  projectIdMap: Map<string, string>,
) {
  const mappedProjectId = projectIdMap.get(input.projectId);

  if (!mappedProjectId) {
    return input;
  }

  return {
    ...input,
    projectId: mappedProjectId,
  };
}

function remapProjectNoteInput<T extends { noteId: string }>(
  input: T,
  projectNoteIdMap: Map<string, string>,
) {
  const mappedNoteId = projectNoteIdMap.get(input.noteId);

  if (!mappedNoteId) {
    return input;
  }

  return {
    ...input,
    noteId: mappedNoteId,
  };
}

function remapProjectResourceInput<
  T extends { projectId: string; resourceId: string },
>(
  input: T,
  projectIdMap: Map<string, string>,
  projectResourceIdMap: Map<string, string>,
) {
  const projectInput = remapProjectInput(input, projectIdMap);
  const mappedResourceId = projectResourceIdMap.get(projectInput.resourceId);

  if (!mappedResourceId) {
    return projectInput;
  }

  return {
    ...projectInput,
    resourceId: mappedResourceId,
  };
}

function remapProjectAttributeInput<
  T extends {
    attributeId?: string;
    patch?: { resourceIds?: string[] };
    projectId: string;
    resourceIds?: string[];
  },
>(
  input: T,
  projectAttributeIdMap: Map<string, string>,
  projectIdMap: Map<string, string>,
  projectResourceIdMap: Map<string, string>,
) {
  const projectInput = remapProjectInput(input, projectIdMap);
  const mappedAttributeId = projectInput.attributeId
    ? projectAttributeIdMap.get(projectInput.attributeId)
    : undefined;
  const resourceIds = projectInput.resourceIds
    ? remapProjectResourceIds(projectInput.resourceIds, projectResourceIdMap)
    : undefined;
  const patchResourceIds = projectInput.patch?.resourceIds
    ? remapProjectResourceIds(
        projectInput.patch.resourceIds,
        projectResourceIdMap,
      )
    : undefined;

  return {
    ...projectInput,
    ...(mappedAttributeId ? { attributeId: mappedAttributeId } : {}),
    ...(resourceIds ? { resourceIds } : {}),
    ...(patchResourceIds
      ? {
          patch: {
            ...projectInput.patch,
            resourceIds: patchResourceIds,
          },
        }
      : {}),
  };
}

function remapProjectResourceIds(
  resourceIds: string[],
  projectResourceIdMap: Map<string, string>,
) {
  return resourceIds.map(
    (resourceId) => projectResourceIdMap.get(resourceId) ?? resourceId,
  );
}

function requireCachedTask(snapshot: BoardSnapshot, taskId: string) {
  const task = snapshot.tasks.find((item) => item.id === taskId);

  if (!task) {
    throw new Error("Task cannot be queued until it has loaded once.");
  }

  return task;
}

function requireCachedJob(jobs: JobRecord[], jobId: string) {
  const job = jobs.find((item) => item.id === jobId);

  if (!job) {
    throw new Error("Job cannot be queued until it has loaded once.");
  }

  return job;
}

function requireCachedProfileItem(snapshot: ProfileSnapshot, itemId: string) {
  const item = snapshot.items.find((currentItem) => currentItem.id === itemId);

  if (!item) {
    throw new Error("Profile item cannot be queued until it has loaded once.");
  }

  return item;
}

function requireCachedProject(projects: Project[], projectId: string) {
  const project = projects.find((item) => item.id === projectId);

  if (!project) {
    throw new Error("Project cannot be queued until it has loaded once.");
  }

  return project;
}

function requireProjectDetailMatches(detail: ProjectDetail, projectId: string) {
  if (detail.project.id !== projectId) {
    throw new Error("Project detail cannot be queued until it has loaded once.");
  }
}

function requireCachedProjectNote(detail: ProjectDetail, noteId: string) {
  const note = detail.notes.find((item) => item.id === noteId);

  if (!note) {
    throw new Error("Project note cannot be queued until it has loaded once.");
  }

  return note;
}

function requireCachedProjectResource(project: Project, resourceId: string) {
  const resource = project.resources.find((item) => item.id === resourceId);

  if (!resource) {
    throw new Error("Project resource cannot be queued until it has loaded once.");
  }

  return resource;
}

function requireCachedProjectAttribute(project: Project, attributeId: string) {
  const attribute = project.attributes.find((item) => item.id === attributeId);

  if (!attribute) {
    throw new Error(
      "Project attribute cannot be queued until it has loaded once.",
    );
  }

  return attribute;
}

function ensureProjectResourceIds(project: Project, resourceIds: string[]) {
  const existing = new Set(project.resources.map((resource) => resource.id));
  const invalid = resourceIds.find((resourceId) => !existing.has(resourceId));

  if (invalid) {
    throw new Error(`Project resource ${invalid} was not found.`);
  }
}

export function setCachedBoardSnapshot(
  queryClient: QueryClient,
  snapshot: BoardSnapshot,
) {
  queryClient.setQueryData(boardSnapshotQueryKey, snapshot);
  queryClient.setQueryData<DashboardMetrics>(
    dashboardMetricsQueryKey,
    (currentMetrics) => {
      if (!currentMetrics) {
        return currentMetrics;
      }

      return {
        ...currentMetrics,
        boardTitle: snapshot.board.title,
        doneCount: snapshot.tasks.filter((task) => task.columnId === "done")
          .length,
        inProgressCount: snapshot.tasks.filter(
          (task) => task.columnId === "in_progress",
        ).length,
        taskCount: snapshot.tasks.length,
      };
    },
  );
}

function setCachedJobs(queryClient: QueryClient, jobs: JobRecord[]) {
  queryClient.setQueryData(jobsQueryKey, jobs);
}

function requireCachedDiaryDay(queryClient: QueryClient, dateKey: string) {
  const queryKey = diaryDayQueryKey(dateKey);

  if (!queryClient.getQueryState(queryKey)) {
    throw new Error("Diary day cannot be queued until it has loaded once.");
  }

  return queryClient.getQueryData<DiaryDay | null>(queryKey) ?? null;
}

function setCachedDiaryDay(queryClient: QueryClient, day: DiaryDay) {
  queryClient.setQueryData(diaryDayQueryKey(day.dateKey), day);
  queryClient.setQueryData<DiaryDay[] | undefined>(
    diaryRecentQueryKey,
    (currentDays) => {
      if (!currentDays) {
        return currentDays;
      }

      const nextDays = [
        day,
        ...currentDays.filter((item) => item.dateKey !== day.dateKey),
      ];

      return sortDiaryDays(nextDays).slice(0, 30);
    },
  );
}

function removeCachedDiaryDay(queryClient: QueryClient, dateKey: string) {
  queryClient.setQueryData(diaryDayQueryKey(dateKey), null);
  queryClient.setQueryData<DiaryDay[] | undefined>(
    diaryRecentQueryKey,
    (currentDays) => applyDiaryDelete(currentDays, dateKey),
  );
}

function setCachedProfileSnapshot(
  queryClient: QueryClient,
  snapshot: ProfileSnapshot,
) {
  queryClient.setQueryData(profileSnapshotQueryKey, snapshot);
}

function setCachedProjects(queryClient: QueryClient, projects: Project[]) {
  queryClient.setQueryData(projectsListQueryKey, projects);
  queryClient.setQueryData<ProjectsSummary>(
    projectsSummaryQueryKey,
    (currentSummary) => {
      if (!currentSummary) {
        return currentSummary;
      }

      const linkedProfileItemIds = new Set(
        projects
          .map((project) => project.sourceProfileItemId)
          .filter((value): value is string => Boolean(value)),
      );

      return {
        ...currentSummary,
        activeProjects: projects.filter(
          (project) => project.status !== "archived",
        ).length,
        archivedProjects: projects.filter(
          (project) => project.status === "archived",
        ).length,
        attributeCount: projects.reduce(
          (count, project) => count + project.attributes.length,
          0,
        ),
        linkedProfileProjects: linkedProfileItemIds.size,
        resourceCount: projects.reduce(
          (count, project) => count + project.resources.length,
          0,
        ),
        totalProjects: projects.length,
        updatedAt: projects[0]?.updatedAt ?? null,
      };
    },
  );
}

function setCachedProjectDetail(
  queryClient: QueryClient,
  detail: ProjectDetail,
) {
  queryClient.setQueryData(projectDetailQueryKey(detail.project.id), detail);
}

function updateCachedProjectDetail(queryClient: QueryClient, project: Project) {
  queryClient.setQueryData<ProjectDetail | undefined>(
    projectDetailQueryKey(project.id),
    (currentDetail) => {
      if (!currentDetail) {
        return currentDetail;
      }

      return {
        ...currentDetail,
        project,
      };
    },
  );
}

function updateCachedProjectListItem(queryClient: QueryClient, project: Project) {
  queryClient.setQueryData<Project[] | undefined>(
    projectsListQueryKey,
    (currentProjects) => {
      if (!currentProjects) {
        return currentProjects;
      }

      return sortProjectsForCache(
        currentProjects.map((item) => (item.id === project.id ? project : item)),
      );
    },
  );
  queryClient.setQueryData<ProjectsSummary>(
    projectsSummaryQueryKey,
    (currentSummary) => {
      if (!currentSummary) {
        return currentSummary;
      }

      return {
        ...currentSummary,
        attributeCount: queryClient
          .getQueryData<Project[]>(projectsListQueryKey)
          ?.reduce((count, item) => count + item.attributes.length, 0)
          ?? currentSummary.attributeCount,
        resourceCount: queryClient
          .getQueryData<Project[]>(projectsListQueryKey)
          ?.reduce((count, item) => count + item.resources.length, 0)
          ?? currentSummary.resourceCount,
        updatedAt: project.updatedAt,
      };
    },
  );
}

function adjustCachedProjectNoteCount(queryClient: QueryClient, delta: number) {
  queryClient.setQueryData<ProjectsSummary>(
    projectsSummaryQueryKey,
    (currentSummary) => {
      if (!currentSummary) {
        return currentSummary;
      }

      return {
        ...currentSummary,
        noteCount: Math.max(0, currentSummary.noteCount + delta),
      };
    },
  );
}

function requireCachedProjectDetail(
  queryClient: QueryClient,
  projectId: string,
) {
  return requireCachedSnapshot<ProjectDetail>(
    queryClient,
    projectDetailQueryKey(projectId),
    "Project detail",
  );
}

function requireCachedProjectDetailForNote(
  queryClient: QueryClient,
  noteId: string,
) {
  const detailEntries = queryClient
    .getQueriesData<ProjectDetail>({ queryKey: ["project-detail"] })
    .map(([, detail]) => detail)
    .filter((detail): detail is ProjectDetail => Boolean(detail));
  const detail = detailEntries.find((item) =>
    item.notes.some((note) => note.id === noteId),
  );

  if (!detail) {
    throw new Error("Project note cannot be queued until it has loaded once.");
  }

  return detail;
}

function requireCachedSnapshot<T>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  label: string,
) {
  const snapshot = queryClient.getQueryData<T>(queryKey);

  if (!snapshot) {
    throw new Error(`${label} cannot be queued until it has loaded once.`);
  }

  return snapshot;
}

function readQueue(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  const persisted = value as {
    operations?: unknown;
    version?: unknown;
  };

  if (
    persisted.version !== storeVersion ||
    !Array.isArray(persisted.operations)
  ) {
    return [];
  }

  return persisted.operations.filter(isOfflineOperation);
}

function isOfflineOperation(value: unknown): value is OfflineOperation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const operation = value as Partial<OfflineOperation>;

  return (
    typeof operation.id === "string" &&
    isOperationKind(operation.kind) &&
    (operation.kind !== "task.create" ||
      typeof operation.localTaskId === "string") &&
    (operation.kind !== "profile.createItem" ||
      typeof operation.localProfileItemId === "string") &&
    (operation.kind !== "projects.create" ||
      typeof operation.localProjectId === "string") &&
    (operation.kind !== "projects.createNote" ||
      typeof operation.localProjectNoteId === "string") &&
    (operation.kind !== "projects.createResource" ||
      typeof operation.localProjectResourceId === "string") &&
    (operation.kind !== "projects.createAttribute" ||
      typeof operation.localProjectAttributeId === "string") &&
    typeof operation.createdAt === "string" &&
    typeof operation.updatedAt === "string" &&
    typeof operation.input === "object" &&
    operation.input !== null
  );
}

function isOperationKind(value: unknown): value is OperationKind {
  return (
    value === "task.create" ||
    value === "task.update" ||
    value === "task.delete" ||
    value === "task.revertToProposal" ||
    value === "task.reorder" ||
    value === "jobs.updateStatus" ||
    value === "jobs.delete" ||
    value === "jobs.updateSearchProfile" ||
    value === "diary.saveDay" ||
    value === "diary.deleteDay" ||
    value === "profile.update" ||
    value === "profile.updateApplicationDefaults" ||
    value === "profile.createItem" ||
    value === "profile.updateItem" ||
    value === "profile.deleteItem" ||
    value === "projects.create" ||
    value === "projects.update" ||
    value === "projects.archive" ||
    value === "projects.delete" ||
    value === "projects.createNote" ||
    value === "projects.updateNote" ||
    value === "projects.deleteNote" ||
    value === "projects.createResource" ||
    value === "projects.updateResource" ||
    value === "projects.deleteResource" ||
    value === "projects.createAttribute" ||
    value === "projects.updateAttribute" ||
    value === "projects.deleteAttribute" ||
    value === "dsa.updateQuestionProgress" ||
    value === "dsa.recordVideoWatch" ||
    value === "systemDesign.updateItemProgress" ||
    value === "systemDesign.recordVideoWatch"
  );
}

function operationId(
  kind: OperationKind,
  input:
    | CreateTaskInput
    | UpdateTaskInput
    | DeleteTaskInput
    | RevertTaskToProposalInput
    | ReorderTaskInput
    | UpdateJobStatusInput
    | DeleteJobInput
    | UpdateJobSearchProfileInput
    | SaveDiaryDayInput
    | DeleteDiaryDayInput
    | ProfileBasicsInput
    | UpdateProfileApplicationDefaultsInput
    | CreateProfileItemInput
    | UpdateProfileItemInput
    | DeleteProfileItemInput
    | CreateProjectInput
    | UpdateProjectInput
    | ProjectIdInput
    | CreateProjectNoteInput
    | UpdateProjectNoteInput
    | DeleteProjectNoteInput
    | CreateProjectResourceInput
    | UpdateProjectResourceInput
    | DeleteProjectResourceInput
    | CreateProjectAttributeInput
    | UpdateProjectAttributeInput
    | DeleteProjectAttributeInput
    | UpdateDsaQuestionProgressInput
    | RecordDsaVideoWatchInput
    | UpdateSystemDesignItemProgressInput
    | RecordSystemDesignVideoWatchInput,
  idOverride?: string,
) {
  if (idOverride) {
    return idOverride;
  }

  if (kind.startsWith("task.")) {
    return `${kind}:${"taskId" in input ? input.taskId : ""}`;
  }

  if (kind.startsWith("jobs.")) {
    return `${kind}:${"jobId" in input ? input.jobId : "search-profile"}`;
  }

  if (kind.startsWith("diary.")) {
    return `${kind}:${"dateKey" in input ? input.dateKey : ""}`;
  }

  if (kind.startsWith("profile.")) {
    return `${kind}:${"itemId" in input ? input.itemId : "profile"}`;
  }

  if (kind.startsWith("projects.")) {
    if ("noteId" in input) {
      return `${kind}:${input.noteId}`;
    }

    if ("resourceId" in input) {
      return `${kind}:${input.resourceId}`;
    }

    if ("attributeId" in input) {
      return `${kind}:${input.attributeId}`;
    }

    if ("projectId" in input) {
      return `${kind}:${input.projectId}`;
    }

    return `${kind}:project`;
  }

  if (kind.startsWith("dsa.")) {
    return `${kind}:${"questionId" in input ? input.questionId : ""}`;
  }

  return `${kind}:${"itemId" in input ? input.itemId : ""}`;
}

function queueKey(userId: string) {
  return `offline-mutations:${userId}`;
}

function shouldQueue(error: unknown) {
  return error instanceof OfflineReplayError || isProbablyNetworkError(error);
}

function isProbablyNetworkError(error: unknown) {
  if (isOffline()) {
    return true;
  }

  if (error instanceof TypeError) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);

  return /failed to fetch|networkerror|network error|load failed/i.test(message);
}

function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function dispatchQueueChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(queueChangedEventName));
  dispatchStatusChanged();
}

function dispatchStatusChanged() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(statusChangedEventName));
}

function isTauriRuntime() {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function createOfflineTaskId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `offline-task-${crypto.randomUUID()}`;
  }

  return `offline-task-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createOfflineDiaryDayId(dateKey: string) {
  return `offline-diary-day-${dateKey}`;
}

function createOfflineDiaryIntervalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `offline-diary-interval-${crypto.randomUUID()}`;
  }

  return `offline-diary-interval-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createOfflineProfileItemId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `offline-profile-item-${crypto.randomUUID()}`;
  }

  return `offline-profile-item-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createOfflineProjectId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `offline-project-${crypto.randomUUID()}`;
  }

  return `offline-project-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createOfflineProjectNoteId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `offline-project-note-${crypto.randomUUID()}`;
  }

  return `offline-project-note-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createOfflineProjectResourceId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `offline-project-resource-${crypto.randomUUID()}`;
  }

  return `offline-project-resource-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createOfflineProjectAttributeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `offline-project-attribute-${crypto.randomUUID()}`;
  }

  return `offline-project-attribute-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function sortDiaryDays(days: DiaryDay[]) {
  return [...days].sort((a, b) => {
    const dateSort = b.dateKey.localeCompare(a.dateKey);

    if (dateSort !== 0) {
      return dateSort;
    }

    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function sortDiaryIntervals(intervals: DiaryInterval[]) {
  return [...intervals].sort((a, b) => {
    const startSort = a.startTime.localeCompare(b.startTime);

    if (startSort !== 0) {
      return startSort;
    }

    const endSort = a.endTime.localeCompare(b.endTime);

    if (endSort !== 0) {
      return endSort;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
}

function sortProjectsForCache(projects: Project[]) {
  return [...projects].sort((left, right) => {
    const updatedSort = right.updatedAt.localeCompare(left.updatedAt);

    if (updatedSort !== 0) {
      return updatedSort;
    }

    return left.title.localeCompare(right.title);
  });
}

function sortProjectNotesForCache(notes: ProjectNote[]) {
  return [...notes].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order;
    }

    return left.createdAt.localeCompare(right.createdAt);
  });
}

function normalizeProjectPatch(input: UpdateProjectInput["patch"]) {
  const patch: Partial<
    Pick<Project, "dateText" | "status" | "summary" | "techStack" | "title">
  > = {};

  if ("dateText" in input) {
    patch.dateText = input.dateText?.trim() ?? "";
  }

  if ("status" in input && input.status) {
    patch.status = input.status;
  }

  if ("summary" in input) {
    patch.summary = input.summary?.trim() ?? "";
  }

  if ("techStack" in input) {
    patch.techStack = normalizeProjectList(input.techStack ?? []);
  }

  if ("title" in input && input.title) {
    patch.title = input.title.trim();
  }

  return patch;
}

function normalizeProjectResourcePatch(
  input: UpdateProjectResourceInput["patch"],
) {
  const patch: Partial<Pick<ProjectResource, "note" | "title" | "type" | "url">> =
    {};

  if ("note" in input) {
    patch.note = input.note?.trim() ?? "";
  }

  if ("title" in input && input.title) {
    patch.title = input.title.trim();
  }

  if ("type" in input && input.type) {
    patch.type = input.type;
  }

  if ("url" in input && input.url) {
    patch.url = input.url.trim();
  }

  return patch;
}

function normalizeProjectAttributePatch(
  input: UpdateProjectAttributeInput["patch"],
) {
  const patch: Partial<
    Pick<ProjectAttribute, "dateValue" | "description" | "label" | "type">
  > = {};

  if ("dateValue" in input) {
    patch.dateValue = input.dateValue?.trim() ?? "";
  }

  if ("description" in input) {
    patch.description = input.description?.trim() ?? "";
  }

  if ("label" in input && input.label) {
    patch.label = input.label.trim();
  }

  if ("type" in input && input.type) {
    patch.type = input.type;
  }

  return patch;
}

function normalizeProjectNotePatch(input: UpdateProjectNoteInput["patch"]) {
  const patch: Partial<Pick<ProjectNote, "content" | "title">> = {};

  if ("content" in input) {
    patch.content = input.content ?? "";
  }

  if ("title" in input && input.title) {
    patch.title = input.title.trim();
  }

  return patch;
}

function normalizeProjectList(values: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const item = value.trim();
    const key = item.toLowerCase();

    if (!item || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(item);
  }

  return normalized;
}

function normalizeProjectAttributeAliases(label: string, aliases: string[]) {
  const labelKey = label.trim().toLowerCase();

  return normalizeProjectList(aliases).filter(
    (alias) => alias.toLowerCase() !== labelKey,
  );
}

function normalizeProfileItemInput(input: CreateProfileItemInput) {
  return {
    description: input.description?.trim() ?? "",
    endDate: input.endDate?.trim() ?? "",
    location: input.location?.trim() ?? "",
    organization: input.organization?.trim() ?? "",
    startDate: input.startDate?.trim() ?? "",
    tags: normalizeProfileTags(input.tags),
    title: input.title.trim(),
    type: input.type ?? "experience",
    url: input.url?.trim() ?? "",
  } satisfies Omit<ProfileItem, "createdAt" | "id" | "updatedAt" | "userId">;
}

function normalizeProfileItemPatch(input: UpdateProfileItemInput["patch"]) {
  const patch: Partial<
    Omit<ProfileItem, "createdAt" | "id" | "updatedAt" | "userId">
  > = {};

  if ("description" in input) {
    patch.description = input.description?.trim() ?? "";
  }

  if ("endDate" in input) {
    patch.endDate = input.endDate?.trim() ?? "";
  }

  if ("location" in input) {
    patch.location = input.location?.trim() ?? "";
  }

  if ("organization" in input) {
    patch.organization = input.organization?.trim() ?? "";
  }

  if ("startDate" in input) {
    patch.startDate = input.startDate?.trim() ?? "";
  }

  if ("tags" in input) {
    patch.tags = normalizeProfileTags(input.tags);
  }

  if ("title" in input && input.title) {
    patch.title = input.title.trim();
  }

  if ("type" in input && input.type) {
    patch.type = input.type;
  }

  if ("url" in input) {
    patch.url = input.url?.trim() ?? "";
  }

  return patch;
}

function normalizeProfileApplicationDefaultsPatch(
  input: UpdateProfileApplicationDefaultsInput,
) {
  const patch: Partial<ProfileApplicationDefaults> = {};

  if ("branch" in input) {
    patch.branch = input.branch?.trim() ?? "";
  }

  if ("college" in input) {
    patch.college = input.college?.trim() ?? "";
  }

  if ("defaultSource" in input) {
    patch.defaultSource = input.defaultSource?.trim() ?? "";
  }

  if ("gender" in input) {
    patch.gender = input.gender?.trim() ?? "";
  }

  if ("graduationPercentage" in input) {
    patch.graduationPercentage = input.graduationPercentage?.trim() ?? "";
  }

  if ("graduationYear" in input) {
    patch.graduationYear = input.graduationYear?.trim() ?? "";
  }

  if ("joiningAvailabilityDays" in input) {
    patch.joiningAvailabilityDays = input.joiningAvailabilityDays ?? null;
  }

  if ("linkedinUrl" in input) {
    patch.linkedinUrl = input.linkedinUrl?.trim() ?? "";
  }

  if ("phone" in input) {
    patch.phone = input.phone?.trim() ?? "";
  }

  if ("resumeLocalPath" in input) {
    patch.resumeLocalPath = input.resumeLocalPath?.trim() ?? "";
  }

  if ("xBoard" in input) {
    patch.xBoard = input.xBoard?.trim() ?? "";
  }

  if ("xPercentage" in input) {
    patch.xPercentage = input.xPercentage?.trim() ?? "";
  }

  if ("xiiBoard" in input) {
    patch.xiiBoard = input.xiiBoard?.trim() ?? "";
  }

  if ("xiiPercentage" in input) {
    patch.xiiPercentage = input.xiiPercentage?.trim() ?? "";
  }

  return patch;
}

function normalizeProfileTags(tags: string[] | undefined) {
  return tags?.map((tag) => tag.trim()).filter(Boolean) ?? [];
}

class OfflineReplayError extends Error {
  constructor() {
    super("Offline desktop mutation queued for replay.");
  }
}
