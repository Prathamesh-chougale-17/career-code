import { Db, MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  __careerightMongoClientPromise?: Promise<MongoClient>;
  __careerightMongoIndexPromise?: Promise<void>;
};

type MongoRuntimeEnv = Record<string, string | undefined>;

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

export async function getMongoClient() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!globalForMongo.__careerightMongoClientPromise) {
    const client = new MongoClient(uri);
    globalForMongo.__careerightMongoClientPromise = client.connect();
  }

  return globalForMongo.__careerightMongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getMongoClient();
  const db = client.db(getMongoDatabaseName());

  if (!globalForMongo.__careerightMongoIndexPromise) {
    globalForMongo.__careerightMongoIndexPromise = ensureMongoIndexes(db).catch(
      (error) => {
        console.error("[mongodb] Could not ensure application indexes.", error);
      },
    );
  }

  await globalForMongo.__careerightMongoIndexPromise;

  return db;
}

export function getMongoDatabaseName(env: MongoRuntimeEnv = process.env) {
  return env.MONGODB_DB?.trim() || env.MONGODB_DB_NAME?.trim() || "careeright";
}

async function ensureMongoIndexes(db: Db) {
  await Promise.all([
    db
      .collection("boards")
      .createIndexes([{ key: { userId: 1, id: 1 }, unique: true }]),
    db.collection("columns").createIndexes([
      { key: { userId: 1, boardId: 1, id: 1 }, unique: true },
      { key: { userId: 1, boardId: 1, order: 1 } },
    ]),
    db.collection("tasks").createIndexes([
      { key: { userId: 1, boardId: 1, columnId: 1, order: 1 } },
      { key: { userId: 1, boardId: 1, taskNumber: 1 } },
      { key: { userId: 1, sourceProposalId: 1 } },
    ]),
    db.collection("aiProposals").createIndexes([
      { key: { userId: 1, status: 1, createdAt: -1 } },
      { key: { userId: 1, boardId: 1, deletedAt: 1, createdAt: -1 } },
    ]),
    db.collection("taskEvents").createIndexes([
      { key: { userId: 1, boardId: 1, createdAt: -1 } },
      { key: { userId: 1, taskId: 1, createdAt: -1 } },
    ]),
    db
      .collection("aiRuns")
      .createIndexes([{ key: { userId: 1, boardId: 1, createdAt: -1 } }]),
    db.collection("mcpTokens").createIndexes([
      { key: { tokenHash: 1 }, unique: true },
      { key: { userId: 1, createdAt: -1 } },
      { key: { userId: 1, revokedAt: 1 } },
    ]),
    db
      .collection("profileItems")
      .createIndexes([{ key: { userId: 1, type: 1, updatedAt: -1 } }]),
    db
      .collection("profileImports")
      .createIndexes([{ key: { userId: 1, status: 1, createdAt: -1 } }]),
    db.collection("profiles").createIndexes([{ key: { userId: 1 } }]),
    db.collection("jobs").createIndexes([
      { key: { userId: 1, deletedAt: 1, seededAt: -1 } },
      { key: { userId: 1, source: 1, sourceJobId: 1 } },
      { key: { userId: 1, applyUrl: 1 } },
    ]),
    db.collection("friendConnections").createIndexes([
      { key: { pairKey: 1 }, unique: true },
      { key: { requesterId: 1, status: 1, updatedAt: -1 } },
      { key: { recipientId: 1, status: 1, updatedAt: -1 } },
    ]),
    db.collection("jobShares").createIndexes([
      { key: { ownerId: 1, createdAt: -1 } },
      { key: { recipientId: 1, revokedAt: 1, createdAt: -1 } },
      { key: { ownerId: 1, recipientId: 1, createdAt: -1 } },
    ]),
    db.collection("jobShareItems").createIndexes([
      { key: { shareId: 1, createdAt: 1 } },
      { key: { recipientId: 1, createdAt: -1 } },
      { key: { ownerId: 1, createdAt: -1 } },
    ]),
    db.collection("projects").createIndexes([
      { key: { userId: 1, deletedAt: 1, updatedAt: -1 } },
      { key: { userId: 1, sourceProfileItemId: 1 } },
      { key: { userId: 1, status: 1, updatedAt: -1 } },
    ]),
    db.collection("projectNotes").createIndexes([
      { key: { userId: 1, projectId: 1, order: 1 } },
      { key: { userId: 1, id: 1 }, unique: true },
    ]),
    db.collection("dsaQuestionProgress").createIndexes([
      { key: { userId: 1, questionId: 1 }, unique: true },
    ]),
    db.collection("dsaVideoWatchEvents").createIndexes([
      { key: { userId: 1, watchedAt: -1 } },
      { key: { userId: 1, questionId: 1, watchedAt: -1 } },
    ]),
    db.collection("dsaTracks").createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { order: 1, title: 1 } },
    ]),
    db.collection("dsaQuestions").createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { trackId: 1, subtopicId: 1, order: 1 } },
      { key: { sourceType: 1, affiliatedLessonId: 1 } },
    ]),
    db.collection("systemDesignProgress").createIndexes([
      { key: { userId: 1, itemId: 1 }, unique: true },
    ]),
    db.collection("systemDesignVideoWatchEvents").createIndexes([
      { key: { userId: 1, watchedAt: -1 } },
      { key: { userId: 1, itemId: 1, watchedAt: -1 } },
    ]),
    db.collection("systemDesignTracks").createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { order: 1, title: 1 } },
    ]),
    db.collection("systemDesignItems").createIndexes([
      { key: { id: 1 }, unique: true },
      { key: { trackId: 1, moduleId: 1, order: 1 } },
      { key: { sourceType: 1 } },
    ]),
    db
      .collection("diaryDays")
      .createIndexes([{ key: { userId: 1, dateKey: -1 } }]),
    db
      .collection("counters")
      .createIndexes([{ key: { key: 1 }, unique: true }]),
  ]);
}
