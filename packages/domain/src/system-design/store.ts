import type { Collection, Document, UpdateFilter } from "mongodb";

import {
  STATIC_SYSTEM_DESIGN_TRACKS,
  SYSTEM_DESIGN_ITEMS,
  buildSystemDesignCatalogFromTrackMetadata,
  systemDesignCatalogItemIds,
  systemDesignCatalogItemOrder,
} from "@careeright/domain/system-design/catalog";
import {
  recordSystemDesignVideoWatchInputSchema,
  systemDesignCatalogSchema,
  systemDesignItemSchema,
  systemDesignProgressSchema,
  systemDesignProgressUpdateResultSchema,
  systemDesignSnapshotSchema,
  systemDesignTrackMetadataSchema,
  systemDesignVideoWatchEventSchema,
  updateSystemDesignItemProgressInputSchema,
  type RecordSystemDesignVideoWatchInput,
  type SystemDesignCatalog,
  type SystemDesignItem,
  type SystemDesignProgress,
  type SystemDesignSnapshot,
  type SystemDesignTrackMetadata,
  type SystemDesignVideoWatchEvent,
  type UpdateSystemDesignItemProgressInput,
} from "@careeright/domain/system-design/schema";
import { getMongoDb, isMongoConfigured } from "@careeright/db";
import { SOLO_USER_ID } from "@careeright/domain/kanban/schema";

type SystemDesignMemoryState = {
  tracks: SystemDesignTrackMetadata[];
  items: SystemDesignItem[];
  progress: SystemDesignProgress[];
  videoWatches: SystemDesignVideoWatchEvent[];
};

type SystemDesignCollections = {
  tracks: Collection<SystemDesignTrackMetadata>;
  items: Collection<SystemDesignItem>;
  progress: Collection<SystemDesignProgress>;
  videoWatches: Collection<SystemDesignVideoWatchEvent>;
};

