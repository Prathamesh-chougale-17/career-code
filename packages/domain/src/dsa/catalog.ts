import {
  dsaCatalogSchema,
  dsaTrackMetadataSchema,
  type DsaCatalog,
  type DsaQuestion,
  type DsaTrackMetadata,
} from "@careeright/domain/dsa/schema";
import { LINKED_LIST_LEETCODE_QUESTIONS } from "@careeright/domain/dsa/linked-list-leetcode";

const LINKED_LIST_TRACK_ID = "linked-list";
const LINKED_LIST_PLAYLIST_ID = "PLgUwDviBIf0rAuz8tVcM0AymmhTRsfaLU";
const LINKED_LIST_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${LINKED_LIST_PLAYLIST_ID}`;

type LessonInput = {
  id: string;
  lessonNumber: number;
  title: string;
  videoId: string;
};

type LeetcodeQuestionInput = {
  title: string;
  slug: string;
  leetcodeSlug?: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  subtopicId: string;
  affiliatedLessonId: string;
};

function videoUrl(videoId: string, playlistId: string) {
  return `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`;
}

function lessonQuestion(
  trackId: string,
  subtopicId: string,
  playlistId: string,
  { id, lessonNumber, title, videoId }: LessonInput,
): DsaQuestion {
  return {
    id,
    trackId,
    subtopicId,
    sourceType: "lesson",
    order: lessonNumber * 100,
    lessonNumber,
    lessonLabel: `L${lessonNumber}`,
    title,
    videoId,
    videoUrl: videoUrl(videoId, playlistId),
  };
}

function leetcodeUrl(slug: string) {
  return `https://leetcode.com/problems/${slug}`;
}

