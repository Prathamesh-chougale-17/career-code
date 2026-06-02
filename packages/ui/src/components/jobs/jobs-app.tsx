"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  Loader2,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import {
  Suspense,
  lazy,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
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
import { Input } from "../ui/input";
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
import {
  jobFitBandOptions,
  jobStatusOptions,
  type JobDigest,
  type JobFitBand,
  type JobRecord,
  type JobSearchProfile,
  type JobSearchProfileInput,
  type JobStatus,
} from "@careeright/domain/jobs/schema";
import { useCareerightUi } from "../../providers/careeright-ui-provider";
import {
  dashboardAnalyticsQueryKey,
  jobDigestsQueryKey,
  jobSearchProfileQueryKey,
  jobsQueryKey,
} from "@careeright/api/query-keys";
import { scheduleIdleTask } from "../../lib/schedule-idle-task";
import { cn } from "../../lib/utils";

type JobDateSection = {
  dateKey: string;
  label: string;
  jobs: JobRecord[];
};

type JobsSortMode = "fit_score" | "status";
type StatusFilter = JobStatus | "all";
type FitBandFilter = JobFitBand | "all";

type JobSearchProfileDraft = {
  targetRoles: string;
  primarySkills: string;
  secondarySkills: string;
  locations: string;
  experienceLevel: string;
  companyPreferences: string;
  excludedKeywords: string;
  minimumFitScore: string;
  maxSeededPerRun: string;
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

const JobDateTable = lazy(() =>
  import("./jobs-date-table.js").then((module) => ({
    default: module.JobDateTable,
  })),
);

const jobStatusLabels = {
  not_applied: "Not applied",
  applied: "Applied",
  interviewing: "Interviewing",
  rejected: "Rejected",
  offer: "Offer",
  expired: "Expired",
} satisfies Record<JobStatus, string>;

const jobStatusRank = new Map<JobStatus, number>(
  jobStatusOptions.map((status, index) => [status, index]),
);

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
} satisfies Record<
  JobFitBand,
  "default" | "secondary" | "outline" | "destructive"
>;

const seededDateFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "full",
  timeZone: "UTC",
});

const jobDigestDateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
});

const jobSearchTextCache = new WeakMap<JobRecord, string>();

function seededDateKey(seededAt: string) {
  return seededAt.slice(0, 10);
}

function formatSeededDate(dateKey: string) {
  return seededDateFormatter.format(new Date(`${dateKey}T00:00:00.000Z`));
}

function formatDigestDateTime(value: string) {
  return jobDigestDateTimeFormatter.format(new Date(value));
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
    jobUrl: firstRawUrl(raw, ["jobUrl", "job_url", "link", "url", "inputUrl"]),
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

function compareJobFallback(a: JobRecord, b: JobRecord) {
  const seededSort = b.seededAt.localeCompare(a.seededAt);

  if (seededSort !== 0) {
    return seededSort;
  }

  const updatedSort = b.updatedAt.localeCompare(a.updatedAt);

  if (updatedSort !== 0) {
    return updatedSort;
  }

  return a.title.localeCompare(b.title);
}

function compareJobsByFitScore(a: JobRecord, b: JobRecord) {
  const scoreSort =
    (b.fitScore ?? Number.NEGATIVE_INFINITY) -
    (a.fitScore ?? Number.NEGATIVE_INFINITY);

  if (scoreSort !== 0) {
    return scoreSort;
  }

  return compareJobFallback(a, b);
}

function compareJobsByStatus(a: JobRecord, b: JobRecord) {
  const statusSort =
    (jobStatusRank.get(a.status) ?? 0) - (jobStatusRank.get(b.status) ?? 0);

  if (statusSort !== 0) {
    return statusSort;
  }

  return compareJobsByFitScore(a, b);
}

function sortJobs(jobs: JobRecord[], sortMode: JobsSortMode) {
  return [...jobs].sort((a, b) =>
    sortMode === "status"
      ? compareJobsByStatus(a, b)
      : compareJobsByFitScore(a, b),
  );
}

function searchValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(searchValue).join(" ");
  }

  if (typeof value === "object") {
    return Object.values(value).map(searchValue).join(" ");
  }

  return "";
}

