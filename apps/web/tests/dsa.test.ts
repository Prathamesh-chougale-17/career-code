import { describe, expect, test } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  DSA_CATALOG,
  DSA_QUESTIONS,
  STATIC_DSA_TRACKS,
  buildDsaCatalogFromTrackMetadata,
} from "@career-code/domain/dsa/catalog";
import { LINKED_LIST_LEETCODE_QUESTIONS } from "@career-code/domain/dsa/linked-list-leetcode";
import { updateDsaQuestionProgressInputSchema } from "@career-code/domain/dsa/schema";
import {
  getDsaSnapshot,
  updateDsaQuestionProgress,
} from "@career-code/domain/dsa/store";
import {
  buildDsaPlaylistEmbedUrl,
  buildDsaVideoEmbedUrl,
} from "@career-code/domain/dsa/youtube";
import { appRouter } from "@career-code/api/router";
import {
  buildCuratedDsaQuestionDocuments,
  buildGraphDsaSeed,
  buildHeapDsaSeed,
  type GraphQuestionDocument,
  type HeapQuestionDocument,
} from "@career-code/domain/dsa/seed-data";

process.env.MONGODB_URI = "";

function trackById(trackId: string) {
  const track = DSA_CATALOG.tracks.find((item) => item.id === trackId);

  if (!track) {
    throw new Error(`Missing DSA track: ${trackId}`);
  }

  return track;
}

function allQuestions(trackId?: string) {
  const tracks = trackId ? [trackById(trackId)] : DSA_CATALOG.tracks;

  return tracks.flatMap((track) =>
    track.subtopics.flatMap((subtopic) => subtopic.questions),
  );
}

function lessonQuestions(trackId?: string) {
  return allQuestions(trackId).filter(
    (question) => question.sourceType === "lesson",
  );
}

function leetcodeQuestions(trackId?: string) {
  return allQuestions(trackId).filter(
    (question) => question.sourceType === "leetcode",
  );
}

function readQuestionDocuments() {
  const directory = path.join(process.cwd(), "tmp", "questions");

  if (!existsSync(directory)) {
    return buildCuratedDsaQuestionDocuments();
  }

  return readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .map((file) =>
      JSON.parse(
        readFileSync(path.join(directory, file), "utf8"),
      ) as HeapQuestionDocument & GraphQuestionDocument,
    );
}

const QUESTION_DOCUMENTS = readQuestionDocuments();

