import { createHash, randomBytes } from "node:crypto";

import type { Collection, Document, Filter } from "mongodb";

import {
  createTaskBreakdown,
  type TaskBreakdownResult,
} from "@careeright/domain/ai/task-breakdown";
import { getMongoDb, isMongoConfigured } from "@careeright/db";
import { deleteDiaryUserData } from "@careeright/domain/diary/store";
import { deleteDsaUserData } from "@careeright/domain/dsa/store";
import { deleteJobUserData } from "@careeright/domain/jobs/store";
import {
  createDefaultBoard,
  createDefaultColumns,
} from "@careeright/domain/kanban/defaults";
import { deleteProfileUserData } from "@careeright/domain/profile/store";
import {
  type AiProposal,
  type AiRun,
  type Board,
  type BoardColumn,
  type BoardSnapshot,
  type CreateMcpTokenInput,
  type CreateTaskInput,
  type DashboardMetrics,
  DEFAULT_BOARD_ID,
  type KanbanTask,
  type McpConnection,
  type McpToken,
  type McpTokenView,
  type ProposalSource,
  type RevokeMcpTokenInput,
  type ReorderTaskInput,
  SOLO_USER_ID,
  type TaskEvent,
  type TaskReference,
  type TaskUpdatePatch,
  type UpdateTaskInput,
  createMcpTokenInputSchema,
  createTaskInputSchema,
  dashboardMetricsSchema,
  deleteTaskInputSchema,
  mcpTokenViewSchema,
  proposalActionInputSchema,
  proposalListSchema,
  proposeStartWorkInputSchema,
  proposeTaskBreakdownFromTasksInputSchema,
  proposeTaskDeleteInputSchema,
  proposeTaskUpdateInputSchema,
  reorderTaskInputSchema,
  revokeMcpTokenInputSchema,
  revertTaskToProposalInputSchema,
  snapshotSchema,
  startWorkPayloadSchema,
  taskBreakdownPayloadSchema,
  taskDeletePayloadSchema,
  taskReferenceSchema,
  taskUpdatePayloadSchema,
  updateTaskInputSchema,
} from "@careeright/domain/kanban/schema";

type TaskWithOptionalNumber = Omit<KanbanTask, "taskNumber"> & {
  taskNumber?: number;
};

type TaskBreakdownCreator = (prompt: string) => Promise<TaskBreakdownResult>;

type MemoryState = {
  boards: Board[];
  columns: BoardColumn[];
  tasks: KanbanTask[];
  proposals: AiProposal[];
  events: TaskEvent[];
  aiRuns: AiRun[];
  mcpConnections: McpConnection[];
  mcpTokens: McpToken[];
};

type Collections = {
  boards: Collection<Board>;
  columns: Collection<BoardColumn>;
  tasks: Collection<KanbanTask>;
  proposals: Collection<AiProposal>;
  events: Collection<TaskEvent>;
  aiRuns: Collection<AiRun>;
  mcpConnections: Collection<McpConnection>;
  mcpTokens: Collection<McpToken>;
  counters: Collection<Counter>;
};

const globalForKanban = globalThis as typeof globalThis & {
  __careerightMemoryState?: MemoryState;
};

type Counter = {
  key: string;
  userId: string;
  boardId: string;
  seq: number;
  updatedAt: string;
};

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function storageMode(): BoardSnapshot["storageMode"] {
  return isMongoConfigured() ? "mongodb" : "demo";
}

function withoutMongoId<T extends Document>(doc: T): Omit<T, "_id"> {
  const { _id: _id, ...rest } = doc;
  void _id;
  return rest;
}

function activeProposalFilter(
  boardId: string,
  userId: string,
): Filter<AiProposal> {
  return {
    boardId,
    userId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  };
}

function activeProposalByIdFilter(
  proposalId: string,
  userId: string,
): Filter<AiProposal> {
  return {
    id: proposalId,
    userId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  };
}

function isActiveProposal(proposal: AiProposal) {
  return !proposal.deletedAt;
}

function sortByOrder<T extends { order: number }>(items: T[]) {
  return [...items].sort((a, b) => a.order - b.order);
}

const legacySampleTaskIds = [
  "seed-map-ai-flow",
  "seed-connect-mcp-client",
  "seed-style-board",
] as const;

function hasValidTaskNumber(
  task: TaskWithOptionalNumber,
): task is KanbanTask {
  return Number.isInteger(task.taskNumber) && Number(task.taskNumber) > 0;
}

function compareTasksForNumberBackfill(
  a: TaskWithOptionalNumber,
  b: TaskWithOptionalNumber,
) {
  const createdAtOrder = a.createdAt.localeCompare(b.createdAt);

  if (createdAtOrder !== 0) {
    return createdAtOrder;
  }

  if (a.order !== b.order) {
    return a.order - b.order;
  }

  return a.id.localeCompare(b.id);
}

function assignMissingTaskNumbers(tasks: TaskWithOptionalNumber[]) {
  const usedNumbers = new Set(
    tasks.filter(hasValidTaskNumber).map((task) => task.taskNumber),
  );
  let nextNumber = 1;

  const missingNumberTasks = tasks
    .filter((task) => !hasValidTaskNumber(task))
    .sort(compareTasksForNumberBackfill);

  for (const task of missingNumberTasks) {
    while (usedNumbers.has(nextNumber)) {
      nextNumber += 1;
    }

    task.taskNumber = nextNumber;
    usedNumbers.add(nextNumber);
  }

  return tasks as KanbanTask[];
}

function ensureMemoryTaskNumbers(boardId?: string, userId = SOLO_USER_ID) {
  const memory = getMemoryState();
  const boardIds = boardId
    ? [boardId]
    : Array.from(
        new Set(
          memory.tasks
            .filter((task) => task.userId === userId)
            .map((task) => task.boardId),
        ),
      );

  for (const currentBoardId of boardIds) {
    assignMissingTaskNumbers(
      memory.tasks.filter(
        (task) => task.userId === userId && task.boardId === currentBoardId,
      ),
    );
  }
}