const globalForSystemDesign = globalThis as typeof globalThis & {
  __careerightSystemDesignMemoryState?: SystemDesignMemoryState;
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

function getMemoryState(): SystemDesignMemoryState {
  if (!globalForSystemDesign.__careerightSystemDesignMemoryState) {
    globalForSystemDesign.__careerightSystemDesignMemoryState = {
      tracks: STATIC_SYSTEM_DESIGN_TRACKS,
      items: SYSTEM_DESIGN_ITEMS,
      progress: [],
      videoWatches: [],
    };
  }

  return globalForSystemDesign.__careerightSystemDesignMemoryState;
}

async function getCollections(): Promise<SystemDesignCollections> {
  const db = await getMongoDb();

  return {
    tracks: db.collection<SystemDesignTrackMetadata>("systemDesignTracks"),
    items: db.collection<SystemDesignItem>("systemDesignItems"),
    progress: db.collection<SystemDesignProgress>("systemDesignProgress"),
    videoWatches: db.collection<SystemDesignVideoWatchEvent>(
      "systemDesignVideoWatchEvents",
    ),
  };
}

function progressSort(
  a: SystemDesignProgress,
  b: SystemDesignProgress,
  itemOrder: Map<string, number>,
) {
  const aOrder = itemOrder.get(a.itemId) ?? Number.MAX_SAFE_INTEGER;
  const bOrder = itemOrder.get(b.itemId) ?? Number.MAX_SAFE_INTEGER;

  if (aOrder !== bOrder) {
    return aOrder - bOrder;
  }

  return a.itemId.localeCompare(b.itemId);
}

function normalizeProgressRows(
  rows: SystemDesignProgress[],
  itemIds: Set<string>,
  itemOrder: Map<string, number>,
) {
  const latestByItemId = new Map<string, SystemDesignProgress>();

  for (const row of rows) {
    if (!itemIds.has(row.itemId)) {
      continue;
    }

    const current = latestByItemId.get(row.itemId);

    if (!current || row.updatedAt.localeCompare(current.updatedAt) >= 0) {
      latestByItemId.set(row.itemId, systemDesignProgressSchema.parse(row));
    }
  }

  return Array.from(latestByItemId.values()).sort((a, b) =>
    progressSort(a, b, itemOrder),
  );
}

function buildSystemDesignSnapshot(
  catalog: SystemDesignCatalog,
  progressRows: SystemDesignProgress[],
  videoWatchRows: SystemDesignVideoWatchEvent[] = [],
): SystemDesignSnapshot {
  const itemIds = systemDesignCatalogItemIds(catalog);
  const progress = normalizeProgressRows(
    progressRows,
    itemIds,
    systemDesignCatalogItemOrder(catalog),
  );
  const completedItemIds = new Set(
    progress
      .filter((item) => item.completed)
      .map((item) => item.itemId)
      .filter((itemId) => itemIds.has(itemId)),
  );
  const items = catalog.tracks.flatMap((track) =>
    track.modules.flatMap((module) => module.items),
  );
  const videoWatches = videoWatchRows
    .filter((event) => itemIds.has(event.itemId))
    .map((event) => systemDesignVideoWatchEventSchema.parse(event))
    .sort((a, b) => b.watchedAt.localeCompare(a.watchedAt));
  const totalItems = itemIds.size;

  return systemDesignSnapshotSchema.parse({
    catalog,
    progress,
    videoWatches,
    summary: {
      totalItems,
      completedItems: completedItemIds.size,
      completionPercentage:
        totalItems === 0
          ? 0
          : Math.round((completedItemIds.size / totalItems) * 100),
      totalLessons: items.filter((item) => item.sourceType === "lesson").length,
      totalDrills: items.filter((item) => item.sourceType === "drill").length,
      watchedVideos: new Set(videoWatches.map((event) => event.itemId)).size,
    },
  });
}

function findCatalogItem(catalog: SystemDesignCatalog, itemId: string) {
  return catalog.tracks
    .flatMap((track) => track.modules)
    .flatMap((module) => module.items)
    .find((item) => item.id === itemId);
}

async function seedSystemDesignCatalogDocuments(
  collections: SystemDesignCollections,
) {
  const nowValue = now();
  const staticTrackIds = STATIC_SYSTEM_DESIGN_TRACKS.map((track) => track.id);
  const staticItemIds = SYSTEM_DESIGN_ITEMS.map((item) => item.id);

  await collections.tracks.bulkWrite(
    STATIC_SYSTEM_DESIGN_TRACKS.map((track) => ({
      updateOne: {
        filter: { id: track.id },
        update: { $set: track },
        upsert: true,
      },
    })),
    { ordered: false },
  );

  await collections.items.bulkWrite(
    SYSTEM_DESIGN_ITEMS.map((item) => ({
      updateOne: {
        filter: { id: item.id },
        update: {
          $set: {
            ...item,
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

  await collections.items.deleteMany({
    trackId: { $in: staticTrackIds },
    id: { $nin: staticItemIds },
  });
}

export async function seedSystemDesignCatalog() {
  if (!isMongoConfigured()) {
    const memory = getMemoryState();
    memory.tracks = STATIC_SYSTEM_DESIGN_TRACKS;
    memory.items = SYSTEM_DESIGN_ITEMS;

    return {
      source: "memory",
      tracks: memory.tracks.length,
      items: memory.items.length,
    };
  }

  const collections = await getCollections();
  await seedSystemDesignCatalogDocuments(collections);

  return {
    source: "mongodb",
    tracks: STATIC_SYSTEM_DESIGN_TRACKS.length,
    items: SYSTEM_DESIGN_ITEMS.length,
  };
}

async function listSystemDesignTrackMetadata(
  collections: SystemDesignCollections,
) {
  const trackRows = await collections.tracks
    .find({})
    .sort({ order: 1, title: 1 })
    .toArray();

  return trackRows.map((row) =>
    systemDesignTrackMetadataSchema.parse(withoutMongoId(row)),
  );
}

async function getSystemDesignCatalog() {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    await seedSystemDesignCatalogDocuments(collections);
    const tracks = await listSystemDesignTrackMetadata(collections);
    const trackIds = tracks.map((track) => track.id);
    const rows = await collections.items
      .find({
        trackId: { $in: trackIds },
      })
      .sort({ trackId: 1, moduleId: 1, order: 1, title: 1 })
      .toArray();
    const items = rows.map((row) =>
      systemDesignItemSchema.parse(withoutMongoId(row)),
    );

    return buildSystemDesignCatalogFromTrackMetadata(tracks, items);
  }

  const memory = getMemoryState();

  return systemDesignCatalogSchema.parse(
    buildSystemDesignCatalogFromTrackMetadata(memory.tracks, memory.items),
  );
}

export async function getSystemDesignSnapshot(userId = SOLO_USER_ID) {
  const catalog = await getSystemDesignCatalog();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const [progressRows, videoWatchRows] = await Promise.all([
      collections.progress.find({ userId }).toArray(),
      collections.videoWatches.find({ userId }).toArray(),
    ]);

    return buildSystemDesignSnapshot(
      catalog,
      progressRows.map((row) =>
        systemDesignProgressSchema.parse(withoutMongoId(row)),
      ),
      videoWatchRows.map((row) =>
        systemDesignVideoWatchEventSchema.parse(withoutMongoId(row)),
      ),
    );
  }

  return buildSystemDesignSnapshot(
    catalog,
    getMemoryState().progress.filter((item) => item.userId === userId),
    getMemoryState().videoWatches.filter((event) => event.userId === userId),
  );
}

export async function updateSystemDesignItemProgress(
  input: UpdateSystemDesignItemProgressInput,
  userId = SOLO_USER_ID,
) {
  const parsed = updateSystemDesignItemProgressInputSchema.parse(input);
  const catalog = await getSystemDesignCatalog();
  const itemIds = systemDesignCatalogItemIds(catalog);

  if (!itemIds.has(parsed.itemId)) {
    throw new Error(`Unknown System Design item: ${parsed.itemId}`);
  }

  const updatedAt = now();
  let progress: SystemDesignProgress;

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const update: UpdateFilter<SystemDesignProgress> = parsed.completed
      ? {
          $setOnInsert: {
            id: id("system-design-progress"),
            userId,
            itemId: parsed.itemId,
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
            id: id("system-design-progress"),
            userId,
            itemId: parsed.itemId,
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
      { userId, itemId: parsed.itemId },
      update,
      { upsert: true, returnDocument: "after" },
    );

    if (!row) {
      throw new Error("Could not update System Design progress.");
    }

    progress = systemDesignProgressSchema.parse(withoutMongoId(row));
  } else {
    const memory = getMemoryState();
    const index = memory.progress.findIndex(
      (item) => item.userId === userId && item.itemId === parsed.itemId,
    );

    if (index === -1) {
      progress = systemDesignProgressSchema.parse({
        id: id("system-design-progress"),
        userId,
        itemId: parsed.itemId,
        completed: parsed.completed,
        completedAt: parsed.completed ? updatedAt : undefined,
        createdAt: updatedAt,
        updatedAt,
      });
      memory.progress.push(progress);
    } else {
      progress = systemDesignProgressSchema.parse({
        ...memory.progress[index],
        completed: parsed.completed,
        completedAt: parsed.completed ? updatedAt : undefined,
        updatedAt,
      });
      memory.progress[index] = progress;
    }
  }

  const snapshot = await getSystemDesignSnapshot(userId);

  return systemDesignProgressUpdateResultSchema.parse({
    progress,
    snapshot,
  });
}

export async function recordSystemDesignVideoWatch(
  input: RecordSystemDesignVideoWatchInput,
  userId = SOLO_USER_ID,
) {
  const parsed = recordSystemDesignVideoWatchInputSchema.parse(input);
  const catalog = await getSystemDesignCatalog();
  const item = findCatalogItem(catalog, parsed.itemId);

  if (!item || item.sourceType !== "lesson" || !item.videoUrl) {
    throw new Error(`Unknown System Design video: ${parsed.itemId}`);
  }

  const watchedAt = now();
  const event = systemDesignVideoWatchEventSchema.parse({
    id: id("system-design-video-watch"),
    userId,
    itemId: parsed.itemId,
    watchedAt,
    createdAt: watchedAt,
  });

  if (isMongoConfigured()) {
    const collections = await getCollections();
    await collections.videoWatches.insertOne({ ...event });
  } else {
    getMemoryState().videoWatches.push(event);
  }

  return event;
}

export async function listSystemDesignVideoWatchEvents(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const rows = await collections.videoWatches
      .find({ userId })
      .sort({ watchedAt: -1 })
      .toArray();

    return rows.map((row) =>
      systemDesignVideoWatchEventSchema.parse(withoutMongoId(row)),
    );
  }

  return getMemoryState()
    .videoWatches.filter((event) => event.userId === userId)
    .sort((a, b) => b.watchedAt.localeCompare(a.watchedAt))
    .map((event) => systemDesignVideoWatchEventSchema.parse(event));
}

export async function deleteSystemDesignUserData(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const [progressResult, videoWatchesResult] = await Promise.all([
      collections.progress.deleteMany({ userId }),
      collections.videoWatches.deleteMany({ userId }),
    ]);

    return {
      systemDesignProgress: progressResult.deletedCount,
      systemDesignVideoWatchEvents: videoWatchesResult.deletedCount,
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
    systemDesignProgress: count,
    systemDesignVideoWatchEvents: videoWatchCount,
  };
}
