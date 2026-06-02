import { CareerightUiProvider } from "@repo/ui/providers/careeright-ui-provider";
import { DashboardShell } from "@repo/ui/components/dashboard-shell";
import {
  boardSnapshotQueryKey,
  dashboardAnalyticsQueryKey,
  dashboardMetricsQueryKey,
  diaryDayQueryKey,
  diaryRecentQueryKey,
  dsaSnapshotQueryKey,
  friendsSummaryQueryKey,
  historySnapshotQueryKey,
  jobDigestsQueryKey,
  jobSearchProfileQueryKey,
  jobsQueryKey,
  leaderboardSnapshotQueryKey,
  mcpTokensQueryKey,
  profileImportsQueryKey,
  profileSnapshotQueryKey,
  projectsListQueryKey,
  projectsSummaryQueryKey,
  proposalHistoryQueryKey,
  systemDesignSnapshotQueryKey,
} from "@careeright/api/query-keys";
import {
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@repo/ui/providers/query-provider";

import Link from "../adapters/next/link";
import { enableAutostartByDefault } from "../lib/autostart";
import {
  createAuthenticatedHeaders,
  remoteRpcClient,
  rpcClient,
} from "../lib/api";
import type { DesktopSession } from "../lib/auth";
import { getCareerightOrigin } from "../lib/config";
import { CareerightLogo } from "./careeright-logo";
import { ThemeToggle } from "./theme-toggle";
import { UserAccountMenu, type DesktopOfflineState } from "./user-account-menu";

type Route =
  | "analytics"
  | "board"
  | "jobs"
  | "diary"
  | "dsa"
  | "system-design"
  | "friends"
  | "leaderboard"
  | "projects"
  | "history"
  | "proposals"
  | "mcp-tools"
  | "profile";
type ThemeMode = "light" | "dark";

const defaultOfflineState: DesktopOfflineState = {
  isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
  isReplayActive: false,
  pendingCount: 0,
};

const loadDashboardAnalyticsApp = () =>
  import("@repo/ui/components/dashboard/dashboard-analytics-app").then(
    (module) => ({
      default: module.DashboardAnalyticsApp,
    }),
  );
const loadKanbanApp = () =>
  import("@repo/ui/components/kanban/kanban-app").then((module) => ({
    default: module.KanbanApp,
  }));
const loadJobsApp = () =>
  import("@repo/ui/components/jobs/jobs-app").then((module) => ({
    default: module.JobsApp,
  }));
const loadDiaryApp = () =>
  import("@repo/ui/components/diary/diary-app").then((module) => ({
    default: module.DiaryApp,
  }));
const loadDsaApp = () =>
  import("@repo/ui/components/dsa/dsa-app").then((module) => ({
    default: module.DsaApp,
  }));
const loadSystemDesignApp = () =>
  import("@repo/ui/components/system-design/system-design-app").then(
    (module) => ({
      default: module.SystemDesignApp,
    }),
  );
const loadFriendsApp = () =>
  import("@repo/ui/components/friends/friends-app").then((module) => ({
    default: module.FriendsApp,
  }));
const loadLeaderboardApp = () =>
  import("@repo/ui/components/leaderboard/leaderboard-app").then((module) => ({
    default: module.LeaderboardApp,
  }));
const loadProjectsApp = () =>
  import("@repo/ui/components/projects/projects-app").then((module) => ({
    default: module.ProjectsApp,
  }));
const loadHistoryApp = () =>
  import("@repo/ui/components/history/history-app").then((module) => ({
    default: module.HistoryApp,
  }));
const loadProposalApp = () =>
  import("@repo/ui/components/proposals/proposal-app").then((module) => ({
    default: module.ProposalApp,
  }));
const loadMcpToolsApp = () =>
  import("@repo/ui/components/mcp/mcp-tools-app").then((module) => ({
    default: module.McpToolsApp,
  }));
const loadProfileApp = () =>
  import("@repo/ui/components/profile/profile-app").then((module) => ({
    default: module.ProfileApp,
  }));

const DashboardAnalyticsRoute = lazy(loadDashboardAnalyticsApp);
const KanbanRoute = lazy(loadKanbanApp);
const JobsRoute = lazy(loadJobsApp);
const DiaryRoute = lazy(loadDiaryApp);
const DsaRoute = lazy(loadDsaApp);
const SystemDesignRoute = lazy(loadSystemDesignApp);
const FriendsRoute = lazy(loadFriendsApp);
const LeaderboardRoute = lazy(loadLeaderboardApp);
const ProjectsRoute = lazy(loadProjectsApp);
const HistoryRoute = lazy(loadHistoryApp);
const ProposalRoute = lazy(loadProposalApp);
const McpToolsRoute = lazy(loadMcpToolsApp);
const ProfileRoute = lazy(loadProfileApp);

const routePreloaders: Record<Route, () => Promise<unknown>> = {
  analytics: loadDashboardAnalyticsApp,
  board: loadKanbanApp,
  jobs: loadJobsApp,
  diary: loadDiaryApp,
  dsa: loadDsaApp,
  "system-design": loadSystemDesignApp,
  friends: loadFriendsApp,
  leaderboard: loadLeaderboardApp,
  projects: loadProjectsApp,
  history: loadHistoryApp,
  proposals: loadProposalApp,
  "mcp-tools": loadMcpToolsApp,
  profile: loadProfileApp,
};

export function preloadInitialDesktopWorkspaceRoute() {
  return routePreloaders.analytics();
}

export function DesktopWorkspace({
  onSignOut,
  session,
}: {
  onSignOut: () => Promise<void>;
  session: DesktopSession;
}) {
  const queryClient = useQueryClient();
  const [route, setRoute] = useState<Route>("analytics");
  const [offlineState, setOfflineState] =
    useState<DesktopOfflineState>(defaultOfflineState);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const storedTheme = localStorage.getItem("careeright-desktop-theme");

    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("careeright-desktop-theme", theme);
  }, [theme]);

  useEffect(() => {
    function handleDesktopNavigation(event: Event) {
      const detail = (event as CustomEvent<{ route?: Route }>).detail;
      const nextRoute = detail?.route;

      if (nextRoute) {
        void warmDesktopRoute(queryClient, nextRoute);
        startTransition(() => setRoute(nextRoute));
      }
    }

    window.addEventListener("careeright:navigate", handleDesktopNavigation);
    return () =>
      window.removeEventListener(
        "careeright:navigate",
        handleDesktopNavigation,
      );
  }, []);

  useEffect(() => {
    function handleDesktopRoutePreload(event: Event) {
      const detail = (event as CustomEvent<{ route?: Route }>).detail;

      if (detail?.route) {
        void warmDesktopRoute(queryClient, detail.route);
      }
    }

    window.addEventListener(
      "careeright:preload-route",
      handleDesktopRoutePreload,
    );
    return () =>
      window.removeEventListener(
        "careeright:preload-route",
        handleDesktopRoutePreload,
      );
  }, [queryClient]);

  useEffect(() => {
    enableAutostartByDefault().catch((error) => {
      console.info("Careeright autostart setup failed", error);
    });
  }, []);

  useEffect(() => {
    let disposed = false;
    let disposeQueryPersistence: () => void = () => undefined;
    let disposeOfflineReplay: () => void = () => undefined;
    let disposeOfflineStatus: () => void = () => undefined;
    let cancelOfflineStartupWork: () => void = () => undefined;

    const cancelStartupWork = scheduleDesktopIdleTask(() => {
      void import("../lib/query-persistence")
        .then((queryPersistence) => {
          if (disposed) {
            return;
          }

          disposeQueryPersistence =
            queryPersistence.installDesktopQueryPersistence(
              queryClient,
              session.user.id,
            );
        })
        .catch((error: unknown) => {
          console.info(
            "Careeright query cache persistence setup failed",
            error,
          );
        });

      cancelOfflineStartupWork = scheduleDesktopIdleTask(() => {
        void import("../lib/offline-mutations")
          .then((offlineMutations) => {
            if (disposed) {
              return;
            }

            disposeOfflineReplay =
              offlineMutations.installDesktopOfflineMutationReplay(
                remoteRpcClient,
                queryClient,
                session.user.id,
              );

            async function refreshOfflineState() {
              const pendingCount =
                await offlineMutations.getDesktopOfflineMutationQueueSize(
                  session.user.id,
                );

              if (disposed) {
                return;
              }

              setOfflineState({
                isOffline:
                  typeof navigator !== "undefined" ? !navigator.onLine : false,
                isReplayActive:
                  offlineMutations.isDesktopOfflineMutationReplayActive(),
                pendingCount,
              });
            }

            disposeOfflineStatus =
              offlineMutations.subscribeDesktopOfflineMutationStatus(() => {
                void refreshOfflineState();
              });
            void refreshOfflineState();
          })
          .catch((error: unknown) => {
            console.info("Careeright offline replay setup failed", error);
          });
      });
    });

    return () => {
      disposed = true;
      cancelStartupWork();
      cancelOfflineStartupWork();
      disposeQueryPersistence();
      disposeOfflineReplay();
      disposeOfflineStatus();
    };
  }, [queryClient, session.user.id]);

  const navigate = useCallback(
    (nextRoute: Route) => {
      void warmDesktopRoute(queryClient, nextRoute);
      startTransition(() => setRoute(nextRoute));
    },
    [queryClient],
  );

  const DesktopThemeToggle = useCallback(
    () => (
      <ThemeToggle
        theme={theme}
        onThemeChange={() =>
          setTheme((current) => (current === "dark" ? "light" : "dark"))
        }
      />
    ),
    [theme],
  );

  const DesktopUserAccountMenu = useCallback(
    ({ className }: { className?: string }) => (
      <UserAccountMenu
        className={className}
        offlineState={offlineState}
        onSignOut={onSignOut}
        user={session.user}
      />
    ),
    [offlineState, onSignOut, session.user],
  );

  const uiAdapter = useMemo(
    () => ({
      rpcClient,
      currentRoute: route,
      navigate,
      LinkComponent: Link,
      LogoComponent: CareerightLogo,
      ThemeToggleComponent: DesktopThemeToggle,
      UserAccountMenuComponent: DesktopUserAccountMenu,
      openExternal: openExternalUrl,
      uploadResume: uploadResumePdf,
      copyText,
    }),
    [DesktopThemeToggle, DesktopUserAccountMenu, navigate, route],
  );

  return (
    <CareerightUiProvider value={uiAdapter}>
      <DashboardShell>
        <Suspense fallback={<DesktopRouteLoading />}>
          <DashboardRoute route={route} />
        </Suspense>
      </DashboardShell>
    </CareerightUiProvider>
  );
}