function getMemoryState(): MemoryState {
  if (!globalForKanban.__careerightMemoryState) {
    const createdAt = now();

    globalForKanban.__careerightMemoryState = {
      boards: [createDefaultBoard(createdAt)],
      columns: createDefaultColumns(DEFAULT_BOARD_ID, SOLO_USER_ID, createdAt),
      tasks: [],
      proposals: [],
      events: [],
      aiRuns: [],
      mcpConnections: [],
      mcpTokens: [],
    };
  }

  return globalForKanban.__careerightMemoryState;
}

function ensureMemoryWorkspace(userId = SOLO_USER_ID) {
  const memory = getMemoryState();
  const existingBoard = memory.boards.find((board) => board.userId === userId);

  if (existingBoard) {
    removeMemoryLegacySampleTasks(existingBoard.id, userId);
    ensureMemoryTaskNumbers(existingBoard.id, userId);
    return existingBoard;
  }

  const createdAt = now();
  const board = {
    ...createDefaultBoard(createdAt),
    userId,
  };

  memory.boards.push(board);
  memory.columns.push(...createDefaultColumns(board.id, userId, createdAt));

  return board;
}

async function getCollections(): Promise<Collections> {
  const db = await getMongoDb();

  return {
    boards: db.collection<Board>("boards"),
    columns: db.collection<BoardColumn>("columns"),
    tasks: db.collection<KanbanTask>("tasks"),
    proposals: db.collection<AiProposal>("aiProposals"),
    events: db.collection<TaskEvent>("taskEvents"),
    aiRuns: db.collection<AiRun>("aiRuns"),
    mcpConnections: db.collection<McpConnection>("mcpConnections"),
    mcpTokens: db.collection<McpToken>("mcpTokens"),
    counters: db.collection<Counter>("counters"),
  };
}

async function findMongoDefaultBoard(collections: Collections, userId: string) {
  const boardDocs = await collections.boards
    .find({ userId, id: DEFAULT_BOARD_ID })
    .sort({ createdAt: 1, updatedAt: 1 })
    .toArray();
  const [defaultBoard, ...duplicateBoards] = boardDocs;

  if (duplicateBoards.length > 0) {
    await collections.boards.deleteMany({
      _id: { $in: duplicateBoards.map((board) => board._id) },
    } as Filter<Board>);
  }

  return defaultBoard;
}

