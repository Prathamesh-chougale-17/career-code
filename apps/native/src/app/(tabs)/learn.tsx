import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpenCheck,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  PlayCircle,
  Save,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { ChartCard, MiniBarChart } from "@/components/charts";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  ScreenHeader,
  ScreenScroll,
  SectionTitle,
  SegmentedControl,
  StatCard,
  TextField,
  spacing,
  useScreenContentStyle,
} from "@/components/ui";
import { rpcClient } from "@/lib/api";
import { successImpact, warningImpact } from "@/lib/haptics";
import { addDays, formatLongDate, todayDateKey, titleCase } from "@/lib/labels";
import { openExternalUrl } from "@/lib/open-url";
import { useAppTheme } from "@/lib/theme";
import {
  dashboardAnalyticsQueryKey,
  diaryDayQueryKey,
  diaryRecentQueryKey,
  dsaSnapshotQueryKey,
  historySnapshotQueryKey,
  systemDesignSnapshotQueryKey,
} from "@careeright/api/query-keys";
import type {
  DiaryStatus,
  SaveDiaryIntervalInput,
} from "@careeright/domain/diary/schema";
import type { DsaQuestion, DsaTrack } from "@careeright/domain/dsa/schema";
import type {
  SystemDesignItem,
  SystemDesignTrack,
} from "@careeright/domain/system-design/schema";

type LearnView = "diary" | "dsa" | "system-design" | "history";
type DiaryDraft = {
  dailySummary: string;
  status: DiaryStatus;
  tomorrowFocus: string;
};

const learnOptions: { label: string; value: LearnView }[] = [
  { label: "Diary", value: "diary" },
  { label: "DSA", value: "dsa" },
  { label: "System", value: "system-design" },
  { label: "History", value: "history" },
];

export default function LearnScreen() {
  const [view, setView] = useState<LearnView>("diary");

  if (view === "dsa") {
    return <DsaView setView={setView} view={view} />;
  }

  if (view === "system-design") {
    return <SystemDesignView setView={setView} view={view} />;
  }

  if (view === "history") {
    return <HistoryView setView={setView} view={view} />;
  }

  return <DiaryView setView={setView} view={view} />;
}

