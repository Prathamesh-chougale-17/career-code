import {
  dsaQuestionSchema,
  dsaTrackMetadataSchema,
  type DsaQuestion,
} from "./schema";
import { DSA_VIDEO_DURATIONS_SECONDS } from "./video-durations";

const HEAP_TRACK_ID = "heap";
const HEAP_PLAYLIST_ID = "PL_z_8CaSLPWdtY9W22VjnPxG30CXNZpI9";
const HEAP_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${HEAP_PLAYLIST_ID}`;

type HeapLessonSeed = {
  id: string;
  subtopicId: string;
  lessonNumber: number;
  title: string;
  videoId: string;
};

type HeapQuestionDocument = {
  question?: {
    title?: string;
    slug?: string;
    difficulty?: string;
    leetcode_link?: string;
    seo_content?: string;
  };
  tags?: Array<{
    name?: string;
    slug?: string;
  }>;
};

const heapSubtopics = [
  {
    id: "heap-foundations",
    title: "Foundations",
    description:
      "Heap identification, priority queue basics, and heap-backed design.",
  },
  {
    id: "heap-kth-selection",
    title: "Kth Selection",
    description:
      "Kth smallest, k largest, and bounded top-k selection patterns.",
  },
  {
    id: "heap-sorted-and-closest",
    title: "Sorted and Closest",
    description:
      "Nearly sorted arrays, closest values, closest points, and sorted merges.",
  },
  {
    id: "heap-frequency-patterns",
    title: "Frequency Patterns",
    description:
      "Top-k frequency, frequency sorting, and heap-driven string construction.",
  },
  {
    id: "heap-applications",
    title: "Heap Applications",
    description:
      "Greedy cost, scheduling, graph, stream, and design problems using priority queues.",
  },
] as const;

const heapLessons = [
  {
    id: "heap-l01-introduction",
    subtopicId: "heap-foundations",
    lessonNumber: 1,
    title: "Heap Introduction and Identification",
    videoId: "hW8PrQrvMNc",
  },
  {
    id: "heap-l02-kth-smallest",
    subtopicId: "heap-kth-selection",
    lessonNumber: 2,
    title: "Kth Smallest Element",
    videoId: "4BfL2Hjvh8g",
  },
  {
    id: "heap-l03-k-largest-elements",
    subtopicId: "heap-kth-selection",
    lessonNumber: 3,
    title: "Return K Largest Elements in Array",
    videoId: "3DdP6Ef8YZM",
  },
  {
    id: "heap-l04-sort-k-sorted-array",
    subtopicId: "heap-sorted-and-closest",
    lessonNumber: 4,
    title: "Sort a K Sorted Array | Sort Nearly Sorted Array",
    videoId: "dYfM6J1y0mU",
  },
  {
    id: "heap-l05-k-closest-numbers",
    subtopicId: "heap-sorted-and-closest",
    lessonNumber: 5,
    title: "K Closest Numbers",
    videoId: "J8yLD-x7fBI",
  },
  {
    id: "heap-l06-top-k-frequent",
    subtopicId: "heap-frequency-patterns",
    lessonNumber: 6,
    title: "Top K Frequent Numbers",
    videoId: "7VoJn544QrM",
  },
  {
    id: "heap-l07-frequency-sort",
    subtopicId: "heap-frequency-patterns",
    lessonNumber: 7,
    title: "Frequency Sort",
    videoId: "hLR5aMzYGGk",
  },
  {
    id: "heap-l08-k-closest-points-origin",
    subtopicId: "heap-sorted-and-closest",
    lessonNumber: 8,
    title: "K Closest Points To Origin",
    videoId: "XC4EotTewro",
  },
  {
    id: "heap-l09-connect-ropes",
    subtopicId: "heap-applications",
    lessonNumber: 9,
    title: "Connect Ropes to Minimise the Cost",
    videoId: "_k_c9nqzKN0",
  },
  {
    id: "heap-l10-sum-between-k1-k2",
    subtopicId: "heap-kth-selection",
    lessonNumber: 10,
    title: "Sum of Elements Between K1 Smallest and K2 Smallest Numbers",
    videoId: "3ioQQQrnw4Q",
  },
] as const satisfies readonly HeapLessonSeed[];

const heapLessonById = new Map(
  heapLessons.map((lesson) => [lesson.id, lesson]),
);

const curatedHeapLeetcodeQuestions = [
  {
    slug: "kth-smallest-element-in-a-sorted-matrix",
    lessonId: "heap-l02-kth-smallest",
  },
  {
    slug: "k-th-smallest-prime-fraction",
    lessonId: "heap-l02-kth-smallest",
  },
  {
    slug: "find-k-pairs-with-smallest-sums",
    lessonId: "heap-l02-kth-smallest",
  },
  {
    slug: "kth-largest-element-in-an-array",
    lessonId: "heap-l03-k-largest-elements",
  },
  {
    slug: "find-the-kth-largest-integer-in-the-array",
    lessonId: "heap-l03-k-largest-elements",
  },
  {
    slug: "kth-largest-element-in-a-stream",
    lessonId: "heap-l03-k-largest-elements",
  },
  {
    slug: "find-subsequence-of-length-k-with-the-largest-sum",
    lessonId: "heap-l03-k-largest-elements",
  },
  {
    slug: "last-stone-weight",
    lessonId: "heap-l03-k-largest-elements",
  },
  {
    slug: "take-gifts-from-the-richest-pile",
    lessonId: "heap-l03-k-largest-elements",
  },
  {
    slug: "sort-an-array",
    lessonId: "heap-l04-sort-k-sorted-array",
  },
  {
    slug: "merge-k-sorted-lists",
    lessonId: "heap-l04-sort-k-sorted-array",
  },
  {
    slug: "smallest-range-covering-elements-from-k-lists",
    lessonId: "heap-l04-sort-k-sorted-array",
  },
  {
    slug: "find-k-closest-elements",
    lessonId: "heap-l05-k-closest-numbers",
  },
  {
    slug: "top-k-frequent-elements",
    lessonId: "heap-l06-top-k-frequent",
  },
  {
    slug: "top-k-frequent-words",
    lessonId: "heap-l06-top-k-frequent",
  },
  {
    slug: "reduce-array-size-to-the-half",
    lessonId: "heap-l06-top-k-frequent",
  },
  {
    slug: "task-scheduler",
    lessonId: "heap-l06-top-k-frequent",
  },
  {
    slug: "sort-characters-by-frequency",
    lessonId: "heap-l07-frequency-sort",
  },
  {
    slug: "reorganize-string",
    lessonId: "heap-l07-frequency-sort",
  },
  {
    slug: "longest-happy-string",
    lessonId: "heap-l07-frequency-sort",
  },
  {
    slug: "k-closest-points-to-origin",
    lessonId: "heap-l08-k-closest-points-origin",
  },
  {
    slug: "minimum-cost-to-connect-sticks",
    lessonId: "heap-l09-connect-ropes",
  },
  {
    slug: "remove-stones-to-minimize-the-total",
    lessonId: "heap-l09-connect-ropes",
  },
  {
    slug: "maximal-score-after-applying-k-operations",
    lessonId: "heap-l09-connect-ropes",
  },
  {
    slug: "minimum-operations-to-exceed-threshold-value-ii",
    lessonId: "heap-l09-connect-ropes",
  },
] as const;

export function buildHeapDsaSeed(documents: HeapQuestionDocument[]) {
  const track = dsaTrackMetadataSchema.parse({
    id: HEAP_TRACK_ID,
    title: "Heap",
    sourceName: "Aditya Verma",
    playlistTitle: "Heap | Priority Queue",
    playlistUrl: HEAP_PLAYLIST_URL,
    order: 200,
    subtopics: heapSubtopics.map((subtopic, index) => ({
      ...subtopic,
      order: index * 100,
    })),
  });
  const lessons = heapLessons.map((lesson) => heapLessonQuestion(lesson));
  const documentBySlug = new Map(
    documents.map((document) => [document.question?.slug?.trim(), document]),
  );
  const lessonOffsets = new Map<string, number>();
  const heapLeetcodeQuestions: DsaQuestion[] = [];

  for (const item of curatedHeapLeetcodeQuestions) {
    const document = documentBySlug.get(item.slug);
    const lesson = heapLessonById.get(item.lessonId);

    if (!document) {
      throw new Error(`Missing curated Heap LeetCode question: ${item.slug}`);
    }

    if (!lesson) {
      throw new Error(`Missing curated Heap lesson: ${item.lessonId}`);
    }

    const offset = (lessonOffsets.get(lesson.id) ?? 0) + 1;
    lessonOffsets.set(lesson.id, offset);
    heapLeetcodeQuestions.push(heapLeetcodeQuestion(document, lesson, offset));
  }

  return {
    track,
    questions: [...lessons, ...heapLeetcodeQuestions],
    lessons,
    leetcodeQuestions: heapLeetcodeQuestions,
  };
}

function heapLessonQuestion(lesson: HeapLessonSeed): DsaQuestion {
  return dsaQuestionSchema.parse({
    id: lesson.id,
    trackId: HEAP_TRACK_ID,
    subtopicId: lesson.subtopicId,
    sourceType: "lesson",
    order: lesson.lessonNumber * 1000,
    lessonNumber: lesson.lessonNumber,
    lessonLabel: `L${lesson.lessonNumber}`,
    title: lesson.title,
    videoId: lesson.videoId,
    videoUrl: `https://www.youtube.com/watch?v=${lesson.videoId}&list=${HEAP_PLAYLIST_ID}`,
    durationSeconds: DSA_VIDEO_DURATIONS_SECONDS[lesson.videoId],
  });
}