async function ensureMongoDefaultColumns(
  collections: Collections,
  boardId: string,
  userId: string,
) {
  const createdAt = now();
  const columns = createDefaultColumns(boardId, userId, createdAt);

  try {
    await collections.columns.bulkWrite(
      columns.map((column) => ({
        updateOne: {
          filter: { userId, boardId, id: column.id },
          update: { $setOnInsert: column },
          upsert: true,
        },
      })),
      { ordered: false },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  const columnDocs = await collections.columns
    .find({ userId, boardId })
    .sort({ order: 1, createdAt: 1 })
    .toArray();
  const seenColumnIds = new Set<string>();
  const duplicateColumnIds = columnDocs
    .filter((column) => {
      if (seenColumnIds.has(column.id)) {
        return true;
      }

      seenColumnIds.add(column.id);
      return false;
    })
    .map((column) => column._id);

  if (duplicateColumnIds.length > 0) {
    await collections.columns.deleteMany({
      _id: { $in: duplicateColumnIds },
    } as Filter<BoardColumn>);
  }
}

async function ensureMongoWorkspace(userId = SOLO_USER_ID) {
  const collections = await getCollections();
  const existingBoard = await findMongoDefaultBoard(collections, userId);

  if (existingBoard) {
    await ensureMongoDefaultColumns(collections, existingBoard.id, userId);
    await removeMongoLegacySampleTasks(existingBoard.id, userId);
    await ensureMongoTaskNumbers(existingBoard.id, userId);
    return;
  }

  const createdAt = now();
  const board = createDefaultBoard(createdAt);

  try {
    await collections.boards.updateOne(
      { userId, id: board.id },
      { $setOnInsert: { ...board, userId } },
      { upsert: true },
    );
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }
  }

  await ensureMongoDefaultColumns(collections, board.id, userId);
}

async function removeMongoLegacySampleTasks(
  boardId: string,
  userId = SOLO_USER_ID,
) {
  const collections = await getCollections();
  await collections.tasks.deleteMany({
    boardId,
    userId,
    id: { $in: [...legacySampleTaskIds] },
  });
}

function removeMemoryLegacySampleTasks(
  boardId: string,
  userId = SOLO_USER_ID,
) {
  const memory = getMemoryState();
  const ids = new Set<string>(legacySampleTaskIds);

  memory.tasks = memory.tasks.filter(
    (task) =>
      task.boardId !== boardId ||
      task.userId !== userId ||
      !ids.has(task.id),
  );
}

async function ensureMongoTaskNumbers(
  boardId: string,
  userId = SOLO_USER_ID,
) {
  const collections = await getCollections();
  const taskDocs = await collections.tasks.find({ boardId, userId }).toArray();
  const tasks = taskDocs.map(withoutMongoId) as TaskWithOptionalNumber[];
  const missingTaskIds = new Set(
    tasks
      .filter((task) => !hasValidTaskNumber(task))
      .map((task) => task.id),
  );

  if (missingTaskIds.size === 0) {
    return;
  }

  const numberedTasks = assignMissingTaskNumbers(tasks);

  await collections.tasks.bulkWrite(
    numberedTasks
      .filter((task) => missingTaskIds.has(task.id))
      .map((task) => ({
        updateOne: {
          filter: { id: task.id, userId },
          update: { $set: { taskNumber: task.taskNumber } },
        },
      })),
  );
}

async function addEvent(event: Omit<TaskEvent, "id" | "createdAt">) {
  const taskEvent: TaskEvent = {
    ...event,
    id: id("event"),
    createdAt: now(),
  };

  if (isMongoConfigured()) {
    const collections = await getCollections();
    await collections.events.insertOne({ ...taskEvent });
    return taskEvent;
  }

  getMemoryState().events.unshift(taskEvent);
  return taskEvent;
}

export async function getBoardSnapshot(
  userId = SOLO_USER_ID,
): Promise<BoardSnapshot> {
  if (isMongoConfigured()) {
    await ensureMongoWorkspace(userId);
    const collections = await getCollections();
    const boardDoc = await findMongoDefaultBoard(collections, userId);

    if (!boardDoc) {
      throw new Error("Board initialization failed.");
    }

    const board = withoutMongoId(boardDoc);
    await ensureMongoTaskNumbers(board.id, userId);
    const [columnDocs, taskDocs, proposalDocs] = await Promise.all([
      collections.columns.find({ boardId: board.id, userId }).toArray(),
      collections.tasks.find({ boardId: board.id, userId }).toArray(),
      collections.proposals
        .find({ ...activeProposalFilter(board.id, userId), status: "pending" })
        .toArray(),
    ]);

    return snapshotSchema.parse({
      board,
      columns: sortByOrder(columnDocs.map(withoutMongoId)),
      tasks: sortByOrder(taskDocs.map(withoutMongoId)),
      proposals: proposalDocs
        .map(withoutMongoId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      storageMode: "mongodb",
    });
  }

  const memory = getMemoryState();
  const board = ensureMemoryWorkspace(userId);

  removeMemoryLegacySampleTasks(board.id, userId);
  ensureMemoryTaskNumbers(board.id, userId);

  return snapshotSchema.parse({
    board,
    columns: sortByOrder(
      memory.columns.filter(
        (column) => column.boardId === board.id && column.userId === userId,
      ),
    ),
    tasks: sortByOrder(
      memory.tasks.filter(
        (task) => task.boardId === board.id && task.userId === userId,
      ),
    ),
    proposals: memory.proposals
      .filter(
        (proposal) =>
          proposal.boardId === board.id &&
          proposal.userId === userId &&
          isActiveProposal(proposal) &&
          proposal.status === "pending",
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    storageMode: storageMode(),
  });
}

async function getDefaultBoardRecord(userId = SOLO_USER_ID): Promise<Board> {
  if (isMongoConfigured()) {
    await ensureMongoWorkspace(userId);
    const collections = await getCollections();
    const boardDoc = await findMongoDefaultBoard(collections, userId);

    if (!boardDoc) {
      throw new Error("Board initialization failed.");
    }

    return withoutMongoId(boardDoc);
  }

  return ensureMemoryWorkspace(userId);
}

async function getDefaultBoard(userId = SOLO_USER_ID): Promise<Board> {
  return getDefaultBoardRecord(userId);
}

export async function getDashboardMetrics(
  userId = SOLO_USER_ID,
): Promise<DashboardMetrics> {
  const board = await getDefaultBoardRecord(userId);

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const baseFilter = { boardId: board.id, userId };
    const proposalFilter = activeProposalFilter(board.id, userId);
    const [taskCount, inProgressCount, doneCount, proposalCount] =
      await Promise.all([
        collections.tasks.countDocuments(baseFilter),
        collections.tasks.countDocuments({
          ...baseFilter,
          columnId: "in_progress",
        }),
        collections.tasks.countDocuments({ ...baseFilter, columnId: "done" }),
        collections.proposals.countDocuments(proposalFilter),
      ]);

    return dashboardMetricsSchema.parse({
      boardTitle: board.title,
      proposalCount,
      taskCount,
      inProgressCount,
      doneCount,
    });
  }

  const memory = getMemoryState();
  const tasks = memory.tasks.filter(
    (task) => task.boardId === board.id && task.userId === userId,
  );
  const proposalCount = memory.proposals.filter(
    (proposal) =>
      proposal.boardId === board.id &&
      proposal.userId === userId &&
      isActiveProposal(proposal),
  ).length;

  return dashboardMetricsSchema.parse({
    boardTitle: board.title,
    proposalCount,
    taskCount: tasks.length,
    inProgressCount: tasks.filter((task) => task.columnId === "in_progress")
      .length,
    doneCount: tasks.filter((task) => task.columnId === "done").length,
  });
}

async function getNextTaskOrder(
  boardId: string,
  columnId: KanbanTask["columnId"],
  userId = SOLO_USER_ID,
) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const count = await collections.tasks.countDocuments({
      boardId,
      columnId,
      userId,
    });
    return count;
  }

  return getMemoryState().tasks.filter(
    (task) =>
      task.boardId === boardId &&
      task.columnId === columnId &&
      task.userId === userId,
  ).length;
}

async function getNextTaskNumber(boardId: string, userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    await ensureMongoTaskNumbers(boardId, userId);
    const collections = await getCollections();
    const tasks = await collections.tasks.find({ boardId, userId }).toArray();
    const maxTaskNumber = tasks.reduce(
      (max, task) => Math.max(max, task.taskNumber ?? 0),
      0,
    );

    return allocateMongoTaskNumber(collections.counters, {
      boardId,
      userId,
      currentMax: maxTaskNumber,
    });
  }

  ensureMemoryTaskNumbers(boardId, userId);
  const maxTaskNumber = getMemoryState().tasks
    .filter((task) => task.boardId === boardId && task.userId === userId)
    .reduce((max, task) => Math.max(max, task.taskNumber), 0);

  return maxTaskNumber + 1;
}

function taskNumberCounterKey(boardId: string, userId: string) {
  return `task-number:${userId}:${boardId}`;
}

async function allocateMongoTaskNumber(
  counters: Collection<Counter>,
  input: { boardId: string; userId: string; currentMax: number },
) {
  const key = taskNumberCounterKey(input.boardId, input.userId);
  const updatedAt = now();
  const existingCounter = await counters.findOneAndUpdate(
    { key },
    {
      $inc: { seq: 1 },
      $set: { updatedAt },
    },
    { returnDocument: "after" },
  );

  if (existingCounter) {
    if (existingCounter.seq > input.currentMax) {
      return existingCounter.seq;
    }

    const correctedCounter = await counters.findOneAndUpdate(
      { key },
      {
        $max: { seq: input.currentMax + 1 },
        $set: { updatedAt: now() },
      },
      { returnDocument: "after" },
    );

    if (!correctedCounter) {
      throw new Error("Could not allocate task number.");
    }

    return correctedCounter.seq;
  }

  try {
    await counters.insertOne({
      key,
      userId: input.userId,
      boardId: input.boardId,
      seq: input.currentMax + 1,
      updatedAt,
    });

    return input.currentMax + 1;
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    const counter = await counters.findOneAndUpdate(
      { key },
      {
        $inc: { seq: 1 },
        $set: { updatedAt: now() },
      },
      { returnDocument: "after" },
    );

    if (!counter) {
      throw new Error("Could not allocate task number.");
    }

    if (counter.seq > input.currentMax) {
      return counter.seq;
    }

    const correctedCounter = await counters.findOneAndUpdate(
      { key },
      {
        $max: { seq: input.currentMax + 1 },
        $set: { updatedAt: now() },
      },
      { returnDocument: "after" },
    );

    if (!correctedCounter) {
      throw new Error("Could not allocate task number.");
    }

    return correctedCounter.seq;
  }
}