function DashboardRoute({ route }: { route: Route }) {
  if (route === "board") return <KanbanRoute />;
  if (route === "jobs") return <JobsRoute />;
  if (route === "diary") return <DiaryRoute />;
  if (route === "dsa") return <DsaRoute />;
  if (route === "system-design") return <SystemDesignRoute />;
  if (route === "friends") return <FriendsRoute />;
  if (route === "leaderboard") return <LeaderboardRoute />;
  if (route === "projects") return <ProjectsRoute />;
  if (route === "history") return <HistoryRoute />;
  if (route === "proposals") return <ProposalRoute />;
  if (route === "mcp-tools") return <McpToolsRoute />;
  if (route === "profile") return <ProfileRoute />;
  return <DashboardAnalyticsRoute />;
}

function DesktopRouteLoading() {
  return (
    <>
      <header className="desktop-route-loading-header">
        <span className="desktop-route-loading-icon" />
        <div className="desktop-route-loading-copy">
          <span className="desktop-route-loading-line title" />
          <span className="desktop-route-loading-line subtitle" />
        </div>
      </header>
      <main className="desktop-route-loading">
        <section className="desktop-route-loading-panel">
          <span className="desktop-route-loading-line wide" />
          <span className="desktop-route-loading-line medium" />
          <div className="desktop-route-loading-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className="desktop-route-loading-tile" />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

async function openExternalUrl(url: string) {
  if (!url.trim()) return;
  const { openUrl } = await import("@tauri-apps/plugin-opener");
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

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

function warmDesktopRoute(
  queryClient: ReturnType<typeof useQueryClient>,
  route: Route,
) {
  void routePreloaders[route]();

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  void preloadRouteData(queryClient, route);
}

function scheduleDesktopIdleTask(task: () => void) {
  const desktopWindow = window as Window & {
    cancelIdleCallback?: (handle: number) => void;
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions,
    ) => number;
  };

  if (desktopWindow.requestIdleCallback && desktopWindow.cancelIdleCallback) {
    const handle = desktopWindow.requestIdleCallback(task, {
      timeout: 1200,
    });

    return () => desktopWindow.cancelIdleCallback?.(handle);
  }

  const timeoutId = window.setTimeout(task, 350);

  return () => window.clearTimeout(timeoutId);
}

async function preloadRouteData(
  queryClient: ReturnType<typeof useQueryClient>,
  route: Route,
) {
  const staleTime = 60_000;
  const prefetches: Array<Promise<unknown>> = [];
  const prefetch = <T,>(
    queryKey: readonly unknown[],
    queryFn: () => Promise<T>,
  ) => {
    prefetches.push(
      queryClient.prefetchQuery({
        queryKey,
        queryFn,
        staleTime,
      }),
    );
  };

  if (route === "analytics") {
    prefetch(dashboardAnalyticsQueryKey, () => rpcClient.dashboard.analytics());
    prefetch(dashboardMetricsQueryKey, () => rpcClient.dashboard.metrics());
  } else if (route === "board") {
    prefetch(boardSnapshotQueryKey, () => rpcClient.board.snapshot());
    prefetch(dashboardMetricsQueryKey, () => rpcClient.dashboard.metrics());
  } else if (route === "jobs") {
    prefetch(jobsQueryKey, () => rpcClient.jobs.list());
    prefetch(jobSearchProfileQueryKey, () => rpcClient.jobs.searchProfile());
    prefetch(jobDigestsQueryKey, () => rpcClient.jobs.digests());
  } else if (route === "diary") {
    const today = localDateKey();

    prefetch(diaryRecentQueryKey, () =>
      rpcClient.diary.listRecent({ limit: 30 }),
    );
    prefetch(diaryDayQueryKey(today), () =>
      rpcClient.diary.getDay({ dateKey: today }),
    );
  } else if (route === "dsa") {
    prefetch(dsaSnapshotQueryKey, () => rpcClient.dsa.snapshot());
  } else if (route === "system-design") {
    prefetch(systemDesignSnapshotQueryKey, () =>
      rpcClient.systemDesign.snapshot(),
    );
  } else if (route === "friends") {
    prefetch(friendsSummaryQueryKey, () => rpcClient.friends.summary());
  } else if (route === "leaderboard") {
    prefetch(leaderboardSnapshotQueryKey, () =>
      rpcClient.leaderboard.snapshot(),
    );
  } else if (route === "projects") {
    prefetch(projectsSummaryQueryKey, () => rpcClient.projects.summary());
    prefetch(projectsListQueryKey, () => rpcClient.projects.list());
  } else if (route === "history") {
    prefetch(historySnapshotQueryKey, () => rpcClient.history.snapshot());
  } else if (route === "proposals") {
    prefetch(boardSnapshotQueryKey, () => rpcClient.board.snapshot());
    prefetch(proposalHistoryQueryKey, () => rpcClient.proposal.list());
  } else if (route === "mcp-tools") {
    prefetch(mcpTokensQueryKey, () => rpcClient.mcpToken.list());
  } else if (route === "profile") {
    prefetch(profileSnapshotQueryKey, () => rpcClient.profile.snapshot());
    prefetch(profileImportsQueryKey, () => rpcClient.profileImport.list());
  }

  await Promise.allSettled(prefetches);
}

function localDateKey() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
