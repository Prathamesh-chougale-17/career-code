import { openUrl } from "@tauri-apps/plugin-opener";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type DownloadEvent, type Update } from "@tauri-apps/plugin-updater";
import { CareerightUiProvider } from "@repo/ui/providers/careeright-ui-provider";
import { DashboardShell } from "@repo/ui/components/dashboard-shell";
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  DownloadCloud,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@repo/ui/providers/query-provider";

import Link from "./adapters/next/link";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
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
      .then(async (storedSession) => {
        if (!mounted) return;

        if (!storedSession) {
          setSession(null);
          setStatus("signed-out");
          return;
        }

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
        const storedSession = await loadDesktopSession().catch(() => null);

        if (storedSession) {
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
        <main className="auth-page">
          <section className="auth-copy">
            <div className="brand-row">
              <CareerightLogo className="size-12" sizes="48px" />
              <div>
                <p className="eyebrow">Careeright Desktop</p>
                <p className="brand-subtitle">Private career execution workspace</p>
              </div>
            </div>
            <h1>Your Careeright workspace, tuned for desktop.</h1>
            <p className="lede">
              Connect with Google to load your jobs, board, proposals, diary, DSA
              progress, profile, and MCP tools through the production backend.
            </p>
            <div className="auth-pills">
              <span><Sparkles aria-hidden="true" /> Review-first AI</span>
              <span><Briefcase aria-hidden="true" /> Job pipeline</span>
              <span><ShieldCheck aria-hidden="true" /> Bearer session</span>
            </div>
            <section className="desktop-preview" aria-label="Workspace preview">
              <div className="preview-header">
                <div>
                  <p>Live workspace</p>
                  <span>Dashboard parity with the web app</span>
                </div>
                <strong>4/5 ready</strong>
              </div>
              <div className="preview-grid">
                <PreviewMetric label="Jobs" value="123" tone="amber" />
                <PreviewMetric label="Profile" value="100%" tone="lime" />
                <PreviewMetric label="Proposals" value="3" tone="violet" />
              </div>
              <div className="preview-row">
                <span>Backend Engineer - Node.js</span>
                <strong>not applied</strong>
              </div>
            </section>
          </section>
          <section className="auth-card" aria-label="Sign in">
            <div className="auth-card-header">
              <p className="card-kicker">Production backend</p>
              <CheckCircle2 aria-hidden="true" />
            </div>
            <h2>Continue to Careeright</h2>
            <p className="muted">
              We will open Google in your system browser and return here after the
              desktop session is created.
            </p>
            <p className="mono-text">{getCareerightOrigin()}</p>
            <Button size="lg" disabled={isSigningIn} onClick={handleSignIn}>
              {isSigningIn ? <Loader2 className="spin" /> : null}
              {isSigningIn ? "Waiting for browser..." : "Continue with Google"}
              {!isSigningIn ? <ArrowRight data-icon="inline-end" aria-hidden="true" /> : null}
            </Button>
            {authError ? <p className="text-sm text-destructive">{authError}</p> : null}
          </section>
        </main>
        <DesktopUpdatePrompt />
      </Fragment>
    );
  }

  return (
    <Fragment>
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
            <UserAccountMenu
              className={className}
              onSignOut={handleSignOut}
              user={session?.user ?? null}
            />
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
      <DesktopUpdatePrompt />
    </Fragment>
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

function DesktopUpdatePrompt() {
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [contentLength, setContentLength] = useState<number | null>(null);
  const [updateError, setUpdateError] = useState("");
  const updateRef = useRef<Update | null>(null);
  const dismissedVersionRef = useRef<string | null>(null);
  const isInstallingRef = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV || !isTauriRuntime()) {
      return;
    }

    let disposed = false;

    async function checkForUpdate() {
      if (disposed || updateRef.current || isInstallingRef.current) {
        return;
      }

      try {
        const nextUpdate = await check({ timeout: 30000 });

        if (!nextUpdate) {
          return;
        }

        if (nextUpdate.version === dismissedVersionRef.current) {
          await nextUpdate.close();
          return;
        }

        updateRef.current = nextUpdate;
        setAvailableUpdate(nextUpdate);
        setIsOpen(true);
      } catch (error) {
        console.info("Careeright updater check failed", error);
      }
    }

    const launchTimer = window.setTimeout(checkForUpdate, 3000);
    const interval = window.setInterval(checkForUpdate, 4 * 60 * 60 * 1000);

    return () => {
      disposed = true;
      window.clearTimeout(launchTimer);
      window.clearInterval(interval);
      if (!isInstallingRef.current) {
        void updateRef.current?.close().catch(() => undefined);
      }
    };
  }, []);

  async function dismissUpdate() {
    if (!availableUpdate || isInstalling) {
      return;
    }

    dismissedVersionRef.current = availableUpdate.version;
    updateRef.current = null;
    setIsOpen(false);
    setAvailableUpdate(null);
    setUpdateError("");
    setDownloadedBytes(0);
    setContentLength(null);
    await availableUpdate.close().catch(() => undefined);
  }

  async function installUpdate() {
    if (!availableUpdate) {
      return;
    }

    isInstallingRef.current = true;
    setIsInstalling(true);
    setUpdateError("");
    setDownloadedBytes(0);
    setContentLength(null);

    let downloaded = 0;

    try {
      await availableUpdate.downloadAndInstall((event: DownloadEvent) => {
        if (event.event === "Started") {
          downloaded = 0;
          setDownloadedBytes(0);
          setContentLength(event.data.contentLength ?? null);
          return;
        }

        if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setDownloadedBytes(downloaded);
        }
      });

      await relaunch();
    } catch (error) {
      isInstallingRef.current = false;
      setIsInstalling(false);
      setUpdateError(getErrorMessage(error));
    }
  }

  const progress =
    contentLength && contentLength > 0
      ? Math.min(100, Math.round((downloadedBytes / contentLength) * 100))
      : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && void dismissUpdate()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <DownloadCloud className="size-5" aria-hidden="true" />
          </div>
          <DialogTitle>Careeright update available</DialogTitle>
          <DialogDescription>
            Version {availableUpdate?.version} is ready. Install it now to keep
            your desktop app current with the latest Careeright release.
          </DialogDescription>
        </DialogHeader>

        {availableUpdate?.body ? (
          <div className="max-h-32 overflow-y-auto rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground desktop-scroll-hidden">
            {availableUpdate.body}
          </div>
        ) : null}

        {isInstalling ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {progress === null ? "Preparing download..." : "Downloading update..."}
              </span>
              {progress === null ? null : (
                <span className="font-medium text-foreground">{progress}%</span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress ?? 18}%` }}
              />
            </div>
          </div>
        ) : null}

        {updateError ? (
          <p className="text-sm text-destructive">{updateError}</p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={dismissUpdate} disabled={isInstalling}>
            Later
          </Button>
          <Button onClick={installUpdate} disabled={isInstalling}>
            {isInstalling ? (
              <RefreshCw
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <DownloadCloud data-icon="inline-start" aria-hidden="true" />
            )}
            {isInstalling ? "Updating..." : "Update now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "amber" | "lime" | "violet";
}) {
  return (
    <div className={`preview-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function isTauriRuntime() {
  return "__TAURI_INTERNALS__" in window;
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