function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

function hashMcpToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createRawMcpToken() {
  return `hb_${randomBytes(32).toString("base64url")}`;
}

function mcpTokenPrefix(token: string) {
  return `${token.slice(0, 8)}...${token.slice(-4)}`;
}

function toMcpTokenView(token: McpToken): McpTokenView {
  return mcpTokenViewSchema.parse(token);
}

export async function createMcpToken(
  input: CreateMcpTokenInput,
  userId = SOLO_USER_ID,
) {
  const parsed = createMcpTokenInputSchema.parse(input);
  const rawToken = createRawMcpToken();
  const createdAt = now();
  const token: McpToken = {
    id: id("mcp-token"),
    userId,
    name: parsed.name,
    tokenHash: hashMcpToken(rawToken),
    tokenPrefix: mcpTokenPrefix(rawToken),
    createdAt,
  };

  if (isMongoConfigured()) {
    const collections = await getCollections();
    await collections.mcpTokens.insertOne({ ...token });
  } else {
    getMemoryState().mcpTokens.unshift(token);
  }

  return {
    token: rawToken,
    tokenRecord: toMcpTokenView(token),
  };
}

export async function listMcpTokens(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const tokens = await collections.mcpTokens
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    return tokens.map((token) => toMcpTokenView(withoutMongoId(token)));
  }

  return getMemoryState().mcpTokens
    .filter((token) => token.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(toMcpTokenView);
}

export async function revokeMcpToken(
  input: RevokeMcpTokenInput,
  userId = SOLO_USER_ID,
) {
  const { tokenId } = revokeMcpTokenInputSchema.parse(input);
  const revokedAt = now();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const token = await collections.mcpTokens.findOneAndUpdate(
      { id: tokenId, userId },
      { $set: { revokedAt } },
      { returnDocument: "after" },
    );

    if (!token) {
      throw new Error("MCP token not found.");
    }

    return toMcpTokenView(withoutMongoId(token));
  }

  const memory = getMemoryState();
  const index = memory.mcpTokens.findIndex(
    (token) => token.id === tokenId && token.userId === userId,
  );

  if (index === -1) {
    throw new Error("MCP token not found.");
  }

  memory.mcpTokens[index] = {
    ...memory.mcpTokens[index],
    revokedAt,
  };

  return toMcpTokenView(memory.mcpTokens[index]);
}

export async function resolveMcpToken(rawToken: string) {
  const tokenHash = hashMcpToken(rawToken.trim());
  const lastUsedAt = now();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const token = await collections.mcpTokens.findOneAndUpdate(
      {
        tokenHash,
        revokedAt: { $exists: false },
      },
      { $set: { lastUsedAt } },
      { returnDocument: "after" },
    );

    return token ? toMcpTokenView(withoutMongoId(token)) : null;
  }

  const memory = getMemoryState();
  const index = memory.mcpTokens.findIndex(
    (token) => token.tokenHash === tokenHash && !token.revokedAt,
  );

  if (index === -1) {
    return null;
  }

  memory.mcpTokens[index] = {
    ...memory.mcpTokens[index],
    lastUsedAt,
  };

  return toMcpTokenView(memory.mcpTokens[index]);
}

export async function createTask(
  input: CreateTaskInput,
  userId = SOLO_USER_ID,
) {
  const parsed = createTaskInputSchema.parse(input);
  const board = parsed.boardId
    ? (await getBoardSnapshot(userId)).board
    : await getDefaultBoard(userId);
  const boardId = parsed.boardId ?? board.id;
  const createdAt = now();
  const sourceFields = {
    ...(parsed.sourceProposalId
      ? { sourceProposalId: parsed.sourceProposalId }
      : {}),
    ...(parsed.sourceProposalItemFingerprint
      ? {
          sourceProposalItemFingerprint:
            parsed.sourceProposalItemFingerprint,
        }
      : {}),
    ...(parsed.sourceProposalTopic
      ? { sourceProposalTopic: parsed.sourceProposalTopic }
      : {}),
  };
  const task: KanbanTask = {
    id: id("task"),
    taskNumber: await getNextTaskNumber(boardId, userId),
    boardId,
    userId,
    columnId: parsed.columnId,
    title: parsed.title,
    description: parsed.description,
    priority: parsed.priority,
    acceptanceCriteria: parsed.acceptanceCriteria,
    dependencies: parsed.dependencies,
    resourceLinks: parsed.resourceLinks,
    helpfulLinks: parsed.helpfulLinks,
    problemLinks: parsed.problemLinks,
    ...sourceFields,
    order: await getNextTaskOrder(boardId, parsed.columnId, userId),
    createdAt,
    updatedAt: createdAt,
  };

  if (isMongoConfigured()) {
    const collections = await getCollections();
    await collections.tasks.insertOne({ ...task });
  } else {
    getMemoryState().tasks.push(task);
  }

  await addEvent({
    boardId: task.boardId,
    userId,
    taskId: task.id,
    type: "task.created",
    summary: `Created "${task.title}"`,
  });

  return task;
}

