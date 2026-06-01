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
  Target,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
import type {
  SystemDesignCatalog,
  SystemDesignItem,
  SystemDesignModule,
  SystemDesignProgress,
  SystemDesignSnapshot,
  SystemDesignVideoWatchEvent,
  UpdateSystemDesignItemProgressInput,
} from "@careeright/domain/system-design/schema";
import { buildSystemDesignVideoEmbedUrl } from "@careeright/domain/system-design/youtube";
import {
  historySnapshotQueryKey,
  systemDesignSnapshotQueryKey,
} from "@careeright/api/query-keys";
import { useCareerightUi } from "../../providers/careeright-ui-provider";
import { cn } from "../../lib/utils";

const SYSTEM_DESIGN_SURFACE_TONES = [
  "border-primary/25 bg-primary/5",
  "border-chart-1/25 bg-chart-1/10",
  "border-chart-2/25 bg-chart-2/10",
  "border-chart-3/25 bg-chart-3/10",
  "border-chart-4/25 bg-chart-4/10",
  "border-chart-5/25 bg-chart-5/10",
];

const SYSTEM_DESIGN_BADGE_TONES = [
  "border-primary/30 bg-primary/10 text-foreground",
  "border-chart-1/35 bg-chart-1/15 text-foreground",
  "border-chart-2/35 bg-chart-2/15 text-foreground",
  "border-chart-3/35 bg-chart-3/15 text-foreground",
  "border-chart-4/35 bg-chart-4/15 text-foreground",
  "border-chart-5/35 bg-chart-5/15 text-foreground",
];

const SYSTEM_DESIGN_VIDEO_PLAYBACK_RATE = 1.25;

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

type SystemDesignVideoDialogState = {
  title: string;
  description: string;
  embedUrl: string;
};

type SystemDesignStats = {
  totalItems: number;
  completedItems: number;
  totalLessons: number;
  totalDrills: number;
  totalVideos: number;
  watchedVideos: number;
  completionPercentage: number;
  videoPercentage: number;
  isComplete: boolean;
};

let youTubeIframeApiPromise: Promise<YouTubeIframeApi> | undefined;

