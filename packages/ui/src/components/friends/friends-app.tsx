"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  CopyPlus,
  ExternalLink,
  Loader2,
  Search,
  Send,
  Share2,
  UserMinus,
  UserPlus,
  UsersRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  dashboardAnalyticsQueryKey,
  friendSearchQueryKey,
  friendShareDetailQueryKey,
  friendSharesQueryKey,
  friendsSummaryQueryKey,
  jobsQueryKey,
} from "@careeright/api/query-keys";
import type {
  FriendConnectionView,
  FriendsSummary,
  FriendUser,
  FriendUserSearchResult,
  JobShareDetail,
  JobShareScope,
  JobShareSummary,
} from "@careeright/domain/friends/schema";
import { useCareerightUi } from "../../providers/careeright-ui-provider";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
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
  DialogFooter,
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { Skeleton } from "../ui/skeleton";
import { Textarea } from "../ui/textarea";

const shareScopeLabels = {
  latest: "Latest seeded day",
  date: "A specific date",
  all: "All active jobs",
} satisfies Record<JobShareScope, string>;

function displayName(user: FriendUser) {
  return user.name || user.email || "Careeright user";
}

function initials(user: FriendUser) {
  const source = displayName(user).trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const value =
    parts.length > 1
      ? `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`
      : source.slice(0, 2);

  return value.toUpperCase() || "CU";
}