export async function updateTask(
  input: UpdateTaskInput,
  userId = SOLO_USER_ID,
) {
  const parsed = updateTaskInputSchema.parse(input);
  const updatedAt = now();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const task = await collections.tasks.findOne({
      id: parsed.taskId,
      userId,
    });

    if (!task) {
      throw new Error("Task not found.");
    }

    const patch = await normalizePatchForColumnMove(
      task,
      parsed.patch,
      userId,
    );

    await collections.tasks.updateOne(
      { id: parsed.taskId, userId },
      { $set: { ...patch, updatedAt } },
    );

    await addEvent({
      boardId: task.boardId,
      userId,
      taskId: task.id,
      type: "task.updated",
      summary: `Updated "${task.title}"`,
      data: { patch },
    });

    return withoutMongoId({
      ...task,
      ...patch,
      updatedAt,
    });
  }

  const memory = getMemoryState();
  const taskIndex = memory.tasks.findIndex(
    (task) => task.id === parsed.taskId && task.userId === userId,
  );

  if (taskIndex === -1) {
    throw new Error("Task not found.");
  }

  const task = memory.tasks[taskIndex];
  const patch = await normalizePatchForColumnMove(task, parsed.patch, userId);
  const updatedTask = {
    ...task,
    ...patch,
    updatedAt,
  };

  memory.tasks[taskIndex] = updatedTask;
  await addEvent({
    boardId: task.boardId,
    userId,
    taskId: task.id,
    type: "task.updated",
    summary: `Updated "${task.title}"`,
    data: { patch },
  });

  return updatedTask;
}

async function normalizePatchForColumnMove(
  task: KanbanTask,
  patch: TaskUpdatePatch,
  userId: string,
) {
  if (!patch.columnId || patch.columnId === task.columnId) {
    return patch;
  }

  return {
    ...patch,
    order: await getNextTaskOrder(task.boardId, patch.columnId, userId),
    userId,
  };
}

export async function deleteTask(taskId: string, userId = SOLO_USER_ID) {
  const parsed = deleteTaskInputSchema.parse({ taskId });

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const task = await collections.tasks.findOne({
      id: parsed.taskId,
      userId,
    });

    if (!task) {
      throw new Error("Task not found.");
    }

    await collections.tasks.deleteOne({ id: parsed.taskId, userId });
    await addEvent({
      boardId: task.boardId,
      userId,
      taskId: task.id,
      type: "task.deleted",
      summary: `Deleted "${task.title}"`,
    });

    return { ok: true };
  }

  const memory = getMemoryState();
  const task = memory.tasks.find(
    (item) => item.id === parsed.taskId && item.userId === userId,
  );

  if (!task) {
    throw new Error("Task not found.");
  }

  memory.tasks = memory.tasks.filter((item) => item.id !== parsed.taskId);
  await addEvent({
    boardId: task.boardId,
    userId,
    taskId: task.id,
    type: "task.deleted",
    summary: `Deleted "${task.title}"`,
  });

  return { ok: true };
}

export async function revertTaskToProposal(
  input: unknown,
  userId = SOLO_USER_ID,
) {
  const parsed = revertTaskToProposalInputSchema.parse(input);

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const task = await collections.tasks.findOne({
      id: parsed.taskId,
      userId,
    });

    if (!task) {
      throw new Error("Task not found.");
    }

    assertTaskCanRevertToProposal(task);
    await collections.tasks.deleteOne({ id: parsed.taskId, userId });
    await addEvent({
      boardId: task.boardId,
      userId,
      taskId: task.id,
      type: "task.reverted_to_proposal",
      summary: `Reverted "${task.title}" to its proposal`,
      data: {
        proposalId: task.sourceProposalId,
        topic: task.sourceProposalTopic,
      },
    });

    return { ok: true };
  }

  const memory = getMemoryState();
  const task = memory.tasks.find(
    (item) => item.id === parsed.taskId && item.userId === userId,
  );

  if (!task) {
    throw new Error("Task not found.");
  }

  assertTaskCanRevertToProposal(task);
  memory.tasks = memory.tasks.filter((item) => item.id !== parsed.taskId);
  await addEvent({
    boardId: task.boardId,
    userId,
    taskId: task.id,
    type: "task.reverted_to_proposal",
    summary: `Reverted "${task.title}" to its proposal`,
    data: {
      proposalId: task.sourceProposalId,
      topic: task.sourceProposalTopic,
    },
  });

  return { ok: true };
}

function assertTaskCanRevertToProposal(task: KanbanTask) {
  if (
    task.columnId !== "todo" ||
    !task.sourceProposalId ||
    !task.sourceProposalItemFingerprint
  ) {
    throw new Error("Only Todo tasks created from a proposal can be reverted.");
  }
}

export async function reorderTask(
  input: ReorderTaskInput,
  userId = SOLO_USER_ID,
) {
  const parsed = reorderTaskInputSchema.parse(input);

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const movingTask = await collections.tasks.findOne({
      id: parsed.taskId,
      userId,
    });

    if (!movingTask) {
      throw new Error("Task not found.");
    }

    const taskDocs = await collections.tasks
      .find({ boardId: movingTask.boardId, userId })
      .toArray();
    const reordered = reorderTaskList(
      taskDocs.map(withoutMongoId),
      parsed.taskId,
      parsed.columnId,
      parsed.index,
    );
    await persistMongoTaskOrdering(collections.tasks, reordered, userId);

    await addEvent({
      boardId: movingTask.boardId,
      userId,
      taskId: movingTask.id,
      type: "task.reordered",
      summary: `Moved "${movingTask.title}" to ${parsed.columnId}`,
      data: { columnId: parsed.columnId, index: parsed.index },
    });

    return reordered.find((task) => task.id === parsed.taskId);
  }

  const memory = getMemoryState();
  const task = memory.tasks.find(
    (item) => item.id === parsed.taskId && item.userId === userId,
  );

  if (!task) {
    throw new Error("Task not found.");
  }

  const scopedTasks = memory.tasks.filter(
    (item) => item.boardId === task.boardId && item.userId === userId,
  );
  const reordered = reorderTaskList(
    scopedTasks,
    parsed.taskId,
    parsed.columnId,
    parsed.index,
  );
  const reorderedIds = new Set(reordered.map((item) => item.id));
  memory.tasks = [
    ...memory.tasks.filter((item) => !reorderedIds.has(item.id)),
    ...reordered,
  ];

  await addEvent({
    boardId: task.boardId,
    userId,
    taskId: task.id,
    type: "task.reordered",
    summary: `Moved "${task.title}" to ${parsed.columnId}`,
    data: { columnId: parsed.columnId, index: parsed.index },
  });

  return reordered.find((item) => item.id === parsed.taskId);
}

