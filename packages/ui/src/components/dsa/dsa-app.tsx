"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpenCheck,
  CheckCircle2,
  Circle,
  CirclePlay,
  ExternalLink,
  ListChecks,
  Loader2,
  PlayCircle,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Badge } from "../ui/badge";
import { Button, buttonVariants } from "../ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import type {
  DsaCatalog,
  DsaQuestion,
  DsaQuestionProgress,
  DsaSnapshot,
  DsaSubtopic,
  DsaTrack,
  DsaVideoWatchEvent,
  UpdateDsaQuestionProgressInput,
} from "@careeright/domain/dsa/schema";
import {
  buildDsaPlaylistEmbedUrl,
  buildDsaVideoEmbedUrl,
} from "@careeright/domain/dsa/youtube";
import { useCareerightUi } from "../../providers/careeright-ui-provider";
import {
  dsaSnapshotQueryKey,
  historySnapshotQueryKey,
} from "@careeright/api/query-keys";
import { cn } from "../../lib/utils";

const DSA_SURFACE_TONES = [
  "border-primary/25 bg-primary/5",
  "border-chart-1/25 bg-chart-1/10",
  "border-chart-2/25 bg-chart-2/10",
  "border-chart-3/25 bg-chart-3/10",
  "border-chart-4/25 bg-chart-4/10",
  "border-chart-5/25 bg-chart-5/10",
];

const DSA_BADGE_TONES = [
  "border-primary/30 bg-primary/10 text-foreground",
  "border-chart-1/35 bg-chart-1/15 text-foreground",
  "border-chart-2/35 bg-chart-2/15 text-foreground",
  "border-chart-3/35 bg-chart-3/15 text-foreground",
  "border-chart-4/35 bg-chart-4/15 text-foreground",
  "border-chart-5/35 bg-chart-5/15 text-foreground",
];

const DSA_VIDEO_PLAYBACK_RATE = 1.5;

type YouTubePlayer = {
  destroy?: () => void;
  setPlaybackRate: (suggestedRate: number) => void;
};

type YouTubePlayerEvent = {
  data?: number;
  target: YouTubePlayer;
};

type YouTubeIframeApi = {
  Player: new (
    element: HTMLIFrameElement,
    options: {
      events?: {
        onReady?: (event: YouTubePlayerEvent) => void;
        onStateChange?: (event: YouTubePlayerEvent) => void;
      };
    },
  ) => YouTubePlayer;
  PlayerState: {
    CUED: number;
    PLAYING: number;
  };
};