function formatDateKey(dateKey: string | null) {
  if (!dateKey) {
    return "No date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${dateKey}T00:00:00.000Z`));
}

function shareSubtitle(share: Pick<JobShareSummary, "scope" | "dateKey" | "jobCount">) {
  const scopeLabel = shareScopeLabels[share.scope];
  const dateLabel = share.dateKey ? ` · ${formatDateKey(share.dateKey)}` : "";

  return `${scopeLabel}${dateLabel} · ${share.jobCount} ${share.jobCount === 1 ? "job" : "jobs"}`;
}

function mutationError(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function FriendsApp({ initialSummary }: { initialSummary?: FriendsSummary }) {
  const { rpcClient } = useCareerightUi();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const trimmedSearchQuery = searchQuery.trim();
  const normalizedSearchEmail = trimmedSearchQuery.toLowerCase();
  const canSearchByEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    normalizedSearchEmail,
  );
  const summaryQuery = useQuery({
    queryKey: friendsSummaryQueryKey,
    queryFn: () => rpcClient.friends.summary(),
    initialData: initialSummary,
  });
  const searchQueryResult = useQuery({
    queryKey: friendSearchQueryKey(normalizedSearchEmail),
    queryFn: () => rpcClient.friends.searchUsers({ query: normalizedSearchEmail }),
    enabled: canSearchByEmail,
  });

  const summary = summaryQuery.data;

  function invalidateFriends() {
    void queryClient.invalidateQueries({ queryKey: friendsSummaryQueryKey });
    void queryClient.invalidateQueries({ queryKey: friendSharesQueryKey("received") });
    void queryClient.invalidateQueries({ queryKey: friendSharesQueryKey("sent") });
    if (canSearchByEmail) {
      void queryClient.invalidateQueries({
        queryKey: friendSearchQueryKey(normalizedSearchEmail),
      });
    }
  }

  const sendRequestMutation = useMutation({
    mutationFn: (recipientId: string) => rpcClient.friends.sendRequest({ recipientId }),
    onSuccess: invalidateFriends,
  });
  const respondRequestMutation = useMutation({
    mutationFn: ({
      connectionId,
      action,
    }: {
      connectionId: string;
      action: "accept" | "reject";
    }) => rpcClient.friends.respondRequest({ connectionId, action }),
    onSuccess: invalidateFriends,
  });
  const cancelRequestMutation = useMutation({
    mutationFn: (connectionId: string) =>
      rpcClient.friends.cancelRequest({ connectionId }),
    onSuccess: invalidateFriends,
  });
  const removeFriendMutation = useMutation({
    mutationFn: (connectionId: string) =>
      rpcClient.friends.removeFriend({ connectionId }),
    onSuccess: invalidateFriends,
  });

  const busyConnectionId =
    respondRequestMutation.variables?.connectionId ??
    cancelRequestMutation.variables ??
    removeFriendMutation.variables ??
    null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <SidebarTrigger className="mt-0.5" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-semibold tracking-normal">
                Friends
              </h1>
              {summary?.incomingRequests.length ? (
                <Badge variant="secondary">
                  {summary.incomingRequests.length} pending
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              Connect with Careeright users and share job batches without exposing
              your private workspace.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:min-w-80">
          <MetricCard label="Friends" value={summary?.friends.length ?? 0} />
          <MetricCard
            label="Received"
            value={summary?.receivedShares.length ?? 0}
          />
          <MetricCard label="Shareable" value={summary?.totalShareableJobs ?? 0} />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Connect</CardTitle>
              <CardDescription>
                Enter an exact email address, then send a friend request.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    value={searchQuery}
                    placeholder="friend@example.com"
                    className="pl-9"
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!canSearchByEmail}
                  onClick={() =>
                    void queryClient.invalidateQueries({
                      queryKey: friendSearchQueryKey(normalizedSearchEmail),
                    })
                  }
                >
                  <Search data-icon="inline-start" aria-hidden="true" />
                  Search
                </Button>
              </div>

              {!canSearchByEmail ? (
                <Empty className="border border-dashed bg-muted/20">
                  <EmptyHeader>
                    <EmptyMedia>
                      <UsersRound aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>Enter an exact email</EmptyTitle>
                    <EmptyDescription>
                      Friends can only be found by the email address on their
                      Careeright account.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : searchQueryResult.isPending ? (
                <UserListSkeleton />
              ) : searchQueryResult.data?.length ? (
                <div className="grid gap-3">
                  {searchQueryResult.data.map((result) => (
                    <SearchResultRow
                      key={result.id}
                      result={result}
                      busyUserId={sendRequestMutation.variables ?? null}
                      busyConnectionId={busyConnectionId}
                      onSendRequest={(recipientId) =>
                        sendRequestMutation.mutate(recipientId)
                      }
                      onRespond={(connectionId, action) =>
                        respondRequestMutation.mutate({ connectionId, action })
                      }
                      onCancel={(connectionId) =>
                        cancelRequestMutation.mutate(connectionId)
                      }
                    />
                  ))}
                </div>
              ) : (
                <Empty className="border border-dashed bg-muted/20">
                  <EmptyHeader>
                    <EmptyMedia>
                      <Search aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No matching users</EmptyTitle>
                    <EmptyDescription>
                      Ask your friend for the exact email they use on Careeright.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              )}

              {sendRequestMutation.error ? (
                <p className="text-sm text-destructive">
                  {mutationError(sendRequestMutation.error)}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <RequestsCard
            incomingRequests={summary?.incomingRequests ?? []}
            outgoingRequests={summary?.outgoingRequests ?? []}
            busyConnectionId={busyConnectionId}
            onRespond={(connectionId, action) =>
              respondRequestMutation.mutate({ connectionId, action })
            }
            onCancel={(connectionId) => cancelRequestMutation.mutate(connectionId)}
          />
        </div>

        <div className="flex flex-col gap-5">
          <FriendsCard
            friends={summary?.friends ?? []}
            summary={summary}
            busyConnectionId={busyConnectionId}
            onRemoveFriend={(connectionId) =>
              removeFriendMutation.mutate(connectionId)
            }
          />
          <SharesCard
            receivedShares={summary?.receivedShares ?? []}
            sentShares={summary?.sentShares ?? []}
          />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-heading text-xl font-medium">{value}</p>
    </div>
  );
}

function UserAvatar({ user }: { user: FriendUser }) {
  if (user.image) {
    return (
      <img
        src={user.image}
        alt=""
        className="size-10 rounded-full object-cover ring-1 ring-border"
      />
    );
  }

  return (
    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-heading text-sm font-semibold text-primary">
      {initials(user)}
    </div>
  );
}

function UserIdentity({ user }: { user: FriendUser }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar user={user} />
      <div className="min-w-0">
        <p className="truncate font-medium">{displayName(user)}</p>
        {user.email ? (
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        ) : (
          <p className="truncate text-xs text-muted-foreground">Careeright user</p>
        )}
      </div>
    </div>
  );
}

function SearchResultRow({
  result,
  busyUserId,
  busyConnectionId,
  onSendRequest,
  onRespond,
  onCancel,
}: {
  result: FriendUserSearchResult;
  busyUserId: string | null;
  busyConnectionId: string | null;
  onSendRequest: (recipientId: string) => void;
  onRespond: (connectionId: string, action: "accept" | "reject") => void;
  onCancel: (connectionId: string) => void;
}) {
  const busy = busyUserId === result.id || busyConnectionId === result.connection?.id;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
      <UserIdentity user={result} />
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {result.relationship === "accepted" ? (
          <Badge variant="secondary">
            <Check data-icon="inline-start" aria-hidden="true" />
            Friends
          </Badge>
        ) : result.relationship === "incoming_pending" && result.connection ? (
          <>
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => onRespond(result.connection!.id, "accept")}
            >
              {busy ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Check data-icon="inline-start" aria-hidden="true" />
              )}
              Accept
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onRespond(result.connection!.id, "reject")}
            >
              Reject
            </Button>
          </>
        ) : result.relationship === "outgoing_pending" && result.connection ? (
          <>
            <Badge variant="outline">Request sent</Badge>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onCancel(result.connection!.id)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => onSendRequest(result.id)}
          >
            {busy ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <UserPlus data-icon="inline-start" aria-hidden="true" />
            )}
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}