const linkedListSubtopics = [
  {
    id: "foundations",
    title: "Foundations",
    description: "Introductory singly linked list operations.",
    lessons: [
      {
        id: "linked-list-l01-introduction",
        lessonNumber: 1,
        title: "Introduction to LinkedList | Traversal | Length | Search an Element",
        videoId: "Nq7ok-OyEpg",
      },
      {
        id: "linked-list-l02-deletion-insertion",
        lessonNumber: 2,
        title: "Deletion and Insertion in LL | 8 Problems",
        videoId: "VaECK03Dz-g",
      },
    ],
  },
  {
    id: "dll-basics",
    title: "DLL Basics",
    description: "Doubly linked list operations and reversal.",
    lessons: [
      {
        id: "linked-list-l03-doubly-introduction",
        lessonNumber: 3,
        title: "Introduction to Doubly LinkedList | Insertions and Deletions",
        videoId: "0eKMU10uEDI",
      },
      {
        id: "linked-list-l04-reverse-dll",
        lessonNumber: 4,
        title: "Reverse a DLL | Multiple Approaches",
        videoId: "u3WUW2qe6ww",
      },
    ],
  },
  {
    id: "core-ll-problems",
    title: "Core LL Problems",
    description: "Classic singly linked list interview problems.",
    lessons: [
      {
        id: "linked-list-l05-add-two-numbers",
        lessonNumber: 5,
        title: "Add 2 numbers in LinkedList | Dummy Node Approach",
        videoId: "XmRrGzR6udg",
      },
      {
        id: "linked-list-l06-odd-even",
        lessonNumber: 6,
        title: "Odd Even Linked List | Multiple Approaches",
        videoId: "qf6qp7GzD5Q",
      },
      {
        id: "linked-list-l07-sort-012",
        lessonNumber: 7,
        title: "Sort a LinkedList of 0's, 1's and 2's | Multiple Approaches",
        videoId: "gRII7LhdJWc",
      },
      {
        id: "linked-list-l08-remove-nth-from-end",
        lessonNumber: 8,
        title: "Remove Nth Node from the end of the LinkedList | Multiple Approaches",
        videoId: "3kMKYQ2wNIU",
      },
      {
        id: "linked-list-l09-reverse-linked-list",
        lessonNumber: 9,
        title: "Reverse a LinkedList | Iterative and Recursive",
        videoId: "D2vI2DNJGd8",
      },
      {
        id: "linked-list-l10-palindrome",
        lessonNumber: 10,
        title: "Check if a LinkedList is Palindrome or Not | Multiple Approaches",
        videoId: "lRY_G-u_8jk",
      },
      {
        id: "linked-list-l11-add-one",
        lessonNumber: 11,
        title: "Add 1 to a number represented by LinkedList",
        videoId: "aXQWhbvT3w0",
      },
      {
        id: "linked-list-l12-intersection-y",
        lessonNumber: 12,
        title: "Find the intersection point of Y LinkedList",
        videoId: "0DYoPz2Tpt4",
      },
      {
        id: "linked-list-l13-middle",
        lessonNumber: 13,
        title: "Find the middle element of the LinkedList | Multiple Approaches",
        videoId: "7LjQ57RqgEc",
      },
    ],
  },
  {
    id: "cycle-loop",
    title: "Cycle and Loop",
    description: "Fast-slow pointer loop detection and loop operations.",
    lessons: [
      {
        id: "linked-list-l14-detect-cycle",
        lessonNumber: 14,
        title: "Detect a loop or cycle in LinkedList | With proof and Intuition",
        videoId: "wiOo4DC5GGA",
      },
      {
        id: "linked-list-l15-loop-length",
        lessonNumber: 15,
        title: "Find the length of the Loop in LinkedList",
        videoId: "I4g1qbkTPus",
      },
      {
        id: "linked-list-l16-delete-middle",
        lessonNumber: 16,
        title: "Delete the middle node of the LinkedList",
        videoId: "ePpV-_pfOeI",
      },
      {
        id: "linked-list-l17-cycle-start",
        lessonNumber: 17,
        title: "Find the starting point of the Loop/Cycle in LinkedList | Multiple Approaches",
        videoId: "2Kd0KKmmHFc",
      },
    ],
  },
  {
    id: "dll-problems",
    title: "DLL Problems",
    description: "Problem solving on doubly linked lists.",
    lessons: [
      {
        id: "linked-list-l18-delete-key-dll",
        lessonNumber: 18,
        title: "Delete all occurrences of a Key in DLL",
        videoId: "Mh0NH_SD92k",
      },
      {
        id: "linked-list-l19-pairs-sum-dll",
        lessonNumber: 19,
        title: "Find all Pairs with given Sum in DLL",
        videoId: "YitR4dQsddE",
      },
      {
        id: "linked-list-l20-remove-duplicates-dll",
        lessonNumber: 20,
        title: "Remove duplicates from sorted DLL",
        videoId: "YJKVTnOJXSY",
      },
    ],
  },
  {
    id: "advanced-patterns",
    title: "Advanced Patterns",
    description: "Reversal groups, merging, flattening, sorting, cloning, and design.",
    lessons: [
      {
        id: "linked-list-l21-reverse-k-group",
        lessonNumber: 21,
        title: "Reverse Nodes in K Group Size of LinkedList",
        videoId: "lIar1skcQYI",
      },
      {
        id: "linked-list-l22-rotate",
        lessonNumber: 22,
        title: "Rotate a LinkedList",
        videoId: "uT7YI7XbTY8",
      },
      {
        id: "linked-list-l23-merge-two-sorted",
        lessonNumber: 23,
        title: "Merge two sorted Linked Lists",
        videoId: "jXu-H7XuClE",
      },
      {
        id: "linked-list-l24-flatten",
        lessonNumber: 24,
        title: "Flattening a LinkedList | Multiple Approaches with Dry Run",
        videoId: "ykelywHJWLg",
      },
      {
        id: "linked-list-l25-merge-k-sorted",
        lessonNumber: 25,
        title: "Merge K Sorted Lists | Multiple Approaches",
        videoId: "1zktEppsdig",
      },
      {
        id: "linked-list-l26-sort-list",
        lessonNumber: 26,
        title: "Sort a Linked List | Merge Sort and Brute Force",
        videoId: "8ocB7a_c-Cc",
      },
      {
        id: "linked-list-l27-clone-random",
        lessonNumber: 27,
        title: "Clone a LinkedList with Next and Random Pointers | Copy List with Random Pointers",
        videoId: "q570bKdrnlw",
      },
      {
        id: "linked-list-l28-browser-history",
        lessonNumber: 28,
        title: "Design a Browser History | LinkedList Implementation",
        videoId: "mG3KLugbOdc",
      },
    ],
  },
] as const;