export function SystemDesignApp({
  initialSnapshot,
}: {
  initialSnapshot?: SystemDesignSnapshot;
}) {
  const { rpcClient } = useCareerightUi();
  const [openTrackIds, setOpenTrackIds] = useState<string[]>([]);
  const [activeVideo, setActiveVideo] =
    useState<SystemDesignVideoDialogState | null>(null);
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(
    () => new Set(),
  );
  const queryClient = useQueryClient();
  const systemDesignQuery = useQuery({
    queryKey: systemDesignSnapshotQueryKey,
    queryFn: () => rpcClient.systemDesign.snapshot(),
    initialData: initialSnapshot,
    staleTime: 60_000,
  });
  const snapshot = systemDesignQuery.data ?? initialSnapshot;
  const updateProgressMutation = useMutation({
    mutationFn: (input: UpdateSystemDesignItemProgressInput) =>
      rpcClient.systemDesign.updateItemProgress(input),
    onMutate: async (input) => {
      setPendingItemIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(input.itemId);
        return nextIds;
      });
      await queryClient.cancelQueries({ queryKey: systemDesignSnapshotQueryKey });
      const previousSnapshot = queryClient.getQueryData<SystemDesignSnapshot>(
        systemDesignSnapshotQueryKey,
      );

      queryClient.setQueryData<SystemDesignSnapshot>(
        systemDesignSnapshotQueryKey,
        (currentSnapshot) =>
          currentSnapshot
            ? optimisticSnapshot(currentSnapshot, input)
            : currentSnapshot,
      );

      return { previousSnapshot };
    },
    onError: (_error, _input, context) => {
      if (context?.previousSnapshot) {
        queryClient.setQueryData(
          systemDesignSnapshotQueryKey,
          context.previousSnapshot,
        );
      }
    },
    onSuccess: (result) => {
      queryClient.setQueryData(systemDesignSnapshotQueryKey, result.snapshot);
      void queryClient.invalidateQueries({ queryKey: historySnapshotQueryKey });
    },
    onSettled: (_result, _error, input) => {
      setPendingItemIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(input.itemId);
        return nextIds;
      });
    },
  });
  const recordVideoWatchMutation = useMutation({
    mutationFn: (itemId: string) =>
      rpcClient.systemDesign.recordVideoWatch({ itemId }),
    onSuccess: (event) => {
      queryClient.setQueryData<SystemDesignSnapshot>(
        systemDesignSnapshotQueryKey,
        (currentSnapshot) =>
          currentSnapshot
            ? appendVideoWatchEvent(currentSnapshot, event)
            : currentSnapshot,
      );
      void queryClient.invalidateQueries({ queryKey: historySnapshotQueryKey });
    },
  });
  const progressByItemId = useMemo(
    () => new Map(snapshot?.progress.map((item) => [item.itemId, item])),
    [snapshot?.progress],
  );
  const completedItemIds = useMemo(
    () =>
      new Set(
        snapshot?.progress
          .filter((item) => item.completed)
          .map((item) => item.itemId) ?? [],
      ),
    [snapshot?.progress],
  );
  const watchedVideoItemIds = useMemo(
    () =>
      new Set(snapshot?.videoWatches.map((event) => event.itemId) ?? []),
    [snapshot?.videoWatches],
  );

  function onToggleItem(itemId: string, completed: boolean) {
    updateProgressMutation.mutate({ itemId, completed });
  }

  function onOpenItemVideo(item: SystemDesignItem) {
    const embedUrl = buildSystemDesignVideoEmbedUrl({
      videoId: item.videoId,
      videoUrl: item.videoUrl,
    });

    if (!embedUrl) {
      return;
    }

    setActiveVideo({
      title: item.title,
      description: item.sourceName
        ? `${item.lessonLabel} - ${item.sourceName}`
        : item.lessonLabel,
      embedUrl,
    });
    recordVideoWatchMutation.mutate(item.id);
  }

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-chart-3/20 bg-[linear-gradient(90deg,color-mix(in_oklch,var(--chart-3)_13%,transparent),color-mix(in_oklch,var(--primary)_10%,transparent),color-mix(in_oklch,var(--chart-1)_8%,transparent))] px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">System Design</p>
          <p className="truncate text-xs text-muted-foreground">
            HLD, LLD, and distributed systems from basics to core
          </p>
        </div>
      </header>

      <main className="w-full min-w-0 max-w-full overflow-x-hidden bg-[linear-gradient(135deg,color-mix(in_oklch,var(--chart-3)_8%,transparent),transparent_34%),linear-gradient(315deg,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_42%)] px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-5">
          {systemDesignQuery.isPending && !snapshot ? (
            <SystemDesignInlineSkeleton />
          ) : systemDesignQuery.isError || !snapshot ? (
            <Empty className="min-h-[360px] border border-border bg-background">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ListChecks aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Could not load System Design progress</EmptyTitle>
                <EmptyDescription>
                  Refresh the page and try again. Your learning progress stays
                  scoped to your account.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <SystemDesignSummaryCard snapshot={snapshot} />
              <Card
                size="sm"
                className="min-w-0 border-chart-3/20 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--chart-3)_10%,transparent),transparent_38%),linear-gradient(315deg,color-mix(in_oklch,var(--chart-1)_8%,transparent),transparent_44%),var(--card)]"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target aria-hidden="true" />
                    Roadmap tracks
                  </CardTitle>
                  <CardDescription>
                    Videos and design drills are grouped in a basic-to-core
                    learning path.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion
                    multiple
                    value={openTrackIds}
                    onValueChange={(value) => setOpenTrackIds(value)}
                  >
                    {snapshot.catalog.tracks.map((track, index) => {
                      const trackStats = getSystemDesignStats(
                        track.modules.flatMap((module) => module.items),
                        completedItemIds,
                        watchedVideoItemIds,
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
                                  {track.description}
                                </span>
                              </div>
                              <SystemDesignProgressCluster
                                stats={trackStats}
                                toneIndex={index}
                                compact
                              />
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <SystemDesignModuleAccordion
                              modules={track.modules}
                              completedItemIds={completedItemIds}
                              watchedVideoItemIds={watchedVideoItemIds}
                              progressByItemId={progressByItemId}
                              pendingItemIds={pendingItemIds}
                              onOpenVideo={onOpenItemVideo}
                              onToggleItem={onToggleItem}
                            />
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
        <SystemDesignVideoDialog
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      ) : null}
    </>
  );
}

function SystemDesignSummaryCard({
  snapshot,
}: {
  snapshot: SystemDesignSnapshot;
}) {
  const moduleCount = snapshot.catalog.tracks.reduce(
    (count, track) => count + track.modules.length,
    0,
  );

  return (
    <Card
      size="sm"
      className="border-chart-3/25 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--chart-3)_15%,transparent),transparent_34%),linear-gradient(225deg,color-mix(in_oklch,var(--primary)_12%,transparent),transparent_48%),linear-gradient(315deg,color-mix(in_oklch,var(--chart-1)_12%,transparent),transparent_42%),var(--card)]"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpenCheck aria-hidden="true" />
          System Design Progress
        </CardTitle>
        <CardDescription>
          {snapshot.catalog.tracks.length} tracks with curated videos and design
          checkpoints.
        </CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Badge variant="secondary">
            {snapshot.summary.completedItems}/{snapshot.summary.totalItems} done
          </Badge>
          <Badge variant="outline">
            {snapshot.summary.completionPercentage}%
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <SystemDesignMetric
          label="Tracks"
          value={snapshot.catalog.tracks.length}
          toneIndex={5}
        />
        <SystemDesignMetric label="Modules" value={moduleCount} toneIndex={0} />
        <SystemDesignMetric
          label="Lessons"
          value={snapshot.summary.totalLessons}
          toneIndex={1}
        />
        <SystemDesignMetric
          label="Drills"
          value={snapshot.summary.totalDrills}
          toneIndex={2}
        />
        <SystemDesignMetric
          label="Watched"
          value={snapshot.summary.watchedVideos}
          toneIndex={3}
        />
        <SystemDesignMetric
          label="Remaining"
          value={snapshot.summary.totalItems - snapshot.summary.completedItems}
          toneIndex={4}
        />
      </CardContent>
    </Card>
  );
}

function SystemDesignMetric({
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
        SYSTEM_DESIGN_SURFACE_TONES[
          toneIndex % SYSTEM_DESIGN_SURFACE_TONES.length
        ],
      )}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl font-medium">{value}</p>
    </div>
  );
}