function RequestsCard({
  incomingRequests,
  outgoingRequests,
  busyConnectionId,
  onRespond,
  onCancel,
}: {
  incomingRequests: FriendConnectionView[];
  outgoingRequests: FriendConnectionView[];
  busyConnectionId: string | null;
  onRespond: (connectionId: string, action: "accept" | "reject") => void;
  onCancel: (connectionId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Requests</CardTitle>
        <CardDescription>Accept incoming requests or cancel outgoing ones.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyMedia>
                <Send aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No pending requests</EmptyTitle>
              <EmptyDescription>
                New friend requests will appear here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}

        {incomingRequests.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Incoming
            </p>
            {incomingRequests.map((request) => {
              const busy = busyConnectionId === request.id;

              return (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <UserIdentity user={request.otherUser} />
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => onRespond(request.id, "accept")}
                    >
                      {busy ? (
                        <Loader2 data-icon="inline-start" className="animate-spin" />
                      ) : (
                        <Check data-icon="inline-start" aria-hidden="true" />
                      )}
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => onRespond(request.id, "reject")}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {outgoingRequests.length > 0 ? (
          <div className="grid gap-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Outgoing
            </p>
            {outgoingRequests.map((request) => {
              const busy = busyConnectionId === request.id;

              return (
                <div
                  key={request.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <UserIdentity user={request.otherUser} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onCancel(request.id)}
                  >
                    {busy ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <X data-icon="inline-start" aria-hidden="true" />
                    )}
                    Cancel
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FriendsCard({
  friends,
  summary,
  busyConnectionId,
  onRemoveFriend,
}: {
  friends: FriendConnectionView[];
  summary?: FriendsSummary;
  busyConnectionId: string | null;
  onRemoveFriend: (connectionId: string) => void;
}) {
  const [shareRecipient, setShareRecipient] = useState<FriendUser | null>(null);
  const [removingFriend, setRemovingFriend] =
    useState<FriendConnectionView | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your friends</CardTitle>
        <CardDescription>
          Share jobs only with accepted Careeright friends.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {friends.length === 0 ? (
          <Empty className="border border-dashed bg-muted/20">
            <EmptyHeader>
              <EmptyMedia>
                <UsersRound aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No friends yet</EmptyTitle>
              <EmptyDescription>
                Search for users above and send your first request.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          friends.map((friend) => {
            const busy = busyConnectionId === friend.id;

            return (
              <div
                key={friend.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <UserIdentity user={friend.otherUser} />
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!summary || summary.totalShareableJobs === 0}
                    onClick={() => setShareRecipient(friend.otherUser)}
                  >
                    <Share2 data-icon="inline-start" aria-hidden="true" />
                    Share jobs
                  </Button>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    aria-label={`Remove ${displayName(friend.otherUser)}`}
                    disabled={busy}
                    onClick={() => setRemovingFriend(friend)}
                  >
                    {busy ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <UserMinus aria-hidden="true" />
                    )}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <ShareJobsDialog
        recipient={shareRecipient}
        summary={summary}
        onOpenChange={(open) => !open && setShareRecipient(null)}
      />
      <ConfirmDialog
        open={Boolean(removingFriend)}
        title="Remove friend?"
        description={
          removingFriend
            ? `${displayName(removingFriend.otherUser)} will no longer be able to receive new job shares from you.`
            : ""
        }
        confirmLabel="Remove"
        onOpenChange={(open) => !open && setRemovingFriend(null)}
        onConfirm={() => {
          if (removingFriend) {
            onRemoveFriend(removingFriend.id);
            setRemovingFriend(null);
          }
        }}
      />
    </Card>
  );
}

function ShareJobsDialog({
  recipient,
  summary,
  onOpenChange,
}: {
  recipient: FriendUser | null;
  summary?: FriendsSummary;
  onOpenChange: (open: boolean) => void;
}) {
  const { rpcClient } = useCareerightUi();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<JobShareScope>("latest");
  const [dateKey, setDateKey] = useState("");
  const [note, setNote] = useState("");
  const dateOptions = summary?.jobDateOptions ?? [];
  const latestDateKey = summary?.latestDateKey ?? "";
  const selectedDateKey = scope === "latest" ? latestDateKey : dateKey;
  const selectedCount =
    scope === "all"
      ? (summary?.totalShareableJobs ?? 0)
      : (dateOptions.find((option) => option.dateKey === selectedDateKey)?.count ?? 0);
  const shareMutation = useMutation({
    mutationFn: () => {
      if (!recipient) {
        throw new Error("Choose a friend before sharing jobs.");
      }

      return rpcClient.friends.createJobShare({
        recipientId: recipient.id,
        scope,
        dateKey: scope === "date" ? dateKey : undefined,
        note,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: friendsSummaryQueryKey });
      void queryClient.invalidateQueries({ queryKey: friendSharesQueryKey("sent") });
      void queryClient.invalidateQueries({
        queryKey: friendSharesQueryKey("received"),
      });
      setNote("");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={Boolean(recipient)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share jobs</DialogTitle>
          <DialogDescription>
            {recipient
              ? `Create a read-only job batch for ${displayName(recipient)}.`
              : "Create a read-only job batch."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          {recipient ? <UserIdentity user={recipient} /> : null}

          <div className="grid gap-2">
            <Label>Share scope</Label>
            <Select value={scope} onValueChange={(value) => setScope(value as JobShareScope)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="latest">Latest seeded day</SelectItem>
                  <SelectItem value="date">A specific date</SelectItem>
                  <SelectItem value="all">All active jobs</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {scope === "date" ? (
            <div className="grid gap-2">
              <Label>Date</Label>
              <Select value={dateKey} onValueChange={(value) => setDateKey(String(value))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a seeded date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {dateOptions.map((option) => (
                      <SelectItem key={option.dateKey} value={option.dateKey}>
                        {formatDateKey(option.dateKey)} · {option.count} jobs
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="grid gap-2">
            <Label>Note</Label>
            <Textarea
              value={note}
              placeholder="Optional context for your friend"
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium">
              {selectedCount} {selectedCount === 1 ? "job" : "jobs"} ready to share
            </p>
            <p className="text-xs text-muted-foreground">
              {scope === "all"
                ? "This includes every active job in your tracker."
                : selectedDateKey
                  ? `Seeded on ${formatDateKey(selectedDateKey)}.`
                  : "Choose a date before sharing."}
            </p>
          </div>

          {shareMutation.error ? (
            <p className="text-sm text-destructive">
              {mutationError(shareMutation.error)}
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={shareMutation.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              shareMutation.isPending ||
              selectedCount === 0 ||
              (scope === "date" && !dateKey)
            }
            onClick={() => shareMutation.mutate()}
          >
            {shareMutation.isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Share2 data-icon="inline-start" aria-hidden="true" />
            )}
            Share
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SharesCard({
  receivedShares,
  sentShares,
}: {
  receivedShares: JobShareSummary[];
  sentShares: JobShareSummary[];
}) {
  const { rpcClient } = useCareerightUi();
  const queryClient = useQueryClient();
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null);
  const [revokingShare, setRevokingShare] = useState<JobShareSummary | null>(null);
  const revokeMutation = useMutation({
    mutationFn: (shareId: string) => rpcClient.friends.revokeShare({ shareId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: friendsSummaryQueryKey });
      void queryClient.invalidateQueries({ queryKey: friendSharesQueryKey("sent") });
      setRevokingShare(null);
    },
  });
  const selectedShareQuery = useQuery({
    queryKey: friendShareDetailQueryKey(selectedShareId ?? ""),
    queryFn: () => rpcClient.friends.getShare({ shareId: selectedShareId ?? "" }),
    enabled: Boolean(selectedShareId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shared jobs</CardTitle>
        <CardDescription>
          Review received job batches or manage the batches you sent.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
        <ShareSection
          title="Received"
          emptyTitle="No received shares"
          shares={receivedShares}
          onView={(shareId) => setSelectedShareId(shareId)}
        />
        <Separator />
        <ShareSection
          title="Sent"
          emptyTitle="No sent shares"
          shares={sentShares}
          onView={(shareId) => setSelectedShareId(shareId)}
          onRevoke={(share) => setRevokingShare(share)}
        />
      </CardContent>

      <ShareDetailDialog
        share={selectedShareQuery.data}
        loading={selectedShareQuery.isPending && Boolean(selectedShareId)}
        open={Boolean(selectedShareId)}
        onOpenChange={(open) => !open && setSelectedShareId(null)}
      />
      <ConfirmDialog
        open={Boolean(revokingShare)}
        title="Revoke share?"
        description={
          revokingShare
            ? `${displayName(revokingShare.otherUser)} will no longer be able to open this shared job batch.`
            : ""
        }
        confirmLabel="Revoke"
        onOpenChange={(open) => !open && setRevokingShare(null)}
        onConfirm={() => {
          if (revokingShare) {
            revokeMutation.mutate(revokingShare.id);
          }
        }}
      />
    </Card>
  );
}

function ShareSection({
  title,
  emptyTitle,
  shares,
  onView,
  onRevoke,
}: {
  title: string;
  emptyTitle: string;
  shares: JobShareSummary[];
  onView: (shareId: string) => void;
  onRevoke?: (share: JobShareSummary) => void;
}) {
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">
          {title}
        </p>
        <Badge variant="outline">{shares.length}</Badge>
      </div>
      {shares.length === 0 ? (
        <Empty className="border border-dashed bg-muted/20">
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>Job shares will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid gap-2">
          {shares.map((share) => (
            <div
              key={share.id}
              className={cn(
                "flex flex-col gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between",
                share.revokedAt ? "opacity-70" : null,
              )}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium">
                    {displayName(share.otherUser)}
                  </p>
                  {share.revokedAt ? (
                    <Badge variant="destructive">Revoked</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {shareSubtitle(share)}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onView(share.id)}
                >
                  Open
                </Button>
                {onRevoke && !share.revokedAt ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => onRevoke(share)}
                  >
                    Revoke
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ShareDetailDialog({
  share,
  loading,
  open,
  onOpenChange,
}: {
  share?: JobShareDetail;
  loading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { openExternal, rpcClient } = useCareerightUi();
  const queryClient = useQueryClient();
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const itemIds = useMemo(() => share?.items.map((item) => item.id) ?? [], [share]);
  const selectedCount = selectedItemIds.size;

  useEffect(() => {
    setSelectedItemIds(new Set());
  }, [share?.id, open]);

  const copyMutation = useMutation({
    mutationFn: (ids?: string[]) =>
      rpcClient.friends.copySharedJobs({
        shareId: share?.id ?? "",
        itemIds: ids,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobsQueryKey });
      void queryClient.invalidateQueries({ queryKey: dashboardAnalyticsQueryKey });
      setSelectedItemIds(new Set());
    },
  });

  function toggleItem(itemId: string, checked: boolean) {
    setSelectedItemIds((current) => {
      const next = new Set(current);

      if (checked) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }

      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88svh] overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Shared jobs</DialogTitle>
          <DialogDescription>
            {share
              ? `${displayName(share.owner)} shared ${share.jobCount} jobs with ${displayName(share.recipient)}.`
              : "Loading shared jobs."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <UserListSkeleton />
        ) : share ? (
          <div className="grid min-h-0 gap-4">
            {share.note ? (
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                {share.note}
              </div>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{shareSubtitle(share)}</Badge>
              <Badge variant="outline">{selectedCount} selected</Badge>
            </div>
            <div className="max-h-[46svh] overflow-auto rounded-lg border border-border">
              <div className="grid min-w-[760px]">
                {share.items.map((item) => {
                  const job = item.snapshot;

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[2.5rem_minmax(16rem,1.3fr)_minmax(8rem,0.8fr)_8rem_8rem] items-center gap-3 border-b border-border px-3 py-3 last:border-b-0"
                    >
                      <Checkbox
                        checked={selectedItemIds.has(item.id)}
                        aria-label={`Select ${job.title}`}
                        onCheckedChange={(checked) =>
                          toggleItem(item.id, checked === true)
                        }
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{job.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {job.company || "Company not listed"} ·{" "}
                          {job.location || "Location not listed"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {job.fitScore === null ? null : (
                          <Badge variant="outline">Fit {job.fitScore}</Badge>
                        )}
                        <Badge variant="secondary">{job.status.replace(/_/g, " ")}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDateKey(job.seededAt.slice(0, 10))}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={!job.applyUrl}
                        onClick={() => void openExternal(job.applyUrl)}
                      >
                        <ExternalLink data-icon="inline-start" aria-hidden="true" />
                        Apply
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
            {copyMutation.error ? (
              <p className="text-sm text-destructive">
                {mutationError(copyMutation.error)}
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!share || copyMutation.isPending || selectedCount === 0}
            onClick={() => copyMutation.mutate(Array.from(selectedItemIds))}
          >
            {copyMutation.isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <CopyPlus data-icon="inline-start" aria-hidden="true" />
            )}
            Copy selected
          </Button>
          <Button
            type="button"
            disabled={!share || copyMutation.isPending || itemIds.length === 0}
            onClick={() => copyMutation.mutate(undefined)}
          >
            {copyMutation.isPending ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <CopyPlus data-icon="inline-start" aria-hidden="true" />
            )}
            Copy all
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserListSkeleton() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3"
        >
          <Skeleton className="size-10 rounded-full" />
          <div className="grid flex-1 gap-2">
            <Skeleton className="h-4 w-44 rounded-md" />
            <Skeleton className="h-3 w-64 max-w-full rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}
