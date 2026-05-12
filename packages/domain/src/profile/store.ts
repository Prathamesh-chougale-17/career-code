import type { Collection, Document } from "mongodb";

import { getMongoDb, isMongoConfigured } from "@careeright/db";
import { SOLO_USER_ID } from "@careeright/domain/kanban/schema";
import {
  createProfileImportInputSchema,
  createProfileItemInputSchema,
  deleteProfileItemInputSchema,
  profileImportActionInputSchema,
  profileImportApplyResultSchema,
  profileImportListSchema,
  profileImportSchema,
  profileImportStatusSchema,
  profileBasicsInputSchema,
  profileApplicationDefaultsSchema,
  type CreateProfileImportInput,
  type CreateProfileItemInput,
  type ProfileBasicsDraft,
  type ProfileItem,
  type ProfileImport,
  type ProfileImportSource,
  type ProfileImportStatus,
  type ProfileSnapshot,
  type UserProfile,
  profileItemSchema,
  profileItemTypeSchema,
  profileSchema,
  profileSnapshotSchema,
  updateProfileApplicationDefaultsInputSchema,
  updateProfileItemInputSchema,
  type ProfileBasicsInput,
  type ProfileItemType,
  type UpdateProfileApplicationDefaultsInput,
  type UpdateProfileItemInput,
} from "@careeright/domain/profile/schema";

type ProfileMemoryState = {
  profiles: UserProfile[];
  items: ProfileItem[];
  imports: ProfileImport[];
};

type ProfileCollections = {
  profiles: Collection<UserProfile>;
  items: Collection<ProfileItem>;
  imports: Collection<ProfileImport>;
};

const sectionOrder = profileItemTypeSchema.options.reduce(
  (order, type, index) => {
    order[type] = index;
    return order;
  },
  {} as Record<ProfileItemType, number>,
);