declare global {
  interface Window {
    YT?: YouTubeIframeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

type DsaVideoDialogState = {
  title: string;
  description: string;
  embedUrl: string;
};

let youTubeIframeApiPromise: Promise<YouTubeIframeApi> | undefined;

export function DsaApp({ initialSnapshot }: { initialSnapshot?: DsaSnapshot }) {
  const { rpcClient } = useCareerightUi();
  const [openTrackIds, setOpenTrackIds] = useState<string[]>([]);
  const [activeVideo, setActiveVideo] = useState<DsaVideoDialogState | null>(
    null,
  );
  const [pendingQuestionIds, setPendingQuestionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const queryClient = useQueryClient();
  const dsaQuery = useQuery({
    queryKey: dsaSnapshotQueryKey,
    queryFn: () => rpcClient.dsa.snapshot(),
    initialData: initialSnapshot,
    staleTime: 60_000,
  });
  const snapshot = dsaQuery.data ?? initialSnapshot;
  const updateProgressMutation = useMutation({
    mutationFn: (input: UpdateDsaQuestionProgressInput) =>
      rpcClient.dsa.updateQuestionProgress(input),
    onMutate: async (input) => {
      setPendingQuestionIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(input.questionId);
        return nextIds;
      });
      await queryClient.cancelQueries({ queryKey: dsaSnapshotQueryKey });
      const previousSnapshot =
        queryClient.getQueryData<DsaSnapshot>(dsaSnapshotQueryKey);

      queryClient.setQueryData<DsaSnapshot>(
        dsaSnapshotQueryKey,
        (currentSnapshot) =>
          currentSnapshot
            ? optimisticSnapshot(currentSnapshot, input)
            : currentSnapshot,
      );

      return { previousSnapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.previousSnapshot) {
        queryClient.setQueryData(dsaSnapshotQueryKey, context.previousSnapshot);
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData(dsaSnapshotQueryKey, result.snapshot);
      void queryClient.invalidateQueries({ queryKey: historySnapshotQueryKey });
    },
    onSettled: (_result, _error, input) => {
      setPendingQuestionIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(input.questionId);
        return nextIds;
      });
    },
  });
  const recordVideoWatchMutation = useMutation({
    mutationFn: (questionId: string) =>
      rpcClient.dsa.recordVideoWatch({ questionId }),
    onSuccess: (event) => {
      queryClient.setQueryData<DsaSnapshot>(
        dsaSnapshotQueryKey,
        (currentSnapshot) =>
          currentSnapshot
            ? appendVideoWatchEvent(currentSnapshot, event)
            : currentSnapshot,
      );
      void queryClient.invalidateQueries({ queryKey: historySnapshotQueryKey });
    },
  });
  const progressByQuestionId = useMemo(
    () => new Map(snapshot?.progress.map((item) => [item.questionId, item])),
    [snapshot?.progress],
  );
  const completedQuestionIds = useMemo(
    () =>
      new Set(
        snapshot?.progress
          .filter((item) => item.completed)
          .map((item) => item.questionId) ?? [],
      ),
    [snapshot?.progress],
  );
  const watchedVideoQuestionIds = useMemo(
    () =>
      new Set(snapshot?.videoWatches.map((event) => event.questionId) ?? []),
    [snapshot?.videoWatches],
  );

  function onToggleQuestion(questionId: string, completed: boolean) {
    updateProgressMutation.mutate({ questionId, completed });
  }

  function onOpenPlaylist(track: DsaTrack) {
    const embedUrl = buildDsaPlaylistEmbedUrl(track.playlistUrl);

    if (!embedUrl) {
      return;
    }

    setActiveVideo({
      title: track.playlistTitle,
      description: `${track.sourceName} playlist for ${track.title}`,
      embedUrl,
    });
  }

  function onOpenQuestionVideo(question: DsaQuestion) {
    const embedUrl = buildDsaVideoEmbedUrl({
      videoId: question.videoId,
      videoUrl: question.videoUrl,
    });

    if (!embedUrl) {
      return;
    }

    setActiveVideo({
      title: question.title,
      description: question.lessonLabel,
      embedUrl,
    });
    recordVideoWatchMutation.mutate(question.id);
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-primary/20 bg-[linear-gradient(90deg,color-mix(in_oklch,var(--primary)_14%,transparent),color-mix(in_oklch,var(--chart-2)_10%,transparent),color-mix(in_oklch,var(--chart-3)_8%,transparent))] px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">DSA</p>
          <p className="truncate text-xs text-muted-foreground">
            Topic-wise practice progress with videos and LeetCode
          </p>
        </div>
      </header>

      <main className="w-full min-w-0 max-w-full overflow-x-hidden bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_34%),linear-gradient(315deg,color-mix(in_oklch,var(--chart-2)_9%,transparent),transparent_42%)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-5">
          {dsaQuery.isPending && !snapshot ? (
            <DsaInlineSkeleton />
          ) : dsaQuery.isError || !snapshot ? (
            <Empty className="min-h-[360px] border border-border bg-background">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListChecks aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Could not load DSA progress</EmptyTitle>
                <EmptyDescription>
                  Refresh the page and try again. Your completion state stays
                  scoped to your account.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <DsaSummaryCard snapshot={snapshot} />
              <Card
                size="sm"
                className="min-w-0 border-chart-2/20 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--chart-2)_11%,transparent),transparent_38%),linear-gradient(315deg,color-mix(in_oklch,var(--chart-3)_9%,transparent),transparent_44%),var(--card)]"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ListChecks aria-hidden="true" />
                    Practice tracks
                  </CardTitle>
                  <CardDescription>
                    Lessons and LeetCode problems are grouped by subtopic.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion
                    value={openTrackIds}
                    onValueChange={(value) => setOpenTrackIds(value)}
                  >
                    {snapshot.catalog.tracks.map((track) => {
                      const trackStats = getDsaProgressStats(
                        track.subtopics.flatMap(
                          (subtopic) => subtopic.questions,
                        ),
                        completedQuestionIds,
                        watchedVideoQuestionIds,
                      );

                      return (
                        <AccordionItem key={track.id} value={track.id}>
                          <AccordionTrigger>
                            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                              <div className="min-w-0">
                                <span className="block truncate text-base">
                                  {track.title}
                                </span>
                                <span className="block text-sm font-normal text-muted-foreground">
                                  {track.playlistTitle}
                                </span>
                              </div>
                              <DsaProgressCluster stats={trackStats} compact />
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <div className="flex flex-col gap-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="secondary">
                                    {track.sourceName}
                                  </Badge>
                                  <Badge variant="outline">
                                    {track.subtopics.length} subtopics
                                  </Badge>
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onOpenPlaylist(track)}
                                >
                                  <CirclePlay
                                    data-icon="inline-start"
                                    aria-hidden="true"
                                  />
                                  Playlist
                                </Button>
                              </div>
                              <DsaSubtopicAccordion
                                subtopics={track.subtopics}
                                completedQuestionIds={completedQuestionIds}
                                watchedVideoQuestionIds={
                                  watchedVideoQuestionIds
                                }
                                progressByQuestionId={progressByQuestionId}
                                pendingQuestionIds={pendingQuestionIds}
                                onOpenVideo={onOpenQuestionVideo}
                                onToggleQuestion={onToggleQuestion}
                              />
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>

      {activeVideo ? (
        <DsaVideoDialog
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      ) : null}
    </>
  );
}

function DsaSummaryCard({ snapshot }: { snapshot: DsaSnapshot }) {
  const questions = snapshot.catalog.tracks.flatMap((track) =>
    track.subtopics.flatMap((subtopic) => subtopic.questions),
  );
  const lessonQuestions = questions.filter(
    (question) => question.sourceType === "lesson",
  ).length;
  const leetcodeQuestions = questions.filter(
    (question) => question.sourceType === "leetcode",
  ).length;
  const watchedVideos = new Set(
    snapshot.videoWatches.map((event) => event.questionId),
  ).size;

  return (
    <Card
      size="sm"
      className="border-primary/25 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_18%,transparent),transparent_34%),linear-gradient(225deg,color-mix(in_oklch,var(--chart-3)_14%,transparent),transparent_48%),linear-gradient(315deg,color-mix(in_oklch,var(--chart-1)_14%,transparent),transparent_42%),var(--card)]"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 aria-hidden="true" />
          DSA Progress
        </CardTitle>
        <CardDescription>
          {snapshot.catalog.tracks.length} tracks with affiliated LeetCode
          practice.
        </CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Badge variant="secondary">
            {snapshot.summary.completedQuestions}/
            {snapshot.summary.totalQuestions} done
          </Badge>
          <Badge variant="outline">
            {snapshot.summary.completionPercentage}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <DsaMetric
          label="Tracks"
          value={snapshot.catalog.tracks.length}
          toneIndex={5}
        />
        <DsaMetric label="Lessons" value={lessonQuestions} toneIndex={0} />
        <DsaMetric label="Watched" value={watchedVideos} toneIndex={1} />
        <DsaMetric label="LeetCode" value={leetcodeQuestions} toneIndex={2} />
        <DsaMetric
          label="Subtopics"
          value={snapshot.catalog.tracks.reduce(
            (count, trackItem) => count + trackItem.subtopics.length,
            0,
          )}
          toneIndex={3}
        />
        <DsaMetric
          label="Remaining"
          value={
            snapshot.summary.totalQuestions -
            snapshot.summary.completedQuestions
          }
          toneIndex={4}
        />
      </CardContent>
    </Card>
  );
}

function DsaMetric({
  label,
  value,
  toneIndex,
}: {
  label: string;
  value: number;
  toneIndex: number;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2 shadow-sm",
        DSA_SURFACE_TONES[toneIndex % DSA_SURFACE_TONES.length],
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl font-medium">{value}</p>
    </div>
  );
}

function DsaSubtopicAccordion({
  subtopics,
  completedQuestionIds,
  watchedVideoQuestionIds,
  progressByQuestionId,
  pendingQuestionIds,
  onOpenVideo,
  onToggleQuestion,
}: {
  subtopics: DsaSubtopic[];
  completedQuestionIds: Set<string>;
  watchedVideoQuestionIds: Set<string>;
  progressByQuestionId: Map<string, DsaQuestionProgress>;
  pendingQuestionIds: Set<string>;
  onOpenVideo: (question: DsaQuestion) => void;
  onToggleQuestion: (questionId: string, completed: boolean) => void;
}) {
  const [openSubtopicIds, setOpenSubtopicIds] = useState<string[]>([]);

  return (
    <div className="grid gap-4">
      <DsaJourneyMap
        subtopics={subtopics}
        completedQuestionIds={completedQuestionIds}
        watchedVideoQuestionIds={watchedVideoQuestionIds}
        openSubtopicIds={openSubtopicIds}
        onSelectSubtopic={(subtopicId) =>
          setOpenSubtopicIds((currentIds) =>
            currentIds.includes(subtopicId)
              ? currentIds
              : [...currentIds, subtopicId],
          )
        }
      />
      <Accordion
        multiple
        value={openSubtopicIds}
        onValueChange={(value) => setOpenSubtopicIds(value)}
        className="rounded-xl"
      >
        {subtopics.map((subtopic, index) => {
          const stats = getDsaProgressStats(
            subtopic.questions,
            completedQuestionIds,
            watchedVideoQuestionIds,
          );
          const toneIndex = index % DSA_SURFACE_TONES.length;

          return (
            <AccordionItem
              key={subtopic.id}
              value={subtopic.id}
              className={cn(
                "border-b border-border/70 data-open:bg-transparent",
                DSA_SURFACE_TONES[toneIndex],
              )}
            >
              <AccordionTrigger>
                <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <DsaMilestoneOrb
                      index={index + 1}
                      stats={stats}
                      toneIndex={toneIndex}
                    />
                    <div className="min-w-0">
                      <span className="block truncate">{subtopic.title}</span>
                      <span className="block text-sm font-normal text-muted-foreground">
                        {subtopic.description}
                      </span>
                    </div>
                  </div>
                  <DsaProgressCluster stats={stats} toneIndex={toneIndex} />
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <DsaLessonAccordion
                  subtopic={subtopic}
                  toneIndex={toneIndex}
                  progressByQuestionId={progressByQuestionId}
                  completedQuestionIds={completedQuestionIds}
                  watchedVideoQuestionIds={watchedVideoQuestionIds}
                  pendingQuestionIds={pendingQuestionIds}
                  onOpenVideo={onOpenVideo}
                  onToggleQuestion={onToggleQuestion}
                />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

type DsaProgressStats = {
  totalQuestions: number;
  completedQuestions: number;
  totalVideos: number;
  watchedVideos: number;
  totalPracticeQuestions: number;
  completedPracticeQuestions: number;
  completionPercentage: number;
  videoPercentage: number;
  isQuestionsComplete: boolean;
  isVideosComplete: boolean;
  isComplete: boolean;
};

function DsaJourneyMap({
  subtopics,
  completedQuestionIds,
  watchedVideoQuestionIds,
  openSubtopicIds,
  onSelectSubtopic,
}: {
  subtopics: DsaSubtopic[];
  completedQuestionIds: Set<string>;
  watchedVideoQuestionIds: Set<string>;
  openSubtopicIds: string[];
  onSelectSubtopic: (subtopicId: string) => void;
}) {
  const completedSubtopics = subtopics.filter(
    (subtopic) =>
      getDsaProgressStats(
        subtopic.questions,
        completedQuestionIds,
        watchedVideoQuestionIds,
      ).isComplete,
  ).length;

  return (
    <section className="rounded-xl border border-primary/20 bg-background/70 p-3 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Subtopic journey
            </p>
            <p className="text-xs text-muted-foreground">
              Videos watched and questions solved across this track.
            </p>
          </div>
        </div>
        <Badge variant="secondary">
          <Trophy data-icon="inline-start" aria-hidden="true" />
          {completedSubtopics}/{subtopics.length} complete
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {subtopics.map((subtopic, index) => {
          const toneIndex = index % DSA_SURFACE_TONES.length;
          const stats = getDsaProgressStats(
            subtopic.questions,
            completedQuestionIds,
            watchedVideoQuestionIds,
          );
          const isOpen = openSubtopicIds.includes(subtopic.id);

          return (
            <button
              key={subtopic.id}
              type="button"
              onClick={() => onSelectSubtopic(subtopic.id)}
              className={cn(
                "group min-w-0 rounded-xl border bg-card/80 p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none",
                isOpen ? "border-primary/50 bg-primary/5" : "border-border",
              )}
            >
              <div className="flex min-w-0 items-start gap-3">
                <DsaMilestoneOrb
                  index={index + 1}
                  stats={stats}
                  toneIndex={toneIndex}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {subtopic.title}
                    </p>
                    <span className="shrink-0 text-xs font-semibold text-primary">
                      {stats.completionPercentage}%
                    </span>
                  </div>
                  <DsaProgressBar
                    value={stats.completionPercentage}
                    className="mt-2"
                  />
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <DsaMiniBadge
                      icon={<BookOpenCheck aria-hidden="true" />}
                      label={`${stats.completedQuestions}/${stats.totalQuestions} questions`}
                      complete={stats.isQuestionsComplete}
                    />
                    <DsaMiniBadge
                      icon={<PlayCircle aria-hidden="true" />}
                      label={`${stats.watchedVideos}/${stats.totalVideos} videos`}
                      complete={stats.isVideosComplete}
                    />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function DsaProgressCluster({
  stats,
  toneIndex = 0,
  compact = false,
}: {
  stats: DsaProgressStats;
  toneIndex?: number;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-wrap items-center gap-2 text-xs",
        compact ? "lg:justify-end" : "lg:max-w-[420px] lg:justify-end",
      )}
    >
      <Badge
        variant={stats.isComplete ? "default" : "outline"}
        className={cn(!stats.isComplete && DSA_BADGE_TONES[toneIndex])}
      >
        {stats.isComplete ? (
          <Trophy data-icon="inline-start" aria-hidden="true" />
        ) : (
          <Target data-icon="inline-start" aria-hidden="true" />
        )}
        {stats.completedQuestions}/{stats.totalQuestions} done
      </Badge>
      <Badge
        variant="outline"
        className={DSA_BADGE_TONES[(toneIndex + 1) % DSA_BADGE_TONES.length]}
      >
        <PlayCircle data-icon="inline-start" aria-hidden="true" />
        {stats.watchedVideos}/{stats.totalVideos} videos
      </Badge>
      {!compact ? (
        <Badge
          variant="outline"
          className={DSA_BADGE_TONES[(toneIndex + 2) % DSA_BADGE_TONES.length]}
        >
          <BookOpenCheck data-icon="inline-start" aria-hidden="true" />
          {stats.completedPracticeQuestions}/{stats.totalPracticeQuestions}{" "}
          practice
        </Badge>
      ) : null}
      <span className="min-w-12 rounded-full border border-border bg-background/75 px-2 py-1 text-center font-semibold text-foreground">
        {stats.completionPercentage}%
      </span>
    </div>
  );
}

function DsaMilestoneOrb({
  index,
  stats,
  toneIndex,
  size = "default",
}: {
  index: number;
  stats: DsaProgressStats;
  toneIndex: number;
  size?: "default" | "sm";
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-full border text-sm font-semibold shadow-sm",
        size === "sm" ? "size-9" : "size-11",
        stats.isComplete
          ? "border-primary bg-primary text-primary-foreground"
          : DSA_SURFACE_TONES[toneIndex],
      )}
    >
      {stats.isComplete ? (
        <Trophy className="size-4" aria-hidden="true" />
      ) : (
        <span>{index}</span>
      )}
      <span
        className={cn(
          "absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full border border-background text-[10px] font-bold",
          stats.isVideosComplete
            ? "bg-chart-2 text-background"
            : "bg-muted text-muted-foreground",
        )}
        aria-label={`${stats.watchedVideos} of ${stats.totalVideos} videos watched`}
      >
        {stats.watchedVideos}
      </span>
    </div>
  );
}

function DsaMiniBadge({
  icon,
  label,
  complete,
}: {
  icon: ReactNode;
  label: string;
  complete: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        complete
          ? "border-primary/25 bg-primary/10 text-foreground"
          : "border-border bg-muted/50 text-muted-foreground",
        "[&_svg]:size-3",
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function DsaProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={cn("h-2 overflow-hidden rounded-full bg-muted", className)}
      aria-hidden="true"
    >
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,var(--primary),var(--chart-2))] transition-all"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

type DsaLessonGroup = {
  lesson: DsaQuestion;
  practiceQuestions: DsaQuestion[];
  questions: DsaQuestion[];
};

function DsaLessonAccordion({
  subtopic,
  toneIndex,
  completedQuestionIds,
  watchedVideoQuestionIds,
  progressByQuestionId,
  pendingQuestionIds,
  onOpenVideo,
  onToggleQuestion,
}: {
  subtopic: DsaSubtopic;
  toneIndex: number;
  completedQuestionIds: Set<string>;
  watchedVideoQuestionIds: Set<string>;
  progressByQuestionId: Map<string, DsaQuestionProgress>;
  pendingQuestionIds: Set<string>;
  onOpenVideo: (question: DsaQuestion) => void;
  onToggleQuestion: (questionId: string, completed: boolean) => void;
}) {
  const [openLessonIds, setOpenLessonIds] = useState<string[]>([]);
  const lessonGroups = groupLessonQuestions(subtopic.questions);

  return (
    <Accordion
      multiple
      value={openLessonIds}
      onValueChange={(value) => setOpenLessonIds(value)}
      className={cn(
        "rounded-lg border px-3 shadow-sm",
        DSA_SURFACE_TONES[toneIndex],
      )}
    >
      {lessonGroups.map((group, index) => {
        const stats = getDsaProgressStats(
          group.questions,
          completedQuestionIds,
          watchedVideoQuestionIds,
        );
        const lessonToneIndex = (toneIndex + index) % DSA_SURFACE_TONES.length;

        return (
          <AccordionItem
            key={group.lesson.id}
            value={group.lesson.id}
            className="data-open:bg-background/45"
          >
            <AccordionTrigger>
              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <DsaMilestoneOrb
                    index={index + 1}
                    stats={stats}
                    toneIndex={lessonToneIndex}
                    size="sm"
                  />
                  <div className="min-w-0">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={DSA_BADGE_TONES[lessonToneIndex]}
                      >
                        {group.lesson.lessonLabel}
                      </Badge>
                      <span className="truncate">{group.lesson.title}</span>
                    </span>
                    <span className="block text-sm font-normal text-muted-foreground">
                      {group.practiceQuestions.length} LeetCode{" "}
                      {group.practiceQuestions.length === 1
                        ? "question"
                        : "questions"}
                    </span>
                  </div>
                </div>
                <DsaProgressCluster
                  stats={stats}
                  toneIndex={lessonToneIndex}
                  compact
                />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <DsaQuestionTable
                questions={group.questions}
                progressByQuestionId={progressByQuestionId}
                watchedVideoQuestionIds={watchedVideoQuestionIds}
                pendingQuestionIds={pendingQuestionIds}
                onOpenVideo={onOpenVideo}
                onToggleQuestion={onToggleQuestion}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function groupLessonQuestions(questions: DsaQuestion[]): DsaLessonGroup[] {
  const lessons = questions.filter(
    (question) => question.sourceType === "lesson",
  );
  const practiceByLessonId = new Map<string, DsaQuestion[]>();

  for (const question of questions) {
    if (question.sourceType !== "leetcode" || !question.affiliatedLessonId) {
      continue;
    }

    const currentQuestions =
      practiceByLessonId.get(question.affiliatedLessonId) ?? [];
    practiceByLessonId.set(question.affiliatedLessonId, [
      ...currentQuestions,
      question,
    ]);
  }

  return lessons.map((lesson) => {
    const practiceQuestions = practiceByLessonId.get(lesson.id) ?? [];

    return {
      lesson,
      practiceQuestions,
      questions: [lesson, ...practiceQuestions],
    };
  });
}

function getDsaProgressStats(
  questions: DsaQuestion[],
  completedQuestionIds: Set<string>,
  watchedVideoQuestionIds: Set<string>,
): DsaProgressStats {
  const videoQuestions = questions.filter(
    (question) => question.sourceType === "lesson" && question.videoUrl,
  );
  const practiceQuestions = questions.filter(
    (question) => question.sourceType === "leetcode",
  );
  const completedQuestions = questions.filter((question) =>
    completedQuestionIds.has(question.id),
  ).length;
  const watchedVideos = videoQuestions.filter((question) =>
    watchedVideoQuestionIds.has(question.id),
  ).length;
  const completedPracticeQuestions = practiceQuestions.filter((question) =>
    completedQuestionIds.has(question.id),
  ).length;
  const totalQuestions = questions.length;
  const totalVideos = videoQuestions.length;
  const totalPracticeQuestions = practiceQuestions.length;
  const isQuestionsComplete =
    totalQuestions > 0 && completedQuestions === totalQuestions;
  const isVideosComplete = totalVideos === 0 || watchedVideos === totalVideos;

  return {
    totalQuestions,
    completedQuestions,
    totalVideos,
    watchedVideos,
    totalPracticeQuestions,
    completedPracticeQuestions,
    completionPercentage: percent(completedQuestions, totalQuestions),
    videoPercentage: percent(watchedVideos, totalVideos),
    isQuestionsComplete,
    isVideosComplete,
    isComplete: isQuestionsComplete && isVideosComplete,
  };
}

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function DsaQuestionTable({
  questions,
  progressByQuestionId,
  watchedVideoQuestionIds,
  pendingQuestionIds,
  onOpenVideo,
  onToggleQuestion,
}: {
  questions: DsaQuestion[];
  progressByQuestionId: Map<string, DsaQuestionProgress>;
  watchedVideoQuestionIds: Set<string>;
  pendingQuestionIds: Set<string>;
  onOpenVideo: (question: DsaQuestion) => void;
  onToggleQuestion: (questionId: string, completed: boolean) => void;
}) {
  return (
    <Table containerClassName="rounded-lg border border-border/80 bg-background/75 shadow-sm">
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">
            <span className="sr-only">Completed</span>
          </TableHead>
          <TableHead className="w-24">Type</TableHead>
          <TableHead>Question</TableHead>
          <TableHead className="w-28">Resource</TableHead>
          <TableHead className="w-28">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {questions.map((question) => {
          const progress = progressByQuestionId.get(question.id);
          const completed = progress?.completed ?? false;
          const pending = pendingQuestionIds.has(question.id);
          const videoWatched = watchedVideoQuestionIds.has(question.id);

          return (
            <TableRow
              key={question.id}
              className={questionRowClassName(question, completed, pending)}
            >
              <TableCell>
                <div className="flex items-center">
                  <Checkbox
                    checked={completed}
                    disabled={pending}
                    aria-label={`Mark ${question.title} as completed`}
                    onCheckedChange={(checked) =>
                      onToggleQuestion(question.id, checked === true)
                    }
                  />
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <Badge
                    variant={
                      question.sourceType === "lesson" ? "secondary" : "outline"
                    }
                    className={cn(
                      question.sourceType === "leetcode"
                        ? "border-chart-2/35 bg-chart-2/10 text-foreground"
                        : "border-primary/25 bg-primary/10 text-foreground",
                    )}
                  >
                    {question.lessonLabel}
                  </Badge>
                  {question.affiliatedLessonLabel ? (
                    <span className="text-xs text-muted-foreground">
                      {question.affiliatedLessonLabel}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="min-w-64 whitespace-normal">
                <div className="flex min-w-0 flex-col gap-2">
                  <span>{question.title}</span>
                  {question.difficulty ? (
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={difficultyBadgeVariant(question.difficulty)}
                        className={difficultyBadgeClassName(
                          question.difficulty,
                        )}
                      >
                        {formatDifficulty(question.difficulty)}
                      </Badge>
                    </div>
                  ) : null}
                  {question.sourceType === "lesson" && question.videoUrl ? (
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant={videoWatched ? "secondary" : "outline"}
                        className={cn(
                          videoWatched
                            ? "border-primary/25 bg-primary/10 text-foreground"
                            : "border-chart-1/35 bg-chart-1/10 text-foreground",
                        )}
                      >
                        <PlayCircle
                          data-icon="inline-start"
                          aria-hidden="true"
                        />
                        {videoWatched ? "Video watched" : "Video pending"}
                      </Badge>
                    </div>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                {question.sourceType === "lesson" && question.videoUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenVideo(question)}
                  >
                    <CirclePlay data-icon="inline-start" aria-hidden="true" />
                    Watch
                  </Button>
                ) : question.leetcodeUrl ? (
                  <a
                    href={question.leetcodeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                    })}
                  >
                    <ExternalLink data-icon="inline-start" aria-hidden="true" />
                    Solve
                  </a>
                ) : null}
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1.5">
                  {pending ? (
                    <Badge variant="secondary">
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                        aria-hidden="true"
                      />
                      Saving
                    </Badge>
                  ) : completed ? (
                    <Badge>
                      <CheckCircle2
                        data-icon="inline-start"
                        aria-hidden="true"
                      />
                      Done
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Circle data-icon="inline-start" aria-hidden="true" />
                      Todo
                    </Badge>
                  )}
                  {question.sourceType === "lesson" && question.videoUrl ? (
                    <Badge variant={videoWatched ? "outline" : "secondary"}>
                      <CirclePlay data-icon="inline-start" aria-hidden="true" />
                      {videoWatched ? "Watched" : "Watch next"}
                    </Badge>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function DsaVideoDialog({
  video,
  onClose,
}: {
  video: DsaVideoDialogState;
  onClose: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<YouTubePlayer | null>(null);
  const playerApiEmbedUrl = useMemo(
    () => buildPlayerApiEmbedUrl(video.embedUrl),
    [video.embedUrl],
  );

  useEffect(() => {
    let disposed = false;

    loadYouTubeIframeApi().then((youTubeApi) => {
      if (disposed || !iframeRef.current) {
        return;
      }

      playerRef.current = new youTubeApi.Player(iframeRef.current, {
        events: {
          onReady: (event) => setDsaVideoPlaybackRate(event.target),
          onStateChange: (event) => {
            if (
              event.data === youTubeApi.PlayerState.PLAYING ||
              event.data === youTubeApi.PlayerState.CUED
            ) {
              setDsaVideoPlaybackRate(event.target);
            }
          },
        },
      });
    });

    return () => {
      disposed = true;
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [playerApiEmbedUrl]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="gap-4 p-4 sm:max-w-4xl sm:p-5">
        <DialogHeader className="pr-10">
          <DialogTitle className="leading-tight">{video.title}</DialogTitle>
          <DialogDescription>{video.description}</DialogDescription>
        </DialogHeader>
        <div className="aspect-video overflow-hidden rounded-xl border border-border bg-black">
          <iframe
            ref={iframeRef}
            key={playerApiEmbedUrl}
            title={video.title}
            src={playerApiEmbedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function buildPlayerApiEmbedUrl(embedUrl: string) {
  const url = new URL(embedUrl);

  url.searchParams.set("enablejsapi", "1");

  if (typeof window !== "undefined") {
    url.searchParams.set("origin", window.location.origin);
  }

  return url.toString();
}

function loadYouTubeIframeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("YouTube iframe API needs a browser."));
  }

  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }

  youTubeIframeApiPromise ??= new Promise((resolve) => {
    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();

      if (window.YT?.Player) {
        resolve(window.YT);
      }
    };

    if (
      !document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      )
    ) {
      const script = document.createElement("script");

      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.append(script);
    }
  });

  return youTubeIframeApiPromise;
}

function setDsaVideoPlaybackRate(player: YouTubePlayer) {
  try {
    player.setPlaybackRate(DSA_VIDEO_PLAYBACK_RATE);
  } catch {
    // YouTube may ignore the suggested rate until the video is fully cued.
  }
}

function difficultyBadgeVariant(
  difficulty: NonNullable<DsaQuestion["difficulty"]>,
) {
  switch (difficulty) {
    case "EASY":
      return "outline";
    case "MEDIUM":
      return "outline";
    case "HARD":
      return "destructive";
  }
}

function difficultyBadgeClassName(
  difficulty: NonNullable<DsaQuestion["difficulty"]>,
) {
  switch (difficulty) {
    case "EASY":
      return "border-primary/35 bg-primary/10 text-foreground";
    case "MEDIUM":
      return "border-chart-1/35 bg-chart-1/15 text-foreground";
    case "HARD":
      return "";
  }
}

function formatDifficulty(difficulty: NonNullable<DsaQuestion["difficulty"]>) {
  return difficulty[0] + difficulty.slice(1).toLowerCase();
}

function questionRowClassName(
  question: DsaQuestion,
  completed: boolean,
  pending: boolean,
) {
  return cn(
    "transition-colors",
    question.sourceType === "leetcode" ? "bg-chart-2/5" : "bg-primary/5",
    pending ? "bg-chart-1/15" : "",
    completed ? "bg-primary/15" : "",
  );
}

function appendVideoWatchEvent(
  snapshot: DsaSnapshot,
  event: DsaVideoWatchEvent,
): DsaSnapshot {
  return {
    ...snapshot,
    videoWatches: [
      event,
      ...(snapshot.videoWatches ?? []).filter((item) => item.id !== event.id),
    ],
  };
}

function optimisticSnapshot(
  snapshot: DsaSnapshot,
  input: UpdateDsaQuestionProgressInput,
): DsaSnapshot {
  const updatedAt = new Date().toISOString();
  const existingProgress = snapshot.progress.find(
    (item) => item.questionId === input.questionId,
  );
  const nextProgressRow: DsaQuestionProgress = {
    id: existingProgress?.id ?? `optimistic-${input.questionId}`,
    userId: existingProgress?.userId ?? "optimistic",
    questionId: input.questionId,
    completed: input.completed,
    completedAt: input.completed ? updatedAt : undefined,
    createdAt: existingProgress?.createdAt ?? updatedAt,
    updatedAt,
  };
  const nextProgress = existingProgress
    ? snapshot.progress.map((item) =>
        item.questionId === input.questionId ? nextProgressRow : item,
      )
    : [...snapshot.progress, nextProgressRow];

  return {
    ...snapshot,
    progress: sortProgress(snapshot.catalog, nextProgress),
    summary: summarize(snapshot.catalog, nextProgress),
  };
}

function sortProgress(catalog: DsaCatalog, progress: DsaQuestionProgress[]) {
  const questionOrder = questionOrderMap(catalog);

  return [...progress].sort((a, b) => {
    const aOrder = questionOrder.get(a.questionId) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = questionOrder.get(b.questionId) ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.questionId.localeCompare(b.questionId);
  });
}

function summarize(catalog: DsaCatalog, progress: DsaQuestionProgress[]) {
  const questionIds = catalogQuestionIds(catalog);
  const completedQuestions = new Set(
    progress
      .filter((item) => item.completed && questionIds.has(item.questionId))
      .map((item) => item.questionId),
  ).size;
  const totalQuestions = questionIds.size;

  return {
    totalQuestions,
    completedQuestions,
    completionPercentage:
      totalQuestions === 0
        ? 0
        : Math.round((completedQuestions / totalQuestions) * 100),
  };
}

function catalogQuestionIds(catalog: DsaCatalog) {
  return new Set(
    catalog.tracks.flatMap((track) =>
      track.subtopics.flatMap((subtopic) =>
        subtopic.questions.map((question) => question.id),
      ),
    ),
  );
}

function questionOrderMap(catalog: DsaCatalog) {
  return new Map(
    catalog.tracks
      .flatMap((track) =>
        track.subtopics.flatMap((subtopic) =>
          subtopic.questions.map((question) => question.id),
        ),
      )
      .map((questionId, index) => [questionId, index]),
  );
}

function DsaInlineSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Card size="sm" className="h-32" />
      <Card size="sm" className="h-[520px]" />
    </div>
  );
}