function jobSearchText(job: JobRecord) {
  const cachedText = jobSearchTextCache.get(job);

  if (cachedText !== undefined) {
    return cachedText;
  }

  const metadata = jobMetadata(job);

  const searchableText = [
    job.title,
    job.company,
    job.location,
    job.source,
    job.sourceJobId,
    jobStatusLabels[job.status],
    job.status.replace(/_/g, " "),
    job.postedAt,
    job.salary,
    job.description,
    job.fitScore,
    ...Object.values(metadata),
    searchValue(job.raw),
  ]
    .join(" ")
    .toLowerCase();

  jobSearchTextCache.set(job, searchableText);
  return searchableText;
}

function matchesJobSearch(job: JobRecord, query: string) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);

  if (terms.length === 0) {
    return true;
  }

  const searchableText = jobSearchText(job);
  return terms.every((term) => searchableText.includes(term));
}

function sanitizeFilePart(value: string) {
  return (
    value
      .toLowerCase()
      .split("")
      .map((character) =>
        character.charCodeAt(0) < 32 || '<>:"/\\|?*'.includes(character)
          ? "-"
          : character,
      )
      .join("")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "jobs"
  );
}

function safeWorksheetName(value: string) {
  return (
    value
      .split("")
      .map((character) => ("[]*?:/\\".includes(character) ? " " : character))
      .join("")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 31) || "Jobs"
  );
}

function jobsToExcelRows(section: JobDateSection, nowMs: number) {
  return section.jobs.map((job) => {
    const metadata = jobMetadata(job);

    return {
      Role: job.title,
      Company: job.company,
      Status: jobStatusLabels[job.status],
      Location: job.location,
      "Fit score": job.fitScore ?? "",
      Posted: formatRelativePostedAt(job.postedAt, nowMs),
      "Posted value": job.postedAt,
      Salary: job.salary,
      Applicants: metadata.applicants,
      Seniority: metadata.seniority,
      Type: metadata.employmentType,
      Work: metadata.workMode,
      Industry: metadata.industry,
      Poster: metadata.posterName,
      Source: job.source,
      "Source job ID": job.sourceJobId,
      "Fit band": job.fitBand ? jobFitBandLabels[job.fitBand] : "",
      "Fit reasons": job.fitReasons.join("; "),
      "Matched skills": job.matchedSkills.join(", "),
      "Missing skills": job.missingSkills.join(", "),
      "Risk flags": job.riskFlags.join("; "),
      "Apply URL": job.applyUrl,
      "Job URL": metadata.jobUrl,
      "Company URL": metadata.companyUrl,
      "Poster URL": metadata.posterUrl,
      "Seeded date": section.label,
      "Seeded at": job.seededAt,
      "Updated at": job.updatedAt,
      Description: job.description,
    };
  });
}