const globalForProfile = globalThis as typeof globalThis & {
  __careerightProfileMemoryState?: ProfileMemoryState;
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

function getMemoryState(): ProfileMemoryState {
  if (!globalForProfile.__careerightProfileMemoryState) {
    globalForProfile.__careerightProfileMemoryState = {
      profiles: [],
      items: [],
      imports: [],
    };
  }

  return globalForProfile.__careerightProfileMemoryState;
}

function createEmptyProfile(userId: string, createdAt = now()): UserProfile {
  return profileSchema.parse({
    id: id("profile"),
    userId,
    displayName: "",
    headline: "",
    location: "",
    email: "",
    website: "",
    summary: "",
    applicationDefaults: {},
    createdAt,
    updatedAt: createdAt,
  });
}

function sortProfileItems(items: ProfileItem[]) {
  return [...items].sort((a, b) => {
    const sectionSort = sectionOrder[a.type] - sectionOrder[b.type];

    if (sectionSort !== 0) {
      return sectionSort;
    }

    const updatedAtSort = b.updatedAt.localeCompare(a.updatedAt);

    if (updatedAtSort !== 0) {
      return updatedAtSort;
    }

    return b.createdAt.localeCompare(a.createdAt);
  });
}

function sortProfileImports(imports: ProfileImport[]) {
  return [...imports].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function normalizeFingerprintText(value?: string) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function profileItemFingerprint(
  item: Pick<
    ProfileItem,
    "type" | "title" | "organization" | "startDate" | "endDate" | "url"
  >,
) {
  return [
    item.type,
    item.title,
    item.organization,
    item.startDate,
    item.endDate,
    item.url,
  ]
    .map(normalizeFingerprintText)
    .join("|");
}

function createProfileItemRecord(
  input: CreateProfileItemInput,
  userId: string,
  createdAt = now(),
) {
  const parsed = createProfileItemInputSchema.parse(input);

  return profileItemSchema.parse({
    ...parsed,
    id: id("profile-item"),
    userId,
    createdAt,
    updatedAt: createdAt,
  });
}

const profileBasicFields = [
  "displayName",
  "headline",
  "location",
  "email",
  "website",
  "summary",
] as const;

function mergeImportedBasics(
  current: UserProfile,
  imported: ProfileBasicsDraft,
) {
  const patch: Partial<UserProfile> = {};
  const updatedBasicFields: Array<(typeof profileBasicFields)[number]> = [];

  for (const field of profileBasicFields) {
    const value = imported[field]?.trim();

    if (!current[field] && value) {
      patch[field] = value;
      updatedBasicFields.push(field);
    }
  }

  return {
    patch,
    updatedBasicFields,
  };
}

function uniqueImportedItems(
  existingItems: ProfileItem[],
  importedItems: CreateProfileItemInput[],
) {
  const fingerprints = new Set(existingItems.map(profileItemFingerprint));
  const itemsToCreate: CreateProfileItemInput[] = [];
  let skippedItemCount = 0;

  for (const item of importedItems) {
    const parsed = createProfileItemInputSchema.parse(item);
    const fingerprint = profileItemFingerprint(parsed);

    if (fingerprints.has(fingerprint)) {
      skippedItemCount += 1;
      continue;
    }

    fingerprints.add(fingerprint);
    itemsToCreate.push(parsed);
  }

  return {
    itemsToCreate,
    skippedItemCount,
  };
}

async function getCollections(): Promise<ProfileCollections> {
  const db = await getMongoDb();

  return {
    profiles: db.collection<UserProfile>("profiles"),
    items: db.collection<ProfileItem>("profileItems"),
    imports: db.collection<ProfileImport>("profileImports"),
  };
}

function ensureMemoryProfile(userId = SOLO_USER_ID) {
  const memory = getMemoryState();
  const existing = memory.profiles.find((profile) => profile.userId === userId);

  if (existing) {
    return existing;
  }

  const profile = createEmptyProfile(userId);
  memory.profiles.push(profile);
  return profile;
}

async function ensureMongoProfile(userId = SOLO_USER_ID) {
  const collections = await getCollections();
  const existing = await collections.profiles.findOne({ userId });

  if (existing) {
    return profileSchema.parse(withoutMongoId(existing));
  }

  const profile = createEmptyProfile(userId);
  await collections.profiles.insertOne(profile);
  return profile;
}

export async function getProfileSnapshot(
  userId = SOLO_USER_ID,
): Promise<ProfileSnapshot> {
  if (isMongoConfigured()) {
    const profile = await ensureMongoProfile(userId);
    const collections = await getCollections();
    const items = await collections.items.find({ userId }).toArray();

    return profileSnapshotSchema.parse({
      profile,
      items: sortProfileItems(
        items.map((item) => profileItemSchema.parse(withoutMongoId(item))),
      ),
    });
  }

  const memory = getMemoryState();
  const profile = ensureMemoryProfile(userId);

  return profileSnapshotSchema.parse({
    profile,
    items: sortProfileItems(
      memory.items.filter((item) => item.userId === userId),
    ),
  });
}

export async function updateProfileBasics(
  input: ProfileBasicsInput,
  userId = SOLO_USER_ID,
) {
  const parsed = profileBasicsInputSchema.parse(input);
  const updatedAt = now();

  if (isMongoConfigured()) {
    await ensureMongoProfile(userId);
    const collections = await getCollections();
    const profile = await collections.profiles.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...parsed,
          updatedAt,
        },
      },
      { returnDocument: "after" },
    );

    if (!profile) {
      throw new Error("Profile not found.");
    }

    return profileSchema.parse(withoutMongoId(profile));
  }

  const memory = getMemoryState();
  const current = ensureMemoryProfile(userId);
  const index = memory.profiles.findIndex((profile) => profile.id === current.id);
  const profile = profileSchema.parse({
    ...current,
    ...parsed,
    updatedAt,
  });

  memory.profiles[index] = profile;
  return profile;
}

export async function updateProfileApplicationDefaults(
  input: UpdateProfileApplicationDefaultsInput,
  userId = SOLO_USER_ID,
) {
  const patch = updateProfileApplicationDefaultsInputSchema.parse(input);
  const current = await ensureMongoOrMemoryProfile(userId);
  const updatedAt = now();
  const applicationDefaults = profileApplicationDefaultsSchema.parse({
    ...current.applicationDefaults,
    ...patch,
  });

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const profile = await collections.profiles.findOneAndUpdate(
      { userId },
      {
        $set: {
          applicationDefaults,
          updatedAt,
        },
      },
      { returnDocument: "after" },
    );

    if (!profile) {
      throw new Error("Profile not found.");
    }

    return profileSchema.parse(withoutMongoId(profile));
  }

  const memory = getMemoryState();
  const index = memory.profiles.findIndex((profile) => profile.id === current.id);
  const profile = profileSchema.parse({
    ...current,
    applicationDefaults,
    updatedAt,
  });

  memory.profiles[index] = profile;
  return profile;
}

async function ensureMongoOrMemoryProfile(userId = SOLO_USER_ID) {
  return isMongoConfigured() ? ensureMongoProfile(userId) : ensureMemoryProfile(userId);
}

