import type { Collection, Document } from "mongodb";

import { getMongoDb, isMongoConfigured } from "@careeright/db";
import { SOLO_USER_ID } from "@careeright/domain/kanban/schema";
import {
  deleteDiaryDayInputSchema,
  deleteDiaryDayResultSchema,
  diaryDayListSchema,
  diaryDayResultSchema,
  diaryDaySchema,
  getDiaryDayInputSchema,
  listRecentDiaryInputSchema,
  saveDiaryDayInputSchema,
  type DiaryDay,
  type DiaryInterval,
  type GetDiaryDayInput,
  type ListRecentDiaryInput,
  type ParsedSaveDiaryDayInput,
  type ParsedSaveDiaryIntervalInput,
  type SaveDiaryDayInput,
  type DeleteDiaryDayInput,
} from "@careeright/domain/diary/schema";

type DiaryMemoryState = {
  days: DiaryDay[];
};

type DiaryCollections = {
  days: Collection<DiaryDay>;
};

const globalForDiary = globalThis as typeof globalThis & {
  __careerightDiaryMemoryState?: DiaryMemoryState;
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

function getMemoryState(): DiaryMemoryState {
  if (!globalForDiary.__careerightDiaryMemoryState) {
    globalForDiary.__careerightDiaryMemoryState = {
      days: [],
    };
  }

  return globalForDiary.__careerightDiaryMemoryState;
}

async function getCollections(): Promise<DiaryCollections> {
  const db = await getMongoDb();

  return {
    days: db.collection<DiaryDay>("diaryDays"),
  };
}

function compareIntervals(a: DiaryInterval, b: DiaryInterval) {
  const startSort = a.startTime.localeCompare(b.startTime);

  if (startSort !== 0) {
    return startSort;
  }

  const endSort = a.endTime.localeCompare(b.endTime);

  if (endSort !== 0) {
    return endSort;
  }

  return a.createdAt.localeCompare(b.createdAt);
}

function sortIntervals(intervals: DiaryInterval[]) {
  return [...intervals].sort(compareIntervals);
}

function sortDays(days: DiaryDay[]) {
  return [...days].sort((a, b) => {
    const dateSort = b.dateKey.localeCompare(a.dateKey);

    if (dateSort !== 0) {
      return dateSort;
    }

    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

function createIntervalRecord(
  input: ParsedSaveDiaryIntervalInput,
  existing: DiaryInterval | undefined,
  updatedAt: string,
) {
  return {
    id: existing?.id ?? id("diary-interval"),
    startTime: input.startTime,
    endTime: input.endTime,
    title: input.title,
    notes: input.notes,
    summary: input.summary,
    createdAt: existing?.createdAt ?? updatedAt,
    updatedAt,
  } satisfies DiaryInterval;
}

function prepareIntervals(
  input: ParsedSaveDiaryDayInput,
  existing: DiaryDay | null,
  updatedAt: string,
) {
  const existingById = new Map(
    (existing?.intervals ?? []).map((interval) => [interval.id, interval]),
  );

  return sortIntervals(
    input.intervals.map((interval) =>
      createIntervalRecord(
        interval,
        interval.id ? existingById.get(interval.id) : undefined,
        updatedAt,
      ),
    ),
  );
}

function createDayRecord(
  input: ParsedSaveDiaryDayInput,
  userId: string,
  createdAt: string,
) {
  return diaryDaySchema.parse({
    id: id("diary-day"),
    userId,
    dateKey: input.dateKey,
    dailySummary: input.dailySummary,
    tomorrowFocus: input.tomorrowFocus,
    status: input.status,
    intervals: prepareIntervals(input, null, createdAt),
    createdAt,
    updatedAt: createdAt,
  });
}

function updateDayRecord(
  existing: DiaryDay,
  input: ParsedSaveDiaryDayInput,
  updatedAt: string,
) {
  return diaryDaySchema.parse({
    ...existing,
    dateKey: input.dateKey,
    dailySummary: input.dailySummary,
    tomorrowFocus: input.tomorrowFocus,
    status: input.status,
    intervals: prepareIntervals(input, existing, updatedAt),
    updatedAt,
  });
}

export async function getDiaryDay(
  input: GetDiaryDayInput,
  userId = SOLO_USER_ID,
) {
  const parsed = getDiaryDayInputSchema.parse(input);

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const day = await collections.days.findOne({
      userId,
      dateKey: parsed.dateKey,
    });

    return diaryDayResultSchema.parse(
      day ? diaryDaySchema.parse(withoutMongoId(day)) : null,
    );
  }

  const day =
    getMemoryState().days.find(
      (item) => item.userId === userId && item.dateKey === parsed.dateKey,
    ) ?? null;

  return diaryDayResultSchema.parse(day);
}

export async function listDiaryDays(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const days = await collections.days.find({ userId }).toArray();

    return diaryDayListSchema.parse(
      sortDays(days.map((day) => diaryDaySchema.parse(withoutMongoId(day)))),
    );
  }

  return diaryDayListSchema.parse(
    sortDays(getMemoryState().days.filter((day) => day.userId === userId)),
  );
}

export async function listRecentDiaryDays(
  input?: ListRecentDiaryInput,
  userId = SOLO_USER_ID,
) {
  const parsed = listRecentDiaryInputSchema.parse(input);

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const days = await collections.days
      .find({ userId })
      .sort({ dateKey: -1, updatedAt: -1 })
      .limit(parsed.limit)
      .toArray();

    return diaryDayListSchema.parse(
      sortDays(days.map((day) => diaryDaySchema.parse(withoutMongoId(day)))),
    );
  }

  return diaryDayListSchema.parse(
    sortDays(getMemoryState().days.filter((day) => day.userId === userId)).slice(
      0,
      parsed.limit,
    ),
  );
}

export async function saveDiaryDay(
  input: SaveDiaryDayInput,
  userId = SOLO_USER_ID,
) {
  const parsed = saveDiaryDayInputSchema.parse(input);
  const updatedAt = now();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const existingDoc = await collections.days.findOne({
      userId,
      dateKey: parsed.dateKey,
    });
    const existing = existingDoc
      ? diaryDaySchema.parse(withoutMongoId(existingDoc))
      : null;

    if (existing) {
      const updated = updateDayRecord(existing, parsed, updatedAt);

      await collections.days.updateOne(
        {
          id: existing.id,
          userId,
        },
        {
          $set: updated,
        },
      );

      return diaryDaySchema.parse(updated);
    }

    const created = createDayRecord(parsed, userId, updatedAt);

    await collections.days.insertOne({ ...created });
    return diaryDaySchema.parse(created);
  }

  const memory = getMemoryState();
  const existingIndex = memory.days.findIndex(
    (day) => day.userId === userId && day.dateKey === parsed.dateKey,
  );

  if (existingIndex !== -1) {
    const updated = updateDayRecord(
      memory.days[existingIndex],
      parsed,
      updatedAt,
    );

    memory.days[existingIndex] = updated;
    return diaryDaySchema.parse(updated);
  }

  const created = createDayRecord(parsed, userId, updatedAt);

  memory.days.push(created);
  return diaryDaySchema.parse(created);
}

export async function deleteDiaryDay(
  input: DeleteDiaryDayInput,
  userId = SOLO_USER_ID,
) {
  const parsed = deleteDiaryDayInputSchema.parse(input);

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const result = await collections.days.deleteOne({
      userId,
      dateKey: parsed.dateKey,
    });

    return deleteDiaryDayResultSchema.parse({
      deleted: result.deletedCount > 0,
    });
  }

  const memory = getMemoryState();
  const before = memory.days.length;

  memory.days = memory.days.filter(
    (day) => day.userId !== userId || day.dateKey !== parsed.dateKey,
  );

  return deleteDiaryDayResultSchema.parse({
    deleted: memory.days.length < before,
  });
}

export async function deleteDiaryUserData(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const days = await collections.days.deleteMany({ userId });

    return {
      diaryDays: days.deletedCount,
    };
  }

  const memory = getMemoryState();
  const count = memory.days.filter((day) => day.userId === userId).length;
  memory.days = memory.days.filter((day) => day.userId !== userId);

  return {
    diaryDays: count,
  };
}