async function downloadJobsExcel(section: JobDateSection, nowMs: number) {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet(jobsToExcelRows(section, nowMs));

  worksheet["!cols"] = [
    { wch: 34 },
    { wch: 24 },
    { wch: 16 },
    { wch: 24 },
    { wch: 10 },
    { wch: 14 },
    { wch: 20 },
    { wch: 18 },
    { wch: 12 },
    { wch: 16 },
    { wch: 18 },
    { wch: 16 },
    { wch: 24 },
    { wch: 18 },
    { wch: 14 },
    { wch: 22 },
    { wch: 14 },
    { wch: 44 },
    { wch: 32 },
    { wch: 32 },
    { wch: 44 },
    { wch: 44 },
    { wch: 44 },
    { wch: 44 },
    { wch: 44 },
    { wch: 28 },
    { wch: 24 },
    { wch: 24 },
    { wch: 80 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    safeWorksheetName(section.dateKey),
  );
  XLSX.writeFile(
    workbook,
    `${sanitizeFilePart(`careeright-jobs-${section.dateKey}`)}.xlsx`,
    { compression: true },
  );
}

function groupJobsBySeededDate(
  jobs: JobRecord[],
  sortMode: JobsSortMode,
): JobDateSection[] {
  const grouped = new Map<string, JobRecord[]>();

  for (const job of jobs) {
    const dateKey = seededDateKey(job.seededAt);
    const sectionJobs = grouped.get(dateKey);

    if (sectionJobs) {
      sectionJobs.push(job);
    } else {
      grouped.set(dateKey, [job]);
    }
  }

  return Array.from(grouped, ([dateKey, sectionJobs]) => ({
    dateKey,
    label: formatSeededDate(dateKey),
    jobs: sortJobs(sectionJobs, sortMode),
  })).sort((a, b) => b.dateKey.localeCompare(a.dateKey));
}

function listToCsv(values: string[]) {
  return values.join(", ");
}

function csvToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function draftFromSearchProfile(
  profile?: JobSearchProfile,
): JobSearchProfileDraft {
  return {
    targetRoles: listToCsv(profile?.targetRoles ?? []),
    primarySkills: listToCsv(profile?.primarySkills ?? []),
    secondarySkills: listToCsv(profile?.secondarySkills ?? []),
    locations: listToCsv(profile?.locations ?? []),
    experienceLevel: profile?.experienceLevel ?? "",
    companyPreferences: listToCsv(profile?.companyPreferences ?? []),
    excludedKeywords: listToCsv(profile?.excludedKeywords ?? []),
    minimumFitScore: String(profile?.minimumFitScore ?? 75),
    maxSeededPerRun: String(profile?.maxSeededPerRun ?? 25),
  };
}

function inputFromSearchProfileDraft(
  draft: JobSearchProfileDraft,
): JobSearchProfileInput {
  return {
    targetRoles: csvToList(draft.targetRoles),
    primarySkills: csvToList(draft.primarySkills),
    secondarySkills: csvToList(draft.secondarySkills),
    locations: csvToList(draft.locations),
    experienceLevel: draft.experienceLevel.trim(),
    companyPreferences: csvToList(draft.companyPreferences),
    excludedKeywords: csvToList(draft.excludedKeywords),
    minimumFitScore: Number(draft.minimumFitScore),
    maxSeededPerRun: Number(draft.maxSeededPerRun),
  };
}

export function JobsApp({
  initialJobs,
  initialSearchProfile,
  initialDigests,
}: {
  initialJobs?: JobRecord[];
  initialSearchProfile?: JobSearchProfile;
  initialDigests?: JobDigest[];
}) {
  const { rpcClient } = useCareerightUi();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [fitBandFilter, setFitBandFilter] = useState<FitBandFilter>("all");
  const [sortMode, setSortMode] = useState<JobsSortMode>("fit_score");
  const [searchProfileDraft, setSearchProfileDraft] =
    useState<JobSearchProfileDraft>(() =>
      draftFromSearchProfile(initialSearchProfile),
    );
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [shouldLoadDigests, setShouldLoadDigests] = useState(
    initialDigests !== undefined,
  );
  const [deleteJobTarget, setDeleteJobTarget] = useState<JobRecord | null>(
    null,
  );
  const [exportingDateKey, setExportingDateKey] = useState<string | null>(null);
  const [pendingDeleteJobIds, setPendingDeleteJobIds] = useState<Set<string>>(
    () => new Set(),
  );
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const queryClient = useQueryClient();
  const jobsQuery = useQuery({
    queryKey: jobsQueryKey,
    queryFn: () => rpcClient.jobs.list(),
    initialData: initialJobs,
    notifyOnChangeProps: ["data", "isPending", "isError"],
    staleTime: 60_000,
  });
  const searchProfileQuery = useQuery({
    queryKey: jobSearchProfileQueryKey,
    queryFn: () => rpcClient.jobs.searchProfile(),
    initialData: initialSearchProfile,
    notifyOnChangeProps: ["data", "isPending"],
    staleTime: 60_000,
  });
  const digestsQuery = useQuery({
    queryKey: jobDigestsQueryKey,
    queryFn: () => rpcClient.jobs.digests(),
    enabled: shouldLoadDigests,
    initialData: initialDigests,
    notifyOnChangeProps: ["data", "isPending"],
    staleTime: 60_000,
  });

  useEffect(() => {
    if (shouldLoadDigests) {
      return;
    }

    return scheduleIdleTask(() => setShouldLoadDigests(true), {
      fallbackDelay: 500,
      timeout: 1500,
    });
  }, [shouldLoadDigests]);

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (searchProfileQuery.data) {
      const timeoutId = window.setTimeout(() => {
        setSearchProfileDraft(draftFromSearchProfile(searchProfileQuery.data));
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [searchProfileQuery.data]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: JobStatus }) =>
      rpcClient.jobs.updateStatus({ jobId, status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: dashboardAnalyticsQueryKey,
      });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) => rpcClient.jobs.delete({ jobId }),
    onMutate: (jobId) => {
      setPendingDeleteJobIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.add(jobId);
        return nextIds;
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: jobsQueryKey });
      void queryClient.invalidateQueries({
        queryKey: dashboardAnalyticsQueryKey,
      });
    },
    onSettled: (_data, _error, jobId) => {
      setPendingDeleteJobIds((currentIds) => {
        const nextIds = new Set(currentIds);
        nextIds.delete(jobId);
        return nextIds;
      });
    },
  });
  const updateSearchProfileMutation = useMutation({
    mutationFn: (input: JobSearchProfileInput) =>
      rpcClient.jobs.updateSearchProfile(input),
    onSuccess: (profile) => {
      setSearchProfileDraft(draftFromSearchProfile(profile));
      void queryClient.invalidateQueries({
        queryKey: jobSearchProfileQueryKey,
      });
    },
  });

  const onStatusChange = useCallback(
    (jobId: string, status: JobStatus) => {
      updateStatusMutation.mutate({ jobId, status });
    },
    [updateStatusMutation],
  );

  const onRequestDeleteJob = useCallback((job: JobRecord) => {
    setDeleteJobTarget(job);
  }, []);

  const onConfirmDeleteJob = useCallback(() => {
    if (!deleteJobTarget) {
      return;
    }

    const jobId = deleteJobTarget.id;
    setDeleteJobTarget(null);
    deleteJobMutation.mutate(jobId);
  }, [deleteJobMutation, deleteJobTarget]);

  const onDeleteJobDialogOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDeleteJobTarget(null);
    }
  }, []);

  const onDownloadJobs = useCallback(
    async (section: JobDateSection) => {
      setExportingDateKey(section.dateKey);

      try {
        await downloadJobsExcel(section, nowMs);
      } catch (error) {
        console.error("[jobs/export] Failed to export jobs.", error);
        window.alert("Could not download the Excel file. Please try again.");
      } finally {
        setExportingDateKey(null);
      }
    },
    [nowMs],
  );
  const onSaveSearchProfile = useCallback(() => {
    updateSearchProfileMutation.mutate(
      inputFromSearchProfileDraft(searchProfileDraft),
    );
  }, [searchProfileDraft, updateSearchProfileMutation]);

  const deleteJobTitle = deleteJobTarget?.title ?? "this job";
  const deleteDialogPending = deleteJobTarget
    ? pendingDeleteJobIds.has(deleteJobTarget.id)
    : false;

  const jobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const digests = useMemo(() => digestsQuery.data ?? [], [digestsQuery.data]);
  const filteredJobs = useMemo(() => {
    const statusJobs =
      statusFilter === "all"
        ? jobs
        : jobs.filter((job) => job.status === statusFilter);
    const fitJobs =
      fitBandFilter === "all"
        ? statusJobs
        : statusJobs.filter((job) => job.fitBand === fitBandFilter);

    return deferredSearchQuery.trim()
      ? fitJobs.filter((job) => matchesJobSearch(job, deferredSearchQuery))
      : fitJobs;
  }, [deferredSearchQuery, fitBandFilter, jobs, statusFilter]);
  const sections = useMemo(
    () => groupJobsBySeededDate(filteredJobs, sortMode),
    [filteredJobs, sortMode],
  );

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="h-5" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">Jobs</p>
          <p className="truncate text-xs text-muted-foreground">
            MCP-seeded opportunities grouped by the date they entered Careeright
          </p>
        </div>
      </header>

      <main className="w-full min-w-0 max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col gap-5">
          {jobsQuery.isPending ? (
            <JobsSkeleton />
          ) : jobsQuery.isError ? (
            <Empty className="min-h-[360px] border border-border bg-background">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Briefcase aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>Could not load jobs</EmptyTitle>
                <EmptyDescription>
                  Refresh the page and try again. The tracker keeps seeded jobs
                  scoped to your account.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <JobSearchSettingsCard
                draft={searchProfileDraft}
                isLoading={searchProfileQuery.isPending}
                isSaving={updateSearchProfileMutation.isPending}
                onDraftChange={(patch) =>
                  setSearchProfileDraft((currentDraft) => ({
                    ...currentDraft,
                    ...patch,
                  }))
                }
                onSave={onSaveSearchProfile}
              />
              <JobDigestSummary
                digests={digests}
                isLoading={digestsQuery.isPending}
              />
              {jobs.length === 0 ? (
                <Empty className="min-h-[360px] border border-border bg-background">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Briefcase aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No jobs seeded yet</EmptyTitle>
                    <EmptyDescription>
                      External MCP apps can call seed_ranked_jobs to add
                      profile-scored opportunities to this tracker.
                    </EmptyDescription>
                  </EmptyHeader>
                </Empty>
              ) : (
                <>
                  <JobsTableControls
                    statusFilter={statusFilter}
                    fitBandFilter={fitBandFilter}
                    searchQuery={searchQuery}
                    sortMode={sortMode}
                    filteredCount={filteredJobs.length}
                    totalCount={jobs.length}
                    onSearchQueryChange={setSearchQuery}
                    onStatusFilterChange={setStatusFilter}
                    onFitBandFilterChange={setFitBandFilter}
                    onSortModeChange={setSortMode}
                  />
                  {sections.length === 0 ? (
                    <Empty className="min-h-[280px] border border-border bg-background">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <Briefcase aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>No jobs match these filters</EmptyTitle>
                        <EmptyDescription>
                          Try another search or change the status filter to show
                          more seeded jobs.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  ) : (
                    sections.map((section) => (
                      <Suspense
                        key={section.dateKey}
                        fallback={<JobDateTableFallback />}
                      >
                        <JobDateTable
                          section={section}
                          updatingJobId={
                            updateStatusMutation.isPending
                              ? updateStatusMutation.variables?.jobId
                              : undefined
                          }
                          deletingJobIds={pendingDeleteJobIds}
                          nowMs={nowMs}
                          exportingDateKey={exportingDateKey}
                          onStatusChange={onStatusChange}
                          onDeleteJob={onRequestDeleteJob}
                          onDownloadJobs={onDownloadJobs}
                        />
                      </Suspense>
                    ))
                  )}
                </>
              )}
            </>
          )}
        </div>
      </main>

      <AlertDialog
        open={Boolean(deleteJobTarget)}
        onOpenChange={onDeleteJobDialogOpenChange}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete job?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{deleteJobTitle}&quot; from your jobs list.
              The record is soft deleted and kept in storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDialogPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={deleteDialogPending}
              onClick={onConfirmDeleteJob}
            >
              <Trash2 data-icon="inline-start" aria-hidden="true" />
              Delete job
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function JobsTableControls({
  statusFilter,
  fitBandFilter,
  searchQuery,
  sortMode,
  filteredCount,
  totalCount,
  onSearchQueryChange,
  onStatusFilterChange,
  onFitBandFilterChange,
  onSortModeChange,
}: {
  statusFilter: StatusFilter;
  fitBandFilter: FitBandFilter;
  searchQuery: string;
  sortMode: JobsSortMode;
  filteredCount: number;
  totalCount: number;
  onSearchQueryChange: (query: string) => void;
  onStatusFilterChange: (status: StatusFilter) => void;
  onFitBandFilterChange: (fitBand: FitBandFilter) => void;
  onSortModeChange: (sortMode: JobsSortMode) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative min-w-0 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search role, company, status, location, source..."
          aria-label="Search jobs"
          className="px-9"
        />
        {searchQuery ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute right-1.5 top-1/2 -translate-y-1/2"
            aria-label="Clear job search"
            onClick={() => onSearchQueryChange("")}
          >
            <X aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Status
          </span>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              onStatusFilterChange(value as StatusFilter)
            }
          >
            <SelectTrigger size="sm" className="min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All statuses</SelectItem>
                {jobStatusOptions.map((status) => (
                  <SelectItem key={status} value={status}>
                    {jobStatusLabels[status]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Fit</span>
          <Select
            value={fitBandFilter}
            onValueChange={(value) =>
              onFitBandFilterChange(value as FitBandFilter)
            }
          >
            <SelectTrigger size="sm" className="min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All fit bands</SelectItem>
                {jobFitBandOptions.map((fitBand) => (
                  <SelectItem key={fitBand} value={fitBand}>
                    {jobFitBandLabels[fitBand]}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            Sort
          </span>
          <Select
            value={sortMode}
            onValueChange={(value) => onSortModeChange(value as JobsSortMode)}
          >
            <SelectTrigger size="sm" className="min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="fit_score">Fit score</SelectItem>
                <SelectItem value="status">Status</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="secondary">
          {filteredCount} of {totalCount} {totalCount === 1 ? "job" : "jobs"}
        </Badge>
      </div>
    </div>
  );
}

function JobSearchSettingsCard({
  draft,
  isLoading,
  isSaving,
  onDraftChange,
  onSave,
}: {
  draft: JobSearchProfileDraft;
  isLoading: boolean;
  isSaving: boolean;
  onDraftChange: (patch: Partial<JobSearchProfileDraft>) => void;
  onSave: () => void;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 aria-hidden="true" />
          Job search settings
        </CardTitle>
        <CardDescription>
          Profile-derived preferences used by MCP automation and ranked seeding.
        </CardDescription>
        <CardAction>
          <Button
            type="button"
            size="sm"
            disabled={isLoading || isSaving}
            onClick={onSave}
          >
            {isSaving ? (
              <Loader2
                data-icon="inline-start"
                className="animate-spin"
                aria-hidden="true"
              />
            ) : null}
            Save
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-3 lg:grid-cols-4">
        <JobSettingsInput
          label="Target roles"
          value={draft.targetRoles}
          onChange={(value) => onDraftChange({ targetRoles: value })}
        />
        <JobSettingsInput
          label="Primary skills"
          value={draft.primarySkills}
          onChange={(value) => onDraftChange({ primarySkills: value })}
        />
        <JobSettingsInput
          label="Secondary skills"
          value={draft.secondarySkills}
          onChange={(value) => onDraftChange({ secondarySkills: value })}
        />
        <JobSettingsInput
          label="Locations"
          value={draft.locations}
          onChange={(value) => onDraftChange({ locations: value })}
        />
        <JobSettingsInput
          label="Experience"
          value={draft.experienceLevel}
          onChange={(value) => onDraftChange({ experienceLevel: value })}
        />
        <JobSettingsInput
          label="Company preferences"
          value={draft.companyPreferences}
          onChange={(value) => onDraftChange({ companyPreferences: value })}
        />
        <JobSettingsInput
          label="Excluded keywords"
          value={draft.excludedKeywords}
          onChange={(value) => onDraftChange({ excludedKeywords: value })}
        />
        <div className="grid grid-cols-2 gap-3">
          <JobSettingsInput
            label="Min score"
            type="number"
            value={draft.minimumFitScore}
            onChange={(value) => onDraftChange({ minimumFitScore: value })}
          />
          <JobSettingsInput
            label="Max/run"
            type="number"
            value={draft.maxSeededPerRun}
            onChange={(value) => onDraftChange({ maxSeededPerRun: value })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function JobSettingsInput({
  label,
  value,
  type = "text",
  onChange,
}: {
  label: string;
  value: string;
  type?: "text" | "number";
  onChange: (value: string) => void;
}) {
  const id = `job-setting-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <label htmlFor={id} className="grid gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Input
        id={id}
        type={type}
        value={value}
        min={type === "number" ? 0 : undefined}
        max={type === "number" ? 100 : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function JobDigestSummary({
  digests,
  isLoading,
}: {
  digests: JobDigest[];
  isLoading: boolean;
}) {
  const latestDigest = digests[0];

  if (isLoading) {
    return <Skeleton className="h-28 rounded-lg" />;
  }

  if (!latestDigest) {
    return (
      <Card size="sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles aria-hidden="true" />
            Daily curation
          </CardTitle>
          <CardDescription>
            Ranked MCP runs will appear here after seed_ranked_jobs completes.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles aria-hidden="true" />
          Daily curation
        </CardTitle>
        <CardDescription>
          Latest run from {latestDigest.source} at{" "}
          {formatDigestDateTime(latestDigest.createdAt)}
        </CardDescription>
        <CardAction className="flex flex-wrap justify-end gap-2">
          <Badge variant="secondary">Seeded {latestDigest.seededCount}</Badge>
          <Badge variant="outline">
            Duplicates {latestDigest.duplicateCount}
          </Badge>
          <Badge variant="outline">Rejected {latestDigest.rejectedCount}</Badge>
        </CardAction>
      </CardHeader>
      {latestDigest.topMatches.length > 0 ? (
        <CardContent className="flex flex-wrap gap-2">
          {latestDigest.topMatches.slice(0, 5).map((match) => (
            <Badge
              key={`${match.title}-${match.company}-${match.applyUrl}`}
              variant={
                match.fitBand
                  ? jobFitBandBadgeVariants[match.fitBand]
                  : "outline"
              }
              className="max-w-full"
            >
              {match.fitScore ?? "Unscored"} · {match.title} · {match.company}
            </Badge>
          ))}
        </CardContent>
      ) : null}
    </Card>
  );
}

function JobDateTableFallback() {
  return (
    <Card size="sm" className="lg:h-[calc(100svh-13rem)]">
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

function JobsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-background px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <Skeleton className="h-10 min-w-0 flex-1 rounded-md" />
        <div className="flex flex-wrap items-center gap-3 lg:shrink-0 lg:justify-end">
          <Skeleton className="h-9 w-44 rounded-md" />
          <Skeleton className="h-9 w-40 rounded-md" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>

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
    </div>
  );
}
