import { getDsaSnapshot, listDsaVideoWatchEvents } from "@careeright/domain/dsa/store";
import { historySnapshotSchema, type HistoryDay } from "@careeright/domain/history/schema";
import { listJobs } from "@careeright/domain/jobs/store";
import { SOLO_USER_ID } from "@careeright/domain/kanban/schema";

const HISTORY_DAY_COUNT = 30;
const TRACKED_JOB_STATUS_KEYS = {
  applied: "appliedJobs",
  interviewing: "interviewingJobs",
  rejected: "rejectedJobs",
  offer: "offerJobs",
} as const;

function isoDateKey(value: string | Date) {
  return typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
}

function addUtcDays(dateKey: string, amount: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  date.setUTCDate(date.getUTCDate() + amount);

  return isoDateKey(date);
}

function buildDateKeys(endDate: string, dayCount: number) {
  const startDate = addUtcDays(endDate, -(dayCount - 1));
  const dateKeys: string[] = [];
  let currentDate = startDate;

  while (currentDate <= endDate) {
    dateKeys.push(currentDate);
    currentDate = addUtcDays(currentDate, 1);
  }

  return dateKeys;
}

function createEmptyHistoryDay(date: string): HistoryDay {
  return {
    date,
    solvedQuestions: 0,
    watchedVideos: 0,
    appliedJobs: 0,
    interviewingJobs: 0,
    rejectedJobs: 0,
    offerJobs: 0,
  };
}

function addWatchedVideo(
  watchedQuestionIdsByDate: Map<string, Set<string>>,
  dayByDate: Map<string, HistoryDay>,
  dateValue: string,
  questionId: string,
) {
  const date = isoDateKey(dateValue);

  if (!dayByDate.has(date)) {
    return;
  }

  const watchedQuestionIds = watchedQuestionIdsByDate.get(date) ?? new Set<string>();
  watchedQuestionIds.add(questionId);
  watchedQuestionIdsByDate.set(date, watchedQuestionIds);
}

function summarize(days: HistoryDay[]) {
  return days.reduce(
    (summary, day) => ({
      solvedQuestions: summary.solvedQuestions + day.solvedQuestions,
      watchedVideos: summary.watchedVideos + day.watchedVideos,
      appliedJobs: summary.appliedJobs + day.appliedJobs,
      interviewingJobs: summary.interviewingJobs + day.interviewingJobs,
      rejectedJobs: summary.rejectedJobs + day.rejectedJobs,
      offerJobs: summary.offerJobs + day.offerJobs,
    }),
    {
      solvedQuestions: 0,
      watchedVideos: 0,
      appliedJobs: 0,
      interviewingJobs: 0,
      rejectedJobs: 0,
      offerJobs: 0,
    },
  );
}

export async function getHistorySnapshot(userId = SOLO_USER_ID) {
  const generatedAt = new Date().toISOString();
  const endDate = isoDateKey(generatedAt);
  const dateKeys = buildDateKeys(endDate, HISTORY_DAY_COUNT);
  const dayByDate = new Map(
    dateKeys.map((date) => [date, createEmptyHistoryDay(date)]),
  );
  const [dsaSnapshot, videoWatches, jobs] = await Promise.all([
    getDsaSnapshot(userId),
    listDsaVideoWatchEvents(userId),
    listJobs(userId),
  ]);
  const questionById = new Map(
    dsaSnapshot.catalog.tracks.flatMap((track) =>
      track.subtopics.flatMap((subtopic) =>
        subtopic.questions.map((question) => [question.id, question] as const),
      ),
    ),
  );
  const watchedQuestionIdsByDate = new Map<string, Set<string>>();

  for (const progress of dsaSnapshot.progress) {
    if (!progress.completedAt || !progress.completed) {
      continue;
    }

    const question = questionById.get(progress.questionId);
    const day = dayByDate.get(isoDateKey(progress.completedAt));

    if (question?.sourceType === "leetcode" && day) {
      day.solvedQuestions += 1;
    } else if (question?.sourceType === "lesson") {
      addWatchedVideo(
        watchedQuestionIdsByDate,
        dayByDate,
        progress.completedAt,
        progress.questionId,
      );
    }
  }

  for (const watchEvent of videoWatches) {
    const question = questionById.get(watchEvent.questionId);

    if (question?.sourceType === "lesson") {
      addWatchedVideo(
        watchedQuestionIdsByDate,
        dayByDate,
        watchEvent.watchedAt,
        watchEvent.questionId,
      );
    }
  }

  for (const [date, watchedQuestionIds] of watchedQuestionIdsByDate) {
    const day = dayByDate.get(date);

    if (day) {
      day.watchedVideos = watchedQuestionIds.size;
    }
  }

  for (const job of jobs) {
    const jobStatusKey =
      TRACKED_JOB_STATUS_KEYS[
        job.status as keyof typeof TRACKED_JOB_STATUS_KEYS
      ];
    const day = dayByDate.get(isoDateKey(job.updatedAt));

    if (jobStatusKey && day) {
      day[jobStatusKey] += 1;
    }
  }

  const days = dateKeys.map((date) => dayByDate.get(date) ?? createEmptyHistoryDay(date));

  return historySnapshotSchema.parse({
    generatedAt,
    range: {
      startDate: dateKeys[0],
      endDate,
      days: days.length,
    },
    days,
    summary: summarize(days),
  });
}
