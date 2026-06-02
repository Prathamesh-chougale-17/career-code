"use client";

import { Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BriefcaseBusiness,
  Code2,
  Medal,
  Trophy,
} from "lucide-react";

import { leaderboardSnapshotQueryKey } from "@careeright/api/query-keys";
import type {
  LeaderboardMember,
  LeaderboardSnapshot,
} from "@careeright/domain/leaderboard/schema";
import { useCareerightUi } from "../../providers/careeright-ui-provider";
import { scheduleIdleTask } from "../../lib/schedule-idle-task";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "../ui/empty";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

const LeaderboardCharts = lazy(() =>
  import("./leaderboard-charts").then((module) => ({
    default: module.LeaderboardCharts,
  })),
);

const leaderboardDayFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function formatDay(value: string) {
  return leaderboardDayFormatter.format(new Date(`${value}T00:00:00.000Z`));
}

function formatRange(data: LeaderboardSnapshot) {
  return `${formatDay(data.range.startDate)} - ${formatDay(data.range.endDate)}`;
}

function displayName(member: LeaderboardMember) {
  if (member.isCurrentUser) {
    return "You";
  }

  return member.user.name ?? member.user.email ?? "Careeright user";
}

function initials(member: LeaderboardMember) {
  return (
    displayName(member)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "C"
  );
}

function podiumLabel(rank: number) {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

export function LeaderboardApp({
  initialLeaderboard,
}: {
  initialLeaderboard?: LeaderboardSnapshot;
}) {
  const { rpcClient } = useCareerightUi();
  const [shouldLoadCharts, setShouldLoadCharts] = useState(false);
  const leaderboardQuery = useQuery({
    queryKey: leaderboardSnapshotQueryKey,
    queryFn: () => rpcClient.leaderboard.snapshot(),
    initialData: initialLeaderboard,
    notifyOnChangeProps: ["data", "isPending", "isError"],
    staleTime: 0,
  });
  const data = leaderboardQuery.data;

  useEffect(() => {
    if (!data || shouldLoadCharts) {
      return;
    }

    return scheduleIdleTask(() => setShouldLoadCharts(true));
  }, [data, shouldLoadCharts]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Leaderboard</p>
          <p className="truncate text-xs text-muted-foreground">
            Rank your 30-day DSA and job application activity with friends
          </p>
        </div>
      </header>

      <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-5">
          {leaderboardQuery.isPending ? (
            <LeaderboardSkeleton />
          ) : leaderboardQuery.isError || !data ? (
            <Empty className="min-h-[360px] border border-border bg-background">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <AlertCircle aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Could not load leaderboard</EmptyTitle>
                <EmptyDescription>
                  Refresh the page and try again. Leaderboard data is generated
                  from accepted friends, DSA progress, and job status history.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <LeaderboardSummary data={data} />
              <LeaderboardTable data={data} />
              {shouldLoadCharts ? (
                <Suspense fallback={<LeaderboardChartsFallback />}>
                  <LeaderboardCharts data={data} />
                </Suspense>
              ) : (
                <LeaderboardChartsFallback />
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

function LeaderboardSummary({ data }: { data: LeaderboardSnapshot }) {
  const currentUser = data.members.find((member) => member.isCurrentUser);
  const leader = data.members[0];

  return (
    <Card
      size="sm"
      className="border-primary/20 bg-[linear-gradient(135deg,color-mix(in_oklch,var(--primary)_13%,transparent),transparent_42%),linear-gradient(315deg,color-mix(in_oklch,var(--chart-3)_11%,transparent),transparent_45%),var(--card)]"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy aria-hidden="true" />
          Friends leaderboard
        </CardTitle>
        <CardDescription>{formatRange(data)}</CardDescription>
        <CardAction>
          <Badge variant="outline">{data.members.length} players</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        <SummaryMetric
          icon={<Medal aria-hidden="true" />}
          label="Your rank"
          value={currentUser ? `#${currentUser.rank}` : "-"}
          detail={
            currentUser
              ? `${currentUser.score} activity score`
              : "No current score"
          }
        />
        <SummaryMetric
          icon={<Code2 aria-hidden="true" />}
          label="Your DSA"
          value={currentUser?.dsaDone ?? 0}
          detail="solved questions"
        />
        <SummaryMetric
          icon={<BriefcaseBusiness aria-hidden="true" />}
          label="Top score"
          value={leader?.score ?? 0}
          detail={leader ? displayName(leader) : "No leader yet"}
        />
      </CardContent>
    </Card>
  );
}

function SummaryMetric({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/80 bg-background/70 px-3 py-2 shadow-sm">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="font-heading text-xl font-medium">{value}</p>
        <p className="truncate text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function LeaderboardTable({ data }: { data: LeaderboardSnapshot }) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader>
        <CardTitle>Ranking</CardTitle>
        <CardDescription>
          Activity score is DSA solved plus jobs applied in the last 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table containerClassName="rounded-lg border border-border">
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Rank</TableHead>
              <TableHead>Member</TableHead>
              <TableHead className="text-right">DSA done</TableHead>
              <TableHead className="text-right">Jobs applied</TableHead>
              <TableHead className="text-right">Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.members.map((member) => (
              <TableRow
                key={member.userId}
                className={cn(member.isCurrentUser ? "bg-primary/5" : null)}
              >
                <TableCell>
                  <Badge
                    variant={member.rank <= 3 ? "default" : "outline"}
                    className="min-w-12 justify-center"
                  >
                    {podiumLabel(member.rank)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-heading text-xs font-semibold text-primary ring-1 ring-border">
                      {initials(member)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">
                          {displayName(member)}
                        </p>
                        {member.isCurrentUser ? (
                          <Badge variant="secondary">You</Badge>
                        ) : null}
                      </div>
                      {member.user.email ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {member.user.email}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {member.dsaDone}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {member.jobsApplied}
                </TableCell>
                <TableCell className="text-right font-heading text-lg font-semibold">
                  {member.score}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function LeaderboardSkeleton() {
  return (
    <>
      <Card size="sm" className="border-primary/20">
        <CardHeader>
          <div className="space-y-2">
            <Skeleton className="h-5 w-40 rounded-md" />
            <Skeleton className="h-4 w-52 rounded-md" />
          </div>
          <CardAction>
            <Skeleton className="h-6 w-20 rounded-full" />
          </CardAction>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </CardContent>
      </Card>
      <Card size="sm">
        <CardHeader>
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-4 w-64 rounded-md" />
        </CardHeader>
        <CardContent className="grid gap-2">
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-12 rounded-md" />
        </CardContent>
      </Card>
      <section className="grid gap-5 xl:grid-cols-2">
        <Skeleton className="h-[380px] rounded-xl" />
        <Skeleton className="h-[380px] rounded-xl" />
      </section>
    </>
  );
}

function LeaderboardChartsFallback() {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <Skeleton className="h-[380px] rounded-xl" />
      <Skeleton className="h-[380px] rounded-xl" />
    </section>
  );
}
