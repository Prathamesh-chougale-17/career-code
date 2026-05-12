"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { DiaryDay, DiaryStatus } from "@careeright/domain/diary/schema";
import { rpcClient } from "@careeright/api/client";
import {
  dashboardAnalyticsQueryKey,
  diaryDayQueryKey,
  diaryRecentQueryKey,
} from "@careeright/api/query-keys";
import { cn } from "@/lib/utils";

type DiaryIntervalDraft = {
  id: string;
  startTime: string;
  endTime: string;
  title: string;
  notes: string;
  summary: string;
};

type DiaryDayDraft = {
  dateKey: string;
  dailySummary: string;
  tomorrowFocus: string;
  status: DiaryStatus;
  intervals: DiaryIntervalDraft[];
};

const statusLabels = {
  draft: "Draft",
  complete: "Complete",
} satisfies Record<DiaryStatus, string>;

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function localDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(dateKey: string, days: number) {
  const date = dateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMinutesToTime(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const next = Math.min(23 * 60 + 59, hours * 60 + mins + minutes);
  const nextHours = String(Math.floor(next / 60)).padStart(2, "0");
  const nextMinutes = String(next % 60).padStart(2, "0");

  return `${nextHours}:${nextMinutes}`;
}

function formatDate(value: string, dateStyle: Intl.DateTimeFormatOptions["dateStyle"]) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle,
    timeZone: "UTC",
  }).format(dateFromKey(value));
}

function emptyDayDraft(dateKey: string): DiaryDayDraft {
  return {
    dateKey,
    dailySummary: "",
    tomorrowFocus: "",
    status: "draft",
    intervals: [],
  };
}

function toDraft(day: DiaryDay | null, dateKey: string): DiaryDayDraft {
  if (!day) {
    return emptyDayDraft(dateKey);
  }

  return {
    dateKey: day.dateKey,
    dailySummary: day.dailySummary,
    tomorrowFocus: day.tomorrowFocus,
    status: day.status,
    intervals: day.intervals.map((interval) => ({
      id: interval.id,
      startTime: interval.startTime,
      endTime: interval.endTime,
      title: interval.title,
      notes: interval.notes,
      summary: interval.summary,
    })),
  };
}

function newIntervalDraft(existing: DiaryIntervalDraft[]): DiaryIntervalDraft {
  const last = existing.at(-1);
  const startTime = last?.endTime ?? "09:00";
  const endTime =
    startTime === "23:59" ? "23:59" : addMinutesToTime(startTime, 60);

  return {
    id: `draft-${crypto.randomUUID()}`,
    startTime,
    endTime,
    title: "",
    notes: "",
    summary: "",
  };
}

function statusBadgeVariant(status: DiaryStatus) {
  return status === "complete" ? "default" : "outline";
}

function mutationMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function DiaryApp({
  initialRecentDays,
  initialSelectedDate,
  initialSelectedDay,
}: {
  initialRecentDays?: DiaryDay[];
  initialSelectedDate?: string;
  initialSelectedDay?: DiaryDay | null;
}) {
  const [selectedDate, setSelectedDate] = useState(
    () => initialSelectedDate ?? localDateKey(),
  );
  const recentQuery = useQuery({
    queryKey: diaryRecentQueryKey,
    queryFn: () => rpcClient.diary.listRecent({ limit: 30 }),
    initialData: initialRecentDays,
    staleTime: 60_000,
  });

  const dayQuery = useQuery({
    queryKey: diaryDayQueryKey(selectedDate),
    queryFn: () => rpcClient.diary.getDay({ dateKey: selectedDate }),
    initialData:
      selectedDate === initialSelectedDate ? initialSelectedDay : undefined,
    staleTime: 60_000,
  });

  const onDateChange = useCallback((dateKey: string) => {
    if (!dateKey) {
      return;
    }

    setSelectedDate(dateKey);
  }, []);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Diary</p>
          <p className="truncate text-xs text-muted-foreground">
            Write the day directly or summarize it interval by interval
          </p>
        </div>
      </header>

      <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6">
        <div className="mx-auto grid w-full max-w-[1440px] min-w-0 gap-4 xl:grid-cols-[17rem_1fr]">
          <RecentDaysCard
            days={recentQuery.data ?? []}
            selectedDate={selectedDate}
            loading={recentQuery.isPending}
            error={recentQuery.isError}
            onSelectDate={onDateChange}
          />
          <DiaryDayForm
            key={`${selectedDate}:${dayQuery.data?.updatedAt ?? "new"}`}
            selectedDate={selectedDate}
            selectedDay={dayQuery.data ?? null}
            dayLoading={dayQuery.isPending}
            dayError={dayQuery.isError}
            onDateChange={onDateChange}
          />
        </div>
      </main>
    </>
  );
}

