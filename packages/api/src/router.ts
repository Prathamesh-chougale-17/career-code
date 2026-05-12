import { os } from "@orpc/server";

import { getDashboardAnalytics } from "@career-code/domain/dashboard/analytics";
import {
  deleteDiaryDay,
  getDiaryDay,
  listRecentDiaryDays,
  saveDiaryDay,
} from "@career-code/domain/diary/store";
import {
  deleteDiaryDayInputSchema,
  getDiaryDayInputSchema,
  listRecentDiaryInputSchema,
  saveDiaryDayInputSchema,
} from "@career-code/domain/diary/schema";
import {
  getDsaSnapshot,
  recordDsaVideoWatch,
  updateDsaQuestionProgress,
} from "@career-code/domain/dsa/store";
import {
  recordDsaVideoWatchInputSchema,
  updateDsaQuestionProgressInputSchema,
} from "@career-code/domain/dsa/schema";
import { getHistorySnapshot } from "@career-code/domain/history/store";
import {
  acceptProposal,
  createMcpToken,
  createTask,
  deleteProposal,
  deleteTask,
  getDashboardMetrics,
  getBoardSnapshot,
  listMcpTokens,
  listProposalHistory,
  proposeStartWork,
  proposeTaskBreakdown,
  proposeTaskDelete,
  proposeTaskUpdate,
  rejectProposal,
  reorderTask,
  revokeMcpToken,
  revertTaskToProposal,
  updateTask,
} from "@career-code/domain/kanban/store";
import {
  createJobApplicationRun,
  deleteJob,
  getJobSearchProfile,
  getLatestUnappliedJobBatch,
  listJobApplicationRuns,
  listJobDigests,
  listJobs,
  updateJobApplicationAttempt,
  updateJobSearchProfile,
  updateJobStatus,
} from "@career-code/domain/jobs/store";
import {
  createJobApplicationRunInputSchema,
  deleteJobInputSchema,
  listJobApplicationRunsInputSchema,
  updateJobApplicationAttemptInputSchema,
  updateJobSearchProfileInputSchema,
  updateJobStatusInputSchema,
} from "@career-code/domain/jobs/schema";
import {
  breakdownPromptInputSchema,
  createMcpTokenInputSchema,
  createTaskInputSchema,
  deleteTaskInputSchema,
  proposalActionInputSchema,
  proposeStartWorkInputSchema,
  proposeTaskDeleteInputSchema,
  proposeTaskUpdateInputSchema,
  reorderTaskInputSchema,
  revokeMcpTokenInputSchema,
  revertTaskToProposalInputSchema,
  updateTaskInputSchema,
} from "@career-code/domain/kanban/schema";
import {
  applyProfileImport,
  createProfileItem,
  deleteProfileItem,
  getProfileSnapshot,
  listProfileImports,
  rejectProfileImport,
  updateProfileApplicationDefaults,
  updateProfileBasics,
  updateProfileItem,
} from "@career-code/domain/profile/store";
import {
  createProfileItemInputSchema,
  deleteProfileItemInputSchema,
  profileImportActionInputSchema,
  profileBasicsInputSchema,
  updateProfileApplicationDefaultsInputSchema,
  updateProfileItemInputSchema,
} from "@career-code/domain/profile/schema";

type AuthenticatedRpcContext = {
  userId: string;
};

const protectedProcedure = os.$context<AuthenticatedRpcContext>();