function reorderTaskList(
  tasks: KanbanTask[],
  taskId: string,
  columnId: KanbanTask["columnId"],
  index: number,
) {
  const movingTask = tasks.find((task) => task.id === taskId);

  if (!movingTask) {
    throw new Error("Task not found.");
  }

  const updatedAt = now();
  const withoutMovingTask = tasks.filter((task) => task.id !== taskId);
  const columns = Array.from(
    new Set([...withoutMovingTask.map((task) => task.columnId), columnId]),
  );
  const result: KanbanTask[] = [];

  for (const currentColumnId of columns) {
    const columnTasks = sortByOrder(
      withoutMovingTask.filter((task) => task.columnId === currentColumnId),
    );

    if (currentColumnId === columnId) {
      const boundedIndex = Math.min(index, columnTasks.length);
      columnTasks.splice(boundedIndex, 0, {
        ...movingTask,
        columnId,
        updatedAt,
      });
    }

    result.push(
      ...columnTasks.map((task, order) => ({
        ...task,
        order,
      })),
    );
  }

  return result.sort((a, b) => {
    if (a.columnId === b.columnId) {
      return a.order - b.order;
    }

    return a.columnId.localeCompare(b.columnId);
  });
}

async function persistMongoTaskOrdering(
  collection: Collection<KanbanTask>,
  tasks: KanbanTask[],
  userId: string,
) {
  await collection.bulkWrite(
    tasks.map((task) => ({
      updateOne: {
        filter: { id: task.id, userId },
        update: {
          $set: {
            columnId: task.columnId,
            order: task.order,
            updatedAt: task.updatedAt,
          },
        },
      },
    })),
  );
}

export async function proposeTaskBreakdown(
  prompt: string,
  source: ProposalSource = "app",
  userId = SOLO_USER_ID,
  breakdownCreator: TaskBreakdownCreator = createTaskBreakdown,
) {
  const board = await getDefaultBoard(userId);
  const createdAt = now();
  let breakdown: TaskBreakdownResult;

  try {
    breakdown = await breakdownCreator(prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    await saveAiRun({
      id: id("airun"),
      boardId: board.id,
      userId,
      prompt,
      provider: process.env.AI_TASK_MODEL?.trim() || "unconfigured",
      status: "failed",
      error: message,
      createdAt,
      updatedAt: createdAt,
    });

    throw error;
  }

  const proposal: AiProposal = {
    id: id("proposal"),
    boardId: board.id,
    userId,
    type: "task_breakdown",
    status: "pending",
    source,
    title: `Create ${breakdown.tasks.length} task${
      breakdown.tasks.length === 1 ? "" : "s"
    }`,
    summary: "AI created a reviewable task breakdown.",
    payload: taskBreakdownPayloadSchema.parse({
      prompt,
      clarifications: [],
      tasks: breakdown.tasks,
    }),
    createdAt,
    updatedAt: createdAt,
  };
  const run: AiRun = {
    id: id("airun"),
    boardId: board.id,
    userId,
    prompt,
    provider: breakdown.provider,
    status: breakdown.status,
    proposalId: proposal.id,
    createdAt,
    updatedAt: createdAt,
  };

  await saveProposal(proposal);
  await saveAiRun(run);

  return proposal;
}

export async function proposeTaskBreakdownFromTasks(
  input: unknown,
  source: ProposalSource = "mcp",
  userId = SOLO_USER_ID,
) {
  const parsed = proposeTaskBreakdownFromTasksInputSchema.parse(input);
  const board = await getDefaultBoard(userId);
  const createdAt = now();
  const proposal: AiProposal = {
    id: id("proposal"),
    boardId: parsed.boardId ?? board.id,
    userId,
    type: "task_breakdown",
    status: "pending",
    source,
    title:
      parsed.title ??
      `Create ${parsed.tasks.length} task${
        parsed.tasks.length === 1 ? "" : "s"
      }`,
    summary:
      parsed.summary ??
      "MCP client supplied a reviewable task breakdown.",
    payload: taskBreakdownPayloadSchema.parse({
      prompt: parsed.prompt,
      refinedPrompt: parsed.refinedPrompt,
      clarifications: parsed.clarifications,
      tasks: parsed.tasks,
    }),
    createdAt,
    updatedAt: createdAt,
  };

  await saveProposal(proposal);
  return proposal;
}

export async function proposeTaskUpdate(
  input: unknown,
  source: ProposalSource = "mcp",
  userId = SOLO_USER_ID,
) {
  const parsed = proposeTaskUpdateInputSchema.parse(input);
  const board = await getDefaultBoard(userId);
  const task = await findTask(parsed.taskId, userId);
  const createdAt = now();
  const proposal: AiProposal = {
    id: id("proposal"),
    boardId: parsed.boardId ?? board.id,
    userId,
    type: "task_update",
    status: "pending",
    source,
    title: `Update "${task.title}"`,
    summary: parsed.reason ?? "An AI client proposed task edits.",
    payload: taskUpdatePayloadSchema.parse({
      taskId: task.id,
      taskNumber: task.taskNumber,
      patch: parsed.patch,
      reason: parsed.reason,
    }),
    createdAt,
    updatedAt: createdAt,
  };

  await saveProposal(proposal);
  return proposal;
}

export async function proposeTaskDelete(
  input: unknown,
  source: ProposalSource = "mcp",
  userId = SOLO_USER_ID,
) {
  const parsed = proposeTaskDeleteInputSchema.parse(input);
  const board = await getDefaultBoard(userId);
  const task = await findTask(parsed.taskId, userId);
  const createdAt = now();
  const proposal: AiProposal = {
    id: id("proposal"),
    boardId: parsed.boardId ?? board.id,
    userId,
    type: "task_delete",
    status: "pending",
    source,
    title: `Delete "${task.title}"`,
    summary: parsed.reason ?? "An AI client proposed deleting this task.",
    payload: taskDeletePayloadSchema.parse({
      taskId: task.id,
      taskNumber: task.taskNumber,
      reason: parsed.reason,
    }),
    createdAt,
    updatedAt: createdAt,
  };

  await saveProposal(proposal);
  return proposal;
}

export async function proposeStartWork(
  input: unknown,
  source: ProposalSource = "mcp",
  userId = SOLO_USER_ID,
) {
  const parsed = proposeStartWorkInputSchema.parse(input);
  const board = await getDefaultBoard(userId);
  const task = await findTask(parsed.taskId, userId);
  const createdAt = now();
  const proposal: AiProposal = {
    id: id("proposal"),
    boardId: parsed.boardId ?? board.id,
    userId,
    type: "start_work",
    status: "pending",
    source,
    title: `Start work on "${task.title}"`,
    summary:
      parsed.reason ??
      "An AI client proposed moving this task into In Progress.",
    payload: startWorkPayloadSchema.parse({
      taskId: task.id,
      taskNumber: task.taskNumber,
      targetColumnId: "in_progress",
      reason: parsed.reason,
    }),
    createdAt,
    updatedAt: createdAt,
  };

  await saveProposal(proposal);
  return proposal;
}

async function saveProposal(proposal: AiProposal) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    await collections.proposals.insertOne({ ...proposal });
    return;
  }

  getMemoryState().proposals.unshift(proposal);
}

