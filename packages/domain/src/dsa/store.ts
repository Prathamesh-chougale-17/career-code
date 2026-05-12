import type { Collection, Document, UpdateFilter } from "mongodb";

import {
  DSA_QUESTIONS,
  STATIC_DSA_TRACKS,
  buildDsaCatalogFromTrackMetadata,
  dsaCatalogQuestionIds,
  dsaCatalogQuestionOrder,
} from "@career-code/domain/dsa/catalog";
import {
  dsaCatalogSchema,
  dsaQuestionSchema,
  dsaProgressUpdateResultSchema,
  dsaQuestionProgressSchema,
  dsaTrackMetadataSchema,
  dsaVideoWatchEventSchema,
  dsaSnapshotSchema,
  recordDsaVideoWatchInputSchema,
  updateDsaQuestionProgressInputSchema,
  type DsaCatalog,
  type DsaQuestion,
  type DsaQuestionProgress,
  type DsaVideoWatchEvent,
  type DsaTrackMetadata,
  type DsaSnapshot,
  type RecordDsaVideoWatchInput,
  type UpdateDsaQuestionProgressInput,
} from "@career-code/domain/dsa/schema";
import { getMongoDb, isMongoConfigured } from "@career-code/db";
import { SOLO_USER_ID } from "@career-code/domain/kanban/schema";

type DsaMemoryState = {
  tracks: DsaTrackMetadata[];
  questions: DsaQuestion[];
  progress: DsaQuestionProgress[];
  videoWatches: DsaVideoWatchEvent[];
};

type DsaCollections = {
  tracks: Collection<DsaTrackMetadata>;
  questions: Collection<DsaQuestion>;
  progress: Collection<DsaQuestionProgress>;
  videoWatches: Collection<DsaVideoWatchEvent>;
};

const globalForDsa = globalThis as typeof globalThis & {
  __careerCodeDsaMemoryState?: DsaMemoryState;
};

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function withoutMongoId<T extends Document>(doc: T): Omit<T, "_id"> {
  const { _id: _id, ...rest } = doc;
  void _id;
  return rest;
}

function getMemoryState(): DsaMemoryState {
  if (!globalForDsa.__careerCodeDsaMemoryState) {
    globalForDsa.__careerCodeDsaMemoryState = {
      tracks: STATIC_DSA_TRACKS,
      questions: DSA_QUESTIONS,
      progress: [],
      videoWatches: [],
    };
  }

  return globalForDsa.__careerCodeDsaMemoryState;
}

async function getCollections(): Promise<DsaCollections> {
  const db = await getMongoDb();

  return {
    tracks: db.collection<DsaTrackMetadata>("dsaTracks"),
    questions: db.collection<DsaQuestion>("dsaQuestions"),
    progress: db.collection<DsaQuestionProgress>("dsaQuestionProgress"),
    videoWatches: db.collection<DsaVideoWatchEvent>("dsaVideoWatchEvents"),
  };
}

function progressSort(
  a: DsaQuestionProgress,
  b: DsaQuestionProgress,
  questionOrder: Map<string, number>,
) {
  const aOrder = questionOrder.get(a.questionId) ?? Number.MAX_SAFE_INTEGER;
  const bOrder = questionOrder.get(b.questionId) ?? Number.MAX_SAFE_INTEGER;

  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }

  return a.questionId.localeCompare(b.questionId);
}

function normalizeProgressRows(
  rows: DsaQuestionProgress[],
  questionIds: Set<string>,
  questionOrder: Map<string, number>,
) {
  const latestByQuestionId = new Map<string, DsaQuestionProgress>();

  for (const row of rows) {
    if (!questionIds.has(row.questionId)) {
      continue;
    }

    const current = latestByQuestionId.get(row.questionId);

    if (!current || row.updatedAt.localeCompare(current.updatedAt) >= 0) {
      latestByQuestionId.set(row.questionId, dsaQuestionProgressSchema.parse(row));
    }
  }

  return Array.from(latestByQuestionId.values()).sort((a, b) =>
    progressSort(a, b, questionOrder),
  );
}