const linkedListLessonEntries = linkedListSubtopics.flatMap((subtopic) =>
  subtopic.lessons.map((lesson) => ({
    ...lesson,
    subtopicId: subtopic.id,
    lessonLabel: `L${lesson.lessonNumber}`,
  })),
);

const linkedListLessonNumberById = new Map<string, number>(
  linkedListLessonEntries.map((lesson) => [lesson.id, lesson.lessonNumber]),
);

const linkedListLessonLabelById = new Map<string, string>(
  linkedListLessonEntries.map((lesson) => [lesson.id, lesson.lessonLabel]),
);

function leetcodeQuestion(
  trackId: string,
  questionInput: LeetcodeQuestionInput,
  index: number,
  lessonNumberById: Map<string, number>,
  lessonLabelById: Map<string, string>,
): DsaQuestion {
  const affiliatedLessonNumber =
    lessonNumberById.get(questionInput.affiliatedLessonId) ?? 999;
  const leetcodeSlug = questionInput.leetcodeSlug ?? questionInput.slug;
  const questionId =
    trackId === LINKED_LIST_TRACK_ID
      ? `leetcode-${questionInput.slug}`
      : `${trackId}-leetcode-${questionInput.slug}`;

  return {
    id: questionId,
    trackId,
    subtopicId: questionInput.subtopicId,
    sourceType: "leetcode",
    order: affiliatedLessonNumber * 100 + index + 1,
    lessonLabel: "LC",
    title: questionInput.title,
    leetcodeSlug,
    leetcodeUrl: leetcodeUrl(leetcodeSlug),
    difficulty: questionInput.difficulty,
    affiliatedLessonId: questionInput.affiliatedLessonId,
    affiliatedLessonLabel: lessonLabelById.get(questionInput.affiliatedLessonId),
  };
}

function linkedListQuestionsForSubtopic(
  subtopic: (typeof linkedListSubtopics)[number],
) {
  const lessons = subtopic.lessons.map((lesson) =>
    lessonQuestion(
      LINKED_LIST_TRACK_ID,
      subtopic.id,
      LINKED_LIST_PLAYLIST_ID,
      lesson,
    ),
  );
  const leetcodeQuestions = LINKED_LIST_LEETCODE_QUESTIONS.map(
    (questionInput, index) =>
      leetcodeQuestion(
        LINKED_LIST_TRACK_ID,
        questionInput,
        index,
        linkedListLessonNumberById,
        linkedListLessonLabelById,
      ),
  ).filter((questionItem) => questionItem.subtopicId === subtopic.id);

  return [...lessons, ...leetcodeQuestions].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.title.localeCompare(b.title);
  });
}

export const DSA_CATALOG: DsaCatalog = dsaCatalogSchema.parse({
  tracks: [
    {
      id: LINKED_LIST_TRACK_ID,
      title: "Linked List",
      sourceName: "take U forward",
      playlistTitle: "Linked List | Beginner to Advanced for FAANG and PBC Interview Rounds",
      playlistUrl: LINKED_LIST_PLAYLIST_URL,
      subtopics: linkedListSubtopics.map((subtopic) => ({
        id: subtopic.id,
        title: subtopic.title,
        description: subtopic.description,
        questions: linkedListQuestionsForSubtopic(subtopic),
      })),
    },
  ],
});

