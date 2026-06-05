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
    order: 300,
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
