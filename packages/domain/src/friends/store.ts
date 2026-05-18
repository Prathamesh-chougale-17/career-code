import { ObjectId, type Collection, type Document, type Filter } from "mongodb";

import { getMongoDb, isMongoConfigured } from "@careeright/db";
import { listJobs, seedJobs } from "@careeright/domain/jobs/store";
import type { ParsedSeedJob, JobRecord } from "@careeright/domain/jobs/schema";
import {
  cancelFriendRequestInputSchema,
  copySharedJobsInputSchema,
  createJobShareInputSchema,
  friendConnectionSchema,
  friendConnectionViewSchema,
  friendUserSchema,
  friendUserSearchResultListSchema,
  friendsSummarySchema,
  getJobShareInputSchema,
  jobShareDetailSchema,
  jobShareItemSchema,
  jobShareSummaryListSchema,
  jobShareSummarySchema,
  jobShareSchema,
  listJobSharesInputSchema,
  removeFriendInputSchema,
  respondFriendRequestInputSchema,
  revokeJobShareInputSchema,
  searchFriendUsersInputSchema,
  sendFriendRequestInputSchema,
  sharedJobSnapshotSchema,
  type CreateJobShareInput,
  type FriendConnection,
  type FriendConnectionView,
  type FriendJobDateOption,
  type FriendsSummary,
  type FriendUser,
  type FriendUserSearchResult,
  type JobShare,
  type JobShareDetail,
  type JobShareItem,
  type JobShareSummary,
  type SearchFriendUsersInput,
} from "@careeright/domain/friends/schema";

type AuthUserDoc = {
  _id?: ObjectId | string;
  id?: string;
  name?: unknown;
  email?: unknown;
  image?: unknown;
};

type FriendsMemoryState = {
  users: FriendUser[];
  connections: FriendConnection[];
  shares: JobShare[];
  shareItems: JobShareItem[];
};

type FriendsCollections = {
  connections: Collection<FriendConnection>;
  shares: Collection<JobShare>;
  shareItems: Collection<JobShareItem>;
};