describe("DSA catalog", () => {
  test("ships the linked list playlist as one stable track", () => {
    const track = trackById("linked-list");
    const lessons = lessonQuestions("linked-list");

    expect(DSA_CATALOG.tracks.map((item) => item.id)).toEqual(["linked-list"]);
    expect(track.title).toBe("Linked List");
    expect(track.playlistUrl).toBe(
      "https://www.youtube.com/playlist?list=PLgUwDviBIf0rAuz8tVcM0AymmhTRsfaLU",
    );
    expect(track.subtopics.map((subtopic) => subtopic.id)).toEqual([
      "foundations",
      "dll-basics",
      "core-ll-problems",
      "cycle-loop",
      "dll-problems",
      "advanced-patterns",
    ]);
    expect(lessons).toHaveLength(28);
    expect(lessons.map((question) => question.lessonNumber)).toEqual(
      Array.from({ length: 28 }, (_, index) => index + 1),
    );
    expect(new Set(lessons.map((question) => question.id)).size).toBe(28);
    expect(lessons.map((question) => question.videoId)).not.toContain(
      "cg6JGiXhQ9c",
    );

    for (const question of lessons) {
      expect(question.videoUrl).toBeDefined();
      const url = new URL(question.videoUrl ?? "");
      expect(url.hostname).toBe("www.youtube.com");
      expect(url.searchParams.get("v")).toBe(question.videoId);
      expect(url.searchParams.get("list")).toBe(
        "PLgUwDviBIf0rAuz8tVcM0AymmhTRsfaLU",
      );
    }
  });

  test("affiliates linked-list LeetCode questions with existing accordions", () => {
    const leetcode = leetcodeQuestions("linked-list");
    const lessonIds = new Set(
      lessonQuestions("linked-list").map((question) => question.id),
    );
    const lessonSubtopicById = new Map(
      lessonQuestions("linked-list").map((question) => [
        question.id,
        question.subtopicId,
      ]),
    );
    const subtopicIds = new Set(
      trackById("linked-list").subtopics.map((subtopic) => subtopic.id),
    );

    expect(leetcode).toHaveLength(LINKED_LIST_LEETCODE_QUESTIONS.length);
    expect(leetcode).toHaveLength(74);
    expect(new Set(leetcode.map((question) => question.id)).size).toBe(
      leetcode.length,
    );
    expect(new Set(leetcode.map((question) => question.leetcodeUrl)).size).toBe(
      leetcode.length,
    );

    for (const question of leetcode) {
      expect(question.lessonLabel).toBe("LC");
      expect(question.videoUrl).toBeUndefined();
      expect(question.leetcodeUrl).toBeDefined();
      expect(new URL(question.leetcodeUrl ?? "").hostname).toBe(
        "leetcode.com",
      );
      expect(subtopicIds.has(question.subtopicId)).toBe(true);
      expect(lessonIds.has(question.affiliatedLessonId ?? "")).toBe(true);
      expect(lessonSubtopicById.get(question.affiliatedLessonId ?? "")).toBe(
        question.subtopicId,
      );
      expect(question.affiliatedLessonLabel ?? "").toMatch(/^L\d+$/);
    }
  });

  test("builds embeddable YouTube URLs for in-page playback", () => {
    const track = trackById("linked-list");
    const lesson = lessonQuestions("linked-list")[0];
    const videoEmbedUrl = new URL(
      buildDsaVideoEmbedUrl({
        videoId: lesson.videoId,
        videoUrl: lesson.videoUrl,
      }) ?? "",
    );
    const playlistEmbedUrl = new URL(
      buildDsaPlaylistEmbedUrl(track.playlistUrl) ?? "",
    );

    expect(videoEmbedUrl.origin).toBe("https://www.youtube.com");
    expect(videoEmbedUrl.pathname).toBe(`/embed/${lesson.videoId}`);
    expect(videoEmbedUrl.searchParams.get("rel")).toBe("0");
    expect(videoEmbedUrl.searchParams.get("list")).toBe(
      "PLgUwDviBIf0rAuz8tVcM0AymmhTRsfaLU",
    );
    expect(playlistEmbedUrl.origin).toBe("https://www.youtube.com");
    expect(playlistEmbedUrl.pathname).toBe("/embed/videoseries");
    expect(playlistEmbedUrl.searchParams.get("list")).toBe(
      "PLgUwDviBIf0rAuz8tVcM0AymmhTRsfaLU",
    );
  });

  test("builds heap playlist data for DB import with affiliated LeetCode questions", () => {
    const seed = buildHeapDsaSeed(QUESTION_DOCUMENTS);
    const catalog = buildDsaCatalogFromTrackMetadata(
      [...STATIC_DSA_TRACKS, seed.track],
      [...DSA_QUESTIONS, ...seed.questions],
    );
    const track = catalog.tracks.find((item) => item.id === "heap");

    if (!track) {
      throw new Error("Missing imported Heap DSA track");
    }

    const questions = track.subtopics.flatMap((subtopic) => subtopic.questions);
    const lessons = questions.filter((question) => question.sourceType === "lesson");
    const leetcode = questions.filter(
      (question) => question.sourceType === "leetcode",
    );
    const lessonIds = new Set(lessons.map((question) => question.id));
    const lessonSubtopicById = new Map(
      lessons.map((question) => [question.id, question.subtopicId]),
    );

    expect(track.title).toBe("Heap");
    expect(track.playlistUrl).toBe(
      "https://www.youtube.com/playlist?list=PL_z_8CaSLPWdtY9W22VjnPxG30CXNZpI9",
    );
    expect(track.subtopics.map((subtopic) => subtopic.id)).toEqual([
      "heap-foundations",
      "heap-kth-selection",
      "heap-sorted-and-closest",
      "heap-frequency-patterns",
      "heap-applications",
    ]);
    expect(lessons).toHaveLength(10);
    expect(lessons.map((question) => question.lessonNumber)).toEqual([
      1, 2, 3, 10, 4, 5, 8, 6, 7, 9,
    ]);
    expect(leetcode).toHaveLength(25);
    expect(leetcode.map((question) => question.leetcodeSlug)).toEqual([
      "kth-smallest-element-in-a-sorted-matrix",
      "k-th-smallest-prime-fraction",
      "find-k-pairs-with-smallest-sums",
      "kth-largest-element-in-an-array",
      "find-the-kth-largest-integer-in-the-array",
      "kth-largest-element-in-a-stream",
      "find-subsequence-of-length-k-with-the-largest-sum",
      "last-stone-weight",
      "take-gifts-from-the-richest-pile",
      "sort-an-array",
      "merge-k-sorted-lists",
      "smallest-range-covering-elements-from-k-lists",
      "find-k-closest-elements",
      "k-closest-points-to-origin",
      "top-k-frequent-elements",
      "top-k-frequent-words",
      "reduce-array-size-to-the-half",
      "task-scheduler",
      "sort-characters-by-frequency",
      "reorganize-string",
      "longest-happy-string",
      "minimum-cost-to-connect-sticks",
      "remove-stones-to-minimize-the-total",
      "maximal-score-after-applying-k-operations",
      "minimum-operations-to-exceed-threshold-value-ii",
    ]);
    expect(new Set(leetcode.map((question) => question.id)).size).toBe(
      leetcode.length,
    );

    for (const question of lessons) {
      expect(question.videoUrl).toBeDefined();
      const url = new URL(question.videoUrl ?? "");
      expect(url.hostname).toBe("www.youtube.com");
      expect(url.searchParams.get("v")).toBe(question.videoId);
      expect(url.searchParams.get("list")).toBe(
        "PL_z_8CaSLPWdtY9W22VjnPxG30CXNZpI9",
      );
    }

    for (const question of leetcode) {
      expect(question.lessonLabel).toBe("LC");
      expect(question.videoUrl).toBeUndefined();
      expect(question.leetcodeUrl).toBeDefined();
      expect(new URL(question.leetcodeUrl ?? "").hostname).toBe(
        "leetcode.com",
      );
      expect(lessonIds.has(question.affiliatedLessonId ?? "")).toBe(true);
      expect(lessonSubtopicById.get(question.affiliatedLessonId ?? "")).toBe(
        question.subtopicId,
      );
    }
  });

  test("builds graph playlist data for DB import with affiliated LeetCode questions", () => {
    const seed = buildGraphDsaSeed(QUESTION_DOCUMENTS);
    const catalog = buildDsaCatalogFromTrackMetadata(
      [...STATIC_DSA_TRACKS, seed.track],
      [...DSA_QUESTIONS, ...seed.questions],
    );
    const track = catalog.tracks.find((item) => item.id === "graph");

    if (!track) {
      throw new Error("Missing imported Graph DSA track");
    }

    const questions = track.subtopics.flatMap((subtopic) => subtopic.questions);
    const lessons = questions.filter((question) => question.sourceType === "lesson");
    const leetcode = questions.filter(
      (question) => question.sourceType === "leetcode",
    );
    const lessonIds = new Set(lessons.map((question) => question.id));
    const lessonSubtopicById = new Map(
      lessons.map((question) => [question.id, question.subtopicId]),
    );

    expect(track.title).toBe("Graph");
    expect(track.playlistUrl).toBe(
      "https://www.youtube.com/playlist?list=PLgUwDviBIf0oE3gA41TKO2H5bHpPd7fzn",
    );
    expect(track.subtopics.map((subtopic) => subtopic.id)).toEqual([
      "graph-foundations",
      "graph-bfs-dfs-matrix",
      "graph-directed-topo",
      "graph-shortest-paths",
      "graph-mst-dsu",
      "graph-advanced-connectivity",
    ]);
    expect(lessons).toHaveLength(56);
    expect(lessons.map((question) => question.lessonNumber)).toEqual(
      Array.from({ length: 56 }, (_, index) => index + 1),
    );
    expect(leetcode).toHaveLength(54);
    expect(leetcode.map((question) => question.leetcodeSlug)).toEqual(
      expect.arrayContaining([
        "number-of-islands",
        "rotting-oranges",
        "course-schedule",
        "word-ladder",
        "network-delay-time",
        "path-with-minimum-effort",
        "min-cost-to-connect-all-points",
        "accounts-merge",
        "critical-connections-in-a-network",
      ]),
    );
    expect(new Set(leetcode.map((question) => question.id)).size).toBe(
      leetcode.length,
    );

    for (const question of lessons) {
      expect(question.videoUrl).toBeDefined();
      const url = new URL(question.videoUrl ?? "");
      expect(url.hostname).toBe("www.youtube.com");
      expect(url.searchParams.get("v")).toBe(question.videoId);
      expect(url.searchParams.get("list")).toBe(
        "PLgUwDviBIf0oE3gA41TKO2H5bHpPd7fzn",
      );
    }

    for (const question of leetcode) {
      expect(question.lessonLabel).toBe("LC");
      expect(question.videoUrl).toBeUndefined();
      expect(question.leetcodeUrl).toBeDefined();
      expect(new URL(question.leetcodeUrl ?? "").hostname).toBe(
        "leetcode.com",
      );
      expect(lessonIds.has(question.affiliatedLessonId ?? "")).toBe(true);
      expect(lessonSubtopicById.get(question.affiliatedLessonId ?? "")).toBe(
        question.subtopicId,
      );
      expect(question.affiliatedLessonLabel ?? "").toMatch(/^G\d+$/);
    }
  });
});

