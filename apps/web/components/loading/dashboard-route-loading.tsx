import type { ReactNode } from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type DashboardHeaderSkeletonProps = {
  titleClassName?: string;
  subtitleClassName?: string;
};

function DashboardHeaderSkeleton({
  titleClassName = "w-28",
  subtitleClassName = "w-72",
}: DashboardHeaderSkeletonProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      <Skeleton className="size-8 rounded-lg" />
      <Skeleton className="h-5 w-px rounded-none" />
      <div className="min-w-0 flex-1">
        <Skeleton className={cn("h-4 rounded-md", titleClassName)} />
        <Skeleton
          className={cn("mt-2 h-3 max-w-full rounded-md", subtitleClassName)}
        />
      </div>
    </header>
  );
}

function DashboardMain({
  children,
  className,
  innerClassName,
}: {
  children: ReactNode;
  className?: string;
  innerClassName?: string;
}) {
  return (
    <main
      className={cn(
        "w-full min-w-0 max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-5",
          innerClassName,
        )}
      >
        {children}
      </div>
    </main>
  );
}

export function DashboardAnalyticsLoadingPage() {
  return (
    <>
      <DashboardHeaderSkeleton
        titleClassName="w-24"
        subtitleClassName="w-[25rem]"
      />
      <DashboardMain className="py-4" innerClassName="max-w-[1280px] gap-4">
        <DashboardAnalyticsContentSkeleton />
      </DashboardMain>
    </>
  );
}

export function DashboardAnalyticsContentSkeleton() {
  return (
    <>
      <Card size="sm" className="border-primary/20">
        <CardContent className="grid gap-5 py-1 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0 space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-9 w-64 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full max-w-3xl rounded-md" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <MiniMetricSkeleton key={index} />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 lg:w-[340px]">
            {Array.from({ length: 3 }, (_, index) => (
              <div
                key={index}
                className="flex min-w-0 flex-col items-center gap-2 rounded-xl border border-border/70 bg-background/70 px-2 py-3"
              >
                <Skeleton className="size-16 rounded-full" />
                <Skeleton className="h-3 w-14 rounded-md" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <ChartCardSkeleton variant="bars" />
        <ChartCardSkeleton variant="donut" />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <InsightCardSkeleton key={index} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DistributionPanelSkeleton />
        <DistributionPanelSkeleton />
      </section>
    </>
  );
}

export function JobsLoadingPage() {
  return (
    <>
      <DashboardHeaderSkeleton
        titleClassName="w-14"
        subtitleClassName="w-[26rem]"
      />
      <DashboardMain innerClassName="max-w-[1280px]">
        <JobsContentSkeleton />
      </DashboardMain>
    </>
  );
}

export function JobsContentSkeleton() {
  return (
    <>
      <section className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-10 min-w-0 flex-1 rounded-md" />
        <div className="flex flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end">
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </section>
      <JobTableCardSkeleton />
    </>
  );
}

export function KanbanLoadingPage() {
  return (
    <>
      <DashboardHeaderSkeleton
        titleClassName="w-36"
        subtitleClassName="w-44"
      />
      <DashboardMain innerClassName="max-w-[1760px]">
        <KanbanBoardSkeleton />
      </DashboardMain>
    </>
  );
}

export function KanbanBoardSkeleton() {
  return (
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
            {Array.from({ length: 4 }, (_, index) => (
              <KanbanColumnSkeleton key={index} cardCount={index === 0 ? 4 : 3} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProfileLoadingPage() {
  return (
    <>
      <DashboardHeaderSkeleton
        titleClassName="w-16"
        subtitleClassName="w-40"
      />
      <DashboardMain innerClassName="max-w-[1440px]">
        <ProfileContentSkeleton />
      </DashboardMain>
    </>
  );
}

export function ProfileContentSkeleton() {
  return (
    <>
      <FormCardSkeleton rows={1} footer={false} />
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <ProfileBasicsSkeleton />
        <ProfilePreviewSkeleton />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <ProfileSectionSkeleton key={index} />
        ))}
      </section>
    </>
  );
}

export function ProposalIndexLoadingPage() {
  return (
    <ProposalLoadingShell>
      <ProposalIndexContentSkeleton />
    </ProposalLoadingShell>
  );
}

export function ProposalTopicDetailLoadingPage() {
  return (
    <ProposalLoadingShell>
      <ProposalTopicDetailContentSkeleton />
    </ProposalLoadingShell>
  );
}

function ProposalLoadingShell({ children }: { children: ReactNode }) {
  return (
    <>
      <DashboardHeaderSkeleton
        titleClassName="w-32"
        subtitleClassName="w-52"
      />
      <main className="w-full min-w-0 max-w-full overflow-x-hidden">
        {children}
      </main>
    </>
  );
}

export function ProposalIndexContentSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-9 w-64 rounded-lg" />
          <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <ProposalTopicCardSkeleton key={index} />
        ))}
      </section>
    </div>
  );
}

export function ProposalTopicDetailContentSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 space-y-3">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-80 max-w-full rounded-lg" />
          <Skeleton className="h-4 w-full max-w-2xl rounded-md" />
          <Skeleton className="h-4 w-3/5 max-w-xl rounded-md" />
        </div>
        <div className="grid w-full grid-cols-3 gap-2 sm:w-auto sm:min-w-[24rem]">
          {Array.from({ length: 3 }, (_, index) => (
            <MiniMetricSkeleton key={index} />
          ))}
        </div>
      </section>
      <section className="grid gap-5">
        {Array.from({ length: 3 }, (_, index) => (
          <ProposalDetailCardSkeleton key={index} />
        ))}
      </section>
    </div>
  );
}

export function DiaryLoadingPage() {
  return (
    <>
      <DashboardHeaderSkeleton
        titleClassName="w-14"
        subtitleClassName="w-[25rem]"
      />
      <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6">
        <div className="mx-auto grid w-full max-w-[1440px] min-w-0 gap-4 xl:grid-cols-[17rem_1fr]">
          <RecentDaysSkeleton />
          <DiaryFormSkeleton />
        </div>
      </main>
    </>
  );
}

export function DsaLoadingPage() {
  return (
    <>
      <DashboardHeaderSkeleton
        titleClassName="w-10"
        subtitleClassName="w-[18rem]"
      />
      <DashboardMain innerClassName="max-w-[1280px]">
        <DsaContentSkeleton />
      </DashboardMain>
    </>
  );
}

export function HistoryLoadingPage() {
  return (
    <>
      <DashboardHeaderSkeleton
        titleClassName="w-20"
        subtitleClassName="w-[23rem]"
      />
      <DashboardMain innerClassName="max-w-[1280px]">
        <Card size="sm" className="border-primary/20">
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>
            <CardAction>
              <Skeleton className="h-6 w-16 rounded-full" />
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-20 rounded-lg" />
            ))}
          </CardContent>
        </Card>
        <section className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-[385px] rounded-2xl" />
          <Skeleton className="h-[385px] rounded-2xl" />
        </section>
      </DashboardMain>
    </>
  );
}