async function saveAiRun(run: AiRun) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    await collections.aiRuns.insertOne({ ...run });
    return;
  }

  getMemoryState().aiRuns.unshift(run);
}

export async function acceptProposal(
  input: unknown,
  userId = SOLO_USER_ID,
) {
  const { proposalId } = proposalActionInputSchema.parse(input);
  const proposal = await findProposal(proposalId, userId);

  if (proposal.status !== "pending") {
    throw new Error("Proposal has already been handled.");
  }

  await applyAcceptedProposalEffect(proposal, userId);

  return setProposalStatus(proposalId, "accepted", userId);
}

async function applyAcceptedProposalEffect(
  proposal: AiProposal,
  userId: string,
) {
  if (proposal.type === "task_update") {
    const payload = taskUpdatePayloadSchema.parse(proposal.payload);
    await updateTask(
      {
        taskId: payload.taskId,
        patch: payload.patch,
      },
      userId,
    );
    return;
  }

  if (proposal.type === "task_delete") {
    const payload = taskDeletePayloadSchema.parse(proposal.payload);
    await deleteTask(payload.taskId, userId);
    return;
  }

  if (proposal.type === "start_work") {
    const payload = startWorkPayloadSchema.parse(proposal.payload);
    await updateTask(
      {
        taskId: payload.taskId,
        patch: {
          columnId: payload.targetColumnId,
        },
      },
      userId,
    );
  }
}

export async function rejectProposal(
  input: unknown,
  userId = SOLO_USER_ID,
) {
  const { proposalId } = proposalActionInputSchema.parse(input);
  return setProposalStatus(proposalId, "rejected", userId);
}

export async function deleteProposal(
  input: unknown,
  userId = SOLO_USER_ID,
) {
  const { proposalId } = proposalActionInputSchema.parse(input);
  const deletedAt = now();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const proposal = await collections.proposals.findOneAndUpdate(
      activeProposalByIdFilter(proposalId, userId),
      { $set: { deletedAt, updatedAt: deletedAt } },
      { returnDocument: "after" },
    );

    if (!proposal) {
      throw new Error("Proposal not found.");
    }

    return withoutMongoId(proposal);
  }

  const memory = getMemoryState();
  const index = memory.proposals.findIndex(
    (proposal) =>
      proposal.id === proposalId &&
      proposal.userId === userId &&
      isActiveProposal(proposal),
  );

  if (index === -1) {
    throw new Error("Proposal not found.");
  }

  memory.proposals[index] = {
    ...memory.proposals[index],
    deletedAt,
    updatedAt: deletedAt,
  };

  return memory.proposals[index];
}

async function setProposalStatus(
  proposalId: string,
  status: AiProposal["status"],
  userId: string,
) {
  const updatedAt = now();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const proposal = await collections.proposals.findOneAndUpdate(
      activeProposalByIdFilter(proposalId, userId),
      { $set: { status, updatedAt } },
      { returnDocument: "after" },
    );

    if (!proposal) {
      throw new Error("Proposal not found.");
    }

    return withoutMongoId(proposal);
  }

  const memory = getMemoryState();
  const index = memory.proposals.findIndex(
    (proposal) =>
      proposal.id === proposalId &&
      proposal.userId === userId &&
      isActiveProposal(proposal),
  );

  if (index === -1) {
    throw new Error("Proposal not found.");
  }

  memory.proposals[index] = {
    ...memory.proposals[index],
    status,
    updatedAt,
  };

  return memory.proposals[index];
}

export async function findTask(taskId: string, userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    let task = await collections.tasks.findOne({ id: taskId, userId });

    if (!task) {
      throw new Error("Task not found.");
    }

    const taskWithOptionalNumber = task as TaskWithOptionalNumber;

    if (!hasValidTaskNumber(taskWithOptionalNumber)) {
      await ensureMongoTaskNumbers(taskWithOptionalNumber.boardId, userId);
      task = await collections.tasks.findOne({ id: taskId, userId });
    }

    if (!task) {
      throw new Error("Task not found.");
    }

    return withoutMongoId(task);
  }

  ensureMemoryTaskNumbers(undefined, userId);
  const task = getMemoryState().tasks.find(
    (item) => item.id === taskId && item.userId === userId,
  );

  if (!task) {
    throw new Error("Task not found.");
  }

  return task;
}

export async function findTaskByNumber(
  boardId: string,
  taskNumber: number,
  userId = SOLO_USER_ID,
) {
  if (isMongoConfigured()) {
    await ensureMongoWorkspace(userId);
    await ensureMongoTaskNumbers(boardId, userId);
    const collections = await getCollections();
    const task = await collections.tasks.findOne({
      boardId,
      userId,
      taskNumber,
    });

    if (!task) {
      throw new Error(
        `Task #${taskNumber} was not found on board "${boardId}". Call list_tasks to confirm the current task numbers.`,
      );
    }

    return withoutMongoId(task);
  }

  ensureMemoryTaskNumbers(boardId, userId);
  const task = getMemoryState().tasks.find(
    (item) =>
      item.boardId === boardId &&
      item.userId === userId &&
      item.taskNumber === taskNumber,
  );

  if (!task) {
    throw new Error(
      `Task #${taskNumber} was not found on board "${boardId}". Call list_tasks to confirm the current task numbers.`,
    );
  }

  return task;
}