function heapLeetcodeQuestion(
  document: HeapQuestionDocument,
  lesson: HeapLessonSeed,
  offset: number,
): DsaQuestion {
  const slug = heapQuestionSlug(document);

  return dsaQuestionSchema.parse({
    id: `${HEAP_TRACK_ID}-leetcode-${slug}`,
    trackId: HEAP_TRACK_ID,
    subtopicId: lesson.subtopicId,
    sourceType: "leetcode",
    order: lesson.lessonNumber * 1000 + offset,
    lessonLabel: "LC",
    title: heapCleanTitle(heapQuestionTitle(document)),
    leetcodeSlug: slug,
    leetcodeUrl: heapQuestionLeetcodeUrl(document),
    difficulty: heapQuestionDifficulty(document),
    affiliatedLessonId: lesson.id,
    affiliatedLessonLabel: `L${lesson.lessonNumber}`,
  });
}

function heapQuestionTitle(document: HeapQuestionDocument) {
  return document.question?.title?.trim() || "Untitled Heap Question";
}

function heapQuestionSlug(document: HeapQuestionDocument) {
  const slug = document.question?.slug?.trim();

  if (!slug) {
    throw new Error(
      `Heap question is missing slug: ${heapQuestionTitle(document)}`,
    );
  }

  return slug;
}

function heapQuestionDifficulty(document: HeapQuestionDocument) {
  const difficulty = document.question?.difficulty?.toUpperCase();

  if (
    difficulty !== "EASY" &&
    difficulty !== "MEDIUM" &&
    difficulty !== "HARD"
  ) {
    throw new Error(
      `Heap question has invalid difficulty: ${heapQuestionTitle(document)}`,
    );
  }

  return difficulty;
}

function heapQuestionLeetcodeUrl(document: HeapQuestionDocument) {
  const url = document.question?.leetcode_link?.trim();

  return url || `https://leetcode.com/problems/${heapQuestionSlug(document)}`;
}

