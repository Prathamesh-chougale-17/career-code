import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type Query,
  type QueryCacheNotifyEvent,
  type QueryClient,
} from "@tanstack/react-query";
import type { Store } from "@tauri-apps/plugin-store";

const storePath = "careeright-desktop-query-cache.json";
const cacheVersion = 1;
const cacheMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
const persistDelayMs = 1200;
const persistedQueryRoots = new Set([
  "board-snapshot",
  "dashboard-analytics",
  "dashboard-metrics",
  "diary-day",
  "diary-recent",
  "dsa-snapshot",
  "friend-share-detail",
  "friend-shares",
  "friends-summary",
  "history-snapshot",
  "job-application-runs",
  "job-digests",
  "job-search-profile",
  "jobs",
  "leaderboard-snapshot",
  "profile-imports",
  "profile-snapshot",
  "project-detail",
  "projects-list",
  "projects-summary",
  "proposal-history",
  "system-design-snapshot",
]);

type PersistedQueryCache = {
  version: typeof cacheVersion;
  savedAt: number;
  state: DehydratedState;
};

type DesktopPersistableQuery = Pick<Query, "queryKey" | "state">;
type DesktopQueryCacheEvent = {
  action?: { type?: string };
  query?: DesktopPersistableQuery;
  type: QueryCacheNotifyEvent["type"];
};

let storePromise: Promise<Store> | undefined;

function getStore() {
  storePromise ??= import("@tauri-apps/plugin-store").then(({ Store }) =>
    Store.load(storePath, {
      autoSave: 1000,
      defaults: {},
    }),
  );

  return storePromise;
}

export async function restoreDesktopQueryCache(
  queryClient: QueryClient,
  userId: string,
) {
  if (!isTauriRuntime()) {
    return;
  }

  const store = await getStore();
  const key = cacheKey(userId);
  const persisted = await store.get<unknown>(key);

  if (!isPersistedQueryCache(persisted)) {
    return;
  }

  if (Date.now() - persisted.savedAt > cacheMaxAgeMs) {
    await store.delete(key);
    await store.save();
    return;
  }

  hydrate(queryClient, persisted.state);
}

export function installDesktopQueryPersistence(
  queryClient: QueryClient,
  userId: string,
) {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  let disposed = false;
  let idleSaveCancel: (() => void) | undefined;
  let lastSerializedSnapshot: string | undefined;
  let saveTimer: number | undefined;
  let savePromise = Promise.resolve();

  function scheduleSave() {
    if (disposed) {
      return;
    }

    window.clearTimeout(saveTimer);
    idleSaveCancel?.();
    saveTimer = window.setTimeout(() => {
      idleSaveCancel = schedulePersistenceIdleTask(persistNow);
    }, persistDelayMs);
  }

  function persistNow() {
    savePromise = savePromise
      .then(async () => {
        lastSerializedSnapshot = await saveDesktopQueryCache(
          queryClient,
          userId,
          lastSerializedSnapshot,
        );
      })
      .catch((error: unknown) => {
        console.info("Careeright query cache persistence failed", error);
      });
  }

  function saveSoon() {
    if (document.visibilityState === "hidden") {
      flushSave();
      return;
    }

    scheduleSave();
  }

  function flushSave() {
    window.clearTimeout(saveTimer);
    idleSaveCancel?.();
    idleSaveCancel = undefined;
    persistNow();
  }

  const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
    if (shouldSaveDesktopQueryCacheEvent(event)) {
      saveSoon();
    }
  });

  window.addEventListener("visibilitychange", saveSoon);
  window.addEventListener("beforeunload", flushSave);

  return () => {
    flushSave();
    unsubscribe();
    window.removeEventListener("visibilitychange", saveSoon);
    window.removeEventListener("beforeunload", flushSave);
    disposed = true;
  };
}

