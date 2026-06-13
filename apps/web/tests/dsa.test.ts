import { describe, expect, test } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import {
  DSA_CATALOG,
  DSA_QUESTIONS,
  STATIC_DSA_TRACKS,
  buildDsaCatalogFromTrackMetadata,
} from "@careeright/domain/dsa/catalog";
import { LINKED_LIST_LEETCODE_QUESTIONS } from "@careeright/domain/dsa/linked-list-leetcode";
import {
  dsaQuestionSchema,
  updateDsaQuestionProgressInputSchema,
  type DsaQuestion,
} from "@careeright/domain/dsa/schema";
import {
  getDsaSnapshot,
  recordDsaVideoWatch,
  updateDsaQuestionProgress,
} from "@careeright/domain/dsa/store";
import {
  buildDsaPlaylistEmbedUrl,
  buildDsaVideoEmbedUrl,
} from "@careeright/domain/dsa/youtube";
import { appRouter } from "@careeright/api/router";
import {
  buildBacktrackingDsaSeed,
  buildCuratedDsaQuestionDocuments,
  buildDynamicProgrammingDsaSeed,
  buildGraphDsaSeed,
  buildHeapDsaSeed,
  buildRecursionDsaSeed,
  type GraphQuestionDocument,
  type HeapQuestionDocument,
} from "@careeright/domain/dsa/seed-data";

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
    .map(
      (file) =>
        JSON.parse(
          readFileSync(path.join(directory, file), "utf8"),
        ) as HeapQuestionDocument & GraphQuestionDocument,
    );
}

const QUESTION_DOCUMENTS = readQuestionDocuments();