export async function createProfileItem(
  input: CreateProfileItemInput,
  userId = SOLO_USER_ID,
) {
  const item = createProfileItemRecord(input, userId);

  if (isMongoConfigured()) {
    await ensureMongoProfile(userId);
    const collections = await getCollections();
    await collections.items.insertOne(item);
  } else {
    ensureMemoryProfile(userId);
    getMemoryState().items.push(item);
  }

  return item;
}

export async function createProfileImport(
  input: CreateProfileImportInput,
  userId = SOLO_USER_ID,
  source: ProfileImportSource = "mcp",
) {
  const parsed = createProfileImportInputSchema.parse(input);
  const createdAt = now();
  const profileImport = profileImportSchema.parse({
    ...parsed,
    id: id("profile-import"),
    userId,
    source,
    status: "pending",
    createdAt,
    updatedAt: createdAt,
  });

  if (isMongoConfigured()) {
    await ensureMongoProfile(userId);
    const collections = await getCollections();
    await collections.imports.insertOne(profileImport);
  } else {
    ensureMemoryProfile(userId);
    getMemoryState().imports.unshift(profileImport);
  }

  return profileImport;
}

export async function listProfileImports(
  userId = SOLO_USER_ID,
  status: ProfileImportStatus = "pending",
) {
  profileImportStatusSchema.parse(status);

  if (isMongoConfigured()) {
    await ensureMongoProfile(userId);
    const collections = await getCollections();
    const imports = await collections.imports.find({ userId, status }).toArray();

    return profileImportListSchema.parse(
      sortProfileImports(imports.map((item) => profileImportSchema.parse(withoutMongoId(item)))),
    );
  }

  ensureMemoryProfile(userId);
  return profileImportListSchema.parse(
    sortProfileImports(
      getMemoryState().imports.filter(
        (item) => item.userId === userId && item.status === status,
      ),
    ),
  );
}

export async function applyProfileImport(
  input: unknown,
  userId = SOLO_USER_ID,
) {
  const { importId } = profileImportActionInputSchema.parse(input);
  const updatedAt = now();

  if (isMongoConfigured()) {
    await ensureMongoProfile(userId);
    const collections = await getCollections();
    const profileImport = await collections.imports.findOne({
      id: importId,
      userId,
    });

    if (!profileImport) {
      throw new Error("Profile import not found.");
    }

    if (profileImport.status !== "pending") {
      throw new Error("Profile import has already been handled.");
    }

    const profile = await ensureMongoProfile(userId);
    const existingItems = await collections.items.find({ userId }).toArray();
    const { patch, updatedBasicFields } = mergeImportedBasics(
      profile,
      profileImport.profileBasics,
    );
    const { itemsToCreate, skippedItemCount } = uniqueImportedItems(
      existingItems.map((item) => profileItemSchema.parse(withoutMongoId(item))),
      profileImport.items,
    );
    const newItems = itemsToCreate.map((item) =>
      createProfileItemRecord(item, userId, updatedAt),
    );

    await Promise.all([
      Object.keys(patch).length > 0
        ? collections.profiles.updateOne(
            { userId },
            { $set: { ...patch, updatedAt } },
          )
        : Promise.resolve(),
      newItems.length > 0
        ? collections.items.insertMany(newItems)
        : Promise.resolve(),
      collections.imports.updateOne(
        { id: importId, userId },
        {
          $set: {
            status: "applied",
            appliedAt: updatedAt,
            updatedAt,
          },
        },
      ),
    ]);

    const appliedImport = await collections.imports.findOne({
      id: importId,
      userId,
    });

    if (!appliedImport) {
      throw new Error("Profile import not found after applying.");
    }

    return profileImportApplyResultSchema.parse({
      import: withoutMongoId(appliedImport),
      addedItemCount: newItems.length,
      skippedItemCount,
      updatedBasicFields,
    });
  }

  const memory = getMemoryState();
  const importIndex = memory.imports.findIndex(
    (item) => item.id === importId && item.userId === userId,
  );

  if (importIndex === -1) {
    throw new Error("Profile import not found.");
  }

  const profileImport = memory.imports[importIndex];

  if (profileImport.status !== "pending") {
    throw new Error("Profile import has already been handled.");
  }

  const profile = ensureMemoryProfile(userId);
  const profileIndex = memory.profiles.findIndex((item) => item.id === profile.id);
  const existingItems = memory.items.filter((item) => item.userId === userId);
  const { patch, updatedBasicFields } = mergeImportedBasics(
    profile,
    profileImport.profileBasics,
  );
  const { itemsToCreate, skippedItemCount } = uniqueImportedItems(
    existingItems,
    profileImport.items,
  );
  const newItems = itemsToCreate.map((item) =>
    createProfileItemRecord(item, userId, updatedAt),
  );

  memory.profiles[profileIndex] = profileSchema.parse({
    ...profile,
    ...patch,
    updatedAt: Object.keys(patch).length > 0 ? updatedAt : profile.updatedAt,
  });
  memory.items.push(...newItems);
  memory.imports[importIndex] = profileImportSchema.parse({
    ...profileImport,
    status: "applied",
    appliedAt: updatedAt,
    updatedAt,
  });

  return profileImportApplyResultSchema.parse({
    import: memory.imports[importIndex],
    addedItemCount: newItems.length,
    skippedItemCount,
    updatedBasicFields,
  });
}

