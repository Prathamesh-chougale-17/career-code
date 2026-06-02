"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Download, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useMemo } from "react";

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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import {
  jobStatusOptions,
  type JobFitBand,
  type JobRecord,
  type JobStatus,
} from "@careeright/domain/jobs/schema";
import { cn } from "../../lib/utils";

type JobDateSection = {
  dateKey: string;
  label: string;
  jobs: JobRecord[];
};

type JobMetadata = {
  jobUrl: string;
  companyUrl: string;
  applicants: string;
  seniority: string;
  employmentType: string;
  workMode: string;
  industry: string;
  posterName: string;
  posterUrl: string;
};

const jobStatusLabels = {
  not_applied: "Not applied",
  applied: "Applied",
  interviewing: "Interviewing",
  rejected: "Rejected",
  offer: "Offer",
  expired: "Expired",
} satisfies Record<JobStatus, string>;

const jobStatusRowClasses = {
  not_applied: "",
  applied: "bg-sky-500/10 hover:bg-sky-500/15",
  interviewing: "bg-amber-500/15 hover:bg-amber-500/20",
  rejected: "bg-rose-500/10 hover:bg-rose-500/15",
  offer: "bg-emerald-500/10 hover:bg-emerald-500/15",
  expired: "bg-zinc-500/10 text-muted-foreground hover:bg-zinc-500/15",
} satisfies Record<JobStatus, string>;

const jobFitBandLabels = {
  excellent: "Excellent",
  strong: "Strong",
  needs_review: "Needs review",
  rejected: "Rejected/hidden",
} satisfies Record<JobFitBand, string>;

const jobFitBandBadgeVariants = {
  excellent: "default",
  strong: "secondary",
  needs_review: "outline",
  rejected: "destructive",
} satisfies Record<JobFitBand, "default" | "secondary" | "outline" | "destructive">;