function SystemDesignModuleAccordion({
  modules,
  completedItemIds,
  watchedVideoItemIds,
  progressByItemId,
  pendingItemIds,
  onOpenVideo,
  onToggleItem,
}: {
  modules: SystemDesignModule[];
  completedItemIds: Set<string>;
  watchedVideoItemIds: Set<string>;
  progressByItemId: Map<string, SystemDesignProgress>;
  pendingItemIds: Set<string>;
  onOpenVideo: (item: SystemDesignItem) => void;
  onToggleItem: (itemId: string, completed: boolean) => void;
}) {
  const [openModuleIds, setOpenModuleIds] = useState<string[]>([]);

  return (
    <Accordion
      multiple
      value={openModuleIds}
      onValueChange={(value) => setOpenModuleIds(value)}
      className="rounded-xl"
    >
      {modules.map((module, index) => {
        const stats = getSystemDesignStats(
          module.items,
          completedItemIds,
          watchedVideoItemIds,
        );
        const toneIndex = index % SYSTEM_DESIGN_SURFACE_TONES.length;

        return (
          <AccordionItem
            key={module.id}
            value={module.id}
            className={cn(
              "border-b border-border/70 data-open:bg-transparent",
              SYSTEM_DESIGN_SURFACE_TONES[toneIndex],
            )}
          >
            <AccordionTrigger>
              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <SystemDesignMilestoneOrb
                    index={index + 1}
                    stats={stats}
                    toneIndex={toneIndex}
                  />
                  <div className="min-w-0">
                    <span className="block truncate">{module.title}</span>
                    <span className="block text-sm font-normal text-muted-foreground">
                      {module.description}
                    </span>
                  </div>
                </div>
                <SystemDesignProgressCluster
                  stats={stats}
                  toneIndex={toneIndex}
                />
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <SystemDesignItemAccordion
                items={module.items}
                toneIndex={toneIndex}
                progressByItemId={progressByItemId}
                completedItemIds={completedItemIds}
                watchedVideoItemIds={watchedVideoItemIds}
                pendingItemIds={pendingItemIds}
                onOpenVideo={onOpenVideo}
                onToggleItem={onToggleItem}
              />
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function SystemDesignItemAccordion({
  items,
  toneIndex,
  progressByItemId,
  completedItemIds,
  watchedVideoItemIds,
  pendingItemIds,
  onOpenVideo,
  onToggleItem,
}: {
  items: SystemDesignItem[];
  toneIndex: number;
  progressByItemId: Map<string, SystemDesignProgress>;
  completedItemIds: Set<string>;
  watchedVideoItemIds: Set<string>;
  pendingItemIds: Set<string>;
  onOpenVideo: (item: SystemDesignItem) => void;
  onToggleItem: (itemId: string, completed: boolean) => void;
}) {
  const [openItemIds, setOpenItemIds] = useState<string[]>([]);

  return (
    <Accordion
      multiple
      value={openItemIds}
      onValueChange={(value) => setOpenItemIds(value)}
      className={cn(
        "rounded-lg border px-3 shadow-sm",
        SYSTEM_DESIGN_SURFACE_TONES[toneIndex],
      )}
    >
      {items.map((item, index) => {
        const completed = completedItemIds.has(item.id);
        const pending = pendingItemIds.has(item.id);
        const videoWatched = watchedVideoItemIds.has(item.id);
        const itemToneIndex = (toneIndex + index) % SYSTEM_DESIGN_SURFACE_TONES.length;

        return (
          <AccordionItem
            key={item.id}
            value={item.id}
            className={cn(
              "data-open:bg-background/45",
              completed ? "bg-primary/10" : "",
              pending ? "bg-chart-1/10" : "",
            )}
          >
            <AccordionTrigger>
              <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <SystemDesignItemStateIcon
                    completed={completed}
                    pending={pending}
                    watched={videoWatched}
                    isDrill={item.sourceType === "drill"}
                  />
                  <div className="min-w-0">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className={SYSTEM_DESIGN_BADGE_TONES[itemToneIndex]}
                      >
                        {item.lessonLabel}
                      </Badge>
                      <span className="truncate">{item.title}</span>
                    </span>
                    <span className="block text-sm font-normal text-muted-foreground">
                      {item.sourceType === "lesson"
                        ? item.sourceName
                        : "Design checkpoint"}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  {item.sourceType === "lesson" && item.videoUrl ? (
                    <Badge variant={videoWatched ? "secondary" : "outline"}>
                      <PlayCircle data-icon="inline-start" aria-hidden="true" />
                      {videoWatched ? "Watched" : "Video"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Drill</Badge>
                  )}
                  {completed ? (
                    <Badge>
                      <CheckCircle2 data-icon="inline-start" aria-hidden="true" />
                      Done
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Circle data-icon="inline-start" aria-hidden="true" />
                      Todo
                    </Badge>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-4 rounded-lg border border-border/70 bg-background/75 p-4">
                {item.description ? (
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2">
                  {item.sourceName ? (
                    <Badge variant="secondary">{item.sourceName}</Badge>
                  ) : null}
                  {item.playlistTitle ? (
                    <Badge variant="outline">{item.playlistTitle}</Badge>
                  ) : null}
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm">
                    <Checkbox
                      checked={progressByItemId.get(item.id)?.completed ?? false}
                      disabled={pending}
                      aria-label={`Mark ${item.title} as completed`}
                      onCheckedChange={(checked) =>
                        onToggleItem(item.id, checked === true)
                      }
                    />
                    <span>{completed ? "Completed" : "Mark complete"}</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {pending ? (
                      <Badge variant="secondary">
                        <Loader2
                          data-icon="inline-start"
                          className="animate-spin"
                          aria-hidden="true"
                        />
                        Saving
                      </Badge>
                    ) : null}
                    {item.sourceType === "lesson" && item.videoUrl ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenVideo(item)}
                        >
                          <CirclePlay
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          Watch
                        </Button>
                        <a
                          href={item.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                          })}
                        >
                          <ExternalLink
                            data-icon="inline-start"
                            aria-hidden="true"
                          />
                          YouTube
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

function SystemDesignItemStateIcon({
  completed,
  pending,
  watched,
  isDrill,
}: {
  completed: boolean;
  pending: boolean;
  watched: boolean;
  isDrill: boolean;
}) {
  return (
    <div
      className={cn(
        "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border shadow-sm",
        completed
          ? "border-primary/35 bg-primary/15 text-primary"
          : watched
            ? "border-chart-2/35 bg-chart-2/15 text-foreground"
            : "border-border bg-background text-muted-foreground",
        pending ? "animate-pulse" : "",
      )}
    >
      {completed ? (
        <CheckCircle2 className="size-4" aria-hidden="true" />
      ) : isDrill ? (
        <ListChecks className="size-4" aria-hidden="true" />
      ) : (
        <PlayCircle className="size-4" aria-hidden="true" />
      )}
    </div>
  );
}

function SystemDesignMilestoneOrb({
  index,
  stats,
  toneIndex,
}: {
  index: number;
  stats: SystemDesignStats;
  toneIndex: number;
}) {
  return (
    <div
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-xl border text-sm font-semibold shadow-sm",
        stats.isComplete
          ? "border-primary/40 bg-primary/15 text-primary"
          : SYSTEM_DESIGN_BADGE_TONES[
              toneIndex % SYSTEM_DESIGN_BADGE_TONES.length
            ],
      )}
    >
      {stats.isComplete ? (
        <CheckCircle2 className="size-5" aria-hidden="true" />
      ) : (
        index
      )}
    </div>
  );
}

function SystemDesignProgressCluster({
  stats,
  toneIndex = 0,
  compact = false,
}: {
  stats: SystemDesignStats;
  toneIndex?: number;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
      <Badge
        variant="outline"
        className={SYSTEM_DESIGN_BADGE_TONES[toneIndex % SYSTEM_DESIGN_BADGE_TONES.length]}
      >
        {stats.completedItems}/{stats.totalItems} done
      </Badge>
      <Badge variant="outline">{stats.completionPercentage}%</Badge>
      {!compact ? (
        <>
          <Badge variant="secondary">
            {stats.watchedVideos}/{stats.totalVideos} videos
          </Badge>
          {stats.totalDrills > 0 ? (
            <Badge variant="outline">{stats.totalDrills} drills</Badge>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function getSystemDesignStats(
  items: SystemDesignItem[],
  completedItemIds: Set<string>,
  watchedVideoItemIds: Set<string>,
): SystemDesignStats {
  const lessonItems = items.filter((item) => item.sourceType === "lesson");
  const drillItems = items.filter((item) => item.sourceType === "drill");
  const videoItems = lessonItems.filter((item) => item.videoUrl);
  const completedItems = items.filter((item) =>
    completedItemIds.has(item.id),
  ).length;
  const watchedVideos = videoItems.filter((item) =>
    watchedVideoItemIds.has(item.id),
  ).length;
  const totalItems = items.length;

  return {
    totalItems,
    completedItems,
    totalLessons: lessonItems.length,
    totalDrills: drillItems.length,
    totalVideos: videoItems.length,
    watchedVideos,
    completionPercentage: percent(completedItems, totalItems),
    videoPercentage: percent(watchedVideos, videoItems.length),
    isComplete: totalItems > 0 && completedItems === totalItems,
  };
}

function percent(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function SystemDesignVideoDialog({
  video,
  onClose,
}: {
  video: SystemDesignVideoDialogState;
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
          onReady: (event) => setSystemDesignVideoPlaybackRate(event.target),
          onStateChange: (event) => {
            if (
              event.data === youTubeApi.PlayerState.PLAYING ||
              event.data === youTubeApi.PlayerState.CUED
            ) {
              setSystemDesignVideoPlaybackRate(event.target);
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

function setSystemDesignVideoPlaybackRate(player: YouTubePlayer) {
  try {
    player.setPlaybackRate(SYSTEM_DESIGN_VIDEO_PLAYBACK_RATE);
  } catch {
    // YouTube may ignore the suggested rate until the video is fully cued.
  }
}

function appendVideoWatchEvent(
  snapshot: SystemDesignSnapshot,
  event: SystemDesignVideoWatchEvent,
): SystemDesignSnapshot {
  const videoWatches = [
    event,
    ...(snapshot.videoWatches ?? []).filter((item) => item.id !== event.id),
  ];

  return {
    ...snapshot,
    videoWatches,
    summary: {
      ...snapshot.summary,
      watchedVideos: new Set(videoWatches.map((item) => item.itemId)).size,
    },
  };
}

function optimisticSnapshot(
  snapshot: SystemDesignSnapshot,
  input: UpdateSystemDesignItemProgressInput,
): SystemDesignSnapshot {
  const updatedAt = new Date().toISOString();
  const existingProgress = snapshot.progress.find(
    (item) => item.itemId === input.itemId,
  );
  const nextProgressRow: SystemDesignProgress = {
    id: existingProgress?.id ?? `optimistic-${input.itemId}`,
    userId: existingProgress?.userId ?? "optimistic",
    itemId: input.itemId,
    completed: input.completed,
    completedAt: input.completed ? updatedAt : undefined,
    createdAt: existingProgress?.createdAt ?? updatedAt,
    updatedAt,
  };
  const nextProgress = existingProgress
    ? snapshot.progress.map((item) =>
        item.itemId === input.itemId ? nextProgressRow : item,
      )
    : [...snapshot.progress, nextProgressRow];

  return {
    ...snapshot,
    progress: sortProgress(snapshot.catalog, nextProgress),
    summary: summarize(snapshot.catalog, nextProgress, snapshot.videoWatches),
  };
}

function sortProgress(
  catalog: SystemDesignCatalog,
  progress: SystemDesignProgress[],
) {
  const itemOrder = itemOrderMap(catalog);

  return [...progress].sort((a, b) => {
    const aOrder = itemOrder.get(a.itemId) ?? Number.MAX_SAFE_INTEGER;
    const bOrder = itemOrder.get(b.itemId) ?? Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.itemId.localeCompare(b.itemId);
  });
}

function summarize(
  catalog: SystemDesignCatalog,
  progress: SystemDesignProgress[],
  videoWatches: SystemDesignVideoWatchEvent[],
) {
  const itemIds = catalogItemIds(catalog);
  const items = catalog.tracks.flatMap((track) =>
    track.modules.flatMap((module) => module.items),
  );
  const completedItems = new Set(
    progress
      .filter((item) => item.completed && itemIds.has(item.itemId))
      .map((item) => item.itemId),
  ).size;
  const totalItems = itemIds.size;

  return {
    totalItems,
    completedItems,
    completionPercentage:
      totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100),
    totalLessons: items.filter((item) => item.sourceType === "lesson").length,
    totalDrills: items.filter((item) => item.sourceType === "drill").length,
    watchedVideos: new Set(
      videoWatches
        .filter((event) => itemIds.has(event.itemId))
        .map((event) => event.itemId),
    ).size,
  };
}

function catalogItemIds(catalog: SystemDesignCatalog) {
  return new Set(
    catalog.tracks.flatMap((track) =>
      track.modules.flatMap((module) => module.items.map((item) => item.id)),
    ),
  );
}

function itemOrderMap(catalog: SystemDesignCatalog) {
  return new Map(
    catalog.tracks
      .flatMap((track) =>
        track.modules.flatMap((module) => module.items.map((item) => item.id)),
      )
      .map((itemId, index) => [itemId, index]),
  );
}

function SystemDesignInlineSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <Card size="sm" className="h-32" />
      <Card size="sm" className="h-[520px]" />
    </div>
  );
}
