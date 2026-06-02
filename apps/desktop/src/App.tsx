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

const DesktopAuthScreen = lazy(() =>
  import("./platform/desktop-auth-screen").then((module) => ({
    default: module.DesktopAuthScreen,
  })),
);
const DesktopUpdatePrompt = lazy(() =>
  import("./platform/desktop-update-prompt").then((module) => ({
    default: module.DesktopUpdatePrompt,
  })),
);
const DesktopWorkspace = lazy(() =>
  import("./platform/desktop-workspace").then((module) => ({
    default: module.DesktopWorkspace,
  })),
);

applyInitialDesktopTheme();

function App() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("booting");
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadDesktopSession()
      .then(async (storedSession) => {
        if (!mounted) return;

        if (!storedSession) {
          setSession(null);
          setStatus("signed-out");
          return;
        }

        await restoreCachedWorkspace(queryClient, storedSession.user.id);

        if (!mounted) return;
        setSession(storedSession);
        setStatus("signed-in");

        try {
          const refreshedSession = await refreshDesktopSession(storedSession);

          if (mounted) {
            setSession(refreshedSession);
          }
        } catch {
          // Keep a valid local session even if the identity refresh is offline.
        }
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setAuthError(getErrorMessage(error));
        setStatus("signed-out");
      });

    return () => {
      mounted = false;
    };
  }, [queryClient]);

  useEffect(() => {
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
        await restoreCachedWorkspace(queryClient, nextSession.user.id);
        setSession(nextSession);
        setStatus("signed-in");
        await queryClient.invalidateQueries();
      } catch (error) {
        const storedSession = await loadDesktopSession().catch(() => null);

        if (storedSession) {
          await restoreCachedWorkspace(queryClient, storedSession.user.id);
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
  }, [queryClient]);

  async function handleSignIn() {
    setIsSigningIn(true);
    setAuthError("");

    try {
      const state = await beginDesktopSignIn();
      await pollForBrowserCompletion(state);
    } catch (error) {
      const storedSession = await loadDesktopSession().catch(() => null);

      if (storedSession) {
        await restoreCachedWorkspace(queryClient, storedSession.user.id);
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
        await restoreCachedWorkspace(queryClient, nextSession.user.id);
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
        <Suspense fallback={null}>
          <DesktopUpdatePrompt />
        </Suspense>
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
      <Suspense fallback={null}>
        <DesktopUpdatePrompt />
      </Suspense>
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