export function JobDateTable({
  section,
  updatingJobId,
  deletingJobIds,
  nowMs,
  exportingDateKey,
  onStatusChange,
  onDeleteJob,
  onDownloadJobs,
}: {
  section: JobDateSection;
  updatingJobId?: string;
  deletingJobIds: Set<string>;
  nowMs: number;
  exportingDateKey: string | null;
  onStatusChange: (jobId: string, status: JobStatus) => void;
  onDeleteJob: (job: JobRecord) => void;
  onDownloadJobs: (section: JobDateSection) => Promise<void>;
}) {
  const isExporting = exportingDateKey === section.dateKey;
  const isExportBlocked = isExporting || section.jobs.length === 0;
  const appliedCount = section.jobs.filter(
    (job) => job.status === "applied",
  ).length;
  const columns = useMemo<ColumnDef<JobRecord>[]>(
    () => [
      {
        id: "delete",
        header: () => <span className="sr-only">Delete</span>,
        cell: ({ row }) => {
          const job = row.original;
          const isDeleting = deletingJobIds.has(job.id);

          return (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    aria-label={`Delete ${job.title}`}
                    disabled={isDeleting}
                    onClick={() => onDeleteJob(job)}
                  >
                    {isDeleting ? (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    ) : (
                      <Trash2 aria-hidden="true" />
                    )}
                  </Button>
                }
              />
              <TooltipContent>Delete job</TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "applyUrl",
        header: "Apply",
        cell: ({ row }) => (
          <ExternalCellLink href={row.original.applyUrl}>Apply</ExternalCellLink>
        ),
      },
      {
        id: "jobUrl",
        header: "Job",
        cell: ({ row }) => {
          const metadata = jobMetadata(row.original);

          return <ExternalCellLink href={metadata.jobUrl}>Open</ExternalCellLink>;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const job = row.original;

          return (
            <Select
              value={job.status}
              disabled={updatingJobId === job.id}
              onValueChange={(value) =>
                onStatusChange(job.id, value as JobStatus)
              }
            >
              <SelectTrigger size="sm" className="min-w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {jobStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {jobStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          );
        },
      },
      {
        accessorKey: "title",
        header: "Role",
        cell: ({ row }) => {
          const job = row.original;

          return (
            <div className="flex min-w-64 max-w-96 flex-col gap-1.5">
              <span className="truncate font-medium">{job.title}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {job.fitScore === null ? null : (
                  <Badge variant="outline">Fit {job.fitScore}</Badge>
                )}
                {job.fitBand ? (
                  <Badge variant={jobFitBandBadgeVariants[job.fitBand]}>
                    {jobFitBandLabels[job.fitBand]}
                  </Badge>
                ) : null}
              </div>
              {job.fitReasons.length > 0 || job.riskFlags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {job.fitReasons.slice(0, 2).map((reason) => (
                    <Badge key={reason} variant="secondary">
                      {reason}
                    </Badge>
                  ))}
                  {job.riskFlags.slice(0, 1).map((flag) => (
                    <Badge key={flag} variant="destructive">
                      {flag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        accessorKey: "company",
        header: "Company",
        cell: ({ row }) => (
          <span className="block max-w-48 truncate">
            {optionalText(row.original.company)}
          </span>
        ),
      },
      {
        id: "companyUrl",
        header: "Company link",
        cell: ({ row }) => {
          const metadata = jobMetadata(row.original);

          return (
            <ExternalCellLink href={metadata.companyUrl}>Open</ExternalCellLink>
          );
        },
      },
      {
        accessorKey: "location",
        header: "Location",
        cell: ({ row }) => (
          <span className="block max-w-56 truncate">
            {optionalText(row.original.location)}
          </span>
        ),
      },
      {
        id: "applicants",
        header: "Applicants",
        cell: ({ row }) => {
          const metadata = jobMetadata(row.original);

          return optionalText(metadata.applicants);
        },
      },
      {
        id: "seniority",
        header: "Seniority",
        cell: ({ row }) => {
          const metadata = jobMetadata(row.original);

          return (
            <span className="block max-w-40 truncate">
              {optionalText(metadata.seniority)}
            </span>
          );
        },
      },
      {
        id: "employmentType",
        header: "Type",
        cell: ({ row }) => {
          const metadata = jobMetadata(row.original);

          return (
            <span className="block max-w-40 truncate">
              {optionalText(metadata.employmentType)}
            </span>
          );
        },
      },
      {
        id: "workMode",
        header: "Work",
        cell: ({ row }) => {
          const metadata = jobMetadata(row.original);

          return (
            <span className="block max-w-40 truncate">
              {optionalText(metadata.workMode)}
            </span>
          );
        },
      },
      {
        id: "industry",
        header: "Industry",
        cell: ({ row }) => {
          const metadata = jobMetadata(row.original);

          return (
            <span className="block max-w-56 truncate">
              {optionalText(metadata.industry)}
            </span>
          );
        },
      },
      {
        id: "poster",
        header: "Poster",
        cell: ({ row }) => {
          const metadata = jobMetadata(row.original);

          if (metadata.posterUrl) {
            return (
              <ExternalCellLink href={metadata.posterUrl}>
                {metadata.posterName || "Profile"}
              </ExternalCellLink>
            );
          }

          return (
            <span className="block max-w-44 truncate">
              {optionalText(metadata.posterName)}
            </span>
          );
        },
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.source}</Badge>
        ),
      },
      {
        accessorKey: "postedAt",
        header: "Posted",
        cell: ({ row }) => (
          <span title={optionalText(row.original.postedAt)}>
            {formatRelativePostedAt(row.original.postedAt, nowMs)}
          </span>
        ),
      },
      {
        accessorKey: "salary",
        header: "Salary",
        cell: ({ row }) => (
          <span className="block max-w-48 truncate">
            {optionalText(row.original.salary)}
          </span>
        ),
      },
    ],
    [deletingJobIds, nowMs, onDeleteJob, onStatusChange, updatingJobId],
  );

  const table = useReactTable({
    data: section.jobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card size="sm" className="lg:h-[calc(100svh-13rem)]">
      <CardHeader>
        <CardTitle>{section.label}</CardTitle>
        <CardDescription>
          Jobs seeded into Careeright on this date.
        </CardDescription>
        <CardAction className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="secondary">
            Applied {appliedCount}/{section.jobs.length}
          </Badge>
          <Badge variant="outline">
            {section.jobs.length} {section.jobs.length === 1 ? "job" : "jobs"}
          </Badge>
          <Button
            type="button"
            size="sm"
            disabled={isExportBlocked}
            onClick={() => void onDownloadJobs(section)}
          >
            {isExporting ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Download data-icon="inline-start" aria-hidden="true" />
            )}
            Excel
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 overflow-hidden">
        <Table containerClassName="h-full overflow-auto">
          <TableHeader className="sticky top-0 bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={cn(jobStatusRowClasses[row.original.status])}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ExternalCellLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  if (!href) {
    return <span className="text-sm text-muted-foreground">Missing</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      <ExternalLink data-icon="inline-start" aria-hidden="true" />
      {children}
    </a>
  );
}

function optionalText(value: string, fallback = "Not listed") {
  return value.trim() || fallback;
}

function pluralize(value: number, unit: string) {
  return `${value} ${unit}${value === 1 ? "" : "s"}`;
}

function parsePostedDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const numericValue = Number(trimmed);

  if (Number.isFinite(numericValue) && numericValue > 0) {
    const timestamp =
      numericValue < 10_000_000_000 ? numericValue * 1000 : numericValue;
    const numericDate = new Date(timestamp);

    if (!Number.isNaN(numericDate.getTime())) {
      return numericDate;
    }
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatRelativePostedAt(value: string, nowMs = Date.now()) {
  const postedDate = parsePostedDate(value);

  if (!postedDate) {
    return optionalText(value);
  }

  const diffMs = nowMs - postedDate.getTime();
  const isFuture = diffMs < 0;
  const absoluteSeconds = Math.max(0, Math.round(Math.abs(diffMs) / 1000));

  if (absoluteSeconds < 45) {
    return isFuture ? "soon" : "just now";
  }

  const absoluteMinutes = Math.round(absoluteSeconds / 60);
  const absoluteHours = Math.round(absoluteMinutes / 60);
  const absoluteDays = Math.round(absoluteHours / 24);
  const absoluteWeeks = Math.round(absoluteDays / 7);
  const absoluteMonths = Math.round(absoluteDays / 30);
  const absoluteYears = Math.round(absoluteDays / 365);
  const relativeLabel =
    absoluteMinutes < 60
      ? pluralize(absoluteMinutes, "min")
      : absoluteHours < 24
        ? pluralize(absoluteHours, "hr")
        : absoluteDays < 7
          ? pluralize(absoluteDays, "day")
          : absoluteWeeks < 5
            ? pluralize(absoluteWeeks, "week")
            : absoluteMonths < 12
              ? pluralize(absoluteMonths, "month")
              : pluralize(absoluteYears, "year");

  return isFuture ? `in ${relativeLabel}` : `${relativeLabel} ago`;
}

function stringValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return "";
}

function listValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(stringValue).filter(Boolean).join(", ");
  }

  return stringValue(value);
}

function firstRawString(raw: JobRecord["raw"], keys: string[]) {
  for (const key of keys) {
    const value = stringValue(raw[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

function firstRawList(raw: JobRecord["raw"], keys: string[]) {
  for (const key of keys) {
    const value = listValue(raw[key]);

    if (value) {
      return value;
    }
  }

  return "";
}

function isSafeExternalUrl(value: string) {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function firstRawUrl(raw: JobRecord["raw"], keys: string[]) {
  for (const key of keys) {
    const value = stringValue(raw[key]);

    if (value && isSafeExternalUrl(value)) {
      return value;
    }
  }

  return "";
}

function jobMetadata(job: JobRecord): JobMetadata {
  const raw = job.raw;
  const workMode = firstRawList(raw, [
    "workplaceTypes",
    "workType",
    "work_type",
    "remote",
    "work_schedule",
  ]);
  const remoteAllowed =
    typeof raw.workRemoteAllowed === "boolean"
      ? raw.workRemoteAllowed
      : typeof raw.work_remote_allowed === "boolean"
        ? raw.work_remote_allowed
        : false;

  return {
    jobUrl: firstRawUrl(raw, [
      "jobUrl",
      "job_url",
      "link",
      "url",
      "inputUrl",
    ]),
    companyUrl: firstRawUrl(raw, [
      "companyUrl",
      "company_url",
      "companyLinkedinUrl",
      "company_linkedin_url",
      "companyWebsite",
      "company_website",
    ]),
    applicants: firstRawString(raw, [
      "applicantsCount",
      "applicationsCount",
      "num_applicants",
      "applicants_count",
    ]),
    seniority: firstRawString(raw, [
      "seniorityLevel",
      "seniority_level",
      "experienceLevel",
      "experience_level",
    ]),
    employmentType: firstRawString(raw, [
      "employmentType",
      "employment_type",
      "contractType",
      "contract_type",
      "jobType",
      "job_type",
    ]),
    workMode: workMode || (remoteAllowed ? "Remote allowed" : ""),
    industry: firstRawList(raw, [
      "industries",
      "industry",
      "sector",
      "jobFunction",
      "job_function",
    ]),
    posterName: firstRawString(raw, [
      "jobPosterName",
      "job_poster_name",
      "posterFullName",
      "poster_full_name",
      "recruiterName",
      "recruiter_name",
      "postedBy",
      "posted_by",
      "posterName",
      "poster_name",
    ]),
    posterUrl: firstRawUrl(raw, [
      "jobPosterProfileUrl",
      "job_poster_profile_url",
      "posterProfileUrl",
      "poster_profile_url",
      "recruiterUrl",
      "recruiter_url",
      "recruiterLinkedinUrl",
      "recruiter_linkedin_url",
    ]),
  };
}
