import type { KanbanTask } from "@careeright/domain/kanban/schema";
import type { JobFitBand, JobStatus } from "@careeright/domain/jobs/schema";

type ColumnId = KanbanTask["columnId"];
type Priority = KanbanTask["priority"];

export const boardColumnOptions: { label: string; value: ColumnId }[] = [
  { label: "Backlog", value: "backlog" },
  { label: "Todo", value: "todo" },
  { label: "Doing", value: "in_progress" },
  { label: "Done", value: "done" },
];

export const priorityOptions: { label: string; value: Priority }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

export const jobStatusOptions: { label: string; value: JobStatus }[] = [
  { label: "Not applied", value: "not_applied" },
  { label: "Applied", value: "applied" },
  { label: "Interview", value: "interviewing" },
  { label: "Rejected", value: "rejected" },
  { label: "Offer", value: "offer" },
  { label: "Expired", value: "expired" },
];

export function columnLabel(value: ColumnId) {
  return boardColumnOptions.find((item) => item.value === value)?.label ?? value;
}

export function priorityLabel(value: Priority) {
  return priorityOptions.find((item) => item.value === value)?.label ?? value;
}

export function jobStatusLabel(value: JobStatus) {
  return jobStatusOptions.find((item) => item.value === value)?.label ?? value;
}

export function jobStatusTone(value: JobStatus) {
  if (value === "offer") {
    return "success" as const;
  }

  if (value === "rejected" || value === "expired") {
    return "danger" as const;
  }

  if (value === "interviewing") {
    return "accent" as const;
  }

  if (value === "applied") {
    return "primary" as const;
  }

  return "default" as const;
}

export function fitBandTone(value: JobFitBand | null) {
  if (value === "excellent" || value === "strong") {
    return "success" as const;
  }

  if (value === "rejected") {
    return "danger" as const;
  }

  return "accent" as const;
}

export function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function todayDateKey() {
  return toDateKey(new Date());
}

export function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return toDateKey(date);
}

export function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function formatShortDate(value?: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function formatLongDate(value?: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function commaList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function listText(value: string[]) {
  return value.join(", ");
}
