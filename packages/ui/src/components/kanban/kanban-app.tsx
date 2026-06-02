"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  GripVertical,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Undo2,
  Check,
} from "lucide-react";
import { lazy, Suspense, useCallback, useMemo, useState } from "react";
import type {
  CSSProperties,
  FormEvent,
  ReactNode,
} from "react";

import { TaskReferenceLinks } from "../task-reference-links";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
} from "../ui/empty";
import { ScrollArea } from "../ui/scroll-area";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";
import type {
  BoardSnapshot,
  BoardColumn,
  KanbanTask,
  ReorderTaskInput,
} from "@careeright/domain/kanban/schema";
import { useCareerightUi } from "../../providers/careeright-ui-provider";
import {
  boardSnapshotQueryKey,
  dashboardMetricsQueryKey,
} from "@careeright/api/query-keys";
import { cn } from "../../lib/utils";
import type { DraftTask } from "./kanban-task-dialogs.js";

type KanbanTaskDialogsModule = typeof import("./kanban-task-dialogs.js");

let kanbanTaskDialogsPromise: Promise<KanbanTaskDialogsModule> | null = null;

function loadKanbanTaskDialogs() {
  kanbanTaskDialogsPromise ??= import("./kanban-task-dialogs.js");
  return kanbanTaskDialogsPromise;
}

const LazyCreateTaskDialog = lazy(() =>
  loadKanbanTaskDialogs().then((module) => ({
    default: module.CreateTaskDialog,
  })),
);

const LazyEditTaskDialog = lazy(() =>
  loadKanbanTaskDialogs().then((module) => ({
    default: module.EditTaskDialog,
  })),
);