function heapCleanTitle(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type { HeapQuestionDocument };

const RECURSION_BACKTRACKING_PLAYLIST_ID = "PLgUwDviBIf0rGlzIn_7rsaR2FQ5e6ZOL9";
const RECURSION_BACKTRACKING_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${RECURSION_BACKTRACKING_PLAYLIST_ID}`;
const RECURSION_TRACK_ID = "recursion";
const BACKTRACKING_TRACK_ID = "backtracking";

type RecursionBacktrackingLessonSeed = {
  subtopicId: string;
  lessonNumber: number;
  title: string;
  videoId: string;
};

const recursionSubtopics = [
  {
    id: "recursion-foundations",
    title: "Foundations",
    description:
      "Recursion trees, stack space, parameterised recursion, functional recursion, and multiple calls.",
  },
  {
    id: "recursion-subsequences-patterns",
    title: "Subsequences and Patterns",
    description:
      "Subsequence recursion, print-all/print-one/count patterns, and recursive generation.",
  },
  {
    id: "recursion-divide-conquer",
    title: "Divide and Conquer",
    description:
      "Recursive sorting, partitioning, and inversion counting patterns.",
  },
  {
    id: "recursion-combinatorics",
    title: "Combinatorics and Partitions",
    description:
      "Combination sums, subsets, permutations, kth permutation, and palindrome partitioning.",
  },
] as const;

const recursionLessons = [
  {
    subtopicId: "recursion-foundations",
    lessonNumber: 1,
    title: "Introduction to Recursion | Recursion Tree | Stack Space",
    videoId: "yVdKa8dnKiE",
  },
  {
    subtopicId: "recursion-foundations",
    lessonNumber: 2,
    title: "Problems on Recursion",
    videoId: "un6PLygfXrA",
  },
  {
    subtopicId: "recursion-foundations",
    lessonNumber: 3,
    title: "Parameterised and Functional Recursion",
    videoId: "69ZCDFy-OUo",
  },
  {
    subtopicId: "recursion-foundations",
    lessonNumber: 4,
    title: "Problems on Functional Recursion",
    videoId: "twuC1F6gLI8",
  },
  {
    subtopicId: "recursion-foundations",
    lessonNumber: 5,
    title: "Multiple Recursion Calls",
    videoId: "kvRjNm4rVBE",
  },
  {
    subtopicId: "recursion-subsequences-patterns",
    lessonNumber: 6,
    title: "Recursion on Subsequences | Printing Subsequences",
    videoId: "AxNNVECce8c",
  },
  {
    subtopicId: "recursion-subsequences-patterns",
    lessonNumber: 7,
    title: "Recursion Patterns | Print All | Print One | Count",
    videoId: "eQCS_v3bw0Q",
  },
  {
    subtopicId: "recursion-divide-conquer",
    lessonNumber: 8,
    title: "Merge Sort | Algorithm | Pseudocode | Dry Run | Code",
    videoId: "ogjf7ORKfd8",
  },
  {
    subtopicId: "recursion-divide-conquer",
    lessonNumber: 9,
    title: "Quick Sort",
    videoId: "WIrA4YexLRQ",
  },
  {
    subtopicId: "recursion-divide-conquer",
    lessonNumber: 10,
    title: "Count Inversions in an Array | Brute and Optimal",
    videoId: "AseUmwVNaoY",
  },
  {
    subtopicId: "recursion-combinatorics",
    lessonNumber: 11,
    title: "Combination Sum",
    videoId: "OyZFFqQtu98",
  },
  {
    subtopicId: "recursion-combinatorics",
    lessonNumber: 12,
    title: "Combination Sum II",
    videoId: "G1fRTGRxXU8",
  },
  {
    subtopicId: "recursion-combinatorics",
    lessonNumber: 13,
    title: "Subset Sum I",
    videoId: "rYkfBRtMJr8",
  },
  {
    subtopicId: "recursion-combinatorics",
    lessonNumber: 14,
    title: "Subset Sum II",
    videoId: "RIn3gOkbhQE",
  },
  {
    subtopicId: "recursion-combinatorics",
    lessonNumber: 15,
    title: "Print All Permutations of a String or Array | Approach 1",
    videoId: "YK78FU5Ffjw",
  },
  {
    subtopicId: "recursion-combinatorics",
    lessonNumber: 16,
    title: "Print All Permutations of a String or Array | Approach 2",
    videoId: "f2ic2Rsc9pU",
  },
  {
    subtopicId: "recursion-combinatorics",
    lessonNumber: 17,
    title: "Palindrome Partitioning",
    videoId: "WBgsABoClE0",
  },
  {
    subtopicId: "recursion-combinatorics",
    lessonNumber: 18,
    title: "K-th Permutation Sequence",
    videoId: "wT7gcXLYoao",
  },
] as const satisfies readonly RecursionBacktrackingLessonSeed[];

const backtrackingSubtopics = [
  {
    id: "backtracking-paths",
    title: "Path Exploration",
    description:
      "Maze-style path construction and grid search with visited-state backtracking.",
  },
  {
    id: "backtracking-placement",
    title: "Placement Constraints",
    description:
      "Board placement problems that prune invalid row, column, and diagonal choices.",
  },
  {
    id: "backtracking-graph-coloring",
    title: "Graph Coloring",
    description:
      "Color assignment problems with adjacency constraints and recursive undo.",
  },
  {
    id: "backtracking-constraint-solving",
    title: "Constraint Solving",
    description:
      "Dense constraint puzzles that combine choice validation and recursive search.",
  },
] as const;

const backtrackingLessons = [
  {
    subtopicId: "backtracking-paths",
    lessonNumber: 1,
    title: "Rat in a Maze",
    videoId: "bLGZhJlt4y0",
  },
  {
    subtopicId: "backtracking-placement",
    lessonNumber: 2,
    title: "N-Queens",
    videoId: "i05Ju7AftcM",
  },
  {
    subtopicId: "backtracking-graph-coloring",
    lessonNumber: 3,
    title: "M-Coloring Problem",
    videoId: "wuVwUK25Rfc",
  },
  {
    subtopicId: "backtracking-constraint-solving",
    lessonNumber: 4,
    title: "Sudoku Solver",
    videoId: "FWAIf_EVUKE",
  },
] as const satisfies readonly RecursionBacktrackingLessonSeed[];

const recursionLeetcodeLessonBySlug = {
  subsets: 13,
  "subsets-ii": 14,
  combinations: 7,
  "combination-sum": 11,
  "combination-sum-ii": 12,
  "combination-sum-iii": 11,
  "generate-parentheses": 7,
  "letter-case-permutation": 15,
  permutations: 15,
  "permutations-ii": 16,
  "beautiful-arrangement": 16,
  "construct-the-lexicographically-largest-valid-sequence": 18,
  "numbers-with-same-consecutive-differences": 7,
  "the-k-th-lexicographical-string-of-all-happy-strings-of-length-n": 7,
  "palindrome-partitioning": 17,
  "restore-ip-addresses": 17,
  "additive-number": 17,
  "expression-add-operators": 17,
  "split-array-into-fibonacci-sequence": 17,
  "word-break": 17,
  "word-break-ii": 17,
  "letter-combinations-of-a-phone-number": 7,
} as const satisfies Record<string, number>;

const backtrackingLeetcodeLessonBySlug = {
  "matchsticks-to-square": 3,
  "partition-to-k-equal-sum-subsets": 3,
  "unique-paths-iii": 1,
  "path-with-maximum-gold": 1,
  "word-search": 1,
  "word-search-ii": 1,
  "n-queens": 2,
  "n-queens-ii": 2,
  "sudoku-solver": 4,
  "valid-sudoku": 4,
} as const satisfies Record<string, number>;

const recursionBacktrackingPracticeQuestions = [
  {
    id: "backtracking-leetcode-unique-paths-iii",
    trackId: "backtracking",
    subtopicId: "backtracking-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Unique Paths III",
    leetcodeSlug: "unique-paths-iii",
    leetcodeUrl: "https://leetcode.com/problems/unique-paths-iii",
    difficulty: "HARD",
  },
  {
    id: "backtracking-leetcode-path-with-maximum-gold",
    trackId: "backtracking",
    subtopicId: "backtracking-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Path with Maximum Gold",
    leetcodeSlug: "path-with-maximum-gold",
    leetcodeUrl: "https://leetcode.com/problems/path-with-maximum-gold",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-word-search",
    trackId: "backtracking",
    subtopicId: "backtracking-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Word Search",
    leetcodeSlug: "word-search",
    leetcodeUrl: "https://leetcode.com/problems/word-search",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-word-search-ii",
    trackId: "backtracking",
    subtopicId: "backtracking-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Word Search II",
    leetcodeSlug: "word-search-ii",
    leetcodeUrl: "https://leetcode.com/problems/word-search-ii",
    difficulty: "HARD",
  },
  {
    id: "backtracking-leetcode-n-queens",
    trackId: "backtracking",
    subtopicId: "backtracking-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "N-Queens",
    leetcodeSlug: "n-queens",
    leetcodeUrl: "https://leetcode.com/problems/n-queens",
    difficulty: "HARD",
  },
  {
    id: "backtracking-leetcode-n-queens-ii",
    trackId: "backtracking",
    subtopicId: "backtracking-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "N-Queens II",
    leetcodeSlug: "n-queens-ii",
    leetcodeUrl: "https://leetcode.com/problems/n-queens-ii",
    difficulty: "HARD",
  },
  {
    id: "backtracking-leetcode-matchsticks-to-square",
    trackId: "backtracking",
    subtopicId: "backtracking-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Matchsticks to Square",
    leetcodeSlug: "matchsticks-to-square",
    leetcodeUrl: "https://leetcode.com/problems/matchsticks-to-square",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-partition-to-k-equal-sum-subsets",
    trackId: "backtracking",
    subtopicId: "backtracking-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Partition to K Equal Sum Subsets",
    leetcodeSlug: "partition-to-k-equal-sum-subsets",
    leetcodeUrl:
      "https://leetcode.com/problems/partition-to-k-equal-sum-subsets",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-sudoku-solver",
    trackId: "backtracking",
    subtopicId: "backtracking-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Sudoku Solver",
    leetcodeSlug: "sudoku-solver",
    leetcodeUrl: "https://leetcode.com/problems/sudoku-solver",
    difficulty: "HARD",
  },
  {
    id: "backtracking-leetcode-valid-sudoku",
    trackId: "backtracking",
    subtopicId: "backtracking-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Valid Sudoku",
    leetcodeSlug: "valid-sudoku",
    leetcodeUrl: "https://leetcode.com/problems/valid-sudoku",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-combinations",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Combinations",
    leetcodeSlug: "combinations",
    leetcodeUrl: "https://leetcode.com/problems/combinations",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-generate-parentheses",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Generate Parentheses",
    leetcodeSlug: "generate-parentheses",
    leetcodeUrl: "https://leetcode.com/problems/generate-parentheses",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-numbers-with-same-consecutive-differences",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Numbers With Same Consecutive Differences",
    leetcodeSlug: "numbers-with-same-consecutive-differences",
    leetcodeUrl:
      "https://leetcode.com/problems/numbers-with-same-consecutive-differences",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-the-k-th-lexicographical-string-of-all-happy-strings-of-length-n",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "The k-th Lexicographical String of All Happy Strings of Length n",
    leetcodeSlug:
      "the-k-th-lexicographical-string-of-all-happy-strings-of-length-n",
    leetcodeUrl:
      "https://leetcode.com/problems/the-k-th-lexicographical-string-of-all-happy-strings-of-length-n",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-letter-combinations-of-a-phone-number",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Letter Combinations of a Phone Number",
    leetcodeSlug: "letter-combinations-of-a-phone-number",
    leetcodeUrl:
      "https://leetcode.com/problems/letter-combinations-of-a-phone-number",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-combination-sum",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Combination Sum",
    leetcodeSlug: "combination-sum",
    leetcodeUrl: "https://leetcode.com/problems/combination-sum",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-combination-sum-iii",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Combination Sum III",
    leetcodeSlug: "combination-sum-iii",
    leetcodeUrl: "https://leetcode.com/problems/combination-sum-iii",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-combination-sum-ii",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Combination Sum II",
    leetcodeSlug: "combination-sum-ii",
    leetcodeUrl: "https://leetcode.com/problems/combination-sum-ii",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-subsets",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Subsets",
    leetcodeSlug: "subsets",
    leetcodeUrl: "https://leetcode.com/problems/subsets",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-subsets-ii",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Subsets II",
    leetcodeSlug: "subsets-ii",
    leetcodeUrl: "https://leetcode.com/problems/subsets-ii",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-letter-case-permutation",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Letter Case Permutation",
    leetcodeSlug: "letter-case-permutation",
    leetcodeUrl: "https://leetcode.com/problems/letter-case-permutation",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-permutations",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Permutations",
    leetcodeSlug: "permutations",
    leetcodeUrl: "https://leetcode.com/problems/permutations",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-permutations-ii",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Permutations II",
    leetcodeSlug: "permutations-ii",
    leetcodeUrl: "https://leetcode.com/problems/permutations-ii",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-beautiful-arrangement",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Beautiful Arrangement",
    leetcodeSlug: "beautiful-arrangement",
    leetcodeUrl: "https://leetcode.com/problems/beautiful-arrangement",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-palindrome-partitioning",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Palindrome Partitioning",
    leetcodeSlug: "palindrome-partitioning",
    leetcodeUrl: "https://leetcode.com/problems/palindrome-partitioning",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-restore-ip-addresses",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Restore IP Addresses",
    leetcodeSlug: "restore-ip-addresses",
    leetcodeUrl: "https://leetcode.com/problems/restore-ip-addresses",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-additive-number",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Additive Number",
    leetcodeSlug: "additive-number",
    leetcodeUrl: "https://leetcode.com/problems/additive-number",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-expression-add-operators",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Expression Add Operators",
    leetcodeSlug: "expression-add-operators",
    leetcodeUrl: "https://leetcode.com/problems/expression-add-operators",
    difficulty: "HARD",
  },
  {
    id: "backtracking-leetcode-split-array-into-fibonacci-sequence",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Split Array into Fibonacci Sequence",
    leetcodeSlug: "split-array-into-fibonacci-sequence",
    leetcodeUrl:
      "https://leetcode.com/problems/split-array-into-fibonacci-sequence",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-word-break",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Word Break",
    leetcodeSlug: "word-break",
    leetcodeUrl: "https://leetcode.com/problems/word-break",
    difficulty: "MEDIUM",
  },
  {
    id: "backtracking-leetcode-word-break-ii",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Word Break II",
    leetcodeSlug: "word-break-ii",
    leetcodeUrl: "https://leetcode.com/problems/word-break-ii",
    difficulty: "HARD",
  },
  {
    id: "backtracking-leetcode-construct-the-lexicographically-largest-valid-sequence",
    trackId: "recursion",
    subtopicId: "recursion-import",
    sourceType: "leetcode",
    order: 0,
    lessonLabel: "LC",
    title: "Construct the Lexicographically Largest Valid Sequence",
    leetcodeSlug: "construct-the-lexicographically-largest-valid-sequence",
    leetcodeUrl:
      "https://leetcode.com/problems/construct-the-lexicographically-largest-valid-sequence",
    difficulty: "MEDIUM",
  },
] as const satisfies readonly DsaQuestion[];

export function buildCuratedRecursionBacktrackingPracticeQuestions() {
  return recursionBacktrackingPracticeQuestions.map((question) => ({
    ...question,
  }));
}

export function buildRecursionDsaSeed(
  practiceQuestions: DsaQuestion[] = buildCuratedRecursionBacktrackingPracticeQuestions(),
) {
  const track = dsaTrackMetadataSchema.parse({
    id: RECURSION_TRACK_ID,
    title: "Recursion",
    sourceName: "Striver",
    playlistTitle: "Recursion (Basics to Advanced) and Backtracking Series",
    playlistUrl: RECURSION_BACKTRACKING_PLAYLIST_URL,
    order: 225,
    subtopics: recursionSubtopics.map((subtopic, index) => ({
      ...subtopic,
      order: index * 100,
    })),
  });
  const lessons = recursionLessons.map((lesson) =>
    recursionBacktrackingLessonQuestion(lesson, RECURSION_TRACK_ID, "R"),
  );
  const leetcodeQuestions = normalizeRecursionBacktrackingPracticeQuestions(
    practiceQuestions,
    RECURSION_TRACK_ID,
    lessons,
    recursionLeetcodeLessonBySlug,
  );

  return {
    track,
    questions: [...lessons, ...leetcodeQuestions],
    lessons,
    leetcodeQuestions,
  };
}

export function buildBacktrackingDsaSeed(
  practiceQuestions: DsaQuestion[] = buildCuratedRecursionBacktrackingPracticeQuestions(),
) {
  const track = dsaTrackMetadataSchema.parse({
    id: BACKTRACKING_TRACK_ID,
    title: "Backtracking",
    sourceName: "Striver",
    playlistTitle: "Recursion (Basics to Advanced) and Backtracking Series",
    playlistUrl: RECURSION_BACKTRACKING_PLAYLIST_URL,
    order: 250,
    subtopics: backtrackingSubtopics.map((subtopic, index) => ({
      ...subtopic,
      order: index * 100,
    })),
  });
  const lessons = backtrackingLessons.map((lesson) =>
    recursionBacktrackingLessonQuestion(lesson, BACKTRACKING_TRACK_ID, "BT"),
  );
  const leetcodeQuestions = normalizeRecursionBacktrackingPracticeQuestions(
    practiceQuestions,
    BACKTRACKING_TRACK_ID,
    lessons,
    backtrackingLeetcodeLessonBySlug,
  );

  return {
    track,
    questions: [...lessons, ...leetcodeQuestions],
    lessons,
    leetcodeQuestions,
  };
}

function recursionBacktrackingLessonQuestion(
  lesson: RecursionBacktrackingLessonSeed,
  trackId: typeof RECURSION_TRACK_ID | typeof BACKTRACKING_TRACK_ID,
  lessonLabelPrefix: "R" | "BT",
): DsaQuestion {
  return dsaQuestionSchema.parse({
    id: recursionBacktrackingLessonId(trackId, lesson),
    trackId,
    subtopicId: lesson.subtopicId,
    sourceType: "lesson",
    order: lesson.lessonNumber * 1000,
    lessonNumber: lesson.lessonNumber,
    lessonLabel: `${lessonLabelPrefix}${lesson.lessonNumber}`,
    title: lesson.title,
    videoId: lesson.videoId,
    videoUrl: `https://www.youtube.com/watch?v=${lesson.videoId}&list=${RECURSION_BACKTRACKING_PLAYLIST_ID}`,
    durationSeconds: DSA_VIDEO_DURATIONS_SECONDS[lesson.videoId],
  });
}