function DsaContentSkeleton() {
  return (
    <>
      <Card size="sm" className="border-primary/20">
        <CardHeader>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-44 rounded-md" />
            <Skeleton className="h-4 w-96 max-w-full rounded-md" />
          </div>
          <CardAction className="flex flex-wrap justify-end gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-12 rounded-full" />
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <MiniMetricSkeleton key={index} />
          ))}
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          {Array.from({ length: 6 }, (_, sectionIndex) => (
            <div
              key={sectionIndex}
              className="rounded-xl border border-border bg-background/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-44 rounded-md" />
                  <Skeleton className="h-4 w-64 max-w-full rounded-md" />
                </div>
                <Skeleton className="h-6 w-12 rounded-full" />
              </div>
              <div className="mt-4 rounded-lg border border-border">
                {Array.from({ length: 3 }, (_, rowIndex) => (
                  <div
                    key={rowIndex}
                    className="grid grid-cols-[2.5rem_4rem_minmax(14rem,1fr)_5rem_5rem] gap-3 border-b border-border px-3 py-3 last:border-b-0"
                  >
                    <Skeleton className="size-4 rounded-md" />
                    <Skeleton className="h-4 w-8 rounded-md" />
                    <Skeleton className="h-4 w-full rounded-md" />
                    <Skeleton className="h-8 w-16 rounded-md" />
                    <Skeleton className="h-5 w-14 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

export function McpToolsLoadingPage() {
  return (
    <>
      <DashboardHeaderSkeleton
        titleClassName="w-24"
        subtitleClassName="w-[27rem]"
      />
      <DashboardMain innerClassName="max-w-[1280px]">
        <McpToolsContentSkeleton />
      </DashboardMain>
    </>
  );
}

export function McpToolsContentSkeleton() {
  return (
    <>
      <McpTokenCardSkeleton />
      <section className="grid min-w-0 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <CodeInfoCardSkeleton key={index} />
        ))}
      </section>
      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <StructuredProposalSkeleton />
        <GuardrailSkeleton />
      </section>
      <Card size="sm">
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-5 w-32 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-background/70 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="mt-3 h-3 w-full rounded-md" />
              <Skeleton className="mt-2 h-3 w-3/4 rounded-md" />
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}

function MiniMetricSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-background/60 px-3 py-2">
      <Skeleton className="h-3 w-16 rounded-md" />
      <Skeleton className="mt-2 h-6 w-12 rounded-md" />
    </div>
  );
}

function ChartCardSkeleton({ variant }: { variant: "bars" | "donut" }) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-4 w-64 max-w-full rounded-md" />
        </div>
        {variant === "bars" ? (
          <CardAction>
            <Skeleton className="h-6 w-24 rounded-full" />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        {variant === "bars" ? (
          <div className="flex h-[210px] items-end gap-4 rounded-xl border border-border/60 bg-background/50 p-4">
            {[55, 85, 42, 68, 36, 75].map((height, index) => (
              <div key={index} className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton
                  className="w-full rounded-t-md rounded-b-sm"
                  style={{ height: `${height}%` }}
                />
                <Skeleton className="h-3 w-full rounded-md" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-1">
            <div className="mx-auto grid h-[190px] w-full max-w-[220px] place-items-center">
              <Skeleton className="size-40 rounded-full" />
            </div>
            <div className="grid gap-3">
              {Array.from({ length: 5 }, (_, index) => (
                <ProgressLineSkeleton key={index} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InsightCardSkeleton() {
  return (
    <Card size="sm" className="border-border/80">
      <CardHeader className="grid-cols-[1fr_auto]">
        <div className="flex min-w-0 flex-col gap-3">
          <Skeleton className="size-9 rounded-lg" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-4 w-20 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <CardAction>
          <Skeleton className="h-8 w-20 rounded-md" />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-2 w-full rounded-full" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
      </CardContent>
    </Card>
  );
}

function DistributionPanelSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-4 w-72 max-w-full rounded-md" />
        </div>
        <CardAction className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-2">
        <div className="space-y-5">
          <ProgressLineSkeleton />
          <DistributionListSkeleton />
        </div>
        <div className="space-y-5">
          <DistributionListSkeleton />
          <TaskRowsSkeleton rows={3} />
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressLineSkeleton() {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-4 w-10 rounded-md" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <Skeleton className="h-3 w-2/3 rounded-md" />
    </div>
  );
}

function DistributionListSkeleton() {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-24 rounded-md" />
        <Skeleton className="h-6 w-10 rounded-full" />
      </div>
      {Array.from({ length: 4 }, (_, index) => (
        <ProgressLineSkeleton key={index} />
      ))}
    </div>
  );
}

function TaskRowsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-4 w-28 rounded-md" />
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-3 py-2"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-4/5 rounded-md" />
            <Skeleton className="h-3 w-24 rounded-md" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function JobTableCardSkeleton() {
  return (
    <Card size="sm" className="lg:h-[calc(100svh-13rem)] lg:min-h-[520px]">
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-6 w-56 rounded-md" />
          <Skeleton className="h-4 w-72 max-w-full rounded-md" />
        </div>
        <CardAction className="flex flex-wrap items-center justify-end gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </CardAction>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden">
        <div className="h-full overflow-auto rounded-lg border border-border">
          <div className="min-w-[1180px]">
            <div className="grid grid-cols-[3rem_4rem_4rem_9rem_minmax(15rem,1.4fr)_repeat(7,minmax(7rem,1fr))] gap-4 border-b border-border bg-card px-4 py-3">
              {Array.from({ length: 12 }, (_, index) => (
                <Skeleton key={index} className="h-4 rounded-md" />
              ))}
            </div>
            {Array.from({ length: 9 }, (_, rowIndex) => (
              <div
                key={rowIndex}
                className="grid grid-cols-[3rem_4rem_4rem_9rem_minmax(15rem,1.4fr)_repeat(7,minmax(7rem,1fr))] gap-4 border-b border-border/70 px-4 py-3 last:border-b-0"
              >
                {Array.from({ length: 12 }, (_, cellIndex) => (
                  <Skeleton
                    key={cellIndex}
                    className={cn(
                      "h-5 rounded-md",
                      cellIndex === 4 ? "w-full" : "w-4/5",
                    )}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanColumnSkeleton({ cardCount }: { cardCount: number }) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-muted/25">
      <div className="flex items-start justify-between gap-3 border-b border-border px-3 py-3">
        <div className="min-w-0 space-y-2">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-3 w-48 rounded-md" />
        </div>
        <Skeleton className="h-6 w-10 rounded-full" />
      </div>
      <div className="grid min-h-0 flex-1 content-start gap-3 overflow-hidden p-3">
        {Array.from({ length: cardCount }, (_, index) => (
          <div
            key={index}
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
  );
}

function FormCardSkeleton({
  rows,
  footer = true,
}: {
  rows: number;
  footer?: boolean;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-4 w-72 max-w-full rounded-md" />
        </div>
        {footer ? (
          <CardAction>
            <Skeleton className="h-9 w-20 rounded-md" />
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <Skeleton className="h-10 rounded-md" />
            <Skeleton className="h-10 w-28 rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ProfileBasicsSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-xl" />
          <Skeleton className="h-5 w-28 rounded-md" />
        </div>
        <Skeleton className="h-4 w-80 max-w-full rounded-md" />
        <CardAction>
          <Skeleton className="h-9 w-20 rounded-md" />
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <FieldSkeleton key={index} />
            ))}
          </div>
          <FieldSkeleton />
          <FieldSkeleton heightClassName="h-36" />
        </div>
      </CardContent>
    </Card>
  );
}

function ProfilePreviewSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-4 w-56 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="rounded-xl border border-border bg-background/70 p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-6 w-48 rounded-md" />
              <Skeleton className="h-4 w-64 max-w-full rounded-md" />
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
          </div>
          <Skeleton className="mt-4 h-16 w-full rounded-lg" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <MiniMetricSkeleton key={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileSectionSkeleton() {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-xl" />
          <Skeleton className="h-5 w-36 rounded-md" />
        </div>
        <Skeleton className="h-4 w-72 max-w-full rounded-md" />
        <CardAction className="flex items-center gap-2">
          <Skeleton className="h-6 w-10 rounded-full" />
          <Skeleton className="size-8 rounded-md" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3">
        {Array.from({ length: 2 }, (_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-background/70 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-24 rounded-full" />
                <Skeleton className="h-4 w-4/5 rounded-md" />
                <Skeleton className="h-3 w-2/3 rounded-md" />
              </div>
              <div className="flex gap-1">
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
              </div>
            </div>
            <Skeleton className="mt-3 h-12 w-full rounded-lg" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function FieldSkeleton({ heightClassName = "h-10" }: { heightClassName?: string }) {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-4 w-20 rounded-md" />
      <Skeleton className={cn("rounded-md", heightClassName)} />
    </div>
  );
}

function ProposalTopicCardSkeleton() {
  return (
    <Card size="sm" className="rounded-xl">
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-6 w-52 max-w-full rounded-md" />
          <Skeleton className="h-4 w-36 rounded-md" />
        </div>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 text-sm">
        {Array.from({ length: 4 }, (_, index) => (
          <MiniMetricSkeleton key={index} />
        ))}
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-2">
        <Skeleton className="h-9 w-20 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </CardFooter>
    </Card>
  );
}

function ProposalDetailCardSkeleton() {
  return (
    <Card size="sm" className="min-w-0 rounded-xl">
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-5 w-2/5 min-w-56 rounded-md" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <div className="grid gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div
              key={index}
              className="rounded-xl border border-border bg-background/70 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/5 rounded-md" />
                  <Skeleton className="h-3 w-full rounded-md" />
                  <Skeleton className="h-3 w-4/5 rounded-md" />
                </div>
                <Skeleton className="h-8 w-24 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-2 border-t bg-background/95 pt-3">
        <Skeleton className="h-9 w-20 rounded-md" />
        <div className="flex flex-wrap justify-end gap-2">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </CardFooter>
    </Card>
  );
}

function RecentDaysSkeleton() {
  return (
    <Card size="sm" className="h-fit xl:sticky xl:top-4">
      <CardHeader className="gap-2 px-4 py-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-4 w-44 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-3 pb-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-background/60 px-3 py-3"
          >
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="mt-2 h-3 w-36 rounded-md" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DiaryFormSkeleton() {
  return (
    <form className="flex min-w-0 flex-col gap-4">
      <Card size="sm">
        <CardHeader className="gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-6 w-64 max-w-full rounded-md" />
            <Skeleton className="h-4 w-80 max-w-full rounded-md" />
          </div>
          <CardAction>
            <Skeleton className="h-6 w-24 rounded-full" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid gap-2 sm:grid-cols-[auto_minmax(12rem,15rem)_9.5rem] sm:items-end">
              <div className="flex gap-2">
                <Skeleton className="size-9 rounded-md" />
                <Skeleton className="size-9 rounded-md" />
              </div>
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Skeleton className="h-9 w-20 rounded-md" />
              <Skeleton className="h-9 w-20 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(26rem,1.05fr)]">
        <Card size="sm" className="h-fit">
          <CardHeader className="py-4">
            <div className="space-y-2">
              <Skeleton className="h-5 w-36 rounded-md" />
              <Skeleton className="h-4 w-72 max-w-full rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="grid gap-4">
            <FieldSkeleton heightClassName="h-64" />
            <FieldSkeleton heightClassName="h-32" />
          </CardContent>
        </Card>
        <Card size="sm" className="min-w-0">
          <CardHeader>
            <div className="space-y-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>
            <CardAction>
              <Skeleton className="h-9 w-28 rounded-md" />
            </CardAction>
          </CardHeader>
          <CardContent className="grid gap-3">
            {Array.from({ length: 2 }, (_, index) => (
              <div
                key={index}
                className="rounded-lg border border-border bg-background/60 p-3"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24 rounded-md" />
                    <Skeleton className="h-3 w-28 rounded-md" />
                  </div>
                  <Skeleton className="size-9 rounded-md" />
                </div>
                <div className="grid gap-3 lg:grid-cols-[7.5rem_7.5rem_minmax(0,1fr)_auto] lg:items-end">
                  <FieldSkeleton />
                  <FieldSkeleton />
                  <FieldSkeleton />
                  <Skeleton className="hidden size-10 rounded-md lg:block" />
                </div>
                <div className="mt-3 grid gap-3 lg:grid-cols-2">
                  <FieldSkeleton heightClassName="h-28" />
                  <FieldSkeleton heightClassName="h-28" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

function McpTokenCardSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-xl" />
          <Skeleton className="h-5 w-36 rounded-md" />
        </div>
        <Skeleton className="h-4 w-96 max-w-full rounded-md" />
        <CardAction>
          <Skeleton className="h-6 w-20 rounded-full" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <Skeleton className="h-10 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

function CodeInfoCardSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="space-y-2">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-14 rounded-lg" />
      </CardContent>
    </Card>
  );
}

function StructuredProposalSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-xl" />
          <Skeleton className="h-5 w-60 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-4 w-80 max-w-full rounded-md" />
        <CardAction>
          <Skeleton className="h-6 w-24 rounded-full" />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-4">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-background/70 p-4"
          >
            <Skeleton className="h-4 w-56 max-w-full rounded-md" />
            <Skeleton className="mt-3 h-3 w-full rounded-md" />
            <Skeleton className="mt-2 h-3 w-4/5 rounded-md" />
          </div>
        ))}
        <div className="grid gap-3">
          <ToolFieldsSkeleton />
          <ToolFieldsSkeleton />
        </div>
      </CardContent>
    </Card>
  );
}

function GuardrailSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Skeleton className="size-5 rounded-md" />
          <Skeleton className="h-5 w-32 rounded-md" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex gap-3">
            <Skeleton className="size-8 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-full rounded-md" />
              <Skeleton className="h-3 w-3/4 rounded-md" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ToolFieldsSkeleton() {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-4 w-40 rounded-md" />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-background/70 px-3 py-2"
          >
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="mt-2 h-3 w-16 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