export async function clearDesktopQueryCache(userId: string) {
  if (!isTauriRuntime()) {
    return;
  }

  const store = await getStore();
  await store.delete(cacheKey(userId));
  await store.save();
}

export function shouldDehydrateDesktopQuery(query: DesktopPersistableQuery) {
  const root = query.queryKey[0];

  return (
    query.state.status === "success" &&
    typeof root === "string" &&
    persistedQueryRoots.has(root)
  );
}

export function shouldSaveDesktopQueryCacheEvent(
  event: DesktopQueryCacheEvent,
) {
  if (!event.query) {
    return false;
  }

  if (event.type === "removed") {
    return isDesktopPersistedQueryRoot(event.query.queryKey);
  }

  if (event.type === "added") {
    return shouldDehydrateDesktopQuery(event.query);
  }

  if (event.type !== "updated" || !shouldDehydrateDesktopQuery(event.query)) {
    return false;
  }

  return event.action?.type === "success" || event.action?.type === "setState";
}

export function createDesktopQueryCacheSnapshot(queryClient: QueryClient) {
  return normalizeDesktopQueryCacheState(
    dehydrate(queryClient, {
      shouldDehydrateQuery: shouldDehydrateDesktopQuery,
    }),
  );
}

export function serializeDesktopQueryCacheState(state: DehydratedState) {
  return JSON.stringify(state);
}

async function saveDesktopQueryCache(
  queryClient: QueryClient,
  userId: string,
  previousSerializedSnapshot: string | undefined,
) {
  if (!isTauriRuntime()) {
    return previousSerializedSnapshot;
  }

  const state = createDesktopQueryCacheSnapshot(queryClient);
  const serializedSnapshot = serializeDesktopQueryCacheState(state);

  if (serializedSnapshot === previousSerializedSnapshot) {
    return previousSerializedSnapshot;
  }

  const store = await getStore();

  if (state.queries.length === 0) {
    await store.delete(cacheKey(userId));
    await store.save();
    return serializedSnapshot;
  }

  await store.set(cacheKey(userId), {
    version: cacheVersion,
    savedAt: Date.now(),
    state,
  } satisfies PersistedQueryCache);
  await store.save();
  return serializedSnapshot;
}

function normalizeDesktopQueryCacheState(state: DehydratedState) {
  return {
    mutations: [],
    queries: state.queries
      .map((query) => {
        const normalizedQuery = {
          ...query,
          state: {
            ...query.state,
            fetchFailureCount: 0,
            fetchFailureReason: null,
            fetchMeta: null,
            fetchStatus: "idle" as const,
          },
        };

        delete normalizedQuery.dehydratedAt;
        return normalizedQuery;
      })
      .sort((left, right) => left.queryHash.localeCompare(right.queryHash)),
  } satisfies DehydratedState;
}

function isDesktopPersistedQueryRoot(queryKey: readonly unknown[]) {
  const root = queryKey[0];

  return typeof root === "string" && persistedQueryRoots.has(root);
}

function schedulePersistenceIdleTask(task: () => void) {
  const desktopWindow = window as Window & {
    cancelIdleCallback?: (handle: number) => void;
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
  };

  if (desktopWindow.requestIdleCallback && desktopWindow.cancelIdleCallback) {
    const handle = desktopWindow.requestIdleCallback(task, {
      timeout: 1000,
    });

    return () => desktopWindow.cancelIdleCallback?.(handle);
  }

  const timeoutId = window.setTimeout(task, 0);

  return () => window.clearTimeout(timeoutId);
}

function cacheKey(userId: string) {
  return `query-cache:${userId}`;
}

function isPersistedQueryCache(value: unknown): value is PersistedQueryCache {
  if (!value || typeof value !== "object") {
    return false;
  }

  const cache = value as Partial<PersistedQueryCache>;

  return (
    cache.version === cacheVersion &&
    typeof cache.savedAt === "number" &&
    typeof cache.state === "object" &&
    cache.state !== null
  );
}

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}
