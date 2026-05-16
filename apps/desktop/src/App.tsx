import { openUrl } from "@tauri-apps/plugin-opener";
import { CareerightUiProvider } from "@repo/ui/providers/careeright-ui-provider";
import { DashboardShell } from "@repo/ui/components/dashboard-shell";
import {
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import Link from "./adapters/next/link";
import {
  beginDesktopSignIn,
  clearDesktopSession,
  exchangeDesktopCode,
  listenForDesktopCallbacks,
  loadDesktopSession,
  pollDesktopAuthState,
  revokeDesktopSession,
  type DesktopSession,
} from "./lib/auth";
import { createAuthenticatedHeaders, rpcClient } from "./lib/api";
import { getCareerightOrigin } from "./lib/config";
import { CareerightLogo } from "./platform/careeright-logo";
import { ThemeToggle } from "./platform/theme-toggle";
import { UserAccountMenu } from "./platform/user-account-menu";
import { DashboardAnalyticsApp } from "@repo/ui/components/dashboard/dashboard-analytics-app";
import { DiaryApp } from "@repo/ui/components/diary/diary-app";
import { DsaApp } from "@repo/ui/components/dsa/dsa-app";
import { HistoryApp } from "@repo/ui/components/history/history-app";
import { JobsApp } from "@repo/ui/components/jobs/jobs-app";
import { KanbanApp } from "@repo/ui/components/kanban/kanban-app";
import { McpToolsApp } from "@repo/ui/components/mcp/mcp-tools-app";
import { ProfileApp } from "@repo/ui/components/profile/profile-app";
import { ProposalApp } from "@repo/ui/components/proposals/proposal-app";
import { Button } from "@repo/ui/components/ui/button";
import "./App.css";

type Status = "booting" | "signed-out" | "signed-in";
type Route =
  | "analytics"
  | "board"
  | "jobs"
  | "diary"
  | "dsa"
  | "history"
  | "proposals"
  | "mcp-tools"
  | "profile";
type ThemeMode = "light" | "dark";
function App() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status>("booting");
  const [session, setSession] = useState<DesktopSession | null>(null);
  const [authError, setAuthError] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [route, setRoute] = useState<Route>("analytics");
  const [theme, setTheme] = useState<ThemeMode>(() =>
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("careeright-desktop-theme", theme);
  }, [theme]);

  useEffect(() => {
    const storedTheme = localStorage.getItem("careeright-desktop-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    function handleDesktopNavigation(event: Event) {
      const detail = (event as CustomEvent<{ route?: Route }>).detail;
      if (detail?.route) setRoute(detail.route);
    }

    window.addEventListener("careeright:navigate", handleDesktopNavigation);
    return () => window.removeEventListener("careeright:navigate", handleDesktopNavigation);
  }, []);

  useEffect(() => {
    let mounted = true;

    loadDesktopSession()
      .then((storedSession) => {
        if (!mounted) return;
        setSession(storedSession);
        setStatus(storedSession ? "signed-in" : "signed-out");
      })
      .catch((error: unknown) => {
        if (!mounted) return;
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

  async function handleSignOut() {
    const token = session?.token;
    setSession(null);
    setStatus("signed-out");
    queryClient.clear();

    if (token) await revokeDesktopSession(token);
    await clearDesktopSession();
  }

  if (status === "booting") {
    return (
      <main className="auth-page">
        <section className="auth-copy">
          <LogoMark />
          <p className="eyebrow">Careeright Desktop</p>
          <h1>Opening your workspace.</h1>
        </section>
      </main>
    );
  }

  if (status === "signed-out") {
    return (
      <main className="auth-page">
        <section className="auth-copy">
          <LogoMark />
          <p className="eyebrow">Careeright Desktop</p>
          <h1>Your web dashboard, rebuilt for desktop.</h1>
          <p className="lede">
            Sign in through Google to connect this desktop client to your Careeright workspace.
          </p>
        </section>
        <section className="auth-card" aria-label="Sign in">
          <p className="card-kicker">Production backend</p>
          <p className="mono-text">{getCareerightOrigin()}</p>
          <Button size="lg" disabled={isSigningIn} onClick={handleSignIn}>
            {isSigningIn ? <Loader2 className="spin" /> : null}
            {isSigningIn ? "Waiting for browser..." : "Continue with Google"}
          </Button>
          {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <CareerightUiProvider
      value={{
        rpcClient,
        currentRoute: route,
        navigate: setRoute,
        LinkComponent: Link,
        LogoComponent: CareerightLogo,
        ThemeToggleComponent: () => (
          <ThemeToggle
            theme={theme}
            onThemeChange={() =>
              setTheme((current) => (current === "dark" ? "light" : "dark"))
            }
          />
        ),
        UserAccountMenuComponent: ({ className }) => (
          <UserAccountMenu className={className} onSignOut={handleSignOut} />
        ),
        openExternal: openExternalUrl,
        uploadResume: uploadResumePdf,
        copyText: (text) => navigator.clipboard.writeText(text),
      }}
    >
      <DashboardShell>
        <DashboardRoute route={route} />
      </DashboardShell>
    </CareerightUiProvider>
  );
}

function DashboardRoute({ route }: { route: Route }) {
  if (route === "board") return <KanbanApp />;
  if (route === "jobs") return <JobsApp />;
  if (route === "diary") return <DiaryApp />;
  if (route === "dsa") return <DsaApp />;
  if (route === "history") return <HistoryApp />;
  if (route === "proposals") return <ProposalApp />;
  if (route === "mcp-tools") return <McpToolsApp />;
  if (route === "profile") return <ProfileApp />;
  return <DashboardAnalyticsApp />;
}

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      CR
    </span>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export async function openExternalUrl(url: string) {
  if (!url.trim()) return;
  await openUrl(url);
}

async function uploadResumePdf(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${getCareerightOrigin()}/api/profile/resume`, {
    method: "POST",
    headers: await createAuthenticatedHeaders(),
    body: formData,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload && typeof payload.error === "string"
        ? payload.error
        : "Resume PDF import failed.",
    );
  }

  return payload;
}

export default App;