function buildDsaSnapshot(
  catalog: DsaCatalog,
  progressRows: DsaQuestionProgress[],
): DsaSnapshot {
  const questionIds = dsaCatalogQuestionIds(catalog);
  const progress = normalizeProgressRows(
    progressRows,
    questionIds,
    dsaCatalogQuestionOrder(catalog),
  );
  const completedQuestionIds = new Set(
    progress
      .filter((item) => item.completed)
      .map((item) => item.questionId)
      .filter((questionId) => questionIds.has(questionId)),
  );
  const totalQuestions = questionIds.size;
  const completedQuestions = completedQuestionIds.size;

  return dsaSnapshotSchema.parse({
    catalog,
    progress,
    summary: {
      totalQuestions,
      completedQuestions,
      completionPercentage:
        totalQuestions === 0
          ? 0
          : Math.round((completedQuestions / totalQuestions) * 100),
    },
  });
}

function findCatalogQuestion(catalog: DsaCatalog, questionId: string) {
  return catalog.tracks
    .flatMap((track) => track.subtopics)
    .flatMap((subtopic) => subtopic.questions)
    .find((question) => question.id === questionId);
}

async function seedDsaQuestionCatalog(collections: DsaCollections) {
  const nowValue = now();
  const staticTrackIds = STATIC_DSA_TRACKS.map((track) => track.id);
  const seedQuestionIds = DSA_QUESTIONS.map((question) => question.id);

  await collections.tracks.bulkWrite(
    STATIC_DSA_TRACKS.map((track) => ({
      updateOne: {
        filter: { id: track.id },
        update: { $set: track },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  await collections.questions.bulkWrite(
    DSA_QUESTIONS.map((question) => ({
      updateOne: {
        filter: { id: question.id },
        update: {
          $set: {
            ...question,
            seededAt: nowValue,
            updatedAt: nowValue,
          },
          $setOnInsert: {
            createdAt: nowValue,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  await collections.questions.deleteMany({
    trackId: { $in: staticTrackIds },
    id: { $nin: seedQuestionIds },
  });
}

export async function seedDsaQuestions() {
  if (!isMongoConfigured()) {
    const memory = getMemoryState();
    memory.tracks = STATIC_DSA_TRACKS;
    memory.questions = DSA_QUESTIONS;

    return {
      source: "memory",
      tracks: memory.tracks.length,
      questions: memory.questions.length,
    };
  }

  const collections = await getCollections();
  await seedDsaQuestionCatalog(collections);

  return {
    source: "mongodb",
    tracks: STATIC_DSA_TRACKS.length,
    questions: DSA_QUESTIONS.length,
  };
}

async function listDsaTrackMetadata(collections: DsaCollections) {
  const trackRows = await collections.tracks
    .find({})
    .sort({ order: 1, title: 1 })
    .toArray();

  return trackRows.map((row) =>
    dsaTrackMetadataSchema.parse(withoutMongoId(row)),
  );
}

async function getDsaCatalog() {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const tracks = await listDsaTrackMetadata(collections);

    if (tracks.length === 0) {
      throw new Error(
        "DSA catalog metadata is not seeded in MongoDB. Run the DSA seed/import scripts before opening the DSA page.",
      );
    }

    const trackIds = tracks.map((track) => track.id);
    const rows = await collections.questions
      .find({
        trackId: { $in: trackIds },
      })
      .sort({ trackId: 1, subtopicId: 1, order: 1, title: 1 })
      .toArray();
    const questions = rows.map((row) =>
      dsaQuestionSchema.parse(withoutMongoId(row)),
    );

    if (questions.length === 0) {
      throw new Error(
        "DSA questions are not seeded in MongoDB. Run the DSA seed/import scripts before opening the DSA page.",
      );
    }

    return buildDsaCatalogFromTrackMetadata(tracks, questions);
  }

  const memory = getMemoryState();

  return dsaCatalogSchema.parse(
    buildDsaCatalogFromTrackMetadata(memory.tracks, memory.questions),
  );
}

export async function getDsaSnapshot(userId = SOLO_USER_ID) {
  const catalog = await getDsaCatalog();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const rows = await collections.progress.find({ userId }).toArray();

    return buildDsaSnapshot(
      catalog,
      rows.map((row) => dsaQuestionProgressSchema.parse(withoutMongoId(row))),
    );
  }

  return buildDsaSnapshot(
    catalog,
    getMemoryState().progress.filter((item) => item.userId === userId),
  );
}

export async function updateDsaQuestionProgress(
  input: UpdateDsaQuestionProgressInput,
  userId = SOLO_USER_ID,
) {
  const parsed = updateDsaQuestionProgressInputSchema.parse(input);
  const catalog = await getDsaCatalog();
  const questionIds = dsaCatalogQuestionIds(catalog);

  if (!questionIds.has(parsed.questionId)) {
    throw new Error(`Unknown DSA question: ${parsed.questionId}`);
  }

  const updatedAt = now();
  let progress: DsaQuestionProgress;

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const update: UpdateFilter<DsaQuestionProgress> = parsed.completed
      ? {
          $setOnInsert: {
            id: id("dsa-progress"),
            userId,
            questionId: parsed.questionId,
            createdAt: updatedAt,
          },
          $set: {
            completed: true,
            completedAt: updatedAt,
            updatedAt,
          },
        }
      : {
          $setOnInsert: {
            id: id("dsa-progress"),
            userId,
            questionId: parsed.questionId,
            createdAt: updatedAt,
          },
          $set: {
            completed: false,
            updatedAt,
          },
          $unset: {
            completedAt: "",
          },
        };
    const row = await collections.progress.findOneAndUpdate(
      { userId, questionId: parsed.questionId },
      update,
      { upsert: true, returnDocument: "after" },
    );

    if (!row) {
      throw new Error("Could not update DSA progress.");
    }

    progress = dsaQuestionProgressSchema.parse(withoutMongoId(row));
  } else {
    const memory = getMemoryState();
    const index = memory.progress.findIndex(
      (item) => item.userId === userId && item.questionId === parsed.questionId,
    );

    if (index === -1) {
      progress = dsaQuestionProgressSchema.parse({
        id: id("dsa-progress"),
        userId,
        questionId: parsed.questionId,
        completed: parsed.completed,
        completedAt: parsed.completed ? updatedAt : undefined,
        createdAt: updatedAt,
        updatedAt,
      });
      memory.progress.push(progress);
    } else {
      progress = dsaQuestionProgressSchema.parse({
        ...memory.progress[index],
        completed: parsed.completed,
        completedAt: parsed.completed ? updatedAt : undefined,
        updatedAt,
      });
      memory.progress[index] = progress;
    }
  }

  const snapshot = await getDsaSnapshot(userId);

  return dsaProgressUpdateResultSchema.parse({
    progress,
    snapshot,
  });
}

export async function recordDsaVideoWatch(
  input: RecordDsaVideoWatchInput,
  userId = SOLO_USER_ID,
) {
  const parsed = recordDsaVideoWatchInputSchema.parse(input);
  const catalog = await getDsaCatalog();
  const question = findCatalogQuestion(catalog, parsed.questionId);

  if (!question || question.sourceType !== "lesson" || !question.videoUrl) {
    throw new Error(`Unknown DSA video: ${parsed.questionId}`);
  }

  const watchedAt = now();
  const event = dsaVideoWatchEventSchema.parse({
    id: id("dsa-video-watch"),
    userId,
    questionId: parsed.questionId,
    watchedAt,
    createdAt: watchedAt,
  });

  if (isMongoConfigured()) {
    const collections = await getCollections();
    await collections.videoWatches.insertOne(event);
  } else {
    getMemoryState().videoWatches.push(event);
  }

  return event;
}

export async function listDsaVideoWatchEvents(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const rows = await collections.videoWatches
      .find({ userId })
      .sort({ watchedAt: -1 })
      .toArray();

    return rows.map((row) =>
      dsaVideoWatchEventSchema.parse(withoutMongoId(row)),
    );
  }

  return getMemoryState().videoWatches
    .filter((event) => event.userId === userId)
    .sort((a, b) => b.watchedAt.localeCompare(a.watchedAt))
    .map((event) => dsaVideoWatchEventSchema.parse(event));
}

export async function deleteDsaUserData(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const [progressResult, videoWatchesResult] = await Promise.all([
      collections.progress.deleteMany({ userId }),
      collections.videoWatches.deleteMany({ userId }),
    ]);

    return {
      dsaQuestionProgress: progressResult.deletedCount,
      dsaVideoWatchEvents: videoWatchesResult.deletedCount,
    };
  }

  const memory = getMemoryState();
  const count = memory.progress.filter((item) => item.userId === userId).length;
  const videoWatchCount = memory.videoWatches.filter(
    (event) => event.userId === userId,
  ).length;
  memory.progress = memory.progress.filter((item) => item.userId !== userId);
  memory.videoWatches = memory.videoWatches.filter(
    (event) => event.userId !== userId,
  );

  return {
    dsaQuestionProgress: count,
    dsaVideoWatchEvents: videoWatchCount,
  };
}
