"use client";

import { useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  BriefcaseBusiness,
  Code2,
  Medal,
  Trophy,
} from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { leaderboardSnapshotQueryKey } from "@careeright/api/query-keys";
import type {
  LeaderboardMember,
  LeaderboardSnapshot,
} from "@careeright/domain/leaderboard/schema";
import { useCareerightUi } from "../../providers/careeright-ui-provider";
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
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
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

const chartColors = [
  "var(--primary)",
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatDay(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
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
  return displayName(member)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "C";
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
  const leaderboardQuery = useQuery({
    queryKey: leaderboardSnapshotQueryKey,
    queryFn: () => rpcClient.leaderboard.snapshot(),
    initialData: initialLeaderboard,
    staleTime: 0,
  });
  const data = leaderboardQuery.data;

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
              <section className="grid min-w-0 gap-5 xl:grid-cols-2">
                <LeaderboardLineChart
                  data={data}
                  metric="dsaDone"
                  title="DSA done"
                  description="Solved DSA questions over the last 30 days."
                  totalLabel="solved"
                />
                <LeaderboardLineChart
                  data={data}
                  metric="jobsApplied"
                  title="Jobs applied"
                  description="Applied job updates over the last 30 days."
                  totalLabel="applied"
                />
              </section>
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

function LeaderboardLineChart({
  data,
  description,
  metric,
  title,
  totalLabel,
}: {
  data: LeaderboardSnapshot;
  description: string;
  metric: "dsaDone" | "jobsApplied";
  title: string;
  totalLabel: string;
}) {
  const series = useMemo(
    () =>
      data.members.map((member, index) => ({
        key: `member${index}`,
        member,
        color: chartColors[index % chartColors.length],
      })),
    [data.members],
  );
  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        series.map((item) => [
          item.key,
          {
            label: displayName(item.member),
            color: item.color,
          },
        ]),
      ) as ChartConfig,
    [series],
  );
  const chartData = useMemo(() => {
    const dates = data.members[0]?.days.map((day) => day.date) ?? [];

    return dates.map((date) => {
      const row: Record<string, number | string> = { date };

      for (const item of series) {
        const day = item.member.days.find((entry) => entry.date === date);
        row[item.key] = day?.[metric] ?? 0;
      }

      return row;
    });
  }, [data.members, metric, series]);
  const total = data.members.reduce((count, member) => count + member[metric], 0);

  return (
    <Card size="sm" className="min-w-0 pt-0">
      <CardHeader className="border-b py-5">
        <div className="grid flex-1 gap-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <CardAction>
          <Badge variant="secondary">
            {total} {totalLabel}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[300px] w-full"
          initialDimension={{ width: 640, height: 300 }}
        >
          <LineChart
            accessibilityLayer
            data={chartData}
            margin={{ left: 12, right: 12 }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={30}
              tickFormatter={formatDay}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={34}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => formatDay(String(value))}
                  indicator="line"
                />
              }
            />
            {series.map((item) => (
              <Line
                key={item.key}
                dataKey={item.key}
                type="monotone"
                stroke={`var(--color-${item.key})`}
                strokeWidth={item.member.isCurrentUser ? 3 : 2}
                dot={false}
              />
            ))}
            <ChartLegend content={<ChartLegendContent />} />
          </LineChart>
        </ChartContainer>
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
