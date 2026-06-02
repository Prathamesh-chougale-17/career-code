import {
  dehydrate,
  hydrate,
  type DehydratedState,
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
  let saveTimer: number | undefined;

  function scheduleSave() {
    if (disposed) {
      return;
    }

    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      void saveDesktopQueryCache(queryClient, userId);
    }, persistDelayMs);
  }

  function saveSoon() {
    if (document.visibilityState === "hidden") {
      window.clearTimeout(saveTimer);
      void saveDesktopQueryCache(queryClient, userId);
      return;
    }

    scheduleSave();
  }

  const unsubscribe = queryClient.getQueryCache().subscribe(saveSoon);

  window.addEventListener("visibilitychange", saveSoon);
  window.addEventListener("beforeunload", saveSoon);

  return () => {
    window.clearTimeout(saveTimer);
    unsubscribe();
    window.removeEventListener("visibilitychange", saveSoon);
    window.removeEventListener("beforeunload", saveSoon);
    void saveDesktopQueryCache(queryClient, userId);
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

async function saveDesktopQueryCache(queryClient: QueryClient, userId: string) {
  if (!isTauriRuntime()) {
    return;
  }

  const state = dehydrate(queryClient, {
    shouldDehydrateQuery: (query) => {
      const root = query.queryKey[0];

      return (
        query.state.status === "success" &&
        typeof root === "string" &&
        persistedQueryRoots.has(root)
      );
    },
  });

  if (state.queries.length === 0) {
    return;
  }

  const store = await getStore();
  await store.set(cacheKey(userId), {
    version: cacheVersion,
    savedAt: Date.now(),
    state,
  } satisfies PersistedQueryCache);
  await store.save();
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