function normalizeRecursionBacktrackingPracticeQuestions(
  practiceQuestions: DsaQuestion[],
  trackId: typeof RECURSION_TRACK_ID | typeof BACKTRACKING_TRACK_ID,
  lessons: DsaQuestion[],
  lessonBySlug: Record<string, number>,
) {
  const lessonByNumber = new Map(
    lessons.map((lesson) => [lesson.lessonNumber ?? 0, lesson]),
  );
  const lessonOffsets = new Map<string, number>();
  const normalizedQuestions: DsaQuestion[] = [];

  for (const question of practiceQuestions) {
    if (question.sourceType !== "leetcode" || !question.leetcodeSlug) {
      continue;
    }

    const lessonNumber = lessonBySlug[question.leetcodeSlug];

    if (!lessonNumber) {
      continue;
    }

    const lesson = lessonByNumber.get(lessonNumber);

    if (!lesson) {
      continue;
    }

    const offset = (lessonOffsets.get(lesson.id) ?? 0) + 1;
    lessonOffsets.set(lesson.id, offset);
    normalizedQuestions.push(
      dsaQuestionSchema.parse({
        ...question,
        trackId,
        subtopicId: lesson.subtopicId,
        order: lesson.order + offset,
        lessonLabel: "LC",
        videoId: undefined,
        videoUrl: undefined,
        durationSeconds: undefined,
        affiliatedLessonId: lesson.id,
        affiliatedLessonLabel: lesson.lessonLabel,
      }),
    );
  }

  return normalizedQuestions;
}

function recursionBacktrackingLessonId(
  trackId: typeof RECURSION_TRACK_ID | typeof BACKTRACKING_TRACK_ID,
  lesson: RecursionBacktrackingLessonSeed,
) {
  const lessonNumber = String(lesson.lessonNumber).padStart(2, "0");
  const titleSlug = lesson.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return `${trackId}-l${lessonNumber}-${titleSlug || "lesson"}`;
}