export const appRouter = {
  dashboard: {
    analytics: protectedProcedure.handler(async ({ context }) => {
      try {
        return await getDashboardAnalytics(context.userId);
      } catch (error) {
        console.error("[rpc/dashboard/analytics] Unhandled failure.", error);
        throw error;
      }
    }),
    metrics: protectedProcedure.handler(async ({ context }) =>
      getDashboardMetrics(context.userId),
    ),
  },
  diary: {
    getDay: protectedProcedure
      .input(getDiaryDayInputSchema)
      .handler(async ({ context, input }) => {
        return getDiaryDay(input, context.userId);
      }),
    listRecent: protectedProcedure
      .input(listRecentDiaryInputSchema)
      .handler(async ({ context, input }) => {
        return listRecentDiaryDays(input, context.userId);
      }),
    saveDay: protectedProcedure
      .input(saveDiaryDayInputSchema)
      .handler(async ({ context, input }) => {
        return saveDiaryDay(input, context.userId);
      }),
    deleteDay: protectedProcedure
      .input(deleteDiaryDayInputSchema)
      .handler(async ({ context, input }) => {
        return deleteDiaryDay(input, context.userId);
      }),
  },
  dsa: {
    snapshot: protectedProcedure.handler(async ({ context }) =>
      getDsaSnapshot(context.userId),
    ),
    updateQuestionProgress: protectedProcedure
      .input(updateDsaQuestionProgressInputSchema)
      .handler(async ({ context, input }) => {
        return updateDsaQuestionProgress(input, context.userId);
      }),
    recordVideoWatch: protectedProcedure
      .input(recordDsaVideoWatchInputSchema)
      .handler(async ({ context, input }) => {
        return recordDsaVideoWatch(input, context.userId);
      }),
  },
  history: {
    snapshot: protectedProcedure.handler(async ({ context }) =>
      getHistorySnapshot(context.userId),
    ),
  },
  jobs: {
    list: protectedProcedure.handler(async ({ context }) =>
      listJobs(context.userId),
    ),
    searchProfile: protectedProcedure.handler(async ({ context }) =>
      getJobSearchProfile(context.userId),
    ),
    latestUnappliedBatch: protectedProcedure.handler(async ({ context }) =>
      getLatestUnappliedJobBatch(context.userId),
    ),
    updateSearchProfile: protectedProcedure
      .input(updateJobSearchProfileInputSchema)
      .handler(async ({ context, input }) => {
        return updateJobSearchProfile(input, context.userId);
      }),
    digests: protectedProcedure.handler(async ({ context }) =>
      listJobDigests(context.userId, 10),
    ),
    updateStatus: protectedProcedure
      .input(updateJobStatusInputSchema)
      .handler(async ({ context, input }) => {
        return updateJobStatus(input, context.userId);
      }),
    delete: protectedProcedure
      .input(deleteJobInputSchema)
      .handler(async ({ context, input }) => {
        return deleteJob(input, context.userId);
      }),
    applicationRuns: protectedProcedure
      .input(listJobApplicationRunsInputSchema)
      .handler(async ({ context, input }) => {
        return listJobApplicationRuns(input, context.userId);
      }),
    createApplicationRun: protectedProcedure
      .input(createJobApplicationRunInputSchema)
      .handler(async ({ context, input }) => {
        return createJobApplicationRun(input, context.userId);
      }),
    updateApplicationAttempt: protectedProcedure
      .input(updateJobApplicationAttemptInputSchema)
      .handler(async ({ context, input }) => {
        return updateJobApplicationAttempt(input, context.userId);
      }),
  },
  board: {
    snapshot: protectedProcedure.handler(async ({ context }) =>
      getBoardSnapshot(context.userId),
    ),
  },
  profile: {
    snapshot: protectedProcedure.handler(async ({ context }) =>
      getProfileSnapshot(context.userId),
    ),
    update: protectedProcedure
      .input(profileBasicsInputSchema)
      .handler(async ({ context, input }) => {
        return updateProfileBasics(input, context.userId);
      }),
    updateApplicationDefaults: protectedProcedure
      .input(updateProfileApplicationDefaultsInputSchema)
      .handler(async ({ context, input }) => {
        return updateProfileApplicationDefaults(input, context.userId);
      }),
    createItem: protectedProcedure
      .input(createProfileItemInputSchema)
      .handler(async ({ context, input }) => {
        return createProfileItem(input, context.userId);
      }),
    updateItem: protectedProcedure
      .input(updateProfileItemInputSchema)
      .handler(async ({ context, input }) => {
        return updateProfileItem(input, context.userId);
      }),
    deleteItem: protectedProcedure
      .input(deleteProfileItemInputSchema)
      .handler(async ({ context, input }) => {
        return deleteProfileItem(input, context.userId);
      }),
  },
  profileImport: {
    list: protectedProcedure.handler(async ({ context }) =>
      listProfileImports(context.userId),
    ),
    apply: protectedProcedure
      .input(profileImportActionInputSchema)
      .handler(async ({ context, input }) => {
        return applyProfileImport(input, context.userId);
      }),
    reject: protectedProcedure
      .input(profileImportActionInputSchema)
      .handler(async ({ context, input }) => {
        return rejectProfileImport(input, context.userId);
      }),
  },
  task: {
    create: protectedProcedure
      .input(createTaskInputSchema)
      .handler(async ({ context, input }) => {
        return createTask(input, context.userId);
      }),
    update: protectedProcedure
      .input(updateTaskInputSchema)
      .handler(async ({ context, input }) => {
        return updateTask(input, context.userId);
      }),
    delete: protectedProcedure
      .input(deleteTaskInputSchema)
      .handler(async ({ context, input }) => {
        return deleteTask(input.taskId, context.userId);
      }),
    revertToProposal: protectedProcedure
      .input(revertTaskToProposalInputSchema)
      .handler(async ({ context, input }) => {
        return revertTaskToProposal(input, context.userId);
      }),
    reorder: protectedProcedure
      .input(reorderTaskInputSchema)
      .handler(async ({ context, input }) => {
        return reorderTask(input, context.userId);
      }),
  },
  proposal: {
    list: protectedProcedure.handler(async ({ context }) =>
      listProposalHistory(context.userId),
    ),
    breakdown: protectedProcedure
      .input(breakdownPromptInputSchema)
      .handler(async ({ context, input }) => {
        return proposeTaskBreakdown(input.prompt, "app", context.userId);
      }),
    updateTask: protectedProcedure
      .input(proposeTaskUpdateInputSchema)
      .handler(async ({ context, input }) => {
        return proposeTaskUpdate(input, "app", context.userId);
      }),
    deleteTask: protectedProcedure
      .input(proposeTaskDeleteInputSchema)
      .handler(async ({ context, input }) => {
        return proposeTaskDelete(input, "app", context.userId);
      }),
    startWork: protectedProcedure
      .input(proposeStartWorkInputSchema)
      .handler(async ({ context, input }) => {
        return proposeStartWork(input, "app", context.userId);
      }),
    accept: protectedProcedure
      .input(proposalActionInputSchema)
      .handler(async ({ context, input }) => {
        return acceptProposal(input, context.userId);
      }),
    reject: protectedProcedure
      .input(proposalActionInputSchema)
      .handler(async ({ context, input }) => {
        return rejectProposal(input, context.userId);
      }),
    delete: protectedProcedure
      .input(proposalActionInputSchema)
      .handler(async ({ context, input }) => {
        return deleteProposal(input, context.userId);
      }),
  },
  mcpToken: {
    list: protectedProcedure.handler(async ({ context }) =>
      listMcpTokens(context.userId),
    ),
    create: protectedProcedure
      .input(createMcpTokenInputSchema)
      .handler(async ({ context, input }) => {
        return createMcpToken(input, context.userId);
      }),
    revoke: protectedProcedure
      .input(revokeMcpTokenInputSchema)
      .handler(async ({ context, input }) => {
        return revokeMcpToken(input, context.userId);
      }),
  },
};

export type AppRouter = typeof appRouter;