const priorityStyles: Record<KanbanTask["priority"], string> = {
  low: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  medium: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  high: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  urgent: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const initialDraft: DraftTask = {
  title: "",
  description: "",
  priority: "medium",
  columnId: "todo",
};

function applyOptimisticTaskReorder(
  snapshot: BoardSnapshot | undefined,
  input: ReorderTaskInput,
) {
  if (!snapshot) {
    return snapshot;
  }

  const movingTask = snapshot.tasks.find((task) => task.id === input.taskId);

  if (!movingTask) {
    return snapshot;
  }

  return {
    ...snapshot,
    tasks: reorderTaskListForSnapshot(
      snapshot.tasks,
      input.taskId,
      input.columnId,
      input.index,
    ),
  };
}

function reorderTaskListForSnapshot(
  tasks: KanbanTask[],
  taskId: string,
  columnId: KanbanTask["columnId"],
  index: number,
) {
  const movingTask = tasks.find((task) => task.id === taskId);

  if (!movingTask) {
    return tasks;
  }

  const updatedAt = new Date().toISOString();
  const withoutMovingTask = tasks.filter((task) => task.id !== taskId);
  const columnIds = Array.from(
    new Set([...withoutMovingTask.map((task) => task.columnId), columnId]),
  );
  const reorderedTasks: KanbanTask[] = [];

  for (const currentColumnId of columnIds) {
    const columnTasks = withoutMovingTask
      .filter((task) => task.columnId === currentColumnId)
      .sort((a, b) => a.order - b.order);

    if (currentColumnId === columnId) {
      columnTasks.splice(Math.min(index, columnTasks.length), 0, {
        ...movingTask,
        columnId,
        updatedAt,
      });
    }

    reorderedTasks.push(
      ...columnTasks.map((task, order) => ({
        ...task,
        order,
      })),
    );
  }

  return reorderedTasks.sort((a, b) => {
    if (a.columnId === b.columnId) {
      return a.order - b.order;
    }

    return a.columnId.localeCompare(b.columnId);
  });
}

export function KanbanApp({
  initialSnapshot,
}: {
  initialSnapshot?: BoardSnapshot;
}) {
  const { rpcClient } = useCareerightUi();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DraftTask>(initialDraft);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<KanbanTask | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const snapshotQuery = useQuery({
    queryKey: boardSnapshotQueryKey,
    queryFn: () => rpcClient.board.snapshot(),
    initialData: initialSnapshot,
    staleTime: 60_000,
  });

  const invalidateBoard = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: boardSnapshotQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardMetricsQueryKey }),
    ]);

  const createTaskMutation = useMutation({
    mutationFn: (input: DraftTask) =>
      rpcClient.task.create({
        ...input,
        acceptanceCriteria: [],
        dependencies: [],
      }),
    onSuccess: () => {
      setDraft(initialDraft);
      setIsCreateTaskDialogOpen(false);
      void invalidateBoard();
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (task: KanbanTask) =>
      rpcClient.task.update({
        taskId: task.id,
        patch: {
          title: task.title,
          description: task.description,
          priority: task.priority,
          acceptanceCriteria: task.acceptanceCriteria,
          dependencies: task.dependencies,
          columnId: task.columnId,
        },
      }),
    onSuccess: () => {
      setEditingTask(null);
      void invalidateBoard();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => rpcClient.task.delete({ taskId }),
    onSuccess: () => void invalidateBoard(),
  });

  const revertTaskMutation = useMutation({
    mutationFn: (taskId: string) =>
      rpcClient.task.revertToProposal({ taskId }),
    onSuccess: () => void invalidateBoard(),
  });

  const reorderTaskMutation = useMutation({
    mutationFn: (input: ReorderTaskInput) => rpcClient.task.reorder(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: boardSnapshotQueryKey });
      const previousSnapshot =
        queryClient.getQueryData<BoardSnapshot>(boardSnapshotQueryKey);

      queryClient.setQueryData<BoardSnapshot>(
        boardSnapshotQueryKey,
        (currentSnapshot) =>
          applyOptimisticTaskReorder(currentSnapshot, input),
      );

      return { previousSnapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.previousSnapshot) {
        queryClient.setQueryData(
          boardSnapshotQueryKey,
          context.previousSnapshot,
        );
      }
    },
    onSettled: () => void invalidateBoard(),
  });

  const snapshot = snapshotQuery.data;
  const activeDragTask =
    snapshot?.tasks.find((task) => task.id === activeTaskId) ?? null;

  const tasksByColumn = useMemo(() => {
    const grouped = new Map<KanbanTask["columnId"], KanbanTask[]>();

    for (const column of snapshot?.columns ?? []) {
      grouped.set(column.id, []);
    }

    for (const task of snapshot?.tasks ?? []) {
      grouped.set(task.columnId, [...(grouped.get(task.columnId) ?? []), task]);
    }

    for (const [columnId, tasks] of grouped) {
      grouped.set(
        columnId,
        [...tasks].sort((a, b) => a.order - b.order),
      );
    }

    return grouped;
  }, [snapshot?.columns, snapshot?.tasks]);

  function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (draft.title.trim()) {
      createTaskMutation.mutate(draft);
    }
  }

  const preloadTaskDialogs = useCallback(() => {
    void loadKanbanTaskDialogs();
  }, []);

  const openCreateTaskDialog = useCallback(() => {
    void loadKanbanTaskDialogs();
    setIsCreateTaskDialogOpen(true);
  }, []);

  const openEditTaskDialog = useCallback((task: KanbanTask) => {
    void loadKanbanTaskDialogs();
    setEditingTask(task);
  }, []);

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over || !snapshot) {
      return;
    }

    const activeTask = snapshot.tasks.find((task) => task.id === active.id);

    if (!activeTask) {
      return;
    }

    const overId = String(over.id);
    const overColumn = snapshot.columns.find((column) => column.id === overId);
    const overTask = snapshot.tasks.find((task) => task.id === overId);
    const targetColumnId = overColumn?.id ?? overTask?.columnId;

    if (!targetColumnId) {
      return;
    }

    const targetTasks = tasksByColumn.get(targetColumnId) ?? [];
    const targetIndex = overTask
      ? targetTasks.findIndex((task) => task.id === overTask.id)
      : targetTasks.length;

    reorderTaskMutation.mutate({
      taskId: activeTask.id,
      columnId: targetColumnId,
      index: Math.max(0, targetIndex),
    });
  }

  if (snapshotQuery.isPending) {
    return <KanbanInitialSkeleton />;
  }

  if (snapshotQuery.isError || !snapshot) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-6 text-center text-foreground">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Board could not load</CardTitle>
            <CardDescription>
            {snapshotQuery.error instanceof Error
              ? snapshotQuery.error.message
              : "Something went wrong while loading the board."}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {snapshot.board.title}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {snapshot.tasks.length} cards across {snapshot.columns.length} lanes
          </p>
        </div>
      </header>

      <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1760px] min-w-0 flex-col gap-5">
          <Card
            size="sm"
            className="flex min-w-0 flex-col overflow-hidden xl:h-[calc(100svh-7.25rem)] xl:min-h-[560px]"
          >
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg">Execution board</CardTitle>
              <CardDescription>
                Drag cards, edit directly, or let an AI propose movement.
              </CardDescription>
              <CardAction className="flex items-center gap-2">
                <Badge variant="outline">{snapshot.columns.length} lanes</Badge>
                <Badge variant="outline">{snapshot.tasks.length} cards</Badge>
                <Button
                  type="button"
                  size="icon-sm"
                  aria-label="Add custom task"
                  title="Add custom task"
                  onClick={openCreateTaskDialog}
                  onFocus={preloadTaskDialogs}
                  onPointerEnter={preloadTaskDialogs}
                >
                  <Plus aria-hidden="true" />
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 pt-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={() => setActiveTaskId(null)}
              >
                <div className="h-full w-full min-w-0 max-w-full overflow-x-auto pb-2">
                  <div className="grid h-full w-max min-w-full grid-flow-col auto-cols-[minmax(22rem,26rem)] items-stretch gap-4">
                    {snapshot.columns.map((column) => (
                      <KanbanColumn
                        key={column.id}
                        column={column}
                        tasks={tasksByColumn.get(column.id) ?? []}
                        onEdit={openEditTaskDialog}
                        onDelete={(taskId) =>
                          deleteTaskMutation.mutate(taskId)
                        }
                        onRevert={(taskId) =>
                          revertTaskMutation.mutate(taskId)
                        }
                        busyTaskId={
                          deleteTaskMutation.isPending
                            ? deleteTaskMutation.variables
                            : undefined
                        }
                        revertingTaskId={
                          revertTaskMutation.isPending
                            ? revertTaskMutation.variables
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </div>
                <DragOverlay
                  zIndex={60}
                  dropAnimation={{
                    duration: 180,
                    easing: "cubic-bezier(0.2, 0, 0, 1)",
                  }}
                >
                  {activeDragTask ? (
                    <div className="pointer-events-none w-[min(24rem,calc(100vw-2rem))]">
                      <TaskCardView
                        task={activeDragTask}
                        dragHandle={<TaskCardDragPreviewHandle />}
                        isExpanded={false}
                        className="shadow-2xl ring-2 ring-primary/35"
                      />
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </CardContent>
          </Card>
        </div>
      </main>

      {isCreateTaskDialogOpen ? (
        <Suspense fallback={null}>
          <LazyCreateTaskDialog
            open={isCreateTaskDialogOpen}
            columns={snapshot.columns}
            draft={draft}
            onDraftChange={setDraft}
            onClose={() => setIsCreateTaskDialogOpen(false)}
            onSubmit={handleCreateTask}
            isPending={createTaskMutation.isPending}
          />
        </Suspense>
      ) : null}

      {editingTask ? (
        <Suspense fallback={null}>
          <LazyEditTaskDialog
            task={editingTask}
            columns={snapshot.columns}
            onClose={() => setEditingTask(null)}
            onSave={(task) => updateTaskMutation.mutate(task)}
            isSaving={updateTaskMutation.isPending}
          />
        </Suspense>
      ) : null}
    </>
  );
}

function KanbanInitialSkeleton() {
  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-36 rounded-md" />
          <Skeleton className="mt-2 h-3 w-44 rounded-md" />
        </div>
      </header>

      <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1760px] min-w-0 flex-col gap-5">
          <Card
            size="sm"
            className="flex min-w-0 flex-col overflow-hidden xl:h-[calc(100svh-7.25rem)] xl:min-h-[560px]"
          >
            <CardHeader className="border-b border-border">
              <div className="space-y-2">
                <Skeleton className="h-6 w-44 rounded-md" />
                <Skeleton className="h-4 w-80 max-w-full rounded-md" />
              </div>
              <CardAction className="flex items-center gap-2">
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="size-8 rounded-md" />
              </CardAction>
            </CardHeader>
            <CardContent className="min-h-0 flex-1 pt-4">
              <div className="h-full w-full min-w-0 max-w-full overflow-x-auto pb-2">
                <div className="grid h-full w-max min-w-full grid-flow-col auto-cols-[minmax(22rem,26rem)] items-stretch gap-4">
                  {Array.from({ length: 4 }, (_, columnIndex) => (
                    <div
                      key={columnIndex}
                      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/25"
                    >
                      <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-3">
                        <div className="min-w-0 space-y-2">
                          <Skeleton className="h-5 w-32 rounded-md" />
                          <Skeleton className="h-3 w-48 rounded-md" />
                        </div>
                        <Skeleton className="h-6 w-10 rounded-full" />
                      </div>
                      <div className="grid min-h-0 flex-1 content-start gap-3 overflow-hidden p-3">
                        {Array.from({ length: columnIndex === 0 ? 4 : 3 }, (_, cardIndex) => (
                          <div
                            key={cardIndex}
                            className="rounded-xl border border-border bg-background/80 p-3 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-2">
                                <Skeleton className="h-4 w-4/5 rounded-md" />
                                <Skeleton className="h-3 w-full rounded-md" />
                                <Skeleton className="h-3 w-2/3 rounded-md" />
                              </div>
                              <Skeleton className="size-7 rounded-md" />
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Skeleton className="h-5 w-16 rounded-full" />
                              <Skeleton className="h-5 w-20 rounded-full" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function KanbanColumn({
  column,
  tasks,
  onEdit,
  onDelete,
  onRevert,
  busyTaskId,
  revertingTaskId,
}: {
  column: BoardColumn;
  tasks: KanbanTask[];
  onEdit: (task: KanbanTask) => void;
  onDelete: (taskId: string) => void;
  onRevert: (taskId: string) => void;
  busyTaskId?: string;
  revertingTaskId?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <Card
      size="sm"
      ref={setNodeRef}
      className={cn(
        "flex min-h-[420px] flex-col rounded-xl bg-background/70 py-4 transition-colors xl:h-full xl:min-h-0",
        isOver && "ring-primary bg-primary/5",
      )}
    >
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className={cn("size-2.5 rounded-full", column.color)} />
          <span className="truncate">
            {column.title}
          </span>
        </CardTitle>
        <CardAction>
          <Badge variant="outline">{tasks.length}</Badge>
        </CardAction>
      </CardHeader>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        <CardContent className="min-h-0 flex-1 px-4">
          <ScrollArea className="h-[calc(100svh-330px)] min-h-[320px] pr-3 xl:h-full xl:min-h-0">
            <div className="flex flex-col gap-3">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => onEdit(task)}
                  onDelete={() => onDelete(task.id)}
                  onRevert={() => onRevert(task.id)}
                  isBusy={busyTaskId === task.id}
                  isReverting={revertingTaskId === task.id}
                />
              ))}
              {tasks.length === 0 ? (
                <Empty className="min-h-28 border border-dashed bg-muted/30 p-6">
                  <EmptyHeader>
                    <EmptyDescription>Drop a card here</EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : null}
            </div>
          </ScrollArea>
        </CardContent>
      </SortableContext>
    </Card>
  );
}

function TaskCard({
  task,
  onEdit,
  onDelete,
  onRevert,
  isBusy,
  isReverting,
}: {
  task: KanbanTask;
  onEdit: () => void;
  onDelete: () => void;
  onRevert: () => void;
  isBusy: boolean;
  isReverting: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const canRevertToProposal =
    task.columnId === "todo" &&
    Boolean(task.sourceProposalId && task.sourceProposalItemFingerprint);
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <TaskCardView
      task={task}
      cardRef={setNodeRef}
      style={style}
      isExpanded={isExpanded}
      className={cn(
        "transition-[box-shadow,opacity,ring-color,background-color]",
        !isDragging && "hover:ring-ring/50 hover:shadow-md",
        isDragging && "opacity-30",
      )}
      dragHandle={
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="mt-0.5 cursor-grab touch-none active:cursor-grabbing"
          aria-label="Drag card"
          title="Drag card"
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden="true" />
        </Button>
      }
      collapseControl={
        <TaskCardCollapseButton
          isExpanded={isExpanded}
          onToggle={() => setIsExpanded((current) => !current)}
        />
      }
      actions={
        <>
          {canRevertToProposal ? (
            <IconButton
              label="Revert to proposal"
              onClick={onRevert}
              disabled={isReverting}
            >
              {isReverting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Undo2 className="size-4" aria-hidden="true" />
              )}
            </IconButton>
          ) : null}
          <IconButton label="Edit task" onClick={onEdit}>
            <Pencil className="size-4" aria-hidden="true" />
          </IconButton>
          <IconButton
            label="Delete task"
            onClick={onDelete}
            disabled={isBusy}
            destructive
          >
            {isBusy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="size-4" aria-hidden="true" />
            )}
          </IconButton>
        </>
      }
    />
  );
}

function TaskCardView({
  task,
  dragHandle,
  isExpanded,
  collapseControl,
  actions,
  cardRef,
  style,
  className,
}: {
  task: KanbanTask;
  dragHandle: ReactNode;
  isExpanded: boolean;
  collapseControl?: ReactNode;
  actions?: ReactNode;
  cardRef?: (node: HTMLDivElement | null) => void;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <Card
      size="sm"
      ref={cardRef}
      style={style}
      className={cn(
        "rounded-xl bg-card",
        isExpanded ? "gap-3 py-3" : "gap-2 py-2.5",
        className,
      )}
    >
      <CardContent className="px-3">
        <div className="flex items-start gap-2">
          {dragHandle}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <Badge variant="secondary">#{task.taskNumber}</Badge>
                <Badge
                  variant="outline"
                  className={cn("capitalize", priorityStyles[task.priority])}
                >
                  {task.priority}
                </Badge>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {task.dependencies.length > 0 ? (
                  <Badge variant="secondary">
                    {task.dependencies.length} deps
                  </Badge>
                ) : null}
                {collapseControl}
              </div>
            </div>
            <h3 className="break-words text-sm font-semibold leading-5">
              {task.title}
            </h3>
            {isExpanded && task.description ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                {task.description}
              </p>
            ) : null}
          </div>
        </div>

        {isExpanded && task.acceptanceCriteria.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1.5 rounded-xl bg-muted/35 p-2 text-xs text-muted-foreground">
            {task.acceptanceCriteria.map((item) => (
              <li key={item} className="flex gap-1.5">
                <Check
                  className="mt-0.5 size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="break-words leading-5">{item}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {isExpanded && task.dependencies.length > 0 ? (
          <div className="mt-3 rounded-xl border border-border/70 bg-background/50 p-2 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Depends on</p>
            <ul className="flex flex-col gap-1">
              {task.dependencies.map((dependency) => (
                <li key={dependency} className="break-words leading-5">
                  {dependency}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {isExpanded ? (
          <TaskReferenceLinks
            task={task}
            className="mt-3 bg-background/50 p-2"
          />
        ) : null}
      </CardContent>

      {actions ? (
        <CardFooter className="justify-end gap-1 px-3">
          {actions}
        </CardFooter>
      ) : null}
    </Card>
  );
}

function TaskCardDragPreviewHandle() {
  return (
    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-4xl text-muted-foreground">
      <GripVertical aria-hidden="true" />
    </span>
  );
}

function TaskCardCollapseButton({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-expanded={isExpanded}
      aria-label={isExpanded ? "Collapse task details" : "Expand task details"}
      title={isExpanded ? "Collapse task details" : "Expand task details"}
      onClick={onToggle}
    >
      <ChevronDown
        className={cn(
          "size-3.5 transition-transform",
          !isExpanded && "-rotate-90",
        )}
        aria-hidden="true"
      />
    </Button>
  );
}

function IconButton({
  children,
  label,
  onClick,
  disabled,
  destructive,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={destructive ? "destructive" : "ghost"}
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}