const DYNAMIC_PROGRAMMING_TRACK_ID = "dynamic-programming";
const DYNAMIC_PROGRAMMING_PLAYLIST_ID = "PLgUwDviBIf0qUlt5H_kiKYaNSqJ81PMMY";
const DYNAMIC_PROGRAMMING_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${DYNAMIC_PROGRAMMING_PLAYLIST_ID}`;

type DynamicProgrammingLessonSeed = {
  subtopicId: string;
  lessonNumber: number;
  title: string;
  videoId: string;
};

const dynamicProgrammingSubtopics = [
  {
    id: "dp-1d-foundations",
    title: "1D DP Foundations",
    description:
      "Memoization, tabulation, space optimization, stairs, frog jump, house robber, and Ninja training.",
  },
  {
    id: "dp-grids",
    title: "DP on Grids",
    description:
      "Unique paths, obstacle grids, minimum path sums, triangle paths, falling paths, and cherry pickup.",
  },
  {
    id: "dp-subsequences",
    title: "DP on Subsequences",
    description:
      "Subset sum, partitions, knapsack, target sum, coin change, unbounded knapsack, and rod cutting.",
  },
  {
    id: "dp-strings",
    title: "DP on Strings",
    description:
      "LCS, common substrings, palindromic subsequences, supersequences, distinct subsequences, edit distance, and wildcard matching.",
  },
  {
    id: "dp-stocks",
    title: "DP on Stocks",
    description:
      "Buy and sell stock variants with multiple transactions, cooldown, and transaction fees.",
  },
  {
    id: "dp-lis",
    title: "LIS Patterns",
    description:
      "Longest increasing subsequence, binary search optimization, divisible subsets, string chains, bitonic subsequences, and LIS counts.",
  },
  {
    id: "dp-partition-rectangles",
    title: "Partition DP and Rectangles",
    description:
      "Matrix chain multiplication, stick cutting, burst balloons, boolean expressions, palindrome partitioning, array partitioning, and rectangle DP.",
  },
] as const;

const dynamicProgrammingLessons = [
  {
    subtopicId: "dp-1d-foundations",
    lessonNumber: 1,
    title:
      "Introduction to Dynamic Programming | Memoization | Tabulation | Space Optimization Techniques",
    videoId: "tyB0ztf0DNY",
  },
  {
    subtopicId: "dp-1d-foundations",
    lessonNumber: 2,
    title: "Climbing Stairs | Learn How to Write 1D Recurrence Relations",
    videoId: "mLfjzJsN8us",
  },
  {
    subtopicId: "dp-1d-foundations",
    lessonNumber: 3,
    title: "Frog Jump | Dynamic Programming | Learn to write 1D DP",
    videoId: "EgG3jsGoPvQ",
  },
  {
    subtopicId: "dp-1d-foundations",
    lessonNumber: 4,
    title: "Frog Jump with K Distance | Lecture 3 Follow Up Question",
    videoId: "Kmh3rhyEtB8",
  },
  {
    subtopicId: "dp-1d-foundations",
    lessonNumber: 5,
    title:
      "Maximum Sum of Non-Adjacent Elements | House Robber | 1-D | DP on Subsequences",
    videoId: "GrMBfJNk_NY",
  },
  {
    subtopicId: "dp-1d-foundations",
    lessonNumber: 6,
    title: "House Robber 2 | 1D DP | DP on Subsequences",
    videoId: "3WaxQMELSkw",
  },
  {
    subtopicId: "dp-1d-foundations",
    lessonNumber: 7,
    title:
      "Ninja's Training | MUST WATCH for 2D CONCEPTS | Vacation | Atcoder | 2D DP",
    videoId: "AE39gJYuRog",
  },
  {
    subtopicId: "dp-grids",
    lessonNumber: 8,
    title: "Grid Unique Paths | Learn Everything about DP on Grids",
    videoId: "sdE0A2Oxofw",
  },
  {
    subtopicId: "dp-grids",
    lessonNumber: 9,
    title: "Unique Paths 2 | DP on Grid with Maze Obstacles",
    videoId: "TmhpgXScLyY",
  },
  {
    subtopicId: "dp-grids",
    lessonNumber: 10,
    title:
      "Minimum Path Sum in Grid | Asked in Microsoft Internship Interview | DP on Grids",
    videoId: "_rgTlyky1uQ",
  },
  {
    subtopicId: "dp-grids",
    lessonNumber: 11,
    title:
      "Triangle | Fixed Starting Point and Variable Ending Point | DP on Grids",
    videoId: "SrP-PiLSYC0",
  },
  {
    subtopicId: "dp-grids",
    lessonNumber: 12,
    title:
      "Minimum/Maximum Falling Path Sum | Variable Starting and Ending Points | DP on Grids",
    videoId: "N_aJ5qQbYA0",
  },
  {
    subtopicId: "dp-grids",
    lessonNumber: 13,
    title: "Cherry Pickup II | 3D DP Made Easy | DP on Grids",
    videoId: "QGfn7JeXK54",
  },
  {
    subtopicId: "dp-subsequences",
    lessonNumber: 14,
    title:
      "Subset Sum Equals to Target | Identify DP on Subsequences and Ways to Solve them",
    videoId: "fWX9xDmIzRI",
  },
  {
    subtopicId: "dp-subsequences",
    lessonNumber: 15,
    title: "Partition Equal Subset Sum | DP on Subsequences",
    videoId: "7win3dcgo3k",
  },
  {
    subtopicId: "dp-subsequences",
    lessonNumber: 16,
    title:
      "Partition A Set Into Two Subsets With Minimum Absolute Sum Difference | DP on Subsequences",
    videoId: "GS_OqZb2CWc",
  },
  {
    subtopicId: "dp-subsequences",
    lessonNumber: 17,
    title: "Count Subsets with Sum K | DP on Subsequences",
    videoId: "ZHyb-A2Mte4",
  },
  {
    subtopicId: "dp-subsequences",
    lessonNumber: 18,
    title: "Count Partitions With Given Difference | DP on Subsequences",
    videoId: "zoilQD1kYSg",
  },
  {
    subtopicId: "dp-subsequences",
    lessonNumber: 19,
    title:
      "0/1 Knapsack | Recursion to Single Array Space Optimised Approach | DP on Subsequences",
    videoId: "GqOmJHQZivw",
  },
  {
    subtopicId: "dp-subsequences",
    lessonNumber: 20,
    title: "Minimum Coins | DP on Subsequences | Infinite Supplies Pattern",
    videoId: "myPeWb3Y68A",
  },
  {
    subtopicId: "dp-subsequences",
    lessonNumber: 21,
    title: "Target Sum | DP on Subsequences",
    videoId: "b3GD8263-PQ",
  },
  {
    subtopicId: "dp-subsequences",
    lessonNumber: 22,
    title: "Coin Change 2 | Infinite Supply Problems | DP on Subsequences",
    videoId: "HgyouUi11zk",
  },
  {
    subtopicId: "dp-subsequences",
    lessonNumber: 23,
    title: "Unbounded Knapsack | 1-D Array Space Optimised Approach",
    videoId: "OgvOZ6OrJoY",
  },
  {
    subtopicId: "dp-subsequences",
    lessonNumber: 24,
    title: "Rod Cutting Problem | 1D Array Space Optimised Approach",
    videoId: "mO8XpGoJwuo",
  },
  {
    subtopicId: "dp-strings",
    lessonNumber: 25,
    title:
      "Longest Common Subsequence | Top Down | Bottom-Up | Space Optimised | DP on Strings",
    videoId: "NPZn9jBrX8U",
  },
  {
    subtopicId: "dp-strings",
    lessonNumber: 26,
    title: "Print Longest Common Subsequence | DP on Strings",
    videoId: "-zI4mrF2Pb4",
  },
  {
    subtopicId: "dp-strings",
    lessonNumber: 27,
    title: "Longest Common Substring | DP on Strings",
    videoId: "_wP9mWNPL5w",
  },
  {
    subtopicId: "dp-strings",
    lessonNumber: 28,
    title: "Longest Palindromic Subsequence",
    videoId: "6i_T5kkfv4A",
  },
  {
    subtopicId: "dp-strings",
    lessonNumber: 29,
    title: "Minimum Insertions to Make String Palindrome",
    videoId: "xPBLEj41rFU",
  },
  {
    subtopicId: "dp-strings",
    lessonNumber: 30,
    title: "Minimum Insertions/Deletions to Convert String A to String B",
    videoId: "yMnH0jrir0Q",
  },
  {
    subtopicId: "dp-strings",
    lessonNumber: 31,
    title: "Shortest Common Supersequence | DP on Strings",
    videoId: "xElxAuBcvsU",
  },
  {
    subtopicId: "dp-strings",
    lessonNumber: 32,
    title: "Distinct Subsequences | 1D Array Optimisation Technique",
    videoId: "nVG7eTiD2bY",
  },
  {
    subtopicId: "dp-strings",
    lessonNumber: 33,
    title: "Edit Distance | Recursive to 1D Array Optimised Solution",
    videoId: "fJaKO8FbDdo",
  },
  {
    subtopicId: "dp-strings",
    lessonNumber: 34,
    title: "Wildcard Matching | Recursive to 1D Array Optimisation",
    videoId: "ZmlQ3vgAOMo",
  },
  {
    subtopicId: "dp-stocks",
    lessonNumber: 35,
    title: "Best Time to Buy and Sell Stock | DP on Stocks",
    videoId: "excAOvwF_Wk",
  },
  {
    subtopicId: "dp-stocks",
    lessonNumber: 36,
    title: "Buy and Sell Stock - II | Recursion to Space Optimisation",
    videoId: "nGJmxkUJQGs",
  },
  {
    subtopicId: "dp-stocks",
    lessonNumber: 37,
    title: "Buy and Sell Stocks III | Recursion to Space Optimisation",
    videoId: "-uQGzhYj8BQ",
  },
  {
    subtopicId: "dp-stocks",
    lessonNumber: 38,
    title: "Buy and Stock Sell IV | Recursion to Space Optimisation",
    videoId: "IV1dHbk5CDc",
  },
  {
    subtopicId: "dp-stocks",
    lessonNumber: 39,
    title:
      "Buy and Sell Stocks With Cooldown | Recursion to Space Optimisation",
    videoId: "IGIe46xw3YY",
  },
  {
    subtopicId: "dp-stocks",
    lessonNumber: 40,
    title:
      "Buy and Sell Stocks With Transaction Fee | Recursion to Space Optimisation",
    videoId: "k4eK-vEmnKg",
  },
  {
    subtopicId: "dp-lis",
    lessonNumber: 41,
    title: "Longest Increasing Subsequence | Memoization",
    videoId: "ekcwMsSIzVc",
  },
  {
    subtopicId: "dp-lis",
    lessonNumber: 42,
    title: "Printing Longest Increasing Subsequence | Tabulation | Algorithm",
    videoId: "IFfYfonAFGc",
  },
  {
    subtopicId: "dp-lis",
    lessonNumber: 43,
    title: "Longest Increasing Subsequence | Binary Search | Intuition",
    videoId: "on2hvxBXJH4",
  },
  {
    subtopicId: "dp-lis",
    lessonNumber: 44,
    title: "Largest Divisible Subset | Longest Increasing Subsequence",
    videoId: "gDuZwBW9VvM",
  },
  {
    subtopicId: "dp-lis",
    lessonNumber: 45,
    title: "Longest String Chain | Longest Increasing Subsequence | LIS",
    videoId: "YY8iBaYcc4g",
  },
  {
    subtopicId: "dp-lis",
    lessonNumber: 46,
    title: "Longest Bitonic Subsequence | LIS",
    videoId: "y4vN0WNdrlg",
  },
  {
    subtopicId: "dp-lis",
    lessonNumber: 47,
    title: "Number of Longest Increasing Subsequences",
    videoId: "cKVl1TFdNXg",
  },
  {
    subtopicId: "dp-partition-rectangles",
    lessonNumber: 48,
    title: "Matrix Chain Multiplication | MCM | Partition DP Starts",
    videoId: "vRVfmbCFW7Y",
  },
  {
    subtopicId: "dp-partition-rectangles",
    lessonNumber: 49,
    title: "Matrix Chain Multiplication | Bottom-Up | Tabulation",
    videoId: "pDCXsbAw5Cg",
  },
  {
    subtopicId: "dp-partition-rectangles",
    lessonNumber: 50,
    title: "Minimum Cost to Cut the Stick",
    videoId: "xwomavsC86c",
  },
  {
    subtopicId: "dp-partition-rectangles",
    lessonNumber: 51,
    title: "Burst Balloons | Partition DP | Interactive G-Meet Session Update",
    videoId: "Yz4LlDSlkns",
  },
  {
    subtopicId: "dp-partition-rectangles",
    lessonNumber: 52,
    title: "Evaluate Boolean Expression to True | Partition DP",
    videoId: "MM7fXopgyjw",
  },
  {
    subtopicId: "dp-partition-rectangles",
    lessonNumber: 53,
    title: "Palindrome Partitioning - II | Front Partition",
    videoId: "_H8V5hJUGd0",
  },
  {
    subtopicId: "dp-partition-rectangles",
    lessonNumber: 54,
    title: "Partition Array for Maximum Sum | Front Partition",
    videoId: "PhWWJmaKfMc",
  },
  {
    subtopicId: "dp-partition-rectangles",
    lessonNumber: 55,
    title: "Maximum Rectangle Area with all 1's | DP on Rectangles",
    videoId: "tOylVCugy9k",
  },
  {
    subtopicId: "dp-partition-rectangles",
    lessonNumber: 56,
    title: "Count Square Submatrices with All Ones | DP on Rectangles",
    videoId: "auS1fynpnjo",
  },
] as const satisfies readonly DynamicProgrammingLessonSeed[];

export function buildDynamicProgrammingDsaSeed(
  practiceQuestions: DsaQuestion[] = [],
) {
  const track = dsaTrackMetadataSchema.parse({
    id: DYNAMIC_PROGRAMMING_TRACK_ID,
    title: "Dynamic Programming",
    sourceName: "Striver",
    playlistTitle: "Dynamic Programming Playlist",
    playlistUrl: DYNAMIC_PROGRAMMING_PLAYLIST_URL,
    order: 300,
    subtopics: dynamicProgrammingSubtopics.map((subtopic, index) => ({
      ...subtopic,
      order: index * 100,
    })),
  });
  const lessons = dynamicProgrammingLessons.map((lesson) =>
    dynamicProgrammingLessonQuestion(lesson),
  );
  const leetcodeQuestions = normalizeDynamicProgrammingPracticeQuestions(
    practiceQuestions,
    lessons,
  );

  return {
    track,
    questions: [...lessons, ...leetcodeQuestions],
    lessons,
    leetcodeQuestions,
  };
}

function dynamicProgrammingLessonQuestion(
  lesson: DynamicProgrammingLessonSeed,
): DsaQuestion {
  return dsaQuestionSchema.parse({
    id: dynamicProgrammingLessonId(lesson),
    trackId: DYNAMIC_PROGRAMMING_TRACK_ID,
    subtopicId: lesson.subtopicId,
    sourceType: "lesson",
    order: lesson.lessonNumber * 1000,
    lessonNumber: lesson.lessonNumber,
    lessonLabel: `DP${lesson.lessonNumber}`,
    title: lesson.title,
    videoId: lesson.videoId,
    videoUrl: `https://www.youtube.com/watch?v=${lesson.videoId}&list=${DYNAMIC_PROGRAMMING_PLAYLIST_ID}`,
    durationSeconds: DSA_VIDEO_DURATIONS_SECONDS[lesson.videoId],
  });
}

