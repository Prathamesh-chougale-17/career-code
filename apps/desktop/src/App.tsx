import { openUrl } from "@tauri-apps/plugin-opener";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Check,
  ClipboardList,
  Code2,
  Copy,
  ExternalLink,
  GripVertical,
  History,
  Loader2,
  LogOut,
  Moon,
  Pencil,
  Plus,
  Server,
  Sparkles,
  Sun,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  useEffect,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  | "mcp"
  | "profile";
type ThemeMode = "light" | "dark";
type AnyRecord = Record<string, unknown>;

const routes: Array<{
  id: Route;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}> = [
  {
    id: "analytics",
    label: "Analytics",
    description: "Workspace health",
    icon: BarChart3,
  },
  {
    id: "board",
    label: "Board",
    description: "Kanban tasks",
    icon: ClipboardList,
  },
  { id: "jobs", label: "Jobs", description: "Applications", icon: Briefcase },
  { id: "diary", label: "Diary", description: "Daily log", icon: BookOpen },
  { id: "dsa", label: "DSA", description: "Practice", icon: Code2 },
  { id: "history", label: "History", description: "30-day activity", icon: History },
  { id: "proposals", label: "Proposals", description: "AI suggestions", icon: Sparkles },
  { id: "mcp", label: "MCP tools", description: "Tokens", icon: Server },
  { id: "profile", label: "Profile", description: "Career profile", icon: UserRound },
];

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

  async function handleSignOut() {
    const token = session?.token;
    setSession(null);
    setStatus("signed-out");
    queryClient.clear();

    if (token) {
      await revokeDesktopSession(token);
    }

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
            Sign in through Google to connect this desktop client to your
            Careeright jobs, board, DSA practice, proposals, MCP tools, diary,
            and profile.
          </p>
        </section>
        <section className="auth-card" aria-label="Sign in">
          <p className="card-kicker">Production backend</p>
          <p className="mono-text">{getCareerightOrigin()}</p>
          <button className="button button-primary" disabled={isSigningIn} onClick={handleSignIn}>
            {isSigningIn ? <Loader2 className="spin" /> : null}
            {isSigningIn ? "Waiting for browser..." : "Continue with Google"}
          </button>
          {authError ? <p className="error-text">{authError}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <DashboardShell
      activeRoute={route}
      onRouteChange={setRoute}
      onSignOut={handleSignOut}
      theme={theme}
      onThemeChange={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
    >
      <DashboardRoute route={route} onRouteChange={setRoute} />
    </DashboardShell>
  );
}

function DashboardShell({
  activeRoute,
  children,
  onRouteChange,
  onSignOut,
  onThemeChange,
  theme,
}: {
  activeRoute: Route;
  children: ReactNode;
  onRouteChange: (route: Route) => void;
  onSignOut: () => void;
  onThemeChange: () => void;
  theme: ThemeMode;
}) {
  const metricsQuery = useQuery({
    queryKey: ["desktop", "dashboard", "metrics"],
    queryFn: () => rpcClient.dashboard.metrics(),
    staleTime: 60_000,
  });
  const metrics = metricsQuery.data as AnyRecord | undefined;

  return (
    <div className="dashboard-frame">
      <aside className="sidebar">
        <div className="sidebar-header">
          <LogoMark />
          <div className="sidebar-brand">
            <strong>Careeright</strong>
            <span>AI-safe Kanban</span>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Dashboard sections">
          {routes.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activeRoute === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => onRouteChange(item.id)}
                type="button"
              >
                <Icon className="nav-icon" />
                <span>{item.label}</span>
                {item.id === "proposals" ? (
                  <em>{String(readNumber(metrics, ["proposalCount"]))}</em>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-metrics">
          <SidebarMetric label="Total tasks" value={readNumber(metrics, ["taskCount"])} />
          <SidebarMetric label="In progress" value={readNumber(metrics, ["inProgressCount"])} />
          <SidebarMetric label="Completed" value={readNumber(metrics, ["doneCount"])} />
        </div>
        <div className="sidebar-footer">
          <button className="icon-button" onClick={onThemeChange} title="Toggle theme" type="button">
            {theme === "dark" ? <Sun /> : <Moon />}
          </button>
          <button className="button button-outline" onClick={onSignOut} type="button">
            <LogOut />
            Sign out
          </button>
        </div>
      </aside>
      <section className="dashboard-main">{children}</section>
    </div>
  );
}

function DashboardRoute({
  onRouteChange,
  route,
}: {
  onRouteChange: (route: Route) => void;
  route: Route;
}) {
  if (route === "board") {
    return <BoardScreen />;
  }
  if (route === "jobs") {
    return <JobsScreen />;
  }
  if (route === "diary") {
    return <DiaryScreen />;
  }
  if (route === "dsa") {
    return <DsaScreen />;
  }
  if (route === "history") {
    return <HistoryScreen />;
  }
  if (route === "proposals") {
    return <ProposalsScreen />;
  }
  if (route === "mcp") {
    return <McpScreen />;
  }
  if (route === "profile") {
    return <ProfileScreen />;
  }

  return <AnalyticsScreen onRouteChange={onRouteChange} />;
}

function AnalyticsScreen({ onRouteChange }: { onRouteChange: (route: Route) => void }) {
  const analyticsQuery = useQuery({
    queryKey: ["desktop", "dashboard", "analytics"],
    queryFn: () => rpcClient.dashboard.analytics(),
    staleTime: 60_000,
  });
  const data = analyticsQuery.data as AnyRecord | undefined;
  const footprint = [
    { name: "Tasks", count: readNestedNumber(data, ["board", "taskCount"]) },
    { name: "Jobs", count: readNestedNumber(data, ["jobs", "totalCount"]) },
    { name: "Diary", count: readNestedNumber(data, ["diary", "totalCount"]) },
    { name: "Profile", count: readNestedNumber(data, ["profile", "itemCount"]) },
    { name: "MCP", count: readNestedNumber(data, ["mcp", "activeTokenCount"]) },
  ];
  const jobStatus = objectEntries(readNestedRecord(data, ["jobs", "statusCounts"]));

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Careeright at a glance"
        description="Workspace health across board, jobs, diary, proposals, profile, and MCP."
      />
      <ScreenState query={analyticsQuery}>
        <div className="hero-card">
          <div>
            <p className="eyebrow">Workspace readiness</p>
            <h2>{readinessSignals(data)}/5 systems ready</h2>
            <p className="muted">Your desktop app is connected to the same protected backend as web.</p>
          </div>
          <div className="metric-strip">
            <Metric label="Tasks" value={readNestedNumber(data, ["board", "taskCount"])} />
            <Metric label="Jobs" value={readNestedNumber(data, ["jobs", "totalCount"])} />
            <Metric label="Profile" value={`${readNestedNumber(data, ["profile", "readinessScore"])}%`} />
            <Metric label="Tokens" value={readNestedNumber(data, ["mcp", "activeTokenCount"])} />
          </div>
        </div>
        <div className="grid two">
          <Card title="Workspace footprint" description="Records across major systems">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={footprint}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]} fill="var(--primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card title="Job status" description="Current tracker split">
            <div className="chart-box">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={jobStatus.length ? jobStatus : [{ name: "No jobs", value: 1 }]}
                    dataKey="value"
                    innerRadius={64}
                    outerRadius={96}
                    paddingAngle={3}
                  >
                    {(jobStatus.length ? jobStatus : [{ name: "No jobs" }]).map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={["var(--primary)", "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"][index % 5]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        <div className="grid three">
          {routes.slice(1).map((item) => (
            <button className="section-card" key={item.id} onClick={() => onRouteChange(item.id)} type="button">
              <item.icon className="section-icon" />
              <strong>{item.label}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      </ScreenState>
    </>
  );
}

function BoardScreen() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({ title: "", description: "", priority: "medium", columnId: "todo" });
  const [editingTask, setEditingTask] = useState<AnyRecord | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const snapshotQuery = useQuery({
    queryKey: ["desktop", "board"],
    queryFn: () => rpcClient.board.snapshot(),
    staleTime: 60_000,
  });
  const createTask = useMutation({
    mutationFn: () => rpcClient.task.create(draft as never),
    onSuccess: () => {
      setDraft({ title: "", description: "", priority: "medium", columnId: "todo" });
      void queryClient.invalidateQueries({ queryKey: ["desktop", "board"] });
      void queryClient.invalidateQueries({ queryKey: ["desktop", "dashboard", "metrics"] });
    },
  });
  const updateTask = useMutation({
    mutationFn: (input: AnyRecord) => rpcClient.task.update(input as never),
    onSuccess: () => {
      setEditingTask(null);
      void queryClient.invalidateQueries({ queryKey: ["desktop", "board"] });
      void queryClient.invalidateQueries({ queryKey: ["desktop", "dashboard", "metrics"] });
    },
  });
  const deleteTask = useMutation({
    mutationFn: (taskId: string) => rpcClient.task.delete({ taskId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["desktop", "board"] });
      void queryClient.invalidateQueries({ queryKey: ["desktop", "dashboard", "metrics"] });
    },
  });
  const reorderTask = useMutation({
    mutationFn: (input: AnyRecord) => rpcClient.task.reorder(input as never),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["desktop", "board"] }),
  });
  const snapshot = snapshotQuery.data as AnyRecord | undefined;
  const columns = arrayOfRecords(snapshot?.columns);
  const tasks = arrayOfRecords(snapshot?.tasks);

  function submitTask(event: FormEvent) {
    event.preventDefault();
    if (draft.title.trim()) {
      createTask.mutate();
    }
  }

  function onDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) {
      return;
    }

    const activeTask = tasks.find((task) => String(task.id) === String(event.active.id));
    const overTask = tasks.find((task) => String(task.id) === String(event.over?.id));

    if (!activeTask || !overTask) {
      return;
    }

    const columnId = String(overTask.columnId);
    const columnTasks = tasks.filter((task) => String(task.columnId) === columnId);
    const index = Math.max(0, columnTasks.findIndex((task) => task.id === overTask.id));
    reorderTask.mutate({ taskId: activeTask.id, columnId, index });
  }

  return (
    <>
      <PageHeader eyebrow="Board" title="Kanban board" description="Create, edit, delete, and reorder Careeright tasks." />
      <ScreenState query={snapshotQuery}>
        <form className="composer" onSubmit={submitTask}>
          <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Task title" />
          <select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value })}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <select value={draft.columnId} onChange={(event) => setDraft({ ...draft, columnId: event.target.value })}>
            {columns.map((column) => (
              <option key={String(column.id)} value={String(column.id)}>{String(column.title)}</option>
            ))}
          </select>
          <button className="button button-primary" disabled={createTask.isPending} type="submit"><Plus /> Add task</button>
        </form>
        <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd} sensors={sensors}>
          <div className="board-grid">
            {columns.map((column) => {
              const columnTasks = tasks.filter((task) => task.columnId === column.id);
              return (
                <section className="board-column" key={String(column.id)}>
                  <header>
                    <strong>{String(column.title)}</strong>
                    <span>{columnTasks.length}</span>
                  </header>
                  <SortableContext items={columnTasks.map((task) => String(task.id))} strategy={verticalListSortingStrategy}>
                    {columnTasks.map((task) => (
                      <TaskCard
                        key={String(task.id)}
                        task={task}
                        onDelete={() => deleteTask.mutate(String(task.id))}
                        onEdit={() => setEditingTask(task)}
                      />
                    ))}
                  </SortableContext>
                </section>
              );
            })}
          </div>
        </DndContext>
        {editingTask ? (
          <Dialog title="Edit task" onClose={() => setEditingTask(null)}>
            <form
              className="dialog-form"
              onSubmit={(event) => {
                event.preventDefault();
                updateTask.mutate({
                  taskId: editingTask.id,
                  patch: {
                    title: editingTask.title,
                    description: editingTask.description,
                    priority: editingTask.priority,
                    columnId: editingTask.columnId,
                  },
                });
              }}
            >
              <input value={String(editingTask.title ?? "")} onChange={(event) => setEditingTask({ ...editingTask, title: event.target.value })} />
              <textarea value={String(editingTask.description ?? "")} onChange={(event) => setEditingTask({ ...editingTask, description: event.target.value })} />
              <select value={String(editingTask.priority ?? "medium")} onChange={(event) => setEditingTask({ ...editingTask, priority: event.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button className="button button-primary" type="submit">Save changes</button>
            </form>
          </Dialog>
        ) : null}
      </ScreenState>
    </>
  );
}

function TaskCard({
  onDelete,
  onEdit,
  task,
}: {
  onDelete: () => void;
  onEdit: () => void;
  task: AnyRecord;
}) {
  const sortable = useSortable({ id: String(task.id) });
  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
  };

  return (
    <article className="task-card" ref={sortable.setNodeRef} style={style}>
      <button className="drag-handle" {...sortable.attributes} {...sortable.listeners} type="button">
        <GripVertical />
      </button>
      <div className="task-body">
        <strong>{String(task.title ?? "Untitled")}</strong>
        <p>{String(task.description ?? "")}</p>
        <span className={`badge ${String(task.priority ?? "medium")}`}>{String(task.priority ?? "medium")}</span>
      </div>
      <div className="row-actions">
        <button className="icon-button" onClick={onEdit} type="button"><Pencil /></button>
        <button className="icon-button danger" onClick={onDelete} type="button"><Trash2 /></button>
      </div>
    </article>
  );
}

function JobsScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const jobsQuery = useQuery({ queryKey: ["desktop", "jobs"], queryFn: () => rpcClient.jobs.list(), staleTime: 60_000 });
  const profileQuery = useQuery({ queryKey: ["desktop", "jobs", "profile"], queryFn: () => rpcClient.jobs.searchProfile(), staleTime: 60_000 });
  const updateStatus = useMutation({
    mutationFn: (input: { jobId: string; status: string }) => rpcClient.jobs.updateStatus(input as never),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["desktop", "jobs"] }),
  });
  const deleteJob = useMutation({
    mutationFn: (jobId: string) => rpcClient.jobs.delete({ jobId }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["desktop", "jobs"] }),
  });
  const jobs = arrayOfRecords(jobsQuery.data).filter((job) => {
    const haystack = `${job.title ?? ""} ${job.company ?? ""} ${job.location ?? ""}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (status === "all" || job.status === status);
  });

  return (
    <>
      <PageHeader eyebrow="Jobs" title="Job tracker" description="Search, filter, update status, and open external application links." />
      <ScreenState query={jobsQuery}>
        <div className="toolbar">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search jobs" />
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            {["not_applied", "applied", "interviewing", "rejected", "offer", "expired"].map((value) => (
              <option key={value} value={value}>{labelize(value)}</option>
            ))}
          </select>
        </div>
        <div className="grid two">
          <Card title="Search profile" description="Profile-derived automation defaults">
            <KeyValueList record={profileQuery.data as AnyRecord | undefined} keys={["targetRoles", "locations", "minimumFitScore", "maxSeededPerRun"]} />
          </Card>
          <Card title="Tracker summary" description="Current filtered view">
            <div className="metric-strip">
              <Metric label="Visible" value={jobs.length} />
              <Metric label="Total" value={arrayOfRecords(jobsQuery.data).length} />
              <Metric label="Applied" value={arrayOfRecords(jobsQuery.data).filter((job) => job.status === "applied").length} />
            </div>
          </Card>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Company</th>
                <th>Fit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={String(job.id)}>
                  <td>
                    <strong>{String(job.title ?? "Untitled role")}</strong>
                    <span>{String(job.location ?? "")}</span>
                  </td>
                  <td>{String(job.company ?? "Unknown")}</td>
                  <td>{String(job.fitScore ?? job.fitBand ?? "—")}</td>
                  <td>
                    <select value={String(job.status ?? "not_applied")} onChange={(event) => updateStatus.mutate({ jobId: String(job.id), status: event.target.value })}>
                      {["not_applied", "applied", "interviewing", "rejected", "offer", "expired"].map((value) => (
                        <option key={value} value={value}>{labelize(value)}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-button" onClick={() => openExternal(String(job.applyUrl ?? job.jobUrl ?? ""))} type="button"><ExternalLink /></button>
                      <button className="icon-button danger" onClick={() => deleteJob.mutate(String(job.id))} type="button"><Trash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScreenState>
    </>
  );
}

function DiaryScreen() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const [dateKey, setDateKey] = useState(today);
  const [draft, setDraft] = useState({ summary: "", intervals: "", status: "draft" });
  const recentQuery = useQuery({ queryKey: ["desktop", "diary", "recent"], queryFn: () => rpcClient.diary.listRecent({ limit: 30 }), staleTime: 60_000 });
  const dayQuery = useQuery({ queryKey: ["desktop", "diary", dateKey], queryFn: () => rpcClient.diary.getDay({ dateKey }), staleTime: 30_000 });
  const saveDay = useMutation({
    mutationFn: () => rpcClient.diary.saveDay({ dateKey, summary: draft.summary, status: draft.status, intervals: draft.intervals.split("\n").filter(Boolean).map((label) => ({ label })) } as never),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["desktop", "diary"] });
    },
  });
  const deleteDay = useMutation({
    mutationFn: () => rpcClient.diary.deleteDay({ dateKey }),
    onSuccess: () => {
      setDraft({ summary: "", intervals: "", status: "draft" });
      void queryClient.invalidateQueries({ queryKey: ["desktop", "diary"] });
    },
  });

  useEffect(() => {
    const day = dayQuery.data as AnyRecord | undefined;
    if (day) {
      setDraft({
        summary: String(day.summary ?? ""),
        intervals: arrayOfRecords(day.intervals).map((item) => String(item.label ?? item.title ?? "")).join("\n"),
        status: String(day.status ?? "draft"),
      });
    }
  }, [dayQuery.data]);

  return (
    <>
      <PageHeader eyebrow="Diary" title="Daily work diary" description="Review recent days and save draft or complete notes." />
      <div className="grid two wide-left">
        <Card title="Editor" description="One line per interval">
          <div className="dialog-form">
            <input type="date" value={dateKey} onChange={(event) => setDateKey(event.target.value)} />
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
              <option value="draft">Draft</option>
              <option value="complete">Complete</option>
            </select>
            <textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} placeholder="Summary" />
            <textarea value={draft.intervals} onChange={(event) => setDraft({ ...draft, intervals: event.target.value })} placeholder="Intervals" />
            <div className="row-actions">
              <button className="button button-primary" onClick={() => saveDay.mutate()} type="button">Save day</button>
              <button className="button button-outline danger" onClick={() => deleteDay.mutate()} type="button">Delete</button>
            </div>
          </div>
        </Card>
        <ListCard title="Recent days" items={arrayOfRecords(recentQuery.data)} primary="dateKey" secondary="summary" />
      </div>
    </>
  );
}

function DsaScreen() {
  const queryClient = useQueryClient();
  const dsaQuery = useQuery({ queryKey: ["desktop", "dsa"], queryFn: () => rpcClient.dsa.snapshot(), staleTime: 60_000 });
  const updateProgress = useMutation({
    mutationFn: (input: AnyRecord) => rpcClient.dsa.updateQuestionProgress(input as never),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["desktop", "dsa"] }),
  });
  const snapshot = dsaQuery.data as AnyRecord | undefined;
  const tracks = arrayOfRecords(snapshot?.tracks);
  const questions: AnyRecord[] = tracks.flatMap((track) =>
    arrayOfRecords(track.questions).map((question) => ({
      ...question,
      trackTitle: track.title,
    })),
  );

  return (
    <>
      <PageHeader eyebrow="DSA" title="Practice tracker" description="Track question progress and open learning links." />
      <ScreenState query={dsaQuery}>
        <div className="metric-strip">
          <Metric label="Tracks" value={tracks.length} />
          <Metric label="Questions" value={questions.length} />
          <Metric label="Completed" value={questions.filter((question) => Boolean(question.completedAt ?? question.completed)).length} />
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Question</th><th>Track</th><th>Status</th><th>Link</th></tr></thead>
            <tbody>
              {questions.slice(0, 200).map((question) => (
                <tr key={String(question.id)}>
                  <td><strong>{String(question.title ?? question.name ?? "Question")}</strong></td>
                  <td>{String(question.trackTitle ?? "")}</td>
                  <td>
                    <button className="button button-outline" onClick={() => updateProgress.mutate({ questionId: question.id, completed: !Boolean(question.completedAt ?? question.completed) })} type="button">
                      {Boolean(question.completedAt ?? question.completed) ? <Check /> : <X />}
                      {Boolean(question.completedAt ?? question.completed) ? "Complete" : "Open"}
                    </button>
                  </td>
                  <td><button className="icon-button" onClick={() => openExternal(String(question.url ?? question.link ?? question.videoUrl ?? ""))} type="button"><ExternalLink /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScreenState>
    </>
  );
}

function HistoryScreen() {
  const historyQuery = useQuery({ queryKey: ["desktop", "history"], queryFn: () => rpcClient.history.snapshot(), staleTime: 60_000 });
  const snapshot = historyQuery.data as AnyRecord | undefined;
  const days = arrayOfRecords(snapshot?.days ?? snapshot?.daily);

  return (
    <>
      <PageHeader eyebrow="History" title="30-day activity" description="Daily DSA and job activity summaries." />
      <ScreenState query={historyQuery}>
        <Card title="Activity trend" description="Recent recorded activity">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={days}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis dataKey="dateKey" tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="jobCount" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="dsaCount" fill="var(--primary)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <ListCard title="Daily summaries" items={days} primary="dateKey" secondary="summary" />
      </ScreenState>
    </>
  );
}

function ProposalsScreen() {
  const queryClient = useQueryClient();
  const proposalsQuery = useQuery({ queryKey: ["desktop", "proposals"], queryFn: () => rpcClient.proposal.list(), staleTime: 60_000 });
  const accept = useMutation({ mutationFn: (proposalId: string) => rpcClient.proposal.accept({ proposalId }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["desktop", "proposals"] }) });
  const reject = useMutation({ mutationFn: (proposalId: string) => rpcClient.proposal.reject({ proposalId }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["desktop", "proposals"] }) });
  const remove = useMutation({ mutationFn: (proposalId: string) => rpcClient.proposal.delete({ proposalId }), onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["desktop", "proposals"] }) });
  const proposals = arrayOfRecords(proposalsQuery.data);

  return (
    <>
      <PageHeader eyebrow="Proposals" title="AI suggestions" description="Accept, reject, or delete pending proposal records." />
      <ScreenState query={proposalsQuery}>
        <div className="cards-list">
          {proposals.map((proposal) => (
            <article className="list-panel" key={String(proposal.id)}>
              <div>
                <strong>{String(proposal.title ?? proposal.type ?? "Proposal")}</strong>
                <p>{String(proposal.summary ?? proposal.status ?? "")}</p>
                <span className="badge">{String(proposal.status ?? "pending")}</span>
              </div>
              <div className="row-actions">
                <button className="button button-primary" onClick={() => accept.mutate(String(proposal.id))} type="button">Accept</button>
                <button className="button button-outline" onClick={() => reject.mutate(String(proposal.id))} type="button">Reject</button>
                <button className="icon-button danger" onClick={() => remove.mutate(String(proposal.id))} type="button"><Trash2 /></button>
              </div>
            </article>
          ))}
        </div>
      </ScreenState>
    </>
  );
}

function McpScreen() {
  const queryClient = useQueryClient();
  const [tokenName, setTokenName] = useState("Primary MCP token");
  const [createdToken, setCreatedToken] = useState("");
  const [copied, setCopied] = useState(false);
  const tokensQuery = useQuery({ queryKey: ["desktop", "mcp"], queryFn: () => rpcClient.mcpToken.list(), staleTime: 60_000 });
  const createToken = useMutation({
    mutationFn: () => rpcClient.mcpToken.create({ name: tokenName.trim() || "MCP token" }),
    onSuccess: (result) => {
      setCreatedToken(String((result as AnyRecord).token ?? ""));
      setCopied(false);
      void queryClient.invalidateQueries({ queryKey: ["desktop", "mcp"] });
    },
  });
  const revokeToken = useMutation({
    mutationFn: (tokenId: string) => rpcClient.mcpToken.revoke({ tokenId }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["desktop", "mcp"] }),
  });
  const tokens = arrayOfRecords(tokensQuery.data);

  return (
    <>
      <PageHeader eyebrow="MCP tools" title="External AI connections" description="Create bearer tokens and connect MCP clients to Careeright." />
      <ScreenState query={tokensQuery}>
        <div className="grid two">
          <Card title="Create token" description="Secrets are shown once">
            <div className="dialog-form">
              <input value={tokenName} onChange={(event) => setTokenName(event.target.value)} />
              <button className="button button-primary" onClick={() => createToken.mutate()} type="button"><Plus /> Create token</button>
              {createdToken ? (
                <div className="secret-box">
                  <code>{createdToken}</code>
                  <button className="icon-button" onClick={async () => { await copyText(createdToken); setCopied(true); }} type="button">
                    {copied ? <Check /> : <Copy />}
                  </button>
                </div>
              ) : null}
            </div>
          </Card>
          <Card title="Connection details" description="Use this with Authorization: Bearer <token>">
            <KeyValueList record={{ endpoint: "https://careeright.vercel.app/mcp", command: "npx -y careeright-mcp", tokenEnv: "CAREERIGHT_MCP_TOKEN" }} keys={["endpoint", "command", "tokenEnv"]} />
          </Card>
        </div>
        <ListTable
          columns={["name", "tokenPrefix", "createdAt", "revokedAt"]}
          items={tokens}
          actions={(item) => (
            <button className="button button-outline danger" onClick={() => revokeToken.mutate(String(item.id))} type="button">Revoke</button>
          )}
        />
      </ScreenState>
    </>
  );
}

function ProfileScreen() {
  const queryClient = useQueryClient();
  const [basics, setBasics] = useState({ name: "", headline: "", location: "", email: "" });
  const [newItem, setNewItem] = useState({ type: "skill", title: "", description: "" });
  const profileQuery = useQuery({ queryKey: ["desktop", "profile"], queryFn: () => rpcClient.profile.snapshot(), staleTime: 60_000 });
  const importsQuery = useQuery({ queryKey: ["desktop", "profile", "imports"], queryFn: () => rpcClient.profileImport.list(), staleTime: 60_000 });
  const updateBasics = useMutation({
    mutationFn: () => rpcClient.profile.update(basics as never),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["desktop", "profile"] }),
  });
  const createItem = useMutation({
    mutationFn: () => rpcClient.profile.createItem(newItem as never),
    onSuccess: () => {
      setNewItem({ type: "skill", title: "", description: "" });
      void queryClient.invalidateQueries({ queryKey: ["desktop", "profile"] });
    },
  });
  const deleteItem = useMutation({
    mutationFn: (itemId: string) => rpcClient.profile.deleteItem({ itemId } as never),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["desktop", "profile"] }),
  });
  const applyImport = useMutation({
    mutationFn: (importId: string) => rpcClient.profileImport.apply({ importId } as never),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["desktop", "profile"] });
      void queryClient.invalidateQueries({ queryKey: ["desktop", "profile", "imports"] });
    },
  });
  const profile = profileQuery.data as AnyRecord | undefined;
  const profileBasics = (profile?.profile ?? profile?.basics ?? {}) as AnyRecord;
  const items = arrayOfRecords(profile?.items);

  useEffect(() => {
    setBasics({
      name: String(profileBasics.name ?? ""),
      headline: String(profileBasics.headline ?? ""),
      location: String(profileBasics.location ?? ""),
      email: String(profileBasics.email ?? ""),
    });
  }, [profileBasics.email, profileBasics.headline, profileBasics.location, profileBasics.name]);

  async function uploadResume(file: File) {
    const formData = new FormData();
    formData.set("file", file);
    const headers = new Headers(await createAuthenticatedHeaders());

    await fetch(`${getCareerightOrigin()}/api/profile/resume`, {
      method: "POST",
      headers,
      body: formData,
    });
    void queryClient.invalidateQueries({ queryKey: ["desktop", "profile", "imports"] });
  }

  return (
    <>
      <PageHeader eyebrow="Profile" title="Career profile" description="Edit basics, manage profile items, and review resume imports." />
      <ScreenState query={profileQuery}>
        <div className="grid two wide-left">
          <Card title="Basics" description="Used for application defaults and job scoring">
            <div className="dialog-form">
              <input value={basics.name} onChange={(event) => setBasics({ ...basics, name: event.target.value })} placeholder="Name" />
              <input value={basics.headline} onChange={(event) => setBasics({ ...basics, headline: event.target.value })} placeholder="Headline" />
              <input value={basics.location} onChange={(event) => setBasics({ ...basics, location: event.target.value })} placeholder="Location" />
              <input value={basics.email} onChange={(event) => setBasics({ ...basics, email: event.target.value })} placeholder="Email" />
              <button className="button button-primary" onClick={() => updateBasics.mutate()} type="button">Save basics</button>
            </div>
          </Card>
          <Card title="Resume import" description="Upload a PDF for pending review">
            <input accept="application/pdf" type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadResume(file); }} />
            <ListCard title="Pending imports" items={arrayOfRecords(importsQuery.data)} primary="summary" secondary="createdAt" actions={(item) => <button className="button button-outline" onClick={() => applyImport.mutate(String(item.id))} type="button">Apply</button>} />
          </Card>
        </div>
        <Card title="Profile items" description="Skills, projects, experience, education, and links">
          <form className="composer" onSubmit={(event) => { event.preventDefault(); createItem.mutate(); }}>
            <select value={newItem.type} onChange={(event) => setNewItem({ ...newItem, type: event.target.value })}>
              {["skill", "project", "experience", "education", "certification", "link", "summary"].map((value) => <option key={value} value={value}>{labelize(value)}</option>)}
            </select>
            <input value={newItem.title} onChange={(event) => setNewItem({ ...newItem, title: event.target.value })} placeholder="Title" />
            <input value={newItem.description} onChange={(event) => setNewItem({ ...newItem, description: event.target.value })} placeholder="Description" />
            <button className="button button-primary" type="submit"><Plus /> Add</button>
          </form>
          <ListTable columns={["type", "title", "description"]} items={items} actions={(item) => <button className="icon-button danger" onClick={() => deleteItem.mutate(String(item.id))} type="button"><Trash2 /></button>} />
        </Card>
      </ScreenState>
    </>
  );
}

function PageHeader({ description, eyebrow, title }: { description: string; eyebrow: string; title: string }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}

function ScreenState({
  children,
  query,
}: {
  children: ReactNode;
  query: { isPending: boolean; isError: boolean; error: unknown };
}) {
  if (query.isPending) {
    return <div className="loading-grid">{Array.from({ length: 6 }, (_, index) => <div className="skeleton" key={index} />)}</div>;
  }

  if (query.isError) {
    return <div className="notice danger">{getErrorMessage(query.error)}</div>;
  }

  return <>{children}</>;
}

function Card({ children, description, title }: { children: ReactNode; description?: string; title: string }) {
  return (
    <section className="card">
      <header>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Dialog({ children, onClose, title }: { children: ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} type="button"><X /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SidebarMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="sidebar-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ListCard({
  actions,
  items,
  primary,
  secondary,
  title,
}: {
  actions?: (item: AnyRecord) => ReactNode;
  items: AnyRecord[];
  primary: string;
  secondary: string;
  title: string;
}) {
  return (
    <Card title={title}>
      <div className="cards-list compact">
        {items.length === 0 ? <p className="muted">No records yet.</p> : null}
        {items.map((item, index) => (
          <article className="mini-row" key={String(item.id ?? item[primary] ?? index)}>
            <div>
              <strong>{String(item[primary] ?? "Untitled")}</strong>
              <span>{String(item[secondary] ?? "")}</span>
            </div>
            {actions ? actions(item) : null}
          </article>
        ))}
      </div>
    </Card>
  );
}

function ListTable({
  actions,
  columns,
  items,
}: {
  actions?: (item: AnyRecord) => ReactNode;
  columns: string[];
  items: AnyRecord[];
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => <th key={column}>{labelize(column)}</th>)}
            {actions ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={String(item.id ?? index)}>
              {columns.map((column) => <td key={column}>{String(item[column] ?? "—")}</td>)}
              {actions ? <td>{actions(item)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function KeyValueList({ keys, record }: { keys: string[]; record?: AnyRecord }) {
  return (
    <dl className="key-values">
      {keys.map((key) => (
        <div key={key}>
          <dt>{labelize(key)}</dt>
          <dd>{formatValue(record?.[key])}</dd>
        </div>
      ))}
    </dl>
  );
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

function readNumber(record: AnyRecord | undefined, keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "number") {
      return value;
    }
  }
  return 0;
}

function readNestedRecord(record: AnyRecord | undefined, keys: string[]) {
  let current: unknown = record;
  for (const key of keys) {
    current = current && typeof current === "object" ? (current as AnyRecord)[key] : undefined;
  }
  return current && typeof current === "object" && !Array.isArray(current) ? (current as AnyRecord) : undefined;
}

function readNestedNumber(record: AnyRecord | undefined, keys: string[]) {
  const lastKey = keys[keys.length - 1];
  const parent = readNestedRecord(record, keys.slice(0, -1));
  const value = lastKey ? parent?.[lastKey] : undefined;
  return typeof value === "number" ? value : 0;
}

function objectEntries(record: AnyRecord | undefined) {
  return Object.entries(record ?? {}).map(([name, value]) => ({ name: labelize(name), value: Number(value) || 0 }));
}

function arrayOfRecords(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.filter((item): item is AnyRecord => Boolean(item) && typeof item === "object") : [];
}

function readinessSignals(data: AnyRecord | undefined) {
  return [
    readNestedNumber(data, ["board", "taskCount"]) > 0,
    readNestedNumber(data, ["jobs", "totalCount"]) > 0,
    readNestedNumber(data, ["diary", "totalCount"]) > 0,
    readNestedNumber(data, ["profile", "readinessScore"]) >= 60,
    readNestedNumber(data, ["mcp", "activeTokenCount"]) > 0,
  ].filter(Boolean).length;
}

function formatValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  if (value === null || value === undefined || value === "") {
    return "—";
  }
  return String(value);
}

function labelize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

async function openExternal(url: string) {
  if (!url.trim()) {
    return;
  }
  await openUrl(url);
}

export default App;