function DiaryDayForm({
  selectedDate,
  selectedDay,
  dayLoading,
  dayError,
  onDateChange,
}: {
  selectedDate: string;
  selectedDay: DiaryDay | null;
  dayLoading: boolean;
  dayError: boolean;
  onDateChange: (dateKey: string) => void;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<DiaryDayDraft>(() =>
    toDraft(selectedDay, selectedDate),
  );
  const [savedMessage, setSavedMessage] = useState("");

  const invalidateDiary = useCallback(
    (dateKey: string) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: diaryDayQueryKey(dateKey) }),
        queryClient.invalidateQueries({ queryKey: diaryRecentQueryKey }),
        queryClient.invalidateQueries({ queryKey: dashboardAnalyticsQueryKey }),
      ]),
    [queryClient],
  );

  const saveMutation = useMutation({
    mutationFn: (input: DiaryDayDraft) =>
      rpcClient.diary.saveDay({
        dateKey: input.dateKey,
        dailySummary: input.dailySummary,
        tomorrowFocus: input.tomorrowFocus,
        status: input.status,
        intervals: input.intervals.map((interval) => ({
          id: interval.id,
          startTime: interval.startTime,
          endTime: interval.endTime,
          title: interval.title,
          notes: interval.notes,
          summary: interval.summary,
        })),
      }),
    onSuccess: (day) => {
      setDraft(toDraft(day, day.dateKey));
      setSavedMessage(`Saved ${formatDate(day.dateKey, "medium")}`);
      void invalidateDiary(day.dateKey);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (dateKey: string) =>
      rpcClient.diary.deleteDay({
        dateKey,
      }),
    onSuccess: (_, dateKey) => {
      setDraft(emptyDayDraft(dateKey));
      setSavedMessage("");
      void invalidateDiary(dateKey);
    },
  });

  const selectedDayExists = Boolean(selectedDay);
  const busy = dayLoading || saveMutation.isPending || deleteMutation.isPending;

  const updateDraft = useCallback((patch: Partial<DiaryDayDraft>) => {
    setSavedMessage("");
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const updateInterval = useCallback(
    (intervalId: string, patch: Partial<DiaryIntervalDraft>) => {
      setSavedMessage("");
      setDraft((current) => ({
        ...current,
        intervals: current.intervals.map((interval) =>
          interval.id === intervalId ? { ...interval, ...patch } : interval,
        ),
      }));
    },
    [],
  );

  const addInterval = useCallback(() => {
    setSavedMessage("");
    setDraft((current) => ({
      ...current,
      intervals: [...current.intervals, newIntervalDraft(current.intervals)],
    }));
  }, []);

  const removeInterval = useCallback((intervalId: string) => {
    setSavedMessage("");
    setDraft((current) => ({
      ...current,
      intervals: current.intervals.filter((interval) => interval.id !== intervalId),
    }));
  }, []);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveMutation.mutate(draft);
  };

  return (
    <form onSubmit={onSubmit} className="flex min-w-0 flex-col gap-4">
      <DiaryControls
        draft={draft}
        selectedDayExists={selectedDayExists}
        busy={busy}
        savedMessage={savedMessage}
        saveError={saveMutation.isError ? mutationMessage(saveMutation.error) : ""}
        deleteError={
          deleteMutation.isError ? mutationMessage(deleteMutation.error) : ""
        }
        onDateChange={onDateChange}
        onStatusChange={(status) => updateDraft({ status })}
        onPreviousDay={() => onDateChange(addDays(selectedDate, -1))}
        onNextDay={() => onDateChange(addDays(selectedDate, 1))}
        onDeleteDay={() => deleteMutation.mutate(selectedDate)}
      />
      {dayLoading ? (
        <DiaryEditorSkeleton />
      ) : dayError ? (
        <Empty className="min-h-[360px] border border-border bg-background">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <AlertCircle aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Could not load this diary day</EmptyTitle>
            <EmptyDescription>
              Pick another date or refresh the page before writing.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <DiaryEditor
          draft={draft}
          onDraftChange={updateDraft}
          onIntervalChange={updateInterval}
          onAddInterval={addInterval}
          onRemoveInterval={removeInterval}
        />
      )}
    </form>
  );
}

function RecentDaysCard({
  days,
  selectedDate,
  loading,
  error,
  onSelectDate,
}: {
  days: DiaryDay[];
  selectedDate: string;
  loading: boolean;
  error: boolean;
  onSelectDate: (dateKey: string) => void;
}) {
  return (
    <Card size="sm" className="h-fit xl:sticky xl:top-4">
      <CardHeader className="gap-2 px-4 py-3">
        <CardTitle className="flex items-center gap-2">
          <CalendarDays aria-hidden="true" />
          Recent days
        </CardTitle>
        <CardDescription>Latest saved diary entries.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-3 pb-3">
        {loading ? (
          <>
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </>
        ) : error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Could not load recent days.
          </p>
        ) : days.length === 0 ? (
          <div className="flex items-start gap-3 rounded-lg border border-dashed bg-muted/20 px-3 py-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
              <BookOpen aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                No saved days yet
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                Saved diary entries will appear here.
              </span>
            </span>
          </div>
        ) : (
          days.map((day) => (
            <button
              key={day.id}
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-background/60 px-2.5 py-2 text-left transition-colors hover:bg-muted/50 aria-current:bg-muted"
              aria-current={day.dateKey === selectedDate ? "true" : undefined}
              onClick={() => onSelectDate(day.dateKey)}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {formatDate(day.dateKey, "medium")}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {day.dailySummary || day.tomorrowFocus || "Interval diary"}
                </span>
              </span>
              <DiaryStatusBadge status={day.status} />
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function DiaryControls({
  draft,
  selectedDayExists,
  busy,
  savedMessage,
  saveError,
  deleteError,
  onDateChange,
  onStatusChange,
  onPreviousDay,
  onNextDay,
  onDeleteDay,
}: {
  draft: DiaryDayDraft;
  selectedDayExists: boolean;
  busy: boolean;
  savedMessage: string;
  saveError: string;
  deleteError: string;
  onDateChange: (dateKey: string) => void;
  onStatusChange: (status: DiaryStatus) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onDeleteDay: () => void;
}) {
  return (
    <Card size="sm">
      <CardHeader className="gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div className="flex min-w-0 flex-col gap-1">
          <CardTitle>{formatDate(draft.dateKey, "full")}</CardTitle>
          <CardDescription>
            Save manually when the day is ready for your private record.
          </CardDescription>
        </div>
        <CardAction>
          <DiaryStatusBadge status={draft.status} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-2 sm:grid-cols-[auto_minmax(12rem,15rem)_9.5rem] sm:items-end">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={onPreviousDay}
                disabled={busy}
                aria-label="Previous day"
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={onNextDay}
                disabled={busy}
                aria-label="Next day"
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
            <Field>
              <FieldLabel>Date</FieldLabel>
              <DiaryDatePicker
                dateKey={draft.dateKey}
                disabled={busy}
                onDateChange={onDateChange}
              />
            </Field>
            <Field>
              <FieldLabel>Status</FieldLabel>
              <Select
                value={draft.status}
                onValueChange={(value) => onStatusChange(value as DiaryStatus)}
                disabled={busy}
              >
                <SelectTrigger className="min-w-36">
                  <SelectValue>{statusLabels[draft.status]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="draft" label="Draft">
                      Draft
                    </SelectItem>
                    <SelectItem value="complete" label="Complete">
                      Complete
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {selectedDayExists ? (
              <Button
                type="button"
                variant="outline"
                onClick={onDeleteDay}
                disabled={busy}
              >
                <Trash2 data-icon="inline-start" aria-hidden="true" />
                Delete
              </Button>
            ) : null}
            <Button type="submit" disabled={busy}>
              <Save data-icon="inline-start" aria-hidden="true" />
              {busy ? "Saving" : "Save"}
            </Button>
          </div>
        </div>
        {savedMessage ? (
          <p className="text-sm text-muted-foreground">{savedMessage}</p>
        ) : null}
        {saveError || deleteError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {saveError || deleteError}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DiaryDatePicker({
  dateKey,
  disabled,
  onDateChange,
}: {
  dateKey: string;
  disabled: boolean;
  onDateChange: (dateKey: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = localDateFromKey(dateKey);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            disabled={disabled}
          />
        }
      >
        <CalendarDays data-icon="inline-start" aria-hidden="true" />
        {formatDate(dateKey, "medium")}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) {
              return;
            }

            onDateChange(localDateKey(date));
            setOpen(false);
          }}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}

function DiaryEditor({
  draft,
  onDraftChange,
  onIntervalChange,
  onAddInterval,
  onRemoveInterval,
}: {
  draft: DiaryDayDraft;
  onDraftChange: (patch: Partial<DiaryDayDraft>) => void;
  onIntervalChange: (
    intervalId: string,
    patch: Partial<DiaryIntervalDraft>,
  ) => void;
  onAddInterval: () => void;
  onRemoveInterval: (intervalId: string) => void;
}) {
  const intervalSummaryCount = useMemo(
    () =>
      draft.intervals.filter((interval) => interval.summary.trim().length > 0)
        .length,
    [draft.intervals],
  );

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(26rem,1.05fr)]">
      <Card size="sm" className="h-fit">
        <CardHeader className="py-4">
          <CardTitle>Daily reflection</CardTitle>
          <CardDescription>
            Overall summary and tomorrow’s focus in one compact panel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="daily-summary">Summary</FieldLabel>
              <Textarea
                id="daily-summary"
                className="min-h-64 resize-y"
                value={draft.dailySummary}
                onChange={(event) =>
                  onDraftChange({ dailySummary: event.target.value })
                }
                placeholder="What happened today? What mattered most?"
              />
              <FieldDescription>
                You can leave this empty when intervals carry the diary.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="tomorrow-focus">Tomorrow’s focus</FieldLabel>
              <Textarea
                id="tomorrow-focus"
                className="min-h-32 resize-y"
                value={draft.tomorrowFocus}
                onChange={(event) =>
                  onDraftChange({ tomorrowFocus: event.target.value })
                }
                placeholder="What should tomorrow start with?"
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card size="sm" className="min-w-0">
        <CardHeader>
          <div>
            <CardTitle>Intervals</CardTitle>
            <CardDescription>
              {draft.intervals.length} block
              {draft.intervals.length === 1 ? "" : "s"},{" "}
              {intervalSummaryCount} summarized
            </CardDescription>
          </div>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onAddInterval}
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Add interval
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {draft.intervals.length === 0 ? (
            <Empty className="min-h-80 border border-dashed bg-muted/20">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpen aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No intervals yet</EmptyTitle>
                <EmptyDescription>
                  Add time blocks when the day is easier to summarize in parts.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <FieldGroup className="gap-3">
              {draft.intervals.map((interval, index) => (
                <IntervalEditor
                  key={interval.id}
                  interval={interval}
                  index={index}
                  onChange={(patch) => onIntervalChange(interval.id, patch)}
                  onRemove={() => onRemoveInterval(interval.id)}
                />
              ))}
            </FieldGroup>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function IntervalEditor({
  interval,
  index,
  onChange,
  onRemove,
}: {
  interval: DiaryIntervalDraft;
  index: number;
  onChange: (patch: Partial<DiaryIntervalDraft>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Interval {index + 1}</p>
          <p className="text-xs text-muted-foreground">
            {interval.startTime} to {interval.endTime}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          aria-label={`Remove interval ${index + 1}`}
          className="lg:hidden"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>
      <FieldGroup className="grid gap-3 lg:grid-cols-[7.5rem_7.5rem_minmax(0,1fr)_auto] lg:items-end">
        <Field>
          <FieldLabel htmlFor={`${interval.id}-start`}>Start</FieldLabel>
          <Input
            id={`${interval.id}-start`}
            type="time"
            value={interval.startTime}
            onChange={(event) => onChange({ startTime: event.target.value })}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${interval.id}-end`}>End</FieldLabel>
          <Input
            id={`${interval.id}-end`}
            type="time"
            value={interval.endTime}
            onChange={(event) => onChange({ endTime: event.target.value })}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${interval.id}-title`}>Title</FieldLabel>
          <Input
            id={`${interval.id}-title`}
            value={interval.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Morning deep work, college, gym..."
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRemove}
          aria-label={`Remove interval ${index + 1}`}
          className="hidden lg:inline-flex"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </FieldGroup>
      <FieldGroup className="mt-3 grid gap-3 lg:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${interval.id}-notes`}>Notes</FieldLabel>
          <Textarea
            id={`${interval.id}-notes`}
            className="min-h-28 resize-y"
            value={interval.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="Raw details from this part of the day."
          />
        </Field>
        <Field>
          <FieldLabel htmlFor={`${interval.id}-summary`}>
            Interval summary
          </FieldLabel>
          <Textarea
            id={`${interval.id}-summary`}
            className="min-h-28 resize-y"
            value={interval.summary}
            onChange={(event) => onChange({ summary: event.target.value })}
            placeholder="What is the concise takeaway from this block?"
          />
        </Field>
      </FieldGroup>
    </div>
  );
}

function DiaryStatusBadge({ status }: { status: DiaryStatus }) {
  const Icon = status === "complete" ? CheckCircle2 : CircleDashed;

  return (
    <Badge variant={statusBadgeVariant(status)}>
      <Icon data-icon="inline-start" aria-hidden="true" />
      {statusLabels[status]}
    </Badge>
  );
}

function DiaryEditorSkeleton() {
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(26rem,1.05fr)]">
      <Card size="sm" className="h-fit">
        <CardHeader className="py-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-4 w-72 max-w-full rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <DiaryFieldSkeleton className="h-64" />
          <DiaryFieldSkeleton className="h-32" />
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
                <DiaryFieldSkeleton />
                <DiaryFieldSkeleton />
                <DiaryFieldSkeleton />
                <Skeleton className="hidden size-10 rounded-md lg:block" />
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <DiaryFieldSkeleton className="h-28" />
                <DiaryFieldSkeleton className="h-28" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function DiaryFieldSkeleton({ className }: { className?: string }) {
  return (
    <div className="grid gap-2">
      <Skeleton className="h-4 w-20 rounded-md" />
      <Skeleton className={cn("h-10 rounded-md", className)} />
    </div>
  );
}