function normalizeDynamicProgrammingPracticeQuestions(
  practiceQuestions: DsaQuestion[],
  lessons: DsaQuestion[],
) {
  const lessonByNumber = new Map(
    lessons.map((lesson) => [lesson.lessonNumber ?? 0, lesson]),
  );
  const lessonOffsets = new Map<string, number>();
  const normalizedQuestions: DsaQuestion[] = [];

  for (const question of practiceQuestions) {
    if (
      question.trackId !== DYNAMIC_PROGRAMMING_TRACK_ID ||
      question.sourceType !== "leetcode"
    ) {
      continue;
    }

    const lessonNumber =
      dynamicProgrammingLessonNumberFromId(question.affiliatedLessonId) ??
      Math.floor(question.order / 1000);
    const lesson = lessonByNumber.get(lessonNumber);

    if (!lesson) {
      continue;
    }

    const offset = (lessonOffsets.get(lesson.id) ?? 0) + 1;
    lessonOffsets.set(lesson.id, offset);
    normalizedQuestions.push(
      dsaQuestionSchema.parse({
        ...question,
        trackId: DYNAMIC_PROGRAMMING_TRACK_ID,
        subtopicId: lesson.subtopicId,
        order: lesson.order + offset,
        lessonLabel: "LC",
        affiliatedLessonId: lesson.id,
        affiliatedLessonLabel: lesson.lessonLabel,
      }),
    );
  }

  return normalizedQuestions;
}

function dynamicProgrammingLessonId(lesson: DynamicProgrammingLessonSeed) {
  const lessonNumber = String(lesson.lessonNumber).padStart(2, "0");
  const titleSlug = lesson.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);

  return `dp-l${lessonNumber}-${titleSlug || "lesson"}`;
}

function dynamicProgrammingLessonNumberFromId(lessonId: string | undefined) {
  const match = lessonId?.match(/^dp-l(\d+)/);

  return match ? Number.parseInt(match[1] ?? "", 10) : undefined;
}