describe("DSA catalog", () => {
  test("ships the local DSA catalog tracks for offline and desktop use", () => {
    const track = trackById("linked-list");
    const lessons = lessonQuestions("linked-list");

    expect(DSA_CATALOG.tracks.map((item) => item.id)).toEqual([
      "linked-list",
      "recursion",
      "backtracking",
    ]);
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
      expect(question.durationSeconds).toBeGreaterThan(0);
      expect(question.videoUrl).toBeDefined();
      const url = new URL(question.videoUrl ?? "");
      expect(url.hostname).toBe("www.youtube.com");
      expect(url.searchParams.get("v")).toBe(question.videoId);
      expect(url.searchParams.get("list")).toBe(
        "PLgUwDviBIf0rAuz8tVcM0AymmhTRsfaLU",
      );
    }
  });

  test("ships split Striver recursion and backtracking tracks locally", () => {
    const recursionTrack = trackById("recursion");
    const backtrackingTrack = trackById("backtracking");
    const recursionLessons = lessonQuestions("recursion");
    const backtrackingLessons = lessonQuestions("backtracking");
    const recursionLeetcode = leetcodeQuestions("recursion");
    const backtrackingLeetcode = leetcodeQuestions("backtracking");

    expect(recursionTrack.sourceName).toBe("Striver");
    expect(backtrackingTrack.sourceName).toBe("Striver");
    expect(recursionTrack.playlistUrl).toBe(
      "https://www.youtube.com/playlist?list=PLgUwDviBIf0rGlzIn_7rsaR2FQ5e6ZOL9",
    );
    expect(backtrackingTrack.playlistUrl).toBe(recursionTrack.playlistUrl);
    expect(recursionLessons).toHaveLength(18);
    expect(recursionLeetcode).toHaveLength(22);
    expect(backtrackingLessons.map((question) => question.title)).toEqual([
      "Rat in a Maze",
      "N-Queens",
      "M-Coloring Problem",
      "Sudoku Solver",
    ]);
    expect(backtrackingLeetcode).toHaveLength(10);
    expect(
      [...recursionLessons, ...backtrackingLessons]
        .filter((question) => !question.durationSeconds)
        .map((question) => question.id),
    ).toEqual([]);
  });

  test("normalizes nullable optional fields from persisted DSA question rows", () => {
    const lesson = lessonQuestions("linked-list")[0];
    const leetcode = leetcodeQuestions("linked-list")[0];
    const parsedLesson = dsaQuestionSchema.parse({
      ...lesson,
      leetcodeSlug: null,
      leetcodeUrl: null,
      difficulty: null,
      affiliatedLessonId: null,
      affiliatedLessonLabel: null,
    });
    const parsedLeetcode = dsaQuestionSchema.parse({
      ...leetcode,
      lessonNumber: null,
      videoId: null,
      videoUrl: null,
      durationSeconds: null,
    });

    expect(parsedLesson.leetcodeSlug).toBeUndefined();
    expect(parsedLesson.leetcodeUrl).toBeUndefined();
    expect(parsedLesson.difficulty).toBeUndefined();
    expect(parsedLesson.affiliatedLessonId).toBeUndefined();
    expect(parsedLesson.affiliatedLessonLabel).toBeUndefined();
    expect(parsedLeetcode.lessonNumber).toBeUndefined();
    expect(parsedLeetcode.videoId).toBeUndefined();
    expect(parsedLeetcode.videoUrl).toBeUndefined();
    expect(parsedLeetcode.durationSeconds).toBeUndefined();
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
      expect(new URL(question.leetcodeUrl ?? "").hostname).toBe("leetcode.com");
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

  test("hydrates video durations when rebuilding persisted DSA catalog rows", () => {
    const persistedQuestions = DSA_QUESTIONS.map((question) => ({
      ...question,
      durationSeconds: undefined,
    }));
    const catalog = buildDsaCatalogFromTrackMetadata(
      STATIC_DSA_TRACKS,
      persistedQuestions,
    );
    const rebuiltLessons = catalog.tracks.flatMap((track) =>
      track.subtopics.flatMap((subtopic) =>
        subtopic.questions.filter(
          (question) => question.sourceType === "lesson",
        ),
      ),
    );
    const totalDurationSeconds = rebuiltLessons.reduce(
      (totalSeconds, question) =>
        totalSeconds + (question.durationSeconds ?? 0),
      0,
    );

    expect(rebuiltLessons[0]?.durationSeconds).toBeGreaterThan(0);
    expect(
      rebuiltLessons
        .filter((question) => !question.durationSeconds)
        .map((question) => question.id),
    ).toEqual([]);
    expect(totalDurationSeconds).toBeGreaterThan(0);
  });

  test("builds heap playlist data for DB import with affiliated LeetCode questions", () => {
    const seed = buildHeapDsaSeed(QUESTION_DOCUMENTS);
    expect(
      seed.lessons
        .filter((question) => !question.durationSeconds)
        .map((question) => question.id),
    ).toEqual([]);
    const persistedQuestions = seed.questions.map((question) => ({
      ...question,
      durationSeconds: undefined,
    }));
    const catalog = buildDsaCatalogFromTrackMetadata(
      [...STATIC_DSA_TRACKS, seed.track],
      [...DSA_QUESTIONS, ...persistedQuestions],
    );
    const track = catalog.tracks.find((item) => item.id === "heap");

    if (!track) {
      throw new Error("Missing imported Heap DSA track");
    }

    const questions = track.subtopics.flatMap((subtopic) => subtopic.questions);
    const lessons = questions.filter(
      (question) => question.sourceType === "lesson",
    );
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
      expect(question.durationSeconds).toBeGreaterThan(0);
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
      expect(new URL(question.leetcodeUrl ?? "").hostname).toBe("leetcode.com");
      expect(lessonIds.has(question.affiliatedLessonId ?? "")).toBe(true);
      expect(lessonSubtopicById.get(question.affiliatedLessonId ?? "")).toBe(
        question.subtopicId,
      );
    }
  });

  test("builds split Striver recursion and backtracking playlist data for DB import", () => {
    const practiceQuestions: DsaQuestion[] = [
      {
        id: "backtracking-leetcode-subsets",
        trackId: "backtracking",
        subtopicId: "old-backtracking-foundations",
        sourceType: "leetcode",
        order: 4001,
        lessonLabel: "LC",
        title: "Subsets",
        leetcodeSlug: "subsets",
        leetcodeUrl: "https://leetcode.com/problems/subsets",
        difficulty: "MEDIUM",
        affiliatedLessonId: "backtracking-l04-generalization",
        affiliatedLessonLabel: "BT4",
      },
      {
        id: "backtracking-leetcode-n-queens",
        trackId: "backtracking",
        subtopicId: "old-backtracking-constraint-solving",
        sourceType: "leetcode",
        order: 18001,
        lessonLabel: "LC",
        title: "N-Queens",
        leetcodeSlug: "n-queens",
        leetcodeUrl: "https://leetcode.com/problems/n-queens",
        difficulty: "HARD",
        affiliatedLessonId: "backtracking-l18-n-queens-part-1",
        affiliatedLessonLabel: "BT18",
      },
    ];
    const recursionSeed = buildRecursionDsaSeed(practiceQuestions);
    const backtrackingSeed = buildBacktrackingDsaSeed(practiceQuestions);
    const persistedQuestions = [
      ...recursionSeed.questions,
      ...backtrackingSeed.questions,
    ].map((question) => ({
      ...question,
      durationSeconds: undefined,
    }));
    const baseTracks = STATIC_DSA_TRACKS.filter(
      (track) => track.id !== "recursion" && track.id !== "backtracking",
    );
    const baseQuestions = DSA_QUESTIONS.filter(
      (question) =>
        question.trackId !== "recursion" && question.trackId !== "backtracking",
    );
    const catalog = buildDsaCatalogFromTrackMetadata(
      [...baseTracks, recursionSeed.track, backtrackingSeed.track],
      [...baseQuestions, ...persistedQuestions],
    );
    const recursionTrack = catalog.tracks.find(
      (item) => item.id === "recursion",
    );
    const backtrackingTrack = catalog.tracks.find(
      (item) => item.id === "backtracking",
    );

    if (!recursionTrack || !backtrackingTrack) {
      throw new Error("Missing imported Recursion or Backtracking DSA track");
    }

    const recursionLessons = recursionTrack.subtopics
      .flatMap((subtopic) => subtopic.questions)
      .filter((question) => question.sourceType === "lesson");
    const backtrackingLessons = backtrackingTrack.subtopics
      .flatMap((subtopic) => subtopic.questions)
      .filter((question) => question.sourceType === "lesson");
    const recursionLeetcode = recursionTrack.subtopics
      .flatMap((subtopic) => subtopic.questions)
      .filter((question) => question.sourceType === "leetcode");
    const backtrackingLeetcode = backtrackingTrack.subtopics
      .flatMap((subtopic) => subtopic.questions)
      .filter((question) => question.sourceType === "leetcode");

    expect(recursionTrack.title).toBe("Recursion");
    expect(recursionTrack.sourceName).toBe("Striver");
    expect(backtrackingTrack.title).toBe("Backtracking");
    expect(backtrackingTrack.sourceName).toBe("Striver");
    expect(recursionTrack.playlistUrl).toBe(
      "https://www.youtube.com/playlist?list=PLgUwDviBIf0rGlzIn_7rsaR2FQ5e6ZOL9",
    );
    expect(backtrackingTrack.playlistUrl).toBe(recursionTrack.playlistUrl);
    expect(recursionLessons).toHaveLength(18);
    expect(backtrackingLessons).toHaveLength(4);
    expect(recursionLessons.map((question) => question.lessonNumber)).toEqual(
      Array.from({ length: 18 }, (_, index) => index + 1),
    );
    expect(backtrackingLessons.map((question) => question.title)).toEqual([
      "Rat in a Maze",
      "N-Queens",
      "M-Coloring Problem",
      "Sudoku Solver",
    ]);
    expect(recursionLessons.map((question) => question.videoId)).toEqual(
      expect.arrayContaining([
        "yVdKa8dnKiE",
        "ogjf7ORKfd8",
        "AseUmwVNaoY",
        "wT7gcXLYoao",
      ]),
    );
    expect(backtrackingLessons.map((question) => question.videoId)).toEqual([
      "bLGZhJlt4y0",
      "i05Ju7AftcM",
      "wuVwUK25Rfc",
      "FWAIf_EVUKE",
    ]);
    expect(
      [...recursionLessons, ...backtrackingLessons]
        .filter((question) => !question.durationSeconds)
        .map((question) => question.id),
    ).toEqual([]);
    expect(recursionLeetcode[0]).toMatchObject({
      id: "backtracking-leetcode-subsets",
      trackId: "recursion",
      affiliatedLessonLabel: "R13",
    });
    expect(backtrackingLeetcode[0]).toMatchObject({
      id: "backtracking-leetcode-n-queens",
      trackId: "backtracking",
      affiliatedLessonLabel: "BT2",
    });

    for (const question of [...recursionLessons, ...backtrackingLessons]) {
      expect(question.durationSeconds).toBeGreaterThan(0);
      expect(question.videoUrl).toBeDefined();
      const url = new URL(question.videoUrl ?? "");
      expect(url.hostname).toBe("www.youtube.com");
      expect(url.searchParams.get("v")).toBe(question.videoId);
      expect(url.searchParams.get("list")).toBe(
        "PLgUwDviBIf0rGlzIn_7rsaR2FQ5e6ZOL9",
      );
    }
  });

  test("builds Striver dynamic programming playlist data for DB import", () => {
    const seed = buildDynamicProgrammingDsaSeed();
    expect(
      seed.lessons
        .filter((question) => !question.durationSeconds)
        .map((question) => question.id),
    ).toEqual([]);
    const persistedQuestions = seed.questions.map((question) => ({
      ...question,
      durationSeconds: undefined,
    }));
    const catalog = buildDsaCatalogFromTrackMetadata(
      [...STATIC_DSA_TRACKS, seed.track],
      [...DSA_QUESTIONS, ...persistedQuestions],
    );
    const track = catalog.tracks.find(
      (item) => item.id === "dynamic-programming",
    );

    if (!track) {
      throw new Error("Missing imported Dynamic Programming DSA track");
    }

    const questions = track.subtopics.flatMap((subtopic) => subtopic.questions);
    const lessons = questions.filter(
      (question) => question.sourceType === "lesson",
    );
    const videoIds = lessons.map((question) => question.videoId);

    expect(track.title).toBe("Dynamic Programming");
    expect(track.sourceName).toBe("Striver");
    expect(track.playlistUrl).toBe(
      "https://www.youtube.com/playlist?list=PLgUwDviBIf0qUlt5H_kiKYaNSqJ81PMMY",
    );
    expect(track.subtopics.map((subtopic) => subtopic.id)).toEqual([
      "dp-1d-foundations",
      "dp-grids",
      "dp-subsequences",
      "dp-strings",
      "dp-stocks",
      "dp-lis",
      "dp-partition-rectangles",
    ]);
    expect(lessons).toHaveLength(56);
    expect(lessons.map((question) => question.lessonNumber)).toEqual(
      Array.from({ length: 56 }, (_, index) => index + 1),
    );
    expect(new Set(lessons.map((question) => question.id)).size).toBe(56);
    expect(videoIds).toEqual(
      expect.arrayContaining([
        "tyB0ztf0DNY",
        "GS_OqZb2CWc",
        "NPZn9jBrX8U",
        "auS1fynpnjo",
      ]),
    );

    for (const question of lessons) {
      expect(question.durationSeconds).toBeGreaterThan(0);
      expect(question.videoUrl).toBeDefined();
      const url = new URL(question.videoUrl ?? "");
      expect(url.hostname).toBe("www.youtube.com");
      expect(url.searchParams.get("v")).toBe(question.videoId);
      expect(url.searchParams.get("list")).toBe(
        "PLgUwDviBIf0qUlt5H_kiKYaNSqJ81PMMY",
      );
    }
  });

  test("builds graph playlist data for DB import with affiliated LeetCode questions", () => {
    const seed = buildGraphDsaSeed(QUESTION_DOCUMENTS);
    expect(
      seed.lessons
        .filter((question) => !question.durationSeconds)
        .map((question) => question.id),
    ).toEqual([]);
    const persistedQuestions = seed.questions.map((question) => ({
      ...question,
      durationSeconds: undefined,
    }));
    const catalog = buildDsaCatalogFromTrackMetadata(
      [...STATIC_DSA_TRACKS, seed.track],
      [...DSA_QUESTIONS, ...persistedQuestions],
    );
    const track = catalog.tracks.find((item) => item.id === "graph");

    if (!track) {
      throw new Error("Missing imported Graph DSA track");
    }

    const questions = track.subtopics.flatMap((subtopic) => subtopic.questions);
    const lessons = questions.filter(
      (question) => question.sourceType === "lesson",
    );
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
      expect(question.durationSeconds).toBeGreaterThan(0);
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
      expect(new URL(question.leetcodeUrl ?? "").hostname).toBe("leetcode.com");
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
      totalQuestions: 156,
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

  test("returns watched lesson videos in the snapshot", async () => {
    const userId = `dsa-video-${crypto.randomUUID()}`;
    const lesson = lessonQuestions()[0];
    const leetcode = leetcodeQuestions()[0];
    const initialSnapshot = await getDsaSnapshot(userId);

    expect(initialSnapshot.videoWatches).toEqual([]);

    const event = await recordDsaVideoWatch({ questionId: lesson.id }, userId);

    expect(event.questionId).toBe(lesson.id);

    const watchedSnapshot = await getDsaSnapshot(userId);

    expect(watchedSnapshot.videoWatches).toHaveLength(1);
    expect(watchedSnapshot.videoWatches[0]?.questionId).toBe(lesson.id);

    await expect(
      recordDsaVideoWatch({ questionId: leetcode.id }, userId),
    ).rejects.toThrow("Unknown DSA video");
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

    expect(snapshot.summary.totalQuestions).toBe(156);

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
