import { Fragment, Suspense, lazy, useEffect, useState } from "react";
import { useQueryClient } from "@repo/ui/providers/query-provider";

import {
  beginDesktopSignIn,
  clearDesktopSession,
  exchangeDesktopCode,
  listenForDesktopCallbacks,
  loadDesktopSession,
  pollDesktopAuthState,
  refreshDesktopSession,
  revokeDesktopSession,
  type DesktopSession,
} from "./lib/auth";
import { CareerightLogo } from "./platform/careeright-logo";
import "./App.css";

type Status = "booting" | "signed-out" | "signed-in";

const loadDesktopAuthScreen = () =>
  import("./platform/desktop-auth-screen").then((module) => ({
    default: module.DesktopAuthScreen,
  }));
const loadDesktopUpdatePrompt = () =>
  import("./platform/desktop-update-prompt").then((module) => ({
    default: module.DesktopUpdatePrompt,
  }));
let desktopWorkspaceModulePromise:
  | Promise<typeof import("./platform/desktop-workspace")>
  | undefined;
const loadDesktopWorkspaceModule = () => {
  desktopWorkspaceModulePromise ??= import("./platform/desktop-workspace");
  return desktopWorkspaceModulePromise;
};
const loadDesktopWorkspace = () =>
  loadDesktopWorkspaceModule().then((module) => ({
    default: module.DesktopWorkspace,
  }));

const DesktopAuthScreen = lazy(loadDesktopAuthScreen);
const DesktopUpdatePrompt = lazy(loadDesktopUpdatePrompt);
const DesktopWorkspace = lazy(loadDesktopWorkspace);

applyInitialDesktopTheme();

function App() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("booting");
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [shouldLoadUpdatePrompt, setShouldLoadUpdatePrompt] = useState(false);

  useEffect(() => {
    let mounted = true;
    let cancelSessionRefresh: () => void = () => undefined;

    loadDesktopSession()
      .then(async (storedSession) => {
        if (!mounted) return;

        if (!storedSession) {
          void loadDesktopAuthScreen();
          setSession(null);
          setStatus("signed-out");
          return;
        }

        await prepareCachedWorkspace(queryClient, storedSession.user.id);

        if (!mounted) return;
        setSession(storedSession);
        setStatus("signed-in");
        cancelSessionRefresh = scheduleDesktopSessionRefresh(
          storedSession,
          (refreshedSession) => {
            if (mounted) {
              setSession(refreshedSession);
            }
          },
        );
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        void loadDesktopAuthScreen();
        setAuthError(getErrorMessage(error));
        setStatus("signed-out");
      });

    return () => {
      mounted = false;
      cancelSessionRefresh();
    };
  }, [queryClient]);

  useEffect(() => {
    if (status !== "signed-out") {
      return;
    }

    let unlisten: (() => void) | undefined;

    listenForDesktopCallbacks(async (url) => {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");

      if (!code || !state) {
        setAuthError("Desktop sign-in callback was missing code or state.");
        return;
      }

      setIsSigningIn(true);
      setAuthError("");

      try {
        const nextSession = await exchangeDesktopCode(code, state);
        await prepareCachedWorkspace(queryClient, nextSession.user.id);
        setSession(nextSession);
        setStatus("signed-in");
        await queryClient.invalidateQueries();
      } catch (error) {
        const storedSession = await loadDesktopSession().catch(() => null);

        if (storedSession) {
          await prepareCachedWorkspace(queryClient, storedSession.user.id);
          setSession(storedSession);
          setStatus("signed-in");
          setAuthError("");
          return;
        }

        setAuthError(getErrorMessage(error));
        setStatus("signed-out");
      } finally {
        setIsSigningIn(false);
      }
    })
      .then((unsubscribe) => {
        unlisten = unsubscribe;
      })
      .catch((error: unknown) => {
        setAuthError(getErrorMessage(error));
      });

    return () => {
      unlisten?.();
    };
  }, [queryClient, status]);

  useEffect(() => {
    if (status === "booting" || shouldLoadUpdatePrompt) {
      return;
    }

    return scheduleDesktopIdleTask(() => setShouldLoadUpdatePrompt(true), {
      timeout: 2500,
    });
  }, [shouldLoadUpdatePrompt, status]);

  async function handleSignIn() {
    setIsSigningIn(true);
    setAuthError("");

    try {
      const state = await beginDesktopSignIn();
      await pollForBrowserCompletion(state);
    } catch (error) {
      const storedSession = await loadDesktopSession().catch(() => null);

      if (storedSession) {
        await prepareCachedWorkspace(queryClient, storedSession.user.id);
        setSession(storedSession);
        setStatus("signed-in");
        setAuthError("");
        setIsSigningIn(false);
        await queryClient.invalidateQueries();
        return;
      }

      setAuthError(getErrorMessage(error));
      setIsSigningIn(false);
    }
  }

  async function pollForBrowserCompletion(state: string) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 5 * 60 * 1000) {
      const nextSession = await pollDesktopAuthState(state);

      if (nextSession) {
        await prepareCachedWorkspace(queryClient, nextSession.user.id);
        setSession(nextSession);
        setStatus("signed-in");
        setIsSigningIn(false);
        await queryClient.invalidateQueries();
        return;
      }

      await sleep(1500);
    }

    setAuthError("Desktop sign-in timed out. Please try again.");
    setIsSigningIn(false);
  }

  async function handleSignOut() {
    const token = session?.token;
    const userId = session?.user.id;
    setSession(null);
    setStatus("signed-out");
    queryClient.clear();

    if (token) await revokeDesktopSession(token);
    if (userId) await clearCachedWorkspace(userId);
    if (userId) {
      const { clearDesktopOfflineMutationQueue } = await import(
        "./lib/offline-mutations"
      );
      await clearDesktopOfflineMutationQueue(userId);
    }
    await clearDesktopSession();
  }

  if (status === "booting") {
    return (
      <main className="auth-page">
        <section className="auth-copy auth-copy-centered">
          <CareerightLogo className="size-12" sizes="48px" />
          <p className="eyebrow">Careeright Desktop</p>
          <h1>Opening your workspace.</h1>
          <p className="lede">Preparing your local shell and protected workspace.</p>
        </section>
      </main>
    );
  }

  if (status === "signed-out") {
    return (
      <Fragment>
        <Suspense fallback={<AuthPageFallback />}>
          <DesktopAuthScreen
            authError={authError}
            isSigningIn={isSigningIn}
            onSignIn={handleSignIn}
          />
        </Suspense>
        {shouldLoadUpdatePrompt ? (
          <Suspense fallback={null}>
            <DesktopUpdatePrompt />
          </Suspense>
        ) : null}
      </Fragment>
    );
  }

  if (!session) {
    return <WorkspaceBootFallback />;
  }

  return (
    <Fragment>
      <Suspense fallback={<WorkspaceBootFallback />}>
        <DesktopWorkspace session={session} onSignOut={handleSignOut} />
      </Suspense>
      {shouldLoadUpdatePrompt ? (
        <Suspense fallback={null}>
          <DesktopUpdatePrompt />
        </Suspense>
      ) : null}
    </Fragment>
  );
}

