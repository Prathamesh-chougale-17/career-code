import {
  getCurrent,
  onOpenUrl,
  register,
} from "@tauri-apps/plugin-deep-link";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Store } from "@tauri-apps/plugin-store";

import { desktopCallbackScheme, getCareerightOrigin } from "./config";

const storePath = "careeright-desktop.json";
const sessionKey = "desktop-session";
const pendingStateKey = "desktop-auth-state";

export type DesktopSession = {
  token: string;
  expiresAt: string;
  user: {
    id: string;
  };
};

let storePromise: Promise<Store> | undefined;

async function getStore() {
  storePromise ??= Store.load(storePath, {
    autoSave: 100,
    defaults: {},
  });

  return storePromise;
}

export async function loadDesktopSession() {
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

export async function saveDesktopSession(session: DesktopSession) {
  const store = await getStore();
  await store.set(sessionKey, session);
  await store.delete(pendingStateKey);
  await store.save();
}

export async function clearDesktopSession() {
  const store = await getStore();
  await store.delete(sessionKey);
  await store.delete(pendingStateKey);
  await store.save();
}

export async function beginDesktopSignIn() {
  const state = createState();
  const store = await getStore();
  const authUrl = new URL("/desktop-auth/start", getCareerightOrigin());

  authUrl.searchParams.set("state", state);
  await store.set(pendingStateKey, state);
  await store.save();
  await ensureDeepLinkRegistration();
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
  await ensureDeepLinkRegistration();
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
