import type { Store } from "@tauri-apps/plugin-store";

import { desktopCallbackScheme, getCareerightOrigin } from "./config";

const storePath = "careeright-desktop.json";
const sessionKey = "desktop-session";
const pendingStateKey = "desktop-auth-state";

export type DesktopSession = {
  token: string;
  expiresAt: string;
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
  };
};

let storePromise: Promise<Store> | undefined;

async function getStore() {
  storePromise ??= import("@tauri-apps/plugin-store").then(({ Store }) =>
    Store.load(storePath, {
      autoSave: 100,
      defaults: {},
    }),
  );

  return storePromise;
}

export async function loadDesktopSession() {
  if (!isTauriRuntime()) {
    return null;
  }

  const store = await getStore();
  const session = await store.get<DesktopSession>(sessionKey);

  if (!session?.token) {
    return null;
  }

  if (Date.parse(session.expiresAt) <= Date.now()) {
    await clearDesktopSession();
    return null;
  }

  return session;
}

export async function refreshDesktopSession(session: DesktopSession) {
  const response = await fetch(`${getCareerightOrigin()}/api/desktop-auth/session`, {
    headers: {
      authorization: `Bearer ${session.token}`,
    },
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || "Desktop session refresh failed.");
  }

  const payload = (await response.json()) as Pick<
    DesktopSession,
    "expiresAt" | "user"
  >;
  const refreshedSession: DesktopSession = {
    token: session.token,
    expiresAt: payload.expiresAt,
    user: payload.user,
  };

  await saveDesktopSession(refreshedSession);

  return refreshedSession;
}

export async function saveDesktopSession(session: DesktopSession) {
  if (!isTauriRuntime()) {
    return;
  }

  const store = await getStore();
  await store.set(sessionKey, session);
  await store.delete(pendingStateKey);
  await store.save();
}

export async function clearDesktopSession() {
  if (!isTauriRuntime()) {
    return;
  }

  const store = await getStore();
  await store.delete(sessionKey);
  await store.delete(pendingStateKey);
  await store.save();
}

export async function beginDesktopSignIn() {
  const state = createState();
  const authUrl = new URL("/desktop-auth/start", getCareerightOrigin());

  authUrl.searchParams.set("state", state);

  if (!isTauriRuntime()) {
    window.location.assign(authUrl.toString());
    return state;
  }

  const store = await getStore();
  await store.set(pendingStateKey, state);
  await store.save();
  await ensureDeepLinkRegistration();
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  await openUrl(authUrl.toString());

  return state;
}

export async function exchangeDesktopCode(code: string, state: string) {
  const store = await getStore();
  const pendingState = await store.get<string>(pendingStateKey);

  if (!pendingState || pendingState !== state) {
    const existingSession = await loadDesktopSession();

    if (existingSession) {
      return existingSession;
    }

    throw new Error("Desktop sign-in state did not match.");
  }

  const response = await fetch(
    `${getCareerightOrigin()}/api/desktop-auth/exchange`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ code, state }),
    },
  );

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || "Desktop sign-in failed.");
  }

  const session = (await response.json()) as DesktopSession;
  await saveDesktopSession(session);

  return session;
}

export async function pollDesktopAuthState(state: string) {
  const store = await getStore();
  const pendingState = await store.get<string>(pendingStateKey);

  if (!pendingState || pendingState !== state) {
    const existingSession = await loadDesktopSession();

    if (existingSession) {
      return existingSession;
    }

    throw new Error("Desktop sign-in state did not match.");
  }

  const response = await fetch(`${getCareerightOrigin()}/api/desktop-auth/poll`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ state }),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || "Desktop sign-in status check failed.");
  }

  const result = (await response.json()) as
    | ({ pending: true } & Partial<DesktopSession>)
    | ({ pending: false } & DesktopSession);

  if (result.pending) {
    return null;
  }

  const session: DesktopSession = {
    token: result.token,
    expiresAt: result.expiresAt,
    user: result.user,
  };

  await saveDesktopSession(session);

  return session;
}

export async function revokeDesktopSession(token: string) {
  await fetch(`${getCareerightOrigin()}/api/desktop-auth/revoke`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
    },
  }).catch(() => undefined);
}

export async function listenForDesktopCallbacks(
  onCallback: (url: URL) => void,
) {
  if (!isTauriRuntime()) {
    return () => undefined;
  }

  await ensureDeepLinkRegistration();
  const { getCurrent, onOpenUrl } = await import(
    "@tauri-apps/plugin-deep-link"
  );
  const currentUrls = await getCurrent().catch(() => null);

  currentUrls?.forEach((value) => dispatchCallback(value, onCallback));

  return onOpenUrl((urls) => {
    urls.forEach((value) => dispatchCallback(value, onCallback));
  });
}

function dispatchCallback(value: string, onCallback: (url: URL) => void) {
  try {
    const url = new URL(value);

    if (
      url.protocol === `${desktopCallbackScheme}:` &&
      url.hostname === "auth" &&
      url.pathname === "/callback"
    ) {
      onCallback(url);
    }
  } catch {
    // Ignore malformed URLs from the host OS.
  }
}

async function ensureDeepLinkRegistration() {
  if (!isTauriRuntime()) {
    return;
  }

  const { register } = await import("@tauri-apps/plugin-deep-link");
  await register(desktopCallbackScheme).catch(() => undefined);
}

function createState() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function readErrorMessage(response: Response) {
  try {
    const body = (await response.json()) as { error?: unknown };

    return typeof body.error === "string" ? body.error : "";
  } catch {
    return "";
  }
}

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
}