export async function rejectProfileImport(
  input: unknown,
  userId = SOLO_USER_ID,
) {
  const { importId } = profileImportActionInputSchema.parse(input);
  const updatedAt = now();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const profileImport = await collections.imports.findOneAndUpdate(
      {
        id: importId,
        userId,
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
          rejectedAt: updatedAt,
          updatedAt,
        },
      },
      { returnDocument: "after" },
    );

    if (!profileImport) {
      throw new Error("Pending profile import not found.");
    }

    return profileImportSchema.parse(withoutMongoId(profileImport));
  }

  const memory = getMemoryState();
  const index = memory.imports.findIndex(
    (item) =>
      item.id === importId &&
      item.userId === userId &&
      item.status === "pending",
  );

  if (index === -1) {
    throw new Error("Pending profile import not found.");
  }

  memory.imports[index] = profileImportSchema.parse({
    ...memory.imports[index],
    status: "rejected",
    rejectedAt: updatedAt,
    updatedAt,
  });

  return memory.imports[index];
}

export async function updateProfileItem(
  input: UpdateProfileItemInput,
  userId = SOLO_USER_ID,
) {
  const parsed = updateProfileItemInputSchema.parse(input);
  const updatedAt = now();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const item = await collections.items.findOneAndUpdate(
      { id: parsed.itemId, userId },
      {
        $set: {
          ...parsed.patch,
          updatedAt,
        },
      },
      { returnDocument: "after" },
    );

    if (!item) {
      throw new Error("Profile item not found.");
    }

    return profileItemSchema.parse(withoutMongoId(item));
  }

  const memory = getMemoryState();
  const index = memory.items.findIndex(
    (item) => item.id === parsed.itemId && item.userId === userId,
  );

  if (index === -1) {
    throw new Error("Profile item not found.");
  }

  const item = profileItemSchema.parse({
    ...memory.items[index],
    ...parsed.patch,
    updatedAt,
  });

  memory.items[index] = item;
  return item;
}

export async function deleteProfileItem(
  input: unknown,
  userId = SOLO_USER_ID,
) {
  const { itemId } = deleteProfileItemInputSchema.parse(input);

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const result = await collections.items.deleteOne({ id: itemId, userId });

    if (result.deletedCount === 0) {
      throw new Error("Profile item not found.");
    }

    return { ok: true };
  }

  const memory = getMemoryState();
  const existing = memory.items.find(
    (item) => item.id === itemId && item.userId === userId,
  );

  if (!existing) {
    throw new Error("Profile item not found.");
  }

  memory.items = memory.items.filter(
    (item) => item.id !== itemId || item.userId !== userId,
  );
  return { ok: true };
}

export async function deleteProfileUserData(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const [profiles, profileItems, profileImports] = await Promise.all([
      collections.profiles.deleteMany({ userId }),
      collections.items.deleteMany({ userId }),
      collections.imports.deleteMany({ userId }),
    ]);

    return {
      profiles: profiles.deletedCount,
      profileItems: profileItems.deletedCount,
      profileImports: profileImports.deletedCount,
    };
  }

  const memory = getMemoryState();
  const counts = {
    profiles: memory.profiles.filter((item) => item.userId === userId).length,
    profileItems: memory.items.filter((item) => item.userId === userId).length,
    profileImports: memory.imports.filter((item) => item.userId === userId)
      .length,
  };

  memory.profiles = memory.profiles.filter((item) => item.userId !== userId);
  memory.items = memory.items.filter((item) => item.userId !== userId);
  memory.imports = memory.imports.filter((item) => item.userId !== userId);

  return counts;
}