const globalForFriends = globalThis as typeof globalThis & {
  __careerightFriendsMemoryState?: FriendsMemoryState;
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

function memoryState(): FriendsMemoryState {
  if (!globalForFriends.__careerightFriendsMemoryState) {
    globalForFriends.__careerightFriendsMemoryState = {
      users: [],
      connections: [],
      shares: [],
      shareItems: [],
    };
  }

  return globalForFriends.__careerightFriendsMemoryState;
}

async function collections(): Promise<FriendsCollections> {
  const db = await getMongoDb();

  return {
    connections: db.collection<FriendConnection>("friendConnections"),
    shares: db.collection<JobShare>("jobShares"),
    shareItems: db.collection<JobShareItem>("jobShareItems"),
  };
}

function pairKey(leftUserId: string, rightUserId: string) {
  return [leftUserId, rightUserId].sort().join(":");
}

function otherUserId(connection: FriendConnection, userId: string) {
  return connection.requesterId === userId
    ? connection.recipientId
    : connection.requesterId;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function userIdFromDoc(doc: AuthUserDoc) {
  if (typeof doc.id === "string" && doc.id.trim()) {
    return doc.id.trim();
  }

  if (doc._id instanceof ObjectId) {
    return doc._id.toHexString();
  }

  if (typeof doc._id === "string" && doc._id.trim()) {
    return doc._id.trim();
  }

  return null;
}

function userIdAliasesFromDoc(doc: AuthUserDoc) {
  const aliases = new Set<string>();

  if (typeof doc.id === "string" && doc.id.trim()) {
    aliases.add(doc.id.trim());
  }

  if (doc._id instanceof ObjectId) {
    aliases.add(doc._id.toHexString());
  } else if (typeof doc._id === "string" && doc._id.trim()) {
    aliases.add(doc._id.trim());
  }

  return Array.from(aliases);
}

function publicUserFromDoc(doc: AuthUserDoc): FriendUser | null {
  const docId = userIdFromDoc(doc);

  if (!docId) {
    return null;
  }

  return friendUserSchema.parse({
    id: docId,
    name: readString(doc.name),
    email: readString(doc.email),
    image: readString(doc.image),
  });
}

function fallbackUser(userId: string): FriendUser {
  return {
    id: userId,
    name: "Careeright user",
    email: null,
    image: null,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createUserLookupFilter(userId: string): Filter<AuthUserDoc> {
  const filters: Filter<AuthUserDoc>[] = [{ id: userId }, { _id: userId }];

  if (ObjectId.isValid(userId)) {
    filters.push({ _id: new ObjectId(userId) });
  }

  return { $or: filters };
}

function createUsersLookupFilter(userIds: string[]): Filter<AuthUserDoc> {
  const objectIds = userIds.filter(ObjectId.isValid).map((value) => new ObjectId(value));

  return {
    $or: [
      { id: { $in: userIds } },
      { _id: { $in: userIds } },
      ...(objectIds.length > 0 ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
}

async function readPublicUser(userId: string) {
  if (isMongoConfigured()) {
    const db = await getMongoDb();
    const filter = createUserLookupFilter(userId);
    const doc =
      (await db.collection<AuthUserDoc>("user").findOne(filter)) ??
      (await db.collection<AuthUserDoc>("users").findOne(filter));

    return doc ? publicUserFromDoc(doc) : null;
  }

  return memoryState().users.find((user) => user.id === userId) ?? null;
}

async function readPublicUsers(userIds: string[]) {
  const uniqueIds = Array.from(new Set(userIds));
  const users = new Map<string, FriendUser>();

  if (uniqueIds.length === 0) {
    return users;
  }

  if (isMongoConfigured()) {
    const db = await getMongoDb();
    const filter = createUsersLookupFilter(uniqueIds);
    const [userDocs, legacyUserDocs] = await Promise.all([
      db.collection<AuthUserDoc>("user").find(filter).toArray(),
      db.collection<AuthUserDoc>("users").find(filter).toArray(),
    ]);

    for (const doc of [...userDocs, ...legacyUserDocs]) {
      const user = publicUserFromDoc(doc);

      if (user) {
        for (const alias of new Set([user.id, ...userIdAliasesFromDoc(doc)])) {
          users.set(alias, user);
        }
      }
    }
  } else {
    for (const user of memoryState().users) {
      if (uniqueIds.includes(user.id)) {
        users.set(user.id, user);
      }
    }
  }

  for (const userId of uniqueIds) {
    if (!users.has(userId)) {
      users.set(userId, fallbackUser(userId));
    }
  }

  return users;
}

async function findConnectionByPair(leftUserId: string, rightUserId: string) {
  const key = pairKey(leftUserId, rightUserId);

  if (isMongoConfigured()) {
    const { connections } = await collections();
    const connection = await connections.findOne({ pairKey: key });

    return connection ? friendConnectionSchema.parse(withoutMongoId(connection)) : null;
  }

  return memoryState().connections.find((connection) => connection.pairKey === key) ?? null;
}

async function findConnectionById(connectionId: string) {
  if (isMongoConfigured()) {
    const { connections } = await collections();
    const connection = await connections.findOne({ id: connectionId });

    return connection ? friendConnectionSchema.parse(withoutMongoId(connection)) : null;
  }

  return memoryState().connections.find((connection) => connection.id === connectionId) ?? null;
}

async function saveConnection(connection: FriendConnection) {
  const parsed = friendConnectionSchema.parse(connection);

  if (isMongoConfigured()) {
    const { connections } = await collections();
    await connections.updateOne(
      { pairKey: parsed.pairKey },
      { $set: parsed },
      { upsert: true },
    );
  } else {
    const memory = memoryState();
    const index = memory.connections.findIndex((item) => item.pairKey === parsed.pairKey);

    if (index === -1) {
      memory.connections.push(parsed);
    } else {
      memory.connections[index] = parsed;
    }
  }

  return parsed;
}

function canSeeConnection(connection: FriendConnection, userId: string) {
  return connection.requesterId === userId || connection.recipientId === userId;
}

function relationshipForConnection(
  connection: FriendConnection | null,
  userId: string,
) {
  if (!connection) {
    return "none" as const;
  }

  if (connection.status === "accepted") {
    return "accepted" as const;
  }

  if (connection.status !== "pending") {
    return "none" as const;
  }

  return connection.requesterId === userId
    ? ("outgoing_pending" as const)
    : ("incoming_pending" as const);
}

async function connectionViews(
  connections: FriendConnection[],
  userId: string,
): Promise<FriendConnectionView[]> {
  const users = await readPublicUsers(connections.map((connection) => otherUserId(connection, userId)));

  return connections.map((connection) =>
    friendConnectionViewSchema.parse({
      ...connection,
      otherUser: users.get(otherUserId(connection, userId)) ?? fallbackUser(otherUserId(connection, userId)),
    }),
  );
}

async function listConnectionsForUser(userId: string) {
  if (isMongoConfigured()) {
    const { connections } = await collections();
    const results = await connections
      .find({
        $or: [{ requesterId: userId }, { recipientId: userId }],
      })
      .sort({ updatedAt: -1 })
      .toArray();

    return results.map((connection) => friendConnectionSchema.parse(withoutMongoId(connection)));
  }

  return [...memoryState().connections]
    .filter((connection) => canSeeConnection(connection, userId))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

function jobDateOptionsFromJobs(jobs: JobRecord[]): FriendJobDateOption[] {
  const counts = new Map<string, number>();

  for (const job of jobs) {
    const dateKey = job.seededAt.slice(0, 10);
    counts.set(dateKey, (counts.get(dateKey) ?? 0) + 1);
  }

  return Array.from(counts, ([dateKey, count]) => ({ dateKey, count })).sort(
    (a, b) => b.dateKey.localeCompare(a.dateKey),
  );
}

function snapshotJob(job: JobRecord) {
  return sharedJobSnapshotSchema.parse({
    ownerJobId: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    applyUrl: job.applyUrl,
    source: job.source,
    sourceJobId: job.sourceJobId,
    status: job.status,
    postedAt: job.postedAt,
    salary: job.salary,
    description: job.description,
    fitScore: job.fitScore,
    fitBand: job.fitBand,
    fitReasons: job.fitReasons,
    matchedSkills: job.matchedSkills,
    missingSkills: job.missingSkills,
    riskFlags: job.riskFlags,
    scoreVersion: job.scoreVersion,
    scoredAt: job.scoredAt,
    seededAt: job.seededAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  });
}

function selectJobsToShare(input: CreateJobShareInput, jobs: JobRecord[]) {
  const parsed = createJobShareInputSchema.parse(input);

  if (parsed.scope === "all") {
    return jobs;
  }

  if (parsed.scope === "latest") {
    const latestDateKey = jobs[0]?.seededAt.slice(0, 10);

    return latestDateKey
      ? jobs.filter((job) => job.seededAt.startsWith(latestDateKey))
      : [];
  }

  return jobs.filter((job) => job.seededAt.startsWith(parsed.dateKey ?? ""));
}

async function saveShare(share: JobShare, items: JobShareItem[]) {
  if (isMongoConfigured()) {
    const { shares, shareItems } = await collections();
    await shares.insertOne({ ...share });

    if (items.length > 0) {
      await shareItems.insertMany(items.map((item) => ({ ...item })));
    }
  } else {
    const memory = memoryState();
    memory.shares.unshift(share);
    memory.shareItems.push(...items);
  }
}

async function readShare(shareId: string) {
  if (isMongoConfigured()) {
    const { shares } = await collections();
    const share = await shares.findOne({ id: shareId });

    return share ? jobShareSchema.parse(withoutMongoId(share)) : null;
  }

  return memoryState().shares.find((share) => share.id === shareId) ?? null;
}

async function readShareItems(shareId: string) {
  if (isMongoConfigured()) {
    const { shareItems } = await collections();
    const items = await shareItems.find({ shareId }).sort({ createdAt: 1 }).toArray();

    return items.map((item) => jobShareItemSchema.parse(withoutMongoId(item)));
  }

  return memoryState().shareItems.filter((item) => item.shareId === shareId);
}

async function writeShare(share: JobShare) {
  const parsed = jobShareSchema.parse(share);

  if (isMongoConfigured()) {
    const { shares } = await collections();
    await shares.updateOne({ id: parsed.id }, { $set: parsed });
  } else {
    const memory = memoryState();
    const index = memory.shares.findIndex((item) => item.id === parsed.id);

    if (index !== -1) {
      memory.shares[index] = parsed;
    }
  }

  return parsed;
}

async function shareSummaries(shares: JobShare[], userId: string) {
  const otherUsers = await readPublicUsers(
    shares.map((share) => (share.ownerId === userId ? share.recipientId : share.ownerId)),
  );

  return jobShareSummaryListSchema.parse(
    shares.map((share) => {
      const otherUserId = share.ownerId === userId ? share.recipientId : share.ownerId;

      return jobShareSummarySchema.parse({
        ...share,
        otherUser: otherUsers.get(otherUserId) ?? fallbackUser(otherUserId),
      });
    }),
  );
}

function copiedJobsBySharedJobId(jobs: JobRecord[]) {
  const copiedJobs = new Map<string, JobRecord>();

  for (const job of jobs) {
    if (job.source !== "friend-share") {
      continue;
    }

    const rawSharedJobId =
      typeof job.raw.sharedJobId === "string" ? job.raw.sharedJobId : "";
    const sharedJobId = rawSharedJobId || job.sourceJobId;

    if (sharedJobId && !copiedJobs.has(sharedJobId)) {
      copiedJobs.set(sharedJobId, job);
    }
  }

  return copiedJobs;
}

export async function upsertFriendUserForTest(user: FriendUser) {
  const parsed = friendUserSchema.parse(user);

  if (isMongoConfigured()) {
    const db = await getMongoDb();
    await db.collection("user").updateOne(
      { id: parsed.id },
      { $set: parsed },
      { upsert: true },
    );
  } else {
    const memory = memoryState();
    const index = memory.users.findIndex((item) => item.id === parsed.id);

    if (index === -1) {
      memory.users.push(parsed);
    } else {
      memory.users[index] = parsed;
    }
  }

  return parsed;
}

export async function searchFriendUsers(
  input: SearchFriendUsersInput,
  userId: string,
) {
  const { query } = searchFriendUsersInputSchema.parse(input);
  let users: FriendUser[] = [];

  if (isMongoConfigured()) {
    const db = await getMongoDb();
    const exactEmailRegex = new RegExp(`^${escapeRegex(query)}$`, "i");
    const filter: Filter<AuthUserDoc> = {
      email: exactEmailRegex,
    };
    const [userDocs, legacyUserDocs] = await Promise.all([
      db.collection<AuthUserDoc>("user").find(filter).limit(5).toArray(),
      db.collection<AuthUserDoc>("users").find(filter).limit(5).toArray(),
    ]);
    const seen = new Set<string>();

    users = [...userDocs, ...legacyUserDocs]
      .map((doc) => ({
        aliases: userIdAliasesFromDoc(doc),
        user: publicUserFromDoc(doc),
      }))
      .filter(
        (result): result is { aliases: string[]; user: FriendUser } =>
          Boolean(result.user),
      )
      .filter(({ aliases, user }) => {
        const keys = new Set([user.id, ...aliases]);

        if (keys.has(userId) || Array.from(keys).some((key) => seen.has(key))) {
          return false;
        }

        for (const key of keys) {
          seen.add(key);
        }

        return true;
      })
      .map(({ user }) => user)
      .slice(0, 1);
  } else {
    users = memoryState().users
      .filter((user) => user.id !== userId)
      .filter((user) => user.email?.toLowerCase() === query)
      .slice(0, 1);
  }

  const connections = await Promise.all(
    users.map((user) => findConnectionByPair(userId, user.id)),
  );

  return friendUserSearchResultListSchema.parse(
    users.map((user, index): FriendUserSearchResult => {
      const connection = connections[index];

      return {
        ...user,
        relationship: relationshipForConnection(connection, userId),
        connection,
      };
    }),
  );
}

export async function getFriendsSummary(userId: string): Promise<FriendsSummary> {
  const [connections, jobs] = await Promise.all([
    listConnectionsForUser(userId),
    listJobs(userId),
  ]);
  const accepted = connections.filter((connection) => connection.status === "accepted");
  const incoming = connections.filter(
    (connection) =>
      connection.status === "pending" && connection.recipientId === userId,
  );
  const outgoing = connections.filter(
    (connection) =>
      connection.status === "pending" && connection.requesterId === userId,
  );
  const [friends, incomingRequests, outgoingRequests, receivedShares, sentShares] =
    await Promise.all([
      connectionViews(accepted, userId),
      connectionViews(incoming, userId),
      connectionViews(outgoing, userId),
      listJobShares({ direction: "received" }, userId),
      listJobShares({ direction: "sent" }, userId),
    ]);
  const jobDateOptions = jobDateOptionsFromJobs(jobs);

  return friendsSummarySchema.parse({
    friends,
    incomingRequests,
    outgoingRequests,
    receivedShares,
    sentShares,
    jobDateOptions,
    latestDateKey: jobDateOptions[0]?.dateKey ?? null,
    totalShareableJobs: jobs.length,
  });
}

export async function sendFriendRequest(input: unknown, userId: string) {
  const { recipientId } = sendFriendRequestInputSchema.parse(input);

  if (recipientId === userId) {
    throw new Error("You cannot send a friend request to yourself.");
  }

  const recipient = await readPublicUser(recipientId);

  if (!recipient) {
    throw new Error("Careeright user not found.");
  }

  const existing = await findConnectionByPair(userId, recipientId);
  const updatedAt = now();

  if (existing?.status === "accepted") {
    return existing;
  }

  if (existing?.status === "pending") {
    if (existing.requesterId === userId) {
      return existing;
    }

    return saveConnection({
      ...existing,
      status: "accepted",
      updatedAt,
      respondedAt: updatedAt,
      removedAt: undefined,
    });
  }

  return saveConnection({
    id: existing?.id ?? id("friend-connection"),
    requesterId: userId,
    recipientId,
    pairKey: pairKey(userId, recipientId),
    status: "pending",
    createdAt: existing?.createdAt ?? updatedAt,
    updatedAt,
    respondedAt: undefined,
    removedAt: undefined,
  });
}

export async function respondFriendRequest(input: unknown, userId: string) {
  const { connectionId, action } = respondFriendRequestInputSchema.parse(input);
  const connection = await findConnectionById(connectionId);

  if (!connection || connection.recipientId !== userId || connection.status !== "pending") {
    throw new Error("Pending friend request not found.");
  }

  const updatedAt = now();

  return saveConnection({
    ...connection,
    status: action === "accept" ? "accepted" : "rejected",
    updatedAt,
    respondedAt: updatedAt,
    removedAt: undefined,
  });
}

export async function cancelFriendRequest(input: unknown, userId: string) {
  const { connectionId } = cancelFriendRequestInputSchema.parse(input);
  const connection = await findConnectionById(connectionId);

  if (!connection || connection.requesterId !== userId || connection.status !== "pending") {
    throw new Error("Outgoing friend request not found.");
  }

  const updatedAt = now();

  return saveConnection({
    ...connection,
    status: "removed",
    updatedAt,
    removedAt: updatedAt,
  });
}

export async function removeFriend(input: unknown, userId: string) {
  const { connectionId } = removeFriendInputSchema.parse(input);
  const connection = await findConnectionById(connectionId);

  if (!connection || !canSeeConnection(connection, userId) || connection.status !== "accepted") {
    throw new Error("Accepted friendship not found.");
  }

  const updatedAt = now();

  return saveConnection({
    ...connection,
    status: "removed",
    updatedAt,
    removedAt: updatedAt,
  });
}

export async function createJobShare(input: unknown, userId: string) {
  const parsed = createJobShareInputSchema.parse(input);
  const connection = await findConnectionByPair(userId, parsed.recipientId);

  if (!connection || connection.status !== "accepted") {
    throw new Error("You can only share jobs with accepted friends.");
  }

  const jobs = selectJobsToShare(parsed, await listJobs(userId));

  if (jobs.length === 0) {
    throw new Error("No jobs are available for this share.");
  }

  const createdAt = now();
  const share = jobShareSchema.parse({
    id: id("job-share"),
    ownerId: userId,
    recipientId: parsed.recipientId,
    connectionId: connection.id,
    scope: parsed.scope,
    dateKey:
      parsed.scope === "date"
        ? parsed.dateKey
        : parsed.scope === "latest"
          ? jobs[0]?.seededAt.slice(0, 10)
          : null,
    note: parsed.note,
    jobCount: jobs.length,
    createdAt,
    updatedAt: createdAt,
  });
  const items = jobs.map((job) =>
    jobShareItemSchema.parse({
      id: id("job-share-item"),
      shareId: share.id,
      ownerId: share.ownerId,
      recipientId: share.recipientId,
      ownerJobId: job.id,
      snapshot: snapshotJob(job),
      createdAt,
    }),
  );

  await saveShare(share, items);

  return getJobShare({ shareId: share.id }, userId);
}

export async function listJobShares(input: unknown, userId: string) {
  const { direction } = listJobSharesInputSchema.parse(input);
  let shares: JobShare[];

  if (isMongoConfigured()) {
    const { shares: collection } = await collections();
    const filter =
      direction === "received"
        ? { recipientId: userId, revokedAt: { $exists: false } }
        : { ownerId: userId };

    shares = (
      await collection.find(filter).sort({ createdAt: -1 }).limit(50).toArray()
    ).map((share) => jobShareSchema.parse(withoutMongoId(share)));
  } else {
    shares = memoryState().shares
      .filter((share) =>
        direction === "received"
          ? share.recipientId === userId && !share.revokedAt
          : share.ownerId === userId,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 50);
  }

  return shareSummaries(shares, userId);
}

export async function getJobShare(input: unknown, userId: string): Promise<JobShareDetail> {
  const { shareId } = getJobShareInputSchema.parse(input);
  const share = await readShare(shareId);

  if (!share || (share.ownerId !== userId && share.recipientId !== userId)) {
    throw new Error("Shared jobs not found.");
  }

  if (share.revokedAt && share.recipientId === userId) {
    throw new Error("This job share has been revoked.");
  }

  const [items, users, recipientJobs] = await Promise.all([
    readShareItems(share.id),
    readPublicUsers([share.ownerId, share.recipientId]),
    share.recipientId === userId ? listJobs(userId) : Promise.resolve([]),
  ]);
  const copiedJobs = copiedJobsBySharedJobId(recipientJobs);
  const detailItems =
    share.recipientId === userId
      ? items.map((item) => {
          const copiedJob = copiedJobs.get(item.ownerJobId);

          return copiedJob
            ? {
                ...item,
                copiedJobId: copiedJob.id,
                copiedAt: copiedJob.createdAt,
              }
            : item;
        })
      : items;

  return jobShareDetailSchema.parse({
    ...share,
    owner: users.get(share.ownerId) ?? fallbackUser(share.ownerId),
    recipient: users.get(share.recipientId) ?? fallbackUser(share.recipientId),
    items: detailItems,
  });
}

export async function revokeJobShare(input: unknown, userId: string) {
  const { shareId } = revokeJobShareInputSchema.parse(input);
  const share = await readShare(shareId);

  if (!share || share.ownerId !== userId) {
    throw new Error("Sent job share not found.");
  }

  if (share.revokedAt) {
    return share;
  }

  return writeShare({
    ...share,
    revokedAt: now(),
    updatedAt: now(),
  });
}

export async function copySharedJobs(input: unknown, userId: string) {
  const { shareId, itemIds } = copySharedJobsInputSchema.parse(input);
  const share = await readShare(shareId);

  if (!share || share.recipientId !== userId || share.revokedAt) {
    throw new Error("Shared jobs not found.");
  }

  const requestedItemIds = itemIds ? new Set(itemIds) : null;
  const items = (await readShareItems(share.id)).filter((item) =>
    requestedItemIds ? requestedItemIds.has(item.id) : true,
  );

  if (items.length === 0) {
    throw new Error("No shared jobs were selected.");
  }
  const copiedJobs = copiedJobsBySharedJobId(await listJobs(userId));
  const itemsToCopy = items.filter((item) => !copiedJobs.has(item.ownerJobId));

  if (itemsToCopy.length === 0) {
    return [];
  }

  const jobs: ParsedSeedJob[] = itemsToCopy.map(({ snapshot }) => ({
    title: snapshot.title,
    company: snapshot.company,
    location: snapshot.location,
    applyUrl: snapshot.applyUrl,
    sourceJobId: snapshot.ownerJobId,
    postedAt: snapshot.postedAt,
    salary: snapshot.salary,
    description: snapshot.description,
    fitScore: snapshot.fitScore,
    fitBand: snapshot.fitBand,
    fitReasons: snapshot.fitReasons,
    matchedSkills: snapshot.matchedSkills,
    missingSkills: snapshot.missingSkills,
    riskFlags: snapshot.riskFlags,
    scoreVersion: snapshot.scoreVersion,
    scoredAt: snapshot.scoredAt,
    raw: {
      sharedFromUserId: share.ownerId,
      sharedJobId: snapshot.ownerJobId,
      sharedAt: share.createdAt,
    },
  }));

  return seedJobs({ source: "friend-share", jobs }, userId);
}

export async function deleteFriendUserData(userId: string) {
  if (isMongoConfigured()) {
    const { connections, shares, shareItems } = await collections();
    const [connectionResult, shareResult, itemResult] = await Promise.all([
      connections.deleteMany({
        $or: [{ requesterId: userId }, { recipientId: userId }],
      }),
      shares.deleteMany({ $or: [{ ownerId: userId }, { recipientId: userId }] }),
      shareItems.deleteMany({ $or: [{ ownerId: userId }, { recipientId: userId }] }),
    ]);

    return {
      friendConnections: connectionResult.deletedCount,
      jobShares: shareResult.deletedCount,
      jobShareItems: itemResult.deletedCount,
    };
  }

  const memory = memoryState();
  const friendConnections = memory.connections.filter((connection) =>
    canSeeConnection(connection, userId),
  ).length;
  const jobShares = memory.shares.filter(
    (share) => share.ownerId === userId || share.recipientId === userId,
  ).length;
  const jobShareItems = memory.shareItems.filter(
    (item) => item.ownerId === userId || item.recipientId === userId,
  ).length;

  memory.connections = memory.connections.filter(
    (connection) => !canSeeConnection(connection, userId),
  );
  memory.shares = memory.shares.filter(
    (share) => share.ownerId !== userId && share.recipientId !== userId,
  );
  memory.shareItems = memory.shareItems.filter(
    (item) => item.ownerId !== userId && item.recipientId !== userId,
  );

  return {
    friendConnections,
    jobShares,
    jobShareItems,
  };
}
