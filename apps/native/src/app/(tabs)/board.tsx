import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import {
  ArrowRightLeft,
  Link as LinkIcon,
  Plus,
  Trash2,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  ScreenHeader,
  SectionTitle,
  SegmentedControl,
  SelectSheet,
  TextField,
  spacing,
  useScreenContentStyle,
} from "@/components/ui";
import { rpcClient } from "@/lib/api";
import { lightImpact, successImpact, warningImpact } from "@/lib/haptics";
import {
  boardColumnOptions,
  columnLabel,
  priorityLabel,
  priorityOptions,
} from "@/lib/labels";
import { openExternalUrl } from "@/lib/open-url";
import { useAppTheme } from "@/lib/theme";
import {
  boardSnapshotQueryKey,
  dashboardAnalyticsQueryKey,
} from "@careeright/api/query-keys";
import type { KanbanTask } from "@careeright/domain/kanban/schema";

type ColumnId = KanbanTask["columnId"];
type Priority = KanbanTask["priority"];
type TaskFormValues = {
  title: string;
  description: string;
  priority: Priority;
};

export default function BoardScreen() {
  const { colors } = useAppTheme();
  const listContentStyle = useScreenContentStyle({ tabBar: true });
  const queryClient = useQueryClient();
  const [selectedColumn, setSelectedColumn] = useState<ColumnId>("todo");
  const snapshotQuery = useQuery({
    queryKey: boardSnapshotQueryKey,
    queryFn: () => rpcClient.board.snapshot(),
  });
  const { control, handleSubmit, reset, setValue, watch } =
    useForm<TaskFormValues>({
      defaultValues: {
        description: "",
        priority: "medium",
        title: "",
      },
    });

  const tasks = useMemo(() => {
    return [...(snapshotQuery.data?.tasks ?? [])].sort(
      (a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt),
    );
  }, [snapshotQuery.data?.tasks]);
  const visibleTasks = tasks.filter(
    (task) => task.columnId === selectedColumn,
  );
  const columnCounts = boardColumnOptions.map((column) => ({
    ...column,
    count: tasks.filter((task) => task.columnId === column.value).length,
  }));

  const invalidateBoard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: boardSnapshotQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardAnalyticsQueryKey }),
    ]);
  };

  const createTaskMutation = useMutation({
    mutationFn: (input: TaskFormValues) =>
      rpcClient.task.create({
        acceptanceCriteria: [],
        columnId: selectedColumn,
        dependencies: [],
        description: input.description,
        priority: input.priority,
        title: input.title,
      }),
    onError: (error) => {
      Alert.alert(
        "Could not create task",
        error instanceof Error ? error.message : "Please try again.",
      );
    },
    onSuccess: async () => {
      reset({ description: "", priority: "medium", title: "" });
      successImpact();
      await invalidateBoard();
    },
  });

  const moveTaskMutation = useMutation({
    mutationFn: ({ columnId, taskId }: { columnId: ColumnId; taskId: string }) =>
      rpcClient.task.reorder({ columnId, index: 0, taskId }),
    onError: (error) => {
      Alert.alert(
        "Could not move task",
        error instanceof Error ? error.message : "Please try again.",
      );
    },
    onSuccess: async () => {
      successImpact();
      await invalidateBoard();
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (taskId: string) => rpcClient.task.delete({ taskId }),
    onError: (error) => {
      Alert.alert(
        "Could not delete task",
        error instanceof Error ? error.message : "Please try again.",
      );
    },
    onSuccess: async () => {
      warningImpact();
      await invalidateBoard();
    },
  });

  function onMoveTask(task: KanbanTask) {
    Alert.alert(
      "Move task",
      `Send #${task.taskNumber} to another board column.`,
      [
        ...boardColumnOptions
          .filter((column) => column.value !== task.columnId)
          .map((column) => ({
            onPress: () =>
              moveTaskMutation.mutate({
                columnId: column.value,
                taskId: task.id,
              }),
            text: column.label,
          })),
        { style: "cancel" as const, text: "Cancel" },
      ],
    );
  }

  function onDeleteTask(task: KanbanTask) {
    Alert.alert(
      "Delete task?",
      `This removes #${task.taskNumber} from your board.`,
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => deleteTaskMutation.mutate(task.id),
          style: "destructive",
          text: "Delete",
        },
      ],
    );
  }

  const header = (
    <View style={styles.headerWrap}>
      <ScreenHeader
        title="Board"
        subtitle="Create, triage, and move Careeright tasks from your phone."
      />

      <View style={styles.countRow}>
        {columnCounts.map((column) => (
          <Pressable
            key={column.value}
            onPress={() => {
              lightImpact();
              setSelectedColumn(column.value);
            }}
            style={[
              styles.countPill,
              {
                backgroundColor:
                  selectedColumn === column.value
                    ? colors.primarySoft
                    : colors.surface,
                borderColor:
                  selectedColumn === column.value ? colors.primary : colors.border,
              },
            ]}
          >
            <Text style={[styles.countValue, { color: colors.text }]}>
              {column.count}
            </Text>
            <Text style={[styles.countLabel, { color: colors.textMuted }]}>
              {column.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Card>
        <SectionTitle title="New task" subtitle={`Adds to ${columnLabel(selectedColumn)}`} />
        <Controller
          control={control}
          name="title"
          rules={{ required: true }}
          render={({ field }) => (
            <TextField
              label="Title"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Build a sharper application flow"
              value={field.value}
            />
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field }) => (
            <TextField
              label="Description"
              multiline
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="Notes, acceptance criteria, or useful context"
              value={field.value}
            />
          )}
        />
        <SelectSheet
          label="Priority"
          onChange={(value) => setValue("priority", value)}
          options={priorityOptions}
          value={watch("priority")}
        />
        <Button
          loading={createTaskMutation.isPending}
          onPress={handleSubmit((values) => createTaskMutation.mutate(values))}
        >
          <Plus color="#FFFFFF" size={17} /> Add task
        </Button>
      </Card>

      <SegmentedControl
        onChange={setSelectedColumn}
        options={boardColumnOptions}
        value={selectedColumn}
      />
    </View>
  );

  if (snapshotQuery.isPending) {
    return <LoadingState message="Loading board" />;
  }

  if (snapshotQuery.isError) {
    return (
      <EmptyState
        title="Board unavailable"
        message="Careeright could not load your task board."
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlashList
        ListEmptyComponent={
          <EmptyState
            title={`No ${columnLabel(selectedColumn).toLowerCase()} tasks`}
            message="Create a task here or move one in from another column."
          />
        }
        ListHeaderComponent={header}
        contentContainerStyle={[styles.listContent, listContentStyle]}
        contentInsetAdjustmentBehavior="automatic"
        data={visibleTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            isBusy={
              moveTaskMutation.isPending || deleteTaskMutation.isPending
            }
            onDelete={() => onDeleteTask(item)}
            onMove={() => onMoveTask(item)}
            task={item}
          />
        )}
      />
    </View>
  );
}

function TaskCard({
  isBusy,
  onDelete,
  onMove,
  task,
}: {
  isBusy: boolean;
  onDelete: () => void;
  onMove: () => void;
  task: KanbanTask;
}) {
  const { colors } = useAppTheme();
  const links = [
    ...task.resourceLinks,
    ...task.helpfulLinks,
    ...task.problemLinks,
  ];

  return (
    <Card style={styles.taskCard}>
      <View style={styles.taskTopRow}>
        <Badge tone={task.priority === "urgent" ? "danger" : "primary"}>
          {priorityLabel(task.priority)}
        </Badge>
        <Text style={[styles.taskNumber, { color: colors.textMuted }]}>
          #{task.taskNumber}
        </Text>
      </View>
      <Text selectable style={[styles.taskTitle, { color: colors.text }]}>
        {task.title}
      </Text>
      {task.description ? (
        <Text selectable style={[styles.taskDescription, { color: colors.textMuted }]}>
          {task.description}
        </Text>
      ) : null}
      {task.acceptanceCriteria.length > 0 ? (
        <Text selectable style={[styles.taskMeta, { color: colors.textMuted }]}>
          {task.acceptanceCriteria.length} acceptance checks
        </Text>
      ) : null}
      <View style={styles.taskActions}>
        <Button disabled={isBusy} onPress={onMove} variant="secondary">
          <ArrowRightLeft color={colors.text} size={16} /> Move
        </Button>
        {links[0]?.url ? (
          <Button
            disabled={isBusy}
            onPress={() => openExternalUrl(links[0]?.url)}
            variant="ghost"
          >
            <LinkIcon color={colors.text} size={16} /> Link
          </Button>
        ) : null}
        <Button disabled={isBusy} onPress={onDelete} variant="danger">
          <Trash2 color="#FFFFFF" size={16} />
        </Button>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  countLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  countPill: {
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.one,
    minWidth: 96,
    padding: spacing.three,
  },
  countRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.two,
  },
  countValue: {
    fontSize: 22,
    fontVariant: ["tabular-nums"],
    fontWeight: "900",
  },
  headerWrap: {
    gap: spacing.four,
    marginBottom: spacing.three,
  },
  listContent: {
    padding: spacing.four,
    paddingBottom: spacing.seven,
  },
  screen: {
    flex: 1,
  },
  taskActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.two,
  },
  taskCard: {
    marginBottom: spacing.three,
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  taskMeta: {
    fontSize: 12,
    fontWeight: "700",
  },
  taskNumber: {
    fontSize: 13,
    fontWeight: "800",
  },
  taskTitle: {
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 25,
  },
  taskTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