export async function resolveTaskReference(
  input: TaskReference,
  boardId = DEFAULT_BOARD_ID,
  userId = SOLO_USER_ID,
) {
  const reference = taskReferenceSchema.parse(input);

  if (reference.taskId) {
    return findTask(reference.taskId, userId);
  }

  return findTaskByNumber(boardId, reference.taskNumber!, userId);
}

async function findProposal(proposalId: string, userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const proposal = await collections.proposals.findOne(
      activeProposalByIdFilter(proposalId, userId),
    );

    if (!proposal) {
      throw new Error("Proposal not found.");
    }

    return withoutMongoId(proposal);
  }

  const proposal = getMemoryState().proposals.find(
    (item) =>
      item.id === proposalId && item.userId === userId && isActiveProposal(item),
  );

  if (!proposal) {
    throw new Error("Proposal not found.");
  }

  return proposal;
}

export async function listProposalHistory(userId = SOLO_USER_ID) {
  const board = await getDefaultBoard(userId);

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const proposals = await collections.proposals
      .find(activeProposalFilter(board.id, userId))
      .toArray();

    return proposalListSchema.parse(
      proposals
        .map(withoutMongoId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  }

  return proposalListSchema.parse(
    getMemoryState().proposals
      .filter(
        (proposal) =>
          proposal.boardId === board.id &&
          proposal.userId === userId &&
          isActiveProposal(proposal),
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function listBoards(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    await ensureMongoWorkspace(userId);
    const collections = await getCollections();
    const boards = await collections.boards.find({ userId }).toArray();
    return boards.map(withoutMongoId);
  }

  ensureMemoryWorkspace(userId);
  return getMemoryState().boards.filter((board) => board.userId === userId);
}

export async function listTasks(
  boardId = DEFAULT_BOARD_ID,
  userId = SOLO_USER_ID,
) {
  if (isMongoConfigured()) {
    await ensureMongoWorkspace(userId);
    await ensureMongoTaskNumbers(boardId, userId);
    const collections = await getCollections();
    const filter = { userId, boardId } satisfies Filter<KanbanTask>;
    const tasks = await collections.tasks.find(filter).toArray();
    return sortByOrder(tasks.map(withoutMongoId));
  }

  removeMemoryLegacySampleTasks(boardId, userId);
  ensureMemoryWorkspace(userId);
  ensureMemoryTaskNumbers(boardId, userId);
  return sortByOrder(
    getMemoryState().tasks.filter(
      (task) => task.userId === userId && task.boardId === boardId,
    ),
  );
}

export async function deleteUserScopedData(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const [
      boards,
      columns,
      tasks,
      proposals,
      events,
      aiRuns,
      mcpConnections,
      mcpTokens,
      counters,
      profileCounts,
      jobCounts,
      diaryCounts,
      dsaCounts,
    ] = await Promise.all([
      collections.boards.deleteMany({ userId }),
      collections.columns.deleteMany({ userId }),
      collections.tasks.deleteMany({ userId }),
      collections.proposals.deleteMany({ userId }),
      collections.events.deleteMany({ userId }),
      collections.aiRuns.deleteMany({ userId }),
      collections.mcpConnections.deleteMany({ userId }),
      collections.mcpTokens.deleteMany({ userId }),
      collections.counters.deleteMany({ userId }),
      deleteProfileUserData(userId),
      deleteJobUserData(userId),
      deleteDiaryUserData(userId),
      deleteDsaUserData(userId),
    ]);

    return {
      boards: boards.deletedCount,
      columns: columns.deletedCount,
      tasks: tasks.deletedCount,
      proposals: proposals.deletedCount,
      events: events.deletedCount,
      aiRuns: aiRuns.deletedCount,
      mcpConnections: mcpConnections.deletedCount,
      mcpTokens: mcpTokens.deletedCount,
      counters: counters.deletedCount,
      ...profileCounts,
      ...jobCounts,
      ...diaryCounts,
      ...dsaCounts,
    };
  }

  const memory = getMemoryState();
  const profileCounts = await deleteProfileUserData(userId);
  const jobCounts = await deleteJobUserData(userId);
  const diaryCounts = await deleteDiaryUserData(userId);
  const dsaCounts = await deleteDsaUserData(userId);
  const counts = {
    boards: memory.boards.filter((item) => item.userId === userId).length,
    columns: memory.columns.filter((item) => item.userId === userId).length,
    tasks: memory.tasks.filter((item) => item.userId === userId).length,
    proposals: memory.proposals.filter((item) => item.userId === userId).length,
    events: memory.events.filter((item) => item.userId === userId).length,
    aiRuns: memory.aiRuns.filter((item) => item.userId === userId).length,
    mcpConnections: memory.mcpConnections.filter((item) => item.userId === userId)
      .length,
    mcpTokens: memory.mcpTokens.filter((item) => item.userId === userId).length,
  };

  memory.boards = memory.boards.filter((item) => item.userId !== userId);
  memory.columns = memory.columns.filter((item) => item.userId !== userId);
  memory.tasks = memory.tasks.filter((item) => item.userId !== userId);
  memory.proposals = memory.proposals.filter((item) => item.userId !== userId);
  memory.events = memory.events.filter((item) => item.userId !== userId);
  memory.aiRuns = memory.aiRuns.filter((item) => item.userId !== userId);
  memory.mcpConnections = memory.mcpConnections.filter(
    (item) => item.userId !== userId,
  );
  memory.mcpTokens = memory.mcpTokens.filter((item) => item.userId !== userId);

  return {
    ...counts,
    ...profileCounts,
    ...jobCounts,
    ...diaryCounts,
    ...dsaCounts,
  };
}
