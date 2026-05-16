import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import type { DesktopSession } from "./lib/auth";
import {
  beginDesktopSignIn,
  clearDesktopSession,
  exchangeDesktopCode,
  listenForDesktopCallbacks,
  loadDesktopSession,
  pollDesktopAuthState,
  revokeDesktopSession,
} from "./lib/auth";
import { getCareerightOrigin } from "./lib/config";
import { rpcClient } from "./lib/api";
import "./App.css";

type Status = "booting" | "signed-out" | "signed-in";

function App() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("booting");
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    loadDesktopSession()
      .then((storedSession) => {
        if (!mounted) {
          return;
        }

        setSession(storedSession);
        setStatus(storedSession ? "signed-in" : "signed-out");
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }

        setAuthError(getErrorMessage(error));
        setStatus("signed-out");
      });

    return () => {
      mounted = false;
    };
  }, []);

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
        setSession(nextSession);
        setStatus("signed-in");
        await queryClient.invalidateQueries();
      } catch (error) {
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
      setAuthError(getErrorMessage(error));
      setIsSigningIn(false);
    }
  }

  async function pollForBrowserCompletion(state: string) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < 5 * 60 * 1000) {
      const nextSession = await pollDesktopAuthState(state);

      if (nextSession) {
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

  function sleep(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function handleSignOut() {
    const token = session?.token;
    setSession(null);
    setStatus("signed-out");
    await queryClient.clear();

    if (token) {
      await revokeDesktopSession(token);
    }

    await clearDesktopSession();
  }

  if (status === "booting") {
    return (
      <main className="app-shell">
        <section className="center-panel">
          <div className="brand-mark">CR</div>
          <p className="eyebrow">Careeright Desktop</p>
          <h1>Opening your workspace.</h1>
        </section>
      </main>
    );
  }

  if (status === "signed-out") {
    return (
      <main className="app-shell auth-layout">
        <section className="auth-copy">
          <div className="brand-mark">CR</div>
          <p className="eyebrow">Careeright Desktop</p>
          <h1>Your career command center, now on desktop.</h1>
          <p className="lede">
            Sign in through your browser and Careeright will connect this app
            to the same jobs, board, DSA, profile, and MCP data you use on web.
          </p>
        </section>
        <section className="sign-in-card" aria-label="Sign in">
          <div>
            <p className="card-kicker">Production backend</p>
            <p className="backend-url">{getCareerightOrigin()}</p>
          </div>
          <button
            className="primary-button"
            disabled={isSigningIn}
            onClick={handleSignIn}
            type="button"
          >
            {isSigningIn ? "Waiting for browser..." : "Continue with Google"}
          </button>
          {authError ? <p className="error-text">{authError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="workspace-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Careeright Desktop</p>
          <h1>Backend-connected workspace</h1>
        </div>
        <button className="ghost-button" onClick={handleSignOut} type="button">
          Sign out
        </button>
      </header>
      <DashboardGrid onUnauthorized={handleSignOut} />
    </main>
  );
}

function DashboardGrid({ onUnauthorized }: { onUnauthorized: () => void }) {
  const queries = useDesktopQueries();
  const firstError = queries.find((query) => query.error)?.error;
  const isLoading = queries.some((query) => query.isLoading);

  useEffect(() => {
    if (firstError && isUnauthorizedError(firstError)) {
      onUnauthorized();
    }
  }, [firstError, onUnauthorized]);

  const cards = useMemo(() => {
    const analytics = queries[0].data as AnyRecord | undefined;
    const jobs = queries[1].data as unknown[] | undefined;
    const board = queries[2].data as AnyRecord | undefined;
    const dsa = queries[3].data as AnyRecord | undefined;
    const profile = queries[4].data as AnyRecord | undefined;
    const tokens = queries[5].data as unknown[] | undefined;
    const diary = queries[6].data as unknown[] | undefined;
    const history = queries[7].data as AnyRecord | undefined;
    const proposals = queries[8].data as unknown[] | undefined;

    return [
      statCard("Analytics", readNumber(analytics, ["healthScore", "score"]), "Workspace health"),
      statCard("Jobs", jobs?.length ?? 0, "Tracked opportunities"),
      statCard("Board", countTasks(board), "Active tasks"),
      statCard("DSA", readNumber(dsa, ["completedQuestions", "completed"]), "Completed"),
      statCard("Profile", countProfileItems(profile), "Profile items"),
      statCard("MCP", tokens?.length ?? 0, "Tokens"),
      statCard("Diary", diary?.length ?? 0, "Recent entries"),
      statCard("History", countHistoryDays(history), "Activity days"),
      statCard("Proposals", proposals?.length ?? 0, "AI suggestions"),
    ];
  }, [queries]);

  return (
    <>
      {firstError ? (
        <div className="notice" role="alert">
          {getErrorMessage(firstError)}
        </div>
      ) : null}
      <section className="grid">
        {cards.map((card) => (
          <article className="metric-card" key={card.label}>
            <p>{card.label}</p>
            <strong>{isLoading ? "..." : card.value}</strong>
            <span>{card.caption}</span>
          </article>
        ))}
      </section>
    </>
  );
}

function useDesktopQueries() {
  return [
    useQuery({
      queryKey: ["desktop", "dashboard", "analytics"],
      queryFn: () => rpcClient.dashboard.analytics(),
    }),
    useQuery({
      queryKey: ["desktop", "jobs"],
      queryFn: () => rpcClient.jobs.list(),
    }),
    useQuery({
      queryKey: ["desktop", "board"],
      queryFn: () => rpcClient.board.snapshot(),
    }),
    useQuery({
      queryKey: ["desktop", "dsa"],
      queryFn: () => rpcClient.dsa.snapshot(),
    }),
    useQuery({
      queryKey: ["desktop", "profile"],
      queryFn: () => rpcClient.profile.snapshot(),
    }),
    useQuery({
      queryKey: ["desktop", "mcp"],
      queryFn: () => rpcClient.mcpToken.list(),
    }),
    useQuery({
      queryKey: ["desktop", "diary"],
      queryFn: () => rpcClient.diary.listRecent({ limit: 7 }),
    }),
    useQuery({
      queryKey: ["desktop", "history"],
      queryFn: () => rpcClient.history.snapshot(),
    }),
    useQuery({
      queryKey: ["desktop", "proposals"],
      queryFn: () => rpcClient.proposal.list(),
    }),
  ];
}

type AnyRecord = Record<string, unknown>;

function statCard(label: string, value: number | string, caption: string) {
  return { label, value, caption };
}

function readNumber(record: AnyRecord | undefined, keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];

    if (typeof value === "number") {
      return value;
    }
  }

  return 0;
}

function countTasks(board: AnyRecord | undefined) {
  const columns = board?.columns;

  if (!Array.isArray(columns)) {
    return 0;
  }

  return columns.reduce((total, column) => {
    if (!column || typeof column !== "object") {
      return total;
    }

    const tasks = (column as AnyRecord).tasks;
    return total + (Array.isArray(tasks) ? tasks.length : 0);
  }, 0);
}

function countProfileItems(profile: AnyRecord | undefined) {
  const items = profile?.items;

  return Array.isArray(items) ? items.length : 0;
}

function countHistoryDays(history: AnyRecord | undefined) {
  const days = history?.days ?? history?.daily;

  return Array.isArray(days) ? days.length : 0;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function isUnauthorizedError(error: unknown) {
  return /unauthorized|401/i.test(getErrorMessage(error));
}

export default App;