const GRAPH_TRACK_ID = "graph";
const GRAPH_PLAYLIST_ID = "PLgUwDviBIf0oE3gA41TKO2H5bHpPd7fzn";
const GRAPH_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${GRAPH_PLAYLIST_ID}`;

type GraphLessonSeed = {
  id: string;
  subtopicId: string;
  lessonNumber: number;
  title: string;
  videoId: string;
};

type GraphQuestionDocument = {
  question?: {
    title?: string;
    slug?: string;
    difficulty?: string;
    leetcode_link?: string;
  };
};

const graphSubtopics = [
  {
    id: "graph-foundations",
    title: "Foundations",
    description:
      "Graph conventions, representations, connected components, BFS, and DFS.",
  },
  {
    id: "graph-bfs-dfs-matrix",
    title: "BFS, DFS, and Grids",
    description:
      "Traversal-driven graph and matrix problems, cycle detection, and bipartite checks.",
  },
  {
    id: "graph-directed-topo",
    title: "Directed Graphs and Topological Sort",
    description:
      "Directed cycles, safe states, Kahn's algorithm, prerequisites, and alien dictionary.",
  },
  {
    id: "graph-shortest-paths",
    title: "Shortest Paths",
    description:
      "DAG shortest paths, word ladder, Dijkstra, Bellman-Ford, and Floyd-Warshall.",
  },
  {
    id: "graph-mst-dsu",
    title: "MST and DSU",
    description:
      "Minimum spanning trees, disjoint set union, Kruskal, and DSU applications.",
  },
  {
    id: "graph-advanced-connectivity",
    title: "Advanced Connectivity",
    description:
      "Strongly connected components, bridges, and articulation points.",
  },
] as const;

const graphLessons = [
  {
    id: "graph-g01-introduction",
    subtopicId: "graph-foundations",
    lessonNumber: 1,
    title: "Introduction to Graph | Types | Different Conventions Used",
    videoId: "M3_pLsDdeuU",
  },
  {
    id: "graph-g02-representation-cpp",
    subtopicId: "graph-foundations",
    lessonNumber: 2,
    title: "Graph Representation in C++ | Two Ways to Represent",
    videoId: "3oI-34aPMWM",
  },
  {
    id: "graph-g03-representation-java",
    subtopicId: "graph-foundations",
    lessonNumber: 3,
    title: "Graph Representation in Java | Two Ways to Represent",
    videoId: "OsNklbh9gYI",
  },
  {
    id: "graph-g04-connected-components",
    subtopicId: "graph-foundations",
    lessonNumber: 4,
    title: "What are Connected Components?",
    videoId: "lea-Wl_uWXY",
  },
  {
    id: "graph-g05-bfs",
    subtopicId: "graph-foundations",
    lessonNumber: 5,
    title: "Breadth-First Search (BFS)",
    videoId: "-tgVpUgsQ5k",
  },
  {
    id: "graph-g06-dfs",
    subtopicId: "graph-foundations",
    lessonNumber: 6,
    title: "Depth-First Search (DFS)",
    videoId: "Qzf1a--rhp8",
  },
  {
    id: "graph-g07-number-of-provinces",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 7,
    title: "Number of Provinces",
    videoId: "ACzkVtewUYA",
  },
  {
    id: "graph-g08-number-of-islands",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 8,
    title: "Number of Islands",
    videoId: "muncqlKJrH0",
  },
  {
    id: "graph-g09-flood-fill",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 9,
    title: "Flood Fill Algorithm",
    videoId: "C-2_uSRli8o",
  },
  {
    id: "graph-g10-rotten-oranges",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 10,
    title: "Rotten Oranges",
    videoId: "yf3oUhkvqA0",
  },
  {
    id: "graph-g11-cycle-undirected-bfs",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 11,
    title: "Detect a Cycle in an Undirected Graph using BFS",
    videoId: "BPlrALf1LDU",
  },
  {
    id: "graph-g12-cycle-undirected-dfs",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 12,
    title: "Detect a Cycle in an Undirected Graph using DFS",
    videoId: "zQ3zgFypzX4",
  },
  {
    id: "graph-g13-01-matrix",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 13,
    title: "Distance of Nearest Cell Having 1 | 0/1 Matrix",
    videoId: "edXdVwkYHF8",
  },
  {
    id: "graph-g14-surrounded-regions",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 14,
    title: "Surrounded Regions | Replace O's with X's",
    videoId: "BtdgAys4yMk",
  },
  {
    id: "graph-g15-number-of-enclaves",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 15,
    title: "Number of Enclaves",
    videoId: "rxKcepXQgU4",
  },
  {
    id: "graph-g16-distinct-islands",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 16,
    title: "Number of Distinct Islands",
    videoId: "7zmgQSJghpo",
  },
  {
    id: "graph-g17-bipartite-bfs",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 17,
    title: "Bipartite Graph | BFS",
    videoId: "-vu34sct1g8",
  },
  {
    id: "graph-g18-bipartite-dfs",
    subtopicId: "graph-bfs-dfs-matrix",
    lessonNumber: 18,
    title: "Bipartite Graph | DFS",
    videoId: "KG5YFfR0j8A",
  },
  {
    id: "graph-g19-directed-cycle-dfs",
    subtopicId: "graph-directed-topo",
    lessonNumber: 19,
    title: "Detect Cycle in a Directed Graph using DFS",
    videoId: "9twcmtQj4DU",
  },
  {
    id: "graph-g20-eventual-safe-states-dfs",
    subtopicId: "graph-directed-topo",
    lessonNumber: 20,
    title: "Find Eventual Safe States - DFS",
    videoId: "uRbJ1OF9aYM",
  },
  {
    id: "graph-g21-topological-sort-dfs",
    subtopicId: "graph-directed-topo",
    lessonNumber: 21,
    title: "Topological Sort Algorithm | DFS",
    videoId: "5lZ0iJMrUMk",
  },
  {
    id: "graph-g22-kahns-algorithm",
    subtopicId: "graph-directed-topo",
    lessonNumber: 22,
    title: "Kahn's Algorithm | Topological Sort",
    videoId: "73sneFXuTEg",
  },
  {
    id: "graph-g23-directed-cycle-kahn",
    subtopicId: "graph-directed-topo",
    lessonNumber: 23,
    title: "Detect a Cycle in Directed Graph | Kahn's Algorithm",
    videoId: "iTBaI90lpDQ",
  },
  {
    id: "graph-g24-course-schedule",
    subtopicId: "graph-directed-topo",
    lessonNumber: 24,
    title: "Course Schedule I and II | Topological Sort",
    videoId: "WAOfKpxYHR8",
  },
  {
    id: "graph-g25-eventual-safe-states-bfs",
    subtopicId: "graph-directed-topo",
    lessonNumber: 25,
    title: "Find Eventual Safe States - BFS - Topological Sort",
    videoId: "2gtg3VsDGyc",
  },
  {
    id: "graph-g26-alien-dictionary",
    subtopicId: "graph-directed-topo",
    lessonNumber: 26,
    title: "Alien Dictionary - Topological Sort",
    videoId: "U3N_je7tWAs",
  },
  {
    id: "graph-g27-shortest-path-dag",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 27,
    title: "Shortest Path in Directed Acyclic Graph",
    videoId: "ZUFQfFaU-8U",
  },
  {
    id: "graph-g28-shortest-path-unit",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 28,
    title: "Shortest Path in Undirected Graph with Unit Weights",
    videoId: "C4gxoTaI71U",
  },
  {
    id: "graph-g29-word-ladder",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 29,
    title: "Word Ladder I",
    videoId: "tRPda0rcf8E",
  },
  {
    id: "graph-g30-word-ladder-ii",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 30,
    title: "Word Ladder II",
    videoId: "DREutrv2XD0",
  },
  {
    id: "graph-g31-word-ladder-ii-optimized",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 31,
    title: "Word Ladder II | Optimised Approach for LeetCode",
    videoId: "AD4SFl7tu7I",
  },
  {
    id: "graph-g32-dijkstra-priority-queue",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 32,
    title: "Dijkstra's Algorithm - Using Priority Queue",
    videoId: "V6H1qAeB-l4",
  },
  {
    id: "graph-g33-dijkstra-set",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 33,
    title: "Dijkstra's Algorithm - Using Set",
    videoId: "PATgNiuTP20",
  },
  {
    id: "graph-g34-dijkstra-intuition",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 34,
    title: "Dijkstra's Algorithm Intuition and Complexity",
    videoId: "3dINsjyfooY",
  },
  {
    id: "graph-g35-print-shortest-path",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 35,
    title: "Print Shortest Path - Dijkstra's Algorithm",
    videoId: "rp1SMw7HSO8",
  },
  {
    id: "graph-g36-shortest-distance-binary-maze",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 36,
    title: "Shortest Distance in a Binary Maze",
    videoId: "U5Mw4eyUmw4",
  },
  {
    id: "graph-g37-path-with-minimum-effort",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 37,
    title: "Path With Minimum Effort",
    videoId: "0ytpZyiZFhA",
  },
  {
    id: "graph-g38-cheapest-flights",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 38,
    title: "Cheapest Flights Within K Stops",
    videoId: "9XybHVqTHcQ",
  },
  {
    id: "graph-g39-minimum-multiplications",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 39,
    title: "Minimum Multiplications to Reach End",
    videoId: "_BvEJ3VIDWw",
  },
  {
    id: "graph-g40-number-of-ways",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 40,
    title: "Number of Ways to Arrive at Destination",
    videoId: "_-0mx0SmYxA",
  },
  {
    id: "graph-g41-bellman-ford",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 41,
    title: "Bellman Ford Algorithm",
    videoId: "0vVofAhAYjc",
  },
  {
    id: "graph-g42-floyd-warshall",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 42,
    title: "Floyd Warshall Algorithm",
    videoId: "YbY8cVwWAvw",
  },
  {
    id: "graph-g43-find-city-threshold",
    subtopicId: "graph-shortest-paths",
    lessonNumber: 43,
    title: "Find the City With the Smallest Number of Neighbours",
    videoId: "PwMVNSJ5SLI",
  },
  {
    id: "graph-g44-mst-theory",
    subtopicId: "graph-mst-dsu",
    lessonNumber: 44,
    title: "Minimum Spanning Tree - Theory",
    videoId: "ZSPjZuZWCME",
  },
  {
    id: "graph-g45-prims-algorithm",
    subtopicId: "graph-mst-dsu",
    lessonNumber: 45,
    title: "Prim's Algorithm - Minimum Spanning Tree",
    videoId: "mJcZjjKzeqk",
  },
  {
    id: "graph-g46-disjoint-set",
    subtopicId: "graph-mst-dsu",
    lessonNumber: 46,
    title: "Disjoint Set | Union by Rank and Size",
    videoId: "aBxjDBC4M1U",
  },
  {
    id: "graph-g47-kruskals-algorithm",
    subtopicId: "graph-mst-dsu",
    lessonNumber: 47,
    title: "Kruskal's Algorithm - Minimum Spanning Tree",
    videoId: "DMnDM_sxVig",
  },
  {
    id: "graph-g48-provinces-dsu",
    subtopicId: "graph-mst-dsu",
    lessonNumber: 48,
    title: "Number of Provinces - Disjoint Set",
    videoId: "ZGr5nX-Gi6Y",
  },
  {
    id: "graph-g49-network-connected-dsu",
    subtopicId: "graph-mst-dsu",
    lessonNumber: 49,
    title: "Number of Operations to Make Network Connected",
    videoId: "FYrl7iz9_ZU",
  },
  {
    id: "graph-g50-accounts-merge",
    subtopicId: "graph-mst-dsu",
    lessonNumber: 50,
    title: "Accounts Merge",
    videoId: "FMwpt_aQOGw",
  },
  {
    id: "graph-g51-number-of-islands-ii",
    subtopicId: "graph-mst-dsu",
    lessonNumber: 51,
    title: "Number of Islands II - Online Queries",
    videoId: "Rn6B-Q4SNyA",
  },
  {
    id: "graph-g52-making-large-island",
    subtopicId: "graph-mst-dsu",
    lessonNumber: 52,
    title: "Making a Large Island",
    videoId: "lgiz0Oup6gM",
  },
  {
    id: "graph-g53-most-stones-removed",
    subtopicId: "graph-mst-dsu",
    lessonNumber: 53,
    title: "Most Stones Removed with Same Row or Column",
    videoId: "OwMNX8SPavM",
  },
  {
    id: "graph-g54-kosaraju",
    subtopicId: "graph-advanced-connectivity",
    lessonNumber: 54,
    title: "Strongly Connected Components - Kosaraju's Algorithm",
    videoId: "R6uoSjZ2imo",
  },
  {
    id: "graph-g55-bridges",
    subtopicId: "graph-advanced-connectivity",
    lessonNumber: 55,
    title: "Bridges in Graph - Tarjan's Algorithm",
    videoId: "qrAub5z8FeA",
  },
  {
    id: "graph-g56-articulation-point",
    subtopicId: "graph-advanced-connectivity",
    lessonNumber: 56,
    title: "Articulation Point in Graph",
    videoId: "j1QDfU21iZk",
  },
] as const satisfies readonly GraphLessonSeed[];

const graphLessonById = new Map(
  graphLessons.map((lesson) => [lesson.id, lesson]),
);

const curatedGraphLeetcodeQuestions = [
  {
    slug: "find-if-path-exists-in-graph",
    lessonId: "graph-g04-connected-components",
  },
  { slug: "clone-graph", lessonId: "graph-g06-dfs" },
  { slug: "graph-valid-tree", lessonId: "graph-g11-cycle-undirected-bfs" },
  { slug: "number-of-provinces", lessonId: "graph-g07-number-of-provinces" },
  { slug: "number-of-islands", lessonId: "graph-g08-number-of-islands" },
  { slug: "max-area-of-island", lessonId: "graph-g08-number-of-islands" },
  { slug: "flood-fill", lessonId: "graph-g09-flood-fill" },
  { slug: "rotting-oranges", lessonId: "graph-g10-rotten-oranges" },
  { slug: "01-matrix", lessonId: "graph-g13-01-matrix" },
  { slug: "surrounded-regions", lessonId: "graph-g14-surrounded-regions" },
  { slug: "number-of-enclaves", lessonId: "graph-g15-number-of-enclaves" },
  { slug: "shortest-bridge", lessonId: "graph-g15-number-of-enclaves" },
  {
    slug: "number-of-distinct-islands",
    lessonId: "graph-g16-distinct-islands",
  },
  {
    slug: "pacific-atlantic-water-flow",
    lessonId: "graph-g16-distinct-islands",
  },
  { slug: "is-graph-bipartite", lessonId: "graph-g17-bipartite-bfs" },
  { slug: "possible-bipartition", lessonId: "graph-g17-bipartite-bfs" },
  { slug: "redundant-connection", lessonId: "graph-g11-cycle-undirected-bfs" },
  {
    slug: "find-eventual-safe-states",
    lessonId: "graph-g20-eventual-safe-states-dfs",
  },
  { slug: "course-schedule", lessonId: "graph-g24-course-schedule" },
  { slug: "course-schedule-ii", lessonId: "graph-g24-course-schedule" },
  { slug: "parallel-courses", lessonId: "graph-g24-course-schedule" },
  { slug: "alien-dictionary", lessonId: "graph-g26-alien-dictionary" },
  {
    slug: "minimum-number-of-vertices-to-reach-all-nodes",
    lessonId: "graph-g21-topological-sort-dfs",
  },
  {
    slug: "all-paths-from-source-to-target",
    lessonId: "graph-g27-shortest-path-dag",
  },
  {
    slug: "largest-color-value-in-a-directed-graph",
    lessonId: "graph-g21-topological-sort-dfs",
  },
  {
    slug: "shortest-path-with-alternating-colors",
    lessonId: "graph-g28-shortest-path-unit",
  },
  { slug: "open-the-lock", lessonId: "graph-g28-shortest-path-unit" },
  {
    slug: "minimum-genetic-mutation",
    lessonId: "graph-g28-shortest-path-unit",
  },
  { slug: "bus-routes", lessonId: "graph-g28-shortest-path-unit" },
  { slug: "word-ladder", lessonId: "graph-g29-word-ladder" },
  { slug: "word-ladder-ii", lessonId: "graph-g30-word-ladder-ii" },
  { slug: "network-delay-time", lessonId: "graph-g32-dijkstra-priority-queue" },
  { slug: "the-maze", lessonId: "graph-g36-shortest-distance-binary-maze" },
  { slug: "the-maze-ii", lessonId: "graph-g36-shortest-distance-binary-maze" },
  { slug: "the-maze-iii", lessonId: "graph-g36-shortest-distance-binary-maze" },
  {
    slug: "shortest-path-in-binary-matrix",
    lessonId: "graph-g36-shortest-distance-binary-maze",
  },
  {
    slug: "path-with-minimum-effort",
    lessonId: "graph-g37-path-with-minimum-effort",
  },
  {
    slug: "swim-in-rising-water",
    lessonId: "graph-g37-path-with-minimum-effort",
  },
  {
    slug: "cheapest-flights-within-k-stops",
    lessonId: "graph-g38-cheapest-flights",
  },
  {
    slug: "number-of-ways-to-arrive-at-destination",
    lessonId: "graph-g40-number-of-ways",
  },
  {
    slug: "find-the-city-with-the-smallest-number-of-neighbors-at-a-threshold-distance",
    lessonId: "graph-g43-find-city-threshold",
  },
  {
    slug: "min-cost-to-connect-all-points",
    lessonId: "graph-g45-prims-algorithm",
  },
  {
    slug: "connecting-cities-with-minimum-cost",
    lessonId: "graph-g47-kruskals-algorithm",
  },
  {
    slug: "find-critical-and-pseudo-critical-edges-in-minimum-spanning-tree",
    lessonId: "graph-g47-kruskals-algorithm",
  },
  {
    slug: "optimize-water-distribution-in-a-village",
    lessonId: "graph-g47-kruskals-algorithm",
  },
  {
    slug: "number-of-operations-to-make-network-connected",
    lessonId: "graph-g49-network-connected-dsu",
  },
  { slug: "accounts-merge", lessonId: "graph-g50-accounts-merge" },
  { slug: "number-of-islands-ii", lessonId: "graph-g51-number-of-islands-ii" },
  { slug: "making-a-large-island", lessonId: "graph-g52-making-large-island" },
  {
    slug: "most-stones-removed-with-same-row-or-column",
    lessonId: "graph-g53-most-stones-removed",
  },
  { slug: "redundant-connection-ii", lessonId: "graph-g46-disjoint-set" },
  {
    slug: "satisfiability-of-equality-equations",
    lessonId: "graph-g46-disjoint-set",
  },
  { slug: "regions-cut-by-slashes", lessonId: "graph-g46-disjoint-set" },
  { slug: "critical-connections-in-a-network", lessonId: "graph-g55-bridges" },
] as const;

export function buildGraphDsaSeed(documents: GraphQuestionDocument[]) {
  const track = dsaTrackMetadataSchema.parse({
    id: GRAPH_TRACK_ID,
    title: "Graph",
    sourceName: "take U forward",
    playlistTitle: "Graph Series",
    playlistUrl: GRAPH_PLAYLIST_URL,
    order: 400,
    subtopics: graphSubtopics.map((subtopic, index) => ({
      ...subtopic,
      order: index * 100,
    })),
  });
  const lessons = graphLessons.map((lesson) => graphLessonQuestion(lesson));
  const documentBySlug = new Map(
    documents.map((document) => [document.question?.slug?.trim(), document]),
  );
  const lessonOffsets = new Map<string, number>();
  const graphLeetcodeQuestions: DsaQuestion[] = [];

  for (const item of curatedGraphLeetcodeQuestions) {
    const document = documentBySlug.get(item.slug);
    const lesson = graphLessonById.get(item.lessonId);

    if (!document) {
      throw new Error(`Missing curated Graph LeetCode question: ${item.slug}`);
    }

    if (!lesson) {
      throw new Error(`Missing curated Graph lesson: ${item.lessonId}`);
    }

    const offset = (lessonOffsets.get(lesson.id) ?? 0) + 1;
    lessonOffsets.set(lesson.id, offset);
    graphLeetcodeQuestions.push(
      graphLeetcodeQuestion(document, lesson, offset),
    );
  }

  return {
    track,
    questions: [...lessons, ...graphLeetcodeQuestions],
    lessons,
    leetcodeQuestions: graphLeetcodeQuestions,
  };
}

function graphLessonQuestion(lesson: GraphLessonSeed): DsaQuestion {
  return dsaQuestionSchema.parse({
    id: lesson.id,
    trackId: GRAPH_TRACK_ID,
    subtopicId: lesson.subtopicId,
    sourceType: "lesson",
    order: lesson.lessonNumber * 1000,
    lessonNumber: lesson.lessonNumber,
    lessonLabel: `G${lesson.lessonNumber}`,
    title: lesson.title,
    videoId: lesson.videoId,
    videoUrl: `https://www.youtube.com/watch?v=${lesson.videoId}&list=${GRAPH_PLAYLIST_ID}`,
    durationSeconds: DSA_VIDEO_DURATIONS_SECONDS[lesson.videoId],
  });
}