describe("DSA progress store", () => {
  test("toggles progress idempotently and isolates users", async () => {
    const questionId = allQuestions()[0].id;
    const userA = `dsa-a-${crypto.randomUUID()}`;
    const userB = `dsa-b-${crypto.randomUUID()}`;
    const initialSnapshot = await getDsaSnapshot(userA);

    expect(initialSnapshot.summary).toEqual({
      totalQuestions: 102,
      completedQuestions: 0,
      completionPercentage: 0,
    });

    const completed = await updateDsaQuestionProgress(
      { questionId, completed: true },
      userA,
    );

    expect(completed.progress.completed).toBe(true);
    expect(completed.progress.completedAt).toBeDefined();
    expect(completed.snapshot.summary.completedQuestions).toBe(1);

    const completedAgain = await updateDsaQuestionProgress(
      { questionId, completed: true },
      userA,
    );

    expect(completedAgain.progress.id).toBe(completed.progress.id);
    expect(completedAgain.snapshot.progress).toHaveLength(1);

    const userBSnapshot = await getDsaSnapshot(userB);
    expect(userBSnapshot.summary.completedQuestions).toBe(0);

    const cleared = await updateDsaQuestionProgress(
      { questionId, completed: false },
      userA,
    );

    expect(cleared.progress.id).toBe(completed.progress.id);
    expect(cleared.progress.completed).toBe(false);
    expect(cleared.progress.completedAt).toBeUndefined();
    expect(cleared.snapshot.summary.completedQuestions).toBe(0);
  });

  test("rejects unknown question ids", async () => {
    await expect(
      updateDsaQuestionProgress(
        {
          questionId: "linked-list-l99-nope",
          completed: true,
        },
        `dsa-invalid-${crypto.randomUUID()}`,
      ),
    ).rejects.toThrow("Unknown DSA question");
  });
});

describe("DSA RPC", () => {
  test("validates progress input and returns a snapshot", async () => {
    const userId = `dsa-rpc-${crypto.randomUUID()}`;
    const questionId = allQuestions()[1].id;
    const snapshot = await appRouter.dsa.snapshot.callable({
      context: { userId },
    })();
    const updateProgress = appRouter.dsa.updateQuestionProgress.callable({
      context: { userId },
    });

    expect(snapshot.summary.totalQuestions).toBe(102);

    const result = await updateProgress({ questionId, completed: true });

    expect(result.progress.questionId).toBe(questionId);
    expect(result.snapshot.summary.completedQuestions).toBe(1);
    expect(() =>
      updateDsaQuestionProgressInputSchema.parse({
        questionId,
        completed: "yes",
      }),
    ).toThrow();
    await expect(
      updateProgress({
        questionId: "missing-question",
        completed: true,
      }),
    ).rejects.toThrow("Unknown DSA question");
  });
});
