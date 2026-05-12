import { describe, expect, test } from "vitest";

import { DSA_CATALOG } from "@career-code/domain/dsa/catalog";
import {
  recordDsaVideoWatch,
  updateDsaQuestionProgress,
} from "@career-code/domain/dsa/store";
import { getHistorySnapshot } from "@career-code/domain/history/store";
import { seedJobs } from "@career-code/domain/jobs/store";

process.env.MONGODB_URI = "";

function dsaQuestions(sourceType: "lesson" | "leetcode") {
  return DSA_CATALOG.tracks
    .flatMap((track) => track.subtopics)
    .flatMap((subtopic) => subtopic.questions)
    .filter((item) => item.sourceType === sourceType);
}

function firstDsaQuestion(sourceType: "lesson" | "leetcode") {
  const question = dsaQuestions(sourceType)[0];

  if (!question) {
    throw new Error(`Missing ${sourceType} DSA question fixture.`);
  }

  return question;
}

function secondDsaQuestion(sourceType: "lesson" | "leetcode") {
  const question = DSA_CATALOG.tracks
    .flatMap((track) => track.subtopics)
    .flatMap((subtopic) => subtopic.questions)
    .filter((item) => item.sourceType === sourceType)[1];

  if (!question) {
    throw new Error(`Missing ${sourceType} DSA question fixture.`);
  }

  return question;
}

describe("history snapshot", () => {
  test("counts DSA learning and job pipeline events for the last month", async () => {
    const userId = `history-${crypto.randomUUID()}`;
    const completedLesson = firstDsaQuestion("lesson");
    const watchedLesson = secondDsaQuestion("lesson");
    const leetcode = firstDsaQuestion("leetcode");

    await updateDsaQuestionProgress(
      { questionId: leetcode.id, completed: true },
      userId,
    );
    await updateDsaQuestionProgress(
      { questionId: completedLesson.id, completed: true },
      userId,
    );
    await recordDsaVideoWatch({ questionId: completedLesson.id }, userId);
    await recordDsaVideoWatch({ questionId: watchedLesson.id }, userId);
    await seedJobs(
      {
        source: "history-test",
        jobs: [
          {
            title: "Applied History Job",
            sourceJobId: `history-applied-${crypto.randomUUID()}`,
            status: "applied",
          },
          {
            title: "Interview History Job",
            sourceJobId: `history-interview-${crypto.randomUUID()}`,
            status: "interviewing",
          },
          {
            title: "Rejected History Job",
            sourceJobId: `history-rejected-${crypto.randomUUID()}`,
            status: "rejected",
          },
          {
            title: "Offer History Job",
            sourceJobId: `history-offer-${crypto.randomUUID()}`,
            status: "offer",
          },
        ],
      },
      userId,
    );

    const snapshot = await getHistorySnapshot(userId);
    const today = new Date().toISOString().slice(0, 10);
    const todayRow = snapshot.days.find((day) => day.date === today);

    expect(snapshot.days).toHaveLength(30);
    expect(snapshot.summary).toMatchObject({
      solvedQuestions: 1,
      watchedVideos: 2,
      appliedJobs: 1,
      interviewingJobs: 1,
      rejectedJobs: 1,
      offerJobs: 1,
    });
    expect(todayRow).toMatchObject({
      solvedQuestions: 1,
      watchedVideos: 2,
      appliedJobs: 1,
      interviewingJobs: 1,
      rejectedJobs: 1,
      offerJobs: 1,
    });
  });
});