function graphLeetcodeQuestion(
  document: GraphQuestionDocument,
  lesson: GraphLessonSeed,
  offset: number,
): DsaQuestion {
  const slug = graphQuestionSlug(document);

  return dsaQuestionSchema.parse({
    id: `${GRAPH_TRACK_ID}-leetcode-${slug}`,
    trackId: GRAPH_TRACK_ID,
    subtopicId: lesson.subtopicId,
    sourceType: "leetcode",
    order: lesson.lessonNumber * 1000 + offset,
    lessonLabel: "LC",
    title: graphCleanTitle(graphQuestionTitle(document)),
    leetcodeSlug: slug,
    leetcodeUrl: graphQuestionLeetcodeUrl(document),
    difficulty: graphQuestionDifficulty(document),
    affiliatedLessonId: lesson.id,
    affiliatedLessonLabel: `G${lesson.lessonNumber}`,
  });
}

function graphQuestionTitle(document: GraphQuestionDocument) {
  return document.question?.title?.trim() || "Untitled Graph Question";
}

function graphQuestionSlug(document: GraphQuestionDocument) {
  const slug = document.question?.slug?.trim();

  if (!slug) {
    throw new Error(
      `Graph question is missing slug: ${graphQuestionTitle(document)}`,
    );
  }

  return slug;
}

function graphQuestionDifficulty(document: GraphQuestionDocument) {
  const difficulty = document.question?.difficulty?.toUpperCase();

  if (
    difficulty !== "EASY" &&
    difficulty !== "MEDIUM" &&
    difficulty !== "HARD"
  ) {
    throw new Error(
      `Graph question has invalid difficulty: ${graphQuestionTitle(document)}`,
    );
  }

  return difficulty;
}

function graphQuestionLeetcodeUrl(document: GraphQuestionDocument) {
  const url = document.question?.leetcode_link?.trim();

  return url || `https://leetcode.com/problems/${graphQuestionSlug(document)}`;
}

function graphCleanTitle(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export type { GraphQuestionDocument };

export function buildCuratedDsaQuestionDocuments(): Array<
  HeapQuestionDocument & GraphQuestionDocument
> {
  const slugs = [
    ...curatedHeapLeetcodeQuestions.map((item) => item.slug),
    ...curatedGraphLeetcodeQuestions.map((item) => item.slug),
  ];

  return slugs.map((slug) => ({
    question: {
      title: titleFromSlug(slug),
      slug,
      difficulty: "MEDIUM",
      leetcode_link: `https://leetcode.com/problems/${slug}`,
    },
  }));
}

function titleFromSlug(slug: string) {
  return slug
    .split("-")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");
}