export const DSA_QUESTIONS = DSA_CATALOG.tracks.flatMap((track) =>
  track.subtopics.flatMap((subtopic) => subtopic.questions),
);

export const DSA_QUESTION_IDS = new Set(
  DSA_QUESTIONS.map((question) => question.id),
);

export const DSA_QUESTION_ORDER = new Map(
  DSA_QUESTIONS.map((question, index) => [question.id, index]),
);

export const STATIC_DSA_TRACKS: DsaTrackMetadata[] = DSA_CATALOG.tracks.map(
  (track, trackIndex) =>
    dsaTrackMetadataSchema.parse({
      id: track.id,
      title: track.title,
      sourceName: track.sourceName,
      playlistTitle: track.playlistTitle,
      playlistUrl: track.playlistUrl,
      order: trackIndex * 100,
      subtopics: track.subtopics.map((subtopic, subtopicIndex) => ({
        id: subtopic.id,
        title: subtopic.title,
        description: subtopic.description,
        order: subtopicIndex * 100,
      })),
    }),
);

export function isKnownDsaQuestionId(questionId: string) {
  return DSA_QUESTION_IDS.has(questionId);
}

export function dsaCatalogQuestionIds(catalog: DsaCatalog) {
  return new Set(
    catalog.tracks.flatMap((track) =>
      track.subtopics.flatMap((subtopic) =>
        subtopic.questions.map((question) => question.id),
      ),
    ),
  );
}

export function dsaCatalogQuestionOrder(catalog: DsaCatalog) {
  return new Map(
    catalog.tracks.flatMap((track) =>
      track.subtopics.flatMap((subtopic) =>
        subtopic.questions.map((question) => question.id),
      ),
    ).map((questionId, index) => [questionId, index]),
  );
}

function dsaCatalogBucketKey(trackId: string, subtopicId: string) {
  return `${trackId}\u0000${subtopicId}`;
}

function sortDsaQuestions(questions: DsaQuestion[]) {
  return [...questions].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.title.localeCompare(b.title);
  });
}

export function buildDsaCatalogFromTrackMetadata(
  tracks: DsaTrackMetadata[],
  questions: DsaQuestion[],
) {
  const lessonLabelByQuestionId = new Map(
    questions
      .filter((question) => question.sourceType === "lesson")
      .map((question) => [question.id, question.lessonLabel]),
  );
  const questionsBySubtopic = new Map<string, DsaQuestion[]>();

  for (const questionInput of questions) {
    const questionItem = {
      ...questionInput,
      affiliatedLessonLabel:
        questionInput.affiliatedLessonLabel ??
        lessonLabelByQuestionId.get(questionInput.affiliatedLessonId ?? ""),
    };
    const key = dsaCatalogBucketKey(questionItem.trackId, questionItem.subtopicId);
    const currentQuestions =
      questionsBySubtopic.get(key) ?? [];

    questionsBySubtopic.set(key, [...currentQuestions, questionItem]);
  }

  return dsaCatalogSchema.parse({
    tracks: [...tracks]
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
      .map((track) => ({
        id: track.id,
        title: track.title,
        sourceName: track.sourceName,
        playlistTitle: track.playlistTitle,
        playlistUrl: track.playlistUrl,
        subtopics: [...track.subtopics]
          .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
          .map((subtopic) => ({
            id: subtopic.id,
            title: subtopic.title,
            description: subtopic.description,
            questions: sortDsaQuestions(
              questionsBySubtopic.get(
                dsaCatalogBucketKey(track.id, subtopic.id),
              ) ?? [],
            ),
          })),
      })),
  });
}

export function buildDsaCatalogFromQuestions(questions: DsaQuestion[]) {
  return buildDsaCatalogFromTrackMetadata(STATIC_DSA_TRACKS, questions);
}