function WorkspaceBootFallback() {
  return (
    <main className="auth-page">
      <section className="auth-copy auth-copy-centered">
        <CareerightLogo className="size-12" sizes="48px" />
        <p className="eyebrow">Careeright Desktop</p>
        <h1>Opening your workspace.</h1>
        <p className="lede">Loading your local dashboard shell.</p>
      </section>
    </main>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function scheduleDesktopIdleTask(
  task: () => void,
  options: { timeout: number },
) {
  const desktopWindow = window as Window & {
    cancelIdleCallback?: (handle: number) => void;
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
  };

  if (desktopWindow.requestIdleCallback && desktopWindow.cancelIdleCallback) {
    const handle = desktopWindow.requestIdleCallback(task, options);

    return () => desktopWindow.cancelIdleCallback?.(handle);
  }

  const timeoutId = window.setTimeout(task, Math.min(options.timeout, 1000));

  return () => window.clearTimeout(timeoutId);
}

function scheduleDesktopSessionRefresh(
  session: DesktopSession,
  onRefresh: (session: DesktopSession) => void,
) {
  let disposed = false;
  let removeOnlineListener: (() => void) | undefined;

  async function refreshSession() {
    try {
      const refreshedSession = await refreshDesktopSession(session);

      if (!disposed) {
        onRefresh(refreshedSession);
      }
    } catch {
      // Keep a valid local session even if the identity refresh is offline.
    }
  }

  function refreshWhenReady() {
    if (disposed) {
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const handleOnline = () => {
        removeOnlineListener?.();
        removeOnlineListener = undefined;
        void refreshSession();
      };

      window.addEventListener("online", handleOnline, { once: true });
      removeOnlineListener = () =>
        window.removeEventListener("online", handleOnline);
      return;
    }

    void refreshSession();
  }

  const cancelIdleRefresh = scheduleDesktopIdleTask(refreshWhenReady, {
    timeout: 4000,
  });

  return () => {
    disposed = true;
    cancelIdleRefresh();
    removeOnlineListener?.();
  };
}

async function prepareCachedWorkspace(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
) {
  const restoreWorkspacePromise = restoreCachedWorkspace(queryClient, userId);
  void loadDesktopWorkspaceModule().then((module) =>
    module.preloadInitialDesktopWorkspaceRoute(),
  );
  await restoreWorkspacePromise;
}

async function restoreCachedWorkspace(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
) {
  try {
    const { restoreDesktopQueryCache } = await import("./lib/query-persistence");
    await restoreDesktopQueryCache(queryClient, userId);
  } catch (error) {
    console.info("Careeright cached workspace restore failed", error);
  }
}

async function clearCachedWorkspace(userId: string) {
  const { clearDesktopQueryCache } = await import("./lib/query-persistence");
  await clearDesktopQueryCache(userId);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function AuthPageFallback() {
  return (
    <main className="auth-page">
      <section className="auth-copy auth-copy-centered">
        <CareerightLogo className="size-12" sizes="48px" />
        <p className="eyebrow">Careeright Desktop</p>
        <h1>Preparing sign-in.</h1>
        <p className="lede">Loading the desktop entry screen.</p>
      </section>
    </main>
  );
}

function applyInitialDesktopTheme() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const storedTheme = localStorage.getItem("careeright-desktop-theme");

  if (storedTheme === "light" || storedTheme === "dark") {
    document.documentElement.classList.toggle("dark", storedTheme === "dark");
    return;
  }

  document.documentElement.classList.toggle(
    "dark",
    window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
}

export default App;