function DiaryView({
  setView,
  view,
}: {
  setView: (view: LearnView) => void;
  view: LearnView;
}) {
  const queryClient = useQueryClient();
  const { colors } = useAppTheme();
  const [dateKey, setDateKey] = useState(todayDateKey());
  const dayQuery = useQuery({
    queryKey: diaryDayQueryKey(dateKey),
    queryFn: () => rpcClient.diary.getDay({ dateKey }),
  });
  const [draft, setDraft] = useState<DiaryDraft>({
    dailySummary: "",
    status: "draft",
    tomorrowFocus: "",
  });
  const [intervals, setIntervals] = useState<SaveDiaryIntervalInput[]>([]);
  const [intervalDraft, setIntervalDraft] = useState<SaveDiaryIntervalInput>({
    endTime: "10:00",
    notes: "",
    startTime: "09:00",
    summary: "",
    title: "",
  });

  useEffect(() => {
    const day = dayQuery.data;

    setDraft({
      dailySummary: day?.dailySummary ?? "",
      status: day?.status ?? "draft",
      tomorrowFocus: day?.tomorrowFocus ?? "",
    });
    setIntervals(
      day?.intervals.map((interval) => ({
        id: interval.id,
        endTime: interval.endTime,
        notes: interval.notes,
        startTime: interval.startTime,
        summary: interval.summary,
        title: interval.title,
      })) ?? [],
    );
  }, [dayQuery.data]);

  const invalidateDiary = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: diaryDayQueryKey(dateKey) }),
      queryClient.invalidateQueries({ queryKey: diaryRecentQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardAnalyticsQueryKey }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      rpcClient.diary.saveDay({
        dateKey,
        dailySummary: draft.dailySummary,
        intervals,
        status: draft.status,
        tomorrowFocus: draft.tomorrowFocus,
      }),
    onError: (error) => {
      Alert.alert(
        "Could not save diary",
        error instanceof Error ? error.message : "Please check the entry.",
      );
    },
    onSuccess: async () => {
      successImpact();
      await invalidateDiary();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => rpcClient.diary.deleteDay({ dateKey }),
    onError: (error) => {
      Alert.alert(
        "Could not delete diary",
        error instanceof Error ? error.message : "Please try again.",
      );
    },
    onSuccess: async () => {
      warningImpact();
      setDraft({ dailySummary: "", status: "draft", tomorrowFocus: "" });
      setIntervals([]);
      await invalidateDiary();
    },
  });

  function addInterval() {
    if (!intervalDraft.title.trim() && !intervalDraft.summary.trim()) {
      Alert.alert("Add a title or summary first");
      return;
    }

    setIntervals((current) => [
      ...current,
      {
        ...intervalDraft,
        title: intervalDraft.title.trim() || "Focus block",
      },
    ]);
    setIntervalDraft({
      endTime: "10:00",
      notes: "",
      startTime: "09:00",
      summary: "",
      title: "",
    });
    successImpact();
  }

  function deleteDiary() {
    Alert.alert("Delete diary day?", `Remove ${dateKey} from your diary.`, [
      { style: "cancel", text: "Cancel" },
      {
        onPress: () => deleteMutation.mutate(),
        style: "destructive",
        text: "Delete",
      },
    ]);
  }

  return (
    <ScreenScroll tabBar>
      <ScreenHeader
        title="Learn"
        subtitle="Diary, DSA practice, and activity history in one place."
      />
      <SegmentedControl onChange={setView} options={learnOptions} value={view} />
      <Card>
        <View style={styles.dateRow}>
          <Button onPress={() => setDateKey(addDays(dateKey, -1))} variant="secondary">
            <ChevronLeft size={16} />
          </Button>
          <View style={styles.dateCopy}>
            <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
              Diary day
            </Text>
            <Text style={[styles.dateValue, { color: colors.text }]}>
              {formatLongDate(dateKey)}
            </Text>
          </View>
          <Button onPress={() => setDateKey(addDays(dateKey, 1))} variant="secondary">
            <ChevronRight size={16} />
          </Button>
        </View>
      </Card>

      {dayQuery.isPending ? (
        <LoadingState message="Loading diary" />
      ) : (
        <>
          <Card>
            <SectionTitle title="Daily review" />
            <TextField
              label="Summary"
              multiline
              onChangeText={(dailySummary) =>
                setDraft((current) => ({ ...current, dailySummary }))
              }
              placeholder="What moved today?"
              value={draft.dailySummary}
            />
            <TextField
              label="Tomorrow focus"
              multiline
              onChangeText={(tomorrowFocus) =>
                setDraft((current) => ({ ...current, tomorrowFocus }))
              }
              placeholder="What deserves attention next?"
              value={draft.tomorrowFocus}
            />
            <SegmentedControl
              onChange={(status) => setDraft((current) => ({ ...current, status }))}
              options={[
                { label: "Draft", value: "draft" },
                { label: "Complete", value: "complete" },
              ]}
              value={draft.status}
            />
            <View style={styles.taskActions}>
              <Button loading={saveMutation.isPending} onPress={() => saveMutation.mutate()}>
                <Save color="#FFFFFF" size={16} /> Save day
              </Button>
              <Button
                loading={deleteMutation.isPending}
                onPress={deleteDiary}
                variant="danger"
              >
                <Trash2 color="#FFFFFF" size={16} />
              </Button>
            </View>
          </Card>

          <Card>
            <SectionTitle title="Intervals" subtitle={`${intervals.length} saved blocks`} />
            {intervals.map((interval, index) => (
              <View key={`${interval.startTime}-${interval.title}-${index}`} style={styles.intervalItem}>
                <View style={styles.taskTopRow}>
                  <Badge tone="primary">
                    {interval.startTime}-{interval.endTime}
                  </Badge>
                  <Pressable
                    onPress={() =>
                      setIntervals((current) =>
                        current.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    <Trash2 color={colors.danger} size={16} />
                  </Pressable>
                </View>
                <Text style={[styles.intervalTitle, { color: colors.text }]}>
                  {interval.title}
                </Text>
                {interval.summary ? (
                  <Text style={[styles.mutedText, { color: colors.textMuted }]}>
                    {interval.summary}
                  </Text>
                ) : null}
              </View>
            ))}
            <View style={styles.twoColumn}>
              <TextField
                label="Start"
                onChangeText={(startTime) =>
                  setIntervalDraft((current) => ({ ...current, startTime }))
                }
                value={intervalDraft.startTime}
              />
              <TextField
                label="End"
                onChangeText={(endTime) =>
                  setIntervalDraft((current) => ({ ...current, endTime }))
                }
                value={intervalDraft.endTime}
              />
            </View>
            <TextField
              label="Title"
              onChangeText={(title) =>
                setIntervalDraft((current) => ({ ...current, title }))
              }
              value={intervalDraft.title}
            />
            <TextField
              label="Summary"
              multiline
              onChangeText={(summary) =>
                setIntervalDraft((current) => ({ ...current, summary }))
              }
              value={intervalDraft.summary}
            />
            <Button onPress={addInterval} variant="secondary">
              Add interval
            </Button>
          </Card>
        </>
      )}
    </ScreenScroll>
  );
}

function DsaView({
  setView,
  view,
}: {
  setView: (view: LearnView) => void;
  view: LearnView;
}) {
  const { colors } = useAppTheme();
  const listContentStyle = useScreenContentStyle({ tabBar: true });
  const queryClient = useQueryClient();
  const snapshotQuery = useQuery({
    queryKey: dsaSnapshotQueryKey,
    queryFn: () => rpcClient.dsa.snapshot(),
  });
  const [selectedTrackId, setSelectedTrackId] = useState("");

  useEffect(() => {
    const firstTrackId = snapshotQuery.data?.catalog.tracks[0]?.id;

    if (firstTrackId && !selectedTrackId) {
      setSelectedTrackId(firstTrackId);
    }
  }, [selectedTrackId, snapshotQuery.data?.catalog.tracks]);

  const selectedTrack = snapshotQuery.data?.catalog.tracks.find(
    (track) => track.id === selectedTrackId,
  );
  const questions = selectedTrack ? flattenTrackQuestions(selectedTrack) : [];
  const progressByQuestion = new Map(
    (snapshotQuery.data?.progress ?? []).map((item) => [item.questionId, item]),
  );

  const progressMutation = useMutation({
    mutationFn: ({ completed, questionId }: { completed: boolean; questionId: string }) =>
      rpcClient.dsa.updateQuestionProgress({ completed, questionId }),
    onError: (error) => {
      Alert.alert(
        "Could not update progress",
        error instanceof Error ? error.message : "Please try again.",
      );
    },
    onSuccess: async () => {
      successImpact();
      await queryClient.invalidateQueries({ queryKey: dsaSnapshotQueryKey });
    },
  });

  const watchMutation = useMutation({
    mutationFn: (questionId: string) => rpcClient.dsa.recordVideoWatch({ questionId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: dsaSnapshotQueryKey });
    },
  });

  const header = (
    <View style={styles.headerWrap}>
      <ScreenHeader
        title="DSA"
        subtitle="Track lesson, LeetCode, and video progress while practicing."
      />
      <SegmentedControl onChange={setView} options={learnOptions} value={view} />
      {snapshotQuery.data ? (
        <View style={styles.statGrid}>
          <StatCard
            icon={BookOpenCheck}
            label="Completed"
            value={snapshotQuery.data.summary.completedQuestions}
            detail={`${snapshotQuery.data.summary.completionPercentage}% done`}
          />
          <StatCard
            icon={CalendarDays}
            label="Total"
            value={snapshotQuery.data.summary.totalQuestions}
            tone="accent"
          />
        </View>
      ) : null}
      <View style={styles.filterRow}>
        {(snapshotQuery.data?.catalog.tracks ?? []).map((track) => (
          <Pressable key={track.id} onPress={() => setSelectedTrackId(track.id)}>
            <Badge tone={track.id === selectedTrackId ? "primary" : "default"}>
              {track.title}
            </Badge>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (snapshotQuery.isPending) {
    return <LoadingState message="Loading DSA plan" />;
  }

  if (snapshotQuery.isError) {
    return (
      <EmptyState
        title="DSA unavailable"
        message="Careeright could not load your DSA snapshot."
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlashList
        ListEmptyComponent={
          <EmptyState title="No questions" message="Pick another track to continue." />
        }
        ListHeaderComponent={header}
        contentContainerStyle={[styles.listContent, listContentStyle]}
        contentInsetAdjustmentBehavior="automatic"
        data={questions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const progress = progressByQuestion.get(item.id);

          return (
            <DsaQuestionCard
              completed={Boolean(progress?.completed)}
              isBusy={progressMutation.isPending}
              onOpen={() => {
                if (item.videoUrl) {
                  watchMutation.mutate(item.id);
                }
                openExternalUrl(item.videoUrl ?? item.leetcodeUrl);
              }}
              onToggle={() =>
                progressMutation.mutate({
                  completed: !progress?.completed,
                  questionId: item.id,
                })
              }
              question={item}
            />
          );
        }}
      />
    </View>
  );
}

function SystemDesignView({
  setView,
  view,
}: {
  setView: (view: LearnView) => void;
  view: LearnView;
}) {
  const { colors } = useAppTheme();
  const listContentStyle = useScreenContentStyle({ tabBar: true });
  const queryClient = useQueryClient();
  const snapshotQuery = useQuery({
    queryKey: systemDesignSnapshotQueryKey,
    queryFn: () => rpcClient.systemDesign.snapshot(),
  });
  const [selectedTrackId, setSelectedTrackId] = useState("");

  useEffect(() => {
    const firstTrackId = snapshotQuery.data?.catalog.tracks[0]?.id;

    if (firstTrackId && !selectedTrackId) {
      setSelectedTrackId(firstTrackId);
    }
  }, [selectedTrackId, snapshotQuery.data?.catalog.tracks]);

  const selectedTrack = snapshotQuery.data?.catalog.tracks.find(
    (track) => track.id === selectedTrackId,
  );
  const items = selectedTrack ? flattenSystemDesignItems(selectedTrack) : [];
  const progressByItem = new Map(
    (snapshotQuery.data?.progress ?? []).map((item) => [item.itemId, item]),
  );

  const progressMutation = useMutation({
    mutationFn: ({ completed, itemId }: { completed: boolean; itemId: string }) =>
      rpcClient.systemDesign.updateItemProgress({ completed, itemId }),
    onError: (error) => {
      Alert.alert(
        "Could not update progress",
        error instanceof Error ? error.message : "Please try again.",
      );
    },
    onSuccess: async () => {
      successImpact();
      await queryClient.invalidateQueries({
        queryKey: systemDesignSnapshotQueryKey,
      });
    },
  });

  const watchMutation = useMutation({
    mutationFn: (itemId: string) =>
      rpcClient.systemDesign.recordVideoWatch({ itemId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: systemDesignSnapshotQueryKey,
      });
    },
  });

  const header = (
    <View style={styles.headerWrap}>
      <ScreenHeader
        title="System Design"
        subtitle="HLD, LLD, and distributed systems from basics to core."
      />
      <SegmentedControl onChange={setView} options={learnOptions} value={view} />
      {snapshotQuery.data ? (
        <View style={styles.statGrid}>
          <StatCard
            icon={BookOpenCheck}
            label="Completed"
            value={snapshotQuery.data.summary.completedItems}
            detail={`${snapshotQuery.data.summary.completionPercentage}% done`}
          />
          <StatCard
            icon={CalendarDays}
            label="Lessons"
            value={snapshotQuery.data.summary.totalLessons}
            tone="accent"
          />
        </View>
      ) : null}
      <View style={styles.filterRow}>
        {(snapshotQuery.data?.catalog.tracks ?? []).map((track) => (
          <Pressable key={track.id} onPress={() => setSelectedTrackId(track.id)}>
            <Badge tone={track.id === selectedTrackId ? "primary" : "default"}>
              {track.title}
            </Badge>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (snapshotQuery.isPending) {
    return <LoadingState message="Loading System Design plan" />;
  }

  if (snapshotQuery.isError) {
    return (
      <EmptyState
        title="System Design unavailable"
        message="Careeright could not load your System Design snapshot."
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlashList
        ListEmptyComponent={
          <EmptyState title="No items" message="Pick another track to continue." />
        }
        ListHeaderComponent={header}
        contentContainerStyle={[styles.listContent, listContentStyle]}
        contentInsetAdjustmentBehavior="automatic"
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const progress = progressByItem.get(item.id);

          return (
            <SystemDesignItemCard
              completed={Boolean(progress?.completed)}
              isBusy={progressMutation.isPending}
              onOpen={() => {
                if (item.videoUrl) {
                  watchMutation.mutate(item.id);
                  openExternalUrl(item.videoUrl);
                }
              }}
              onToggle={() =>
                progressMutation.mutate({
                  completed: !progress?.completed,
                  itemId: item.id,
                })
              }
              item={item}
            />
          );
        }}
      />
    </View>
  );
}

function HistoryView({
  setView,
  view,
}: {
  setView: (view: LearnView) => void;
  view: LearnView;
}) {
  const historyQuery = useQuery({
    queryKey: historySnapshotQueryKey,
    queryFn: () => rpcClient.history.snapshot(),
  });
  const history = historyQuery.data;
  const recentDays = history?.days.slice(-14) ?? [];

  return (
    <ScreenScroll tabBar>
      <ScreenHeader
        title="History"
        subtitle="A 30-day rollup of practice and job application activity."
      />
      <SegmentedControl onChange={setView} options={learnOptions} value={view} />
      {historyQuery.isPending ? (
        <LoadingState message="Loading history" />
      ) : !history ? (
        <EmptyState title="No history" message="Activity summaries will appear here." />
      ) : (
        <>
          <View style={styles.statGrid}>
            <StatCard label="Solved" value={history.summary.solvedQuestions} />
            <StatCard label="Videos" value={history.summary.watchedVideos} tone="accent" />
            <StatCard label="Applied" value={history.summary.appliedJobs} tone="success" />
            <StatCard label="Offers" value={history.summary.offerJobs} tone="violet" />
          </View>
          <ChartCard title="DSA activity" subtitle={`${history.range.days} day range`}>
            <MiniBarChart
              data={recentDays.map((day) => ({
                label: day.date.slice(5),
                value: day.solvedQuestions + day.watchedVideos,
              }))}
            />
          </ChartCard>
          <ChartCard title="Job activity" subtitle="Applications and interviews">
            <MiniBarChart
              data={recentDays.map((day) => ({
                label: day.date.slice(5),
                value:
                  day.appliedJobs +
                  day.interviewingJobs +
                  day.rejectedJobs +
                  day.offerJobs,
              }))}
            />
          </ChartCard>
        </>
      )}
    </ScreenScroll>
  );
}

function DsaQuestionCard({
  completed,
  isBusy,
  onOpen,
  onToggle,
  question,
}: {
  completed: boolean;
  isBusy: boolean;
  onOpen: () => void;
  onToggle: () => void;
  question: DsaQuestion;
}) {
  const { colors } = useAppTheme();

  return (
    <Card style={styles.questionCard}>
      <View style={styles.taskTopRow}>
        <Badge tone={completed ? "success" : "default"}>
          {completed ? "Complete" : "Open"}
        </Badge>
        <Badge tone={question.difficulty === "HARD" ? "danger" : "accent"}>
          {question.difficulty ? titleCase(question.difficulty.toLowerCase()) : question.lessonLabel}
        </Badge>
      </View>
      <Text selectable style={[styles.questionTitle, { color: colors.text }]}>
        {question.title}
      </Text>
      <Text selectable style={[styles.mutedText, { color: colors.textMuted }]}>
        {question.lessonLabel} - {titleCase(question.sourceType)}
      </Text>
      <View style={styles.taskActions}>
        <Button disabled={isBusy} onPress={onToggle} variant={completed ? "secondary" : "primary"}>
          {completed ? "Mark open" : "Mark done"}
        </Button>
        {question.videoUrl || question.leetcodeUrl ? (
          <Button onPress={onOpen} variant="ghost">
            {question.videoUrl ? (
              <PlayCircle color={colors.text} size={16} />
            ) : (
              <ExternalLink color={colors.text} size={16} />
            )}
            Open
          </Button>
        ) : null}
      </View>
    </Card>
  );
}

function flattenTrackQuestions(track: DsaTrack) {
  return track.subtopics.flatMap((subtopic) => subtopic.questions);
}

function SystemDesignItemCard({
  completed,
  isBusy,
  item,
  onOpen,
  onToggle,
}: {
  completed: boolean;
  isBusy: boolean;
  item: SystemDesignItem;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Card style={styles.questionCard}>
      <View style={styles.taskTopRow}>
        <Badge tone={completed ? "success" : "default"}>
          {completed ? "Complete" : "Open"}
        </Badge>
        <Badge tone={item.sourceType === "drill" ? "violet" : "accent"}>
          {item.sourceType === "drill" ? "Drill" : item.lessonLabel}
        </Badge>
      </View>
      <Text selectable style={[styles.questionTitle, { color: colors.text }]}>
        {item.title}
      </Text>
      <Text selectable style={[styles.mutedText, { color: colors.textMuted }]}>
        {item.sourceType === "lesson"
          ? `${item.lessonLabel} - ${item.sourceName ?? "Lesson"}`
          : item.description}
      </Text>
      <View style={styles.taskActions}>
        <Button disabled={isBusy} onPress={onToggle} variant={completed ? "secondary" : "primary"}>
          {completed ? "Mark open" : "Mark done"}
        </Button>
        {item.videoUrl ? (
          <Button onPress={onOpen} variant="ghost">
            <PlayCircle color={colors.text} size={16} />
            Open
          </Button>
        ) : null}
      </View>
    </Card>
  );
}

function flattenSystemDesignItems(track: SystemDesignTrack) {
  return track.modules.flatMap((module) => module.items);
}

const styles = StyleSheet.create({
  dateCopy: {
    alignItems: "center",
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  dateRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.three,
  },
  dateValue: {
    fontSize: 18,
    fontWeight: "900",
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.two,
  },
  headerWrap: {
    gap: spacing.four,
    marginBottom: spacing.three,
  },
  intervalItem: {
    gap: spacing.two,
  },
  intervalTitle: {
    fontSize: 16,
    fontWeight: "900",
  },
  listContent: {
    padding: spacing.four,
    paddingBottom: spacing.seven,
  },
  mutedText: {
    fontSize: 13,
    lineHeight: 19,
  },
  questionCard: {
    marginBottom: spacing.three,
  },
  questionTitle: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
  screen: {
    flex: 1,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.three,
  },
  taskActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.two,
  },
  taskTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.two,
    justifyContent: "space-between",
  },
  twoColumn: {
    flexDirection: "row",
    gap: spacing.three,
  },
});
