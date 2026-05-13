import { FlashList } from "@shopify/flash-list";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase,
  ExternalLink,
  PlayCircle,
  Search,
  Trash2,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  LoadingState,
  ScreenHeader,
  ScreenScroll,
  SectionTitle,
  SegmentedControl,
      StatCard,
  TextField,
  spacing,
} from "@/components/ui";
import { rpcClient } from "@/lib/api";
import { successImpact, warningImpact } from "@/lib/haptics";
import {
  commaList,
  fitBandTone,
  formatLongDate,
  jobStatusLabel,
  jobStatusOptions,
  jobStatusTone,
  listText,
  titleCase,
} from "@/lib/labels";
import { openExternalUrl } from "@/lib/open-url";
import { useAppTheme } from "@/lib/theme";
import {
  dashboardAnalyticsQueryKey,
  jobApplicationRunsQueryKey,
  jobDigestsQueryKey,
  jobSearchProfileQueryKey,
  jobsQueryKey,
} from "@careeright/api/query-keys";
import type {
  JobRecord,
  JobSearchProfile,
  JobStatus,
} from "@careeright/domain/jobs/schema";

type JobsView = "jobs" | "profile" | "runs";
type SearchProfileDraft = {
  companyPreferences: string;
  excludedKeywords: string;
  experienceLevel: string;
  locations: string;
  maxSeededPerRun: string;
  minimumFitScore: string;
  primarySkills: string;
  secondarySkills: string;
  targetRoles: string;
};

export default function JobsScreen() {
  const { colors } = useAppTheme();
  const [view, setView] = useState<JobsView>("jobs");

  if (view === "profile") {
    return <JobProfileView onBack={() => setView("jobs")} view={view} setView={setView} />;
  }

  if (view === "runs") {
    return <JobRunsView view={view} setView={setView} />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <JobsListView view={view} setView={setView} />
    </View>
  );
}

function JobsListView({
  setView,
  view,
}: {
  setView: (view: JobsView) => void;
  view: JobsView;
}) {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const jobsQuery = useQuery({
    queryKey: jobsQueryKey,
    queryFn: () => rpcClient.jobs.list(),
  });

  const jobs = useMemo(() => jobsQuery.data ?? [], [jobsQuery.data]);
  const filteredJobs = useMemo(() => {
    const needle = searchText.trim().toLowerCase();

    return jobs.filter((job) => {
      const matchesStatus = statusFilter === "all" || job.status === statusFilter;
      const matchesText =
        needle.length === 0 ||
        [job.title, job.company, job.location, job.source]
          .join(" ")
          .toLowerCase()
          .includes(needle);

      return matchesStatus && matchesText;
    });
  }, [jobs, searchText, statusFilter]);

  const invalidateJobs = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: jobsQueryKey }),
      queryClient.invalidateQueries({ queryKey: dashboardAnalyticsQueryKey }),
    ]);
  };

  const updateStatusMutation = useMutation({
    mutationFn: ({ jobId, status }: { jobId: string; status: JobStatus }) =>
      rpcClient.jobs.updateStatus({ jobId, status }),
    onError: (error) => {
      Alert.alert(
        "Could not update job",
        error instanceof Error ? error.message : "Please try again.",
      );
    },
    onSuccess: async () => {
      successImpact();
      await invalidateJobs();
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) => rpcClient.jobs.delete({ jobId }),
    onError: (error) => {
      Alert.alert(
        "Could not delete job",
        error instanceof Error ? error.message : "Please try again.",
      );
    },
    onSuccess: async () => {
      warningImpact();
      await invalidateJobs();
    },
  });

  function chooseStatus(job: JobRecord) {
    Alert.alert(
      "Update status",
      `${job.company} - ${job.title}`,
      [
        ...jobStatusOptions.map((option) => ({
          onPress: () =>
            updateStatusMutation.mutate({
              jobId: job.id,
              status: option.value,
            }),
          text: option.label,
        })),
        { style: "cancel" as const, text: "Cancel" },
      ],
    );
  }

  function deleteJob(job: JobRecord) {
    Alert.alert("Delete job?", `${job.company} - ${job.title}`, [
      { style: "cancel", text: "Cancel" },
      {
        onPress: () => deleteJobMutation.mutate(job.id),
        style: "destructive",
        text: "Delete",
      },
    ]);
  }

  const header = (
    <View style={styles.headerWrap}>
      <ScreenHeader
        title="Jobs"
        subtitle="Search, score, filter, and update your application pipeline."
      />
      <SegmentedControl
        onChange={setView}
        options={[
          { label: "Jobs", value: "jobs" },
          { label: "Profile", value: "profile" },
          { label: "Runs", value: "runs" },
        ]}
        value={view}
      />
      <View style={styles.statGrid}>
        <StatCard icon={Briefcase} label="Saved" value={jobs.length} />
        <StatCard
          icon={Search}
          label="Visible"
          value={filteredJobs.length}
          tone="accent"
        />
      </View>
      <TextField
        label="Search"
        onChangeText={setSearchText}
        placeholder="Title, company, location, source"
        value={searchText}
      />
      <View style={styles.filterRow}>
        <Pressable onPress={() => setStatusFilter("all")}>
          <Badge tone={statusFilter === "all" ? "primary" : "default"}>
            All
          </Badge>
        </Pressable>
        {jobStatusOptions.map((option) => (
          <Pressable key={option.value} onPress={() => setStatusFilter(option.value)}>
            <Badge tone={statusFilter === option.value ? "primary" : "default"}>
              {option.label}
            </Badge>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (jobsQuery.isPending) {
    return <LoadingState message="Loading jobs" />;
  }

  if (jobsQuery.isError) {
    return (
      <EmptyState
        title="Jobs unavailable"
        message="Careeright could not load your job tracker."
      />
    );
  }

  return (
    <FlashList
      ListEmptyComponent={
        <EmptyState
          title="No jobs match"
          message="Adjust the search or status filter to see more saved jobs."
        />
      }
      ListHeaderComponent={header}
      contentContainerStyle={styles.listContent}
      data={filteredJobs}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <JobCard
          isBusy={updateStatusMutation.isPending || deleteJobMutation.isPending}
          job={item}
          onDelete={() => deleteJob(item)}
          onStatus={() => chooseStatus(item)}
        />
      )}
    />
  );
}

function JobCard({
  isBusy,
  job,
  onDelete,
  onStatus,
}: {
  isBusy: boolean;
  job: JobRecord;
  onDelete: () => void;
  onStatus: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Card style={styles.jobCard}>
      <View style={styles.taskTopRow}>
        <Badge tone={jobStatusTone(job.status)}>{jobStatusLabel(job.status)}</Badge>
        {job.fitScore !== null ? (
          <Badge tone={fitBandTone(job.fitBand)}>{Math.round(job.fitScore)}% fit</Badge>
        ) : null}
      </View>
      <View style={styles.jobTitleWrap}>
        <Text selectable style={[styles.jobTitle, { color: colors.text }]}>
          {job.title}
        </Text>
        <Text selectable style={[styles.jobCompany, { color: colors.textMuted }]}>
          {job.company || "Unknown company"} - {job.location || "Remote/unspecified"}
        </Text>
      </View>
      {job.fitReasons[0] ? (
        <Text selectable style={[styles.jobReason, { color: colors.textMuted }]}>
          {job.fitReasons[0]}
        </Text>
      ) : null}
      <View style={styles.skillWrap}>
        {job.matchedSkills.slice(0, 4).map((skill) => (
          <Badge key={skill} tone="success">
            {skill}
          </Badge>
        ))}
        {job.missingSkills.slice(0, 3).map((skill) => (
          <Badge key={skill} tone="accent">
            {skill}
          </Badge>
        ))}
      </View>
      <View style={styles.taskActions}>
        <Button disabled={isBusy} onPress={onStatus} variant="secondary">
          Status
        </Button>
        {job.applyUrl ? (
          <Button onPress={() => openExternalUrl(job.applyUrl)} variant="ghost">
            <ExternalLink color={colors.text} size={16} /> Apply
          </Button>
        ) : null}
        <Button disabled={isBusy} onPress={onDelete} variant="danger">
          <Trash2 color="#FFFFFF" size={16} />
        </Button>
      </View>
    </Card>
  );
}

function JobProfileView({
  setView,
  view,
}: {
  onBack: () => void;
  setView: (view: JobsView) => void;
  view: JobsView;
}) {
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: jobSearchProfileQueryKey,
    queryFn: () => rpcClient.jobs.searchProfile(),
  });
  const [draft, setDraft] = useState<SearchProfileDraft>(emptySearchDraft);

  useEffect(() => {
    if (profileQuery.data) {
      setDraft(profileToDraft(profileQuery.data));
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      rpcClient.jobs.updateSearchProfile({
        companyPreferences: commaList(draft.companyPreferences),
        excludedKeywords: commaList(draft.excludedKeywords),
        experienceLevel: draft.experienceLevel.trim() || "Entry level",
        locations: commaList(draft.locations),
        maxSeededPerRun: Number.parseInt(draft.maxSeededPerRun, 10) || 25,
        minimumFitScore: Number.parseInt(draft.minimumFitScore, 10) || 75,
        primarySkills: commaList(draft.primarySkills),
        secondarySkills: commaList(draft.secondarySkills),
        targetRoles: commaList(draft.targetRoles),
      }),
    onError: (error) => {
      Alert.alert(
        "Could not save profile",
        error instanceof Error ? error.message : "Please try again.",
      );
    },
    onSuccess: async () => {
      successImpact();
      await queryClient.invalidateQueries({ queryKey: jobSearchProfileQueryKey });
    },
  });

  if (profileQuery.isPending) {
    return <LoadingState message="Loading search profile" />;
  }

  return (
    <ScreenScroll>
      <ScreenHeader
        title="Search profile"
        subtitle="Tune the job matching criteria used by Careeright."
      />
      <SegmentedControl
        onChange={setView}
        options={[
          { label: "Jobs", value: "jobs" },
          { label: "Profile", value: "profile" },
          { label: "Runs", value: "runs" },
        ]}
        value={view}
      />
      <Card>
        <SectionTitle
          title="Targeting"
          subtitle="Use comma-separated lists for skills, roles, and locations."
        />
        <DraftField draft={draft} field="targetRoles" label="Target roles" setDraft={setDraft} />
        <DraftField draft={draft} field="primarySkills" label="Primary skills" setDraft={setDraft} />
        <DraftField draft={draft} field="secondarySkills" label="Secondary skills" setDraft={setDraft} />
        <DraftField draft={draft} field="locations" label="Locations" setDraft={setDraft} />
        <DraftField draft={draft} field="experienceLevel" label="Experience level" setDraft={setDraft} />
        <DraftField draft={draft} field="companyPreferences" label="Company preferences" setDraft={setDraft} />
        <DraftField draft={draft} field="excludedKeywords" label="Excluded keywords" setDraft={setDraft} />
        <View style={styles.twoColumn}>
          <DraftField draft={draft} field="minimumFitScore" label="Min fit" setDraft={setDraft} />
          <DraftField draft={draft} field="maxSeededPerRun" label="Max per run" setDraft={setDraft} />
        </View>
        <Button loading={saveMutation.isPending} onPress={() => saveMutation.mutate()}>
          Save search profile
        </Button>
      </Card>
    </ScreenScroll>
  );
}

function JobRunsView({
  setView,
  view,
}: {
  setView: (view: JobsView) => void;
  view: JobsView;
}) {
  const queryClient = useQueryClient();
  const digestsQuery = useQuery({
    queryKey: jobDigestsQueryKey,
    queryFn: () => rpcClient.jobs.digests(),
  });
  const runsQuery = useQuery({
    queryKey: jobApplicationRunsQueryKey,
    queryFn: () => rpcClient.jobs.applicationRuns({ limit: 10 }),
  });
  const createRunMutation = useMutation({
    mutationFn: () => rpcClient.jobs.createApplicationRun({ report: "" }),
    onError: (error) => {
      Alert.alert(
        "Could not create run",
        error instanceof Error ? error.message : "Please try again.",
      );
    },
    onSuccess: async () => {
      successImpact();
      await queryClient.invalidateQueries({ queryKey: jobApplicationRunsQueryKey });
    },
  });

  return (
    <ScreenScroll>
      <ScreenHeader
        action={
          <Button
            loading={createRunMutation.isPending}
            onPress={() => createRunMutation.mutate()}
            variant="secondary"
          >
            <PlayCircle size={16} /> Run
          </Button>
        }
        title="Runs"
        subtitle="Review job digests and application automation attempts."
      />
      <SegmentedControl
        onChange={setView}
        options={[
          { label: "Jobs", value: "jobs" },
          { label: "Profile", value: "profile" },
          { label: "Runs", value: "runs" },
        ]}
        value={view}
      />

      <SectionTitle title="Latest digests" />
      {digestsQuery.isPending ? (
        <LoadingState message="Loading digests" />
      ) : (digestsQuery.data ?? []).length === 0 ? (
        <EmptyState title="No digests yet" message="Job sourcing runs will appear here." />
      ) : (
        (digestsQuery.data ?? []).map((digest) => (
          <Card key={digest.id}>
            <View style={styles.taskTopRow}>
              <Badge tone={digest.status === "completed" ? "success" : "danger"}>
                {titleCase(digest.status)}
              </Badge>
              <Text style={styles.mutedText}>{formatLongDate(digest.createdAt)}</Text>
            </View>
            <Text style={styles.jobTitle}>{digest.source}</Text>
            <Text style={styles.mutedText}>
              {digest.seededCount} saved, {digest.scoredCount} scored,{" "}
              {digest.duplicateCount} duplicates
            </Text>
            {digest.summary ? <Text style={styles.mutedText}>{digest.summary}</Text> : null}
          </Card>
        ))
      )}

      <SectionTitle title="Application runs" />
      {runsQuery.isPending ? (
        <LoadingState message="Loading application runs" />
      ) : (runsQuery.data ?? []).length === 0 ? (
        <EmptyState
          title="No application runs"
          message="Create a run when you are ready to work through the latest unapplied jobs."
        />
      ) : (
        (runsQuery.data ?? []).map((run) => (
          <Card key={run.id}>
            <View style={styles.taskTopRow}>
              <Badge tone="violet">{run.attempts.length} attempts</Badge>
              <Text style={styles.mutedText}>{formatLongDate(run.createdAt)}</Text>
            </View>
            <Text style={styles.mutedText}>
              Latest seeded date: {run.latestSeededDateKey ?? "none"}
            </Text>
            {run.attempts.slice(0, 4).map((attempt) => (
              <Text key={attempt.jobId} style={styles.mutedText}>
                {titleCase(attempt.status)} - {attempt.advice || attempt.skipReason || attempt.error || attempt.formUrl}
              </Text>
            ))}
          </Card>
        ))
      )}
    </ScreenScroll>
  );
}

function DraftField({
  draft,
  field,
  label,
  setDraft,
}: {
  draft: SearchProfileDraft;
  field: keyof SearchProfileDraft;
  label: string;
  setDraft: React.Dispatch<React.SetStateAction<SearchProfileDraft>>;
}) {
  return (
    <TextField
      label={label}
      onChangeText={(value) =>
        setDraft((current) => ({
          ...current,
          [field]: value,
        }))
      }
      value={draft[field]}
    />
  );
}

const emptySearchDraft: SearchProfileDraft = {
  companyPreferences: "",
  excludedKeywords: "",
  experienceLevel: "",
  locations: "",
  maxSeededPerRun: "25",
  minimumFitScore: "75",
  primarySkills: "",
  secondarySkills: "",
  targetRoles: "",
};

function profileToDraft(profile: JobSearchProfile): SearchProfileDraft {
  return {
    companyPreferences: listText(profile.companyPreferences),
    excludedKeywords: listText(profile.excludedKeywords),
    experienceLevel: profile.experienceLevel,
    locations: listText(profile.locations),
    maxSeededPerRun: String(profile.maxSeededPerRun),
    minimumFitScore: String(profile.minimumFitScore),
    primarySkills: listText(profile.primarySkills),
    secondarySkills: listText(profile.secondarySkills),
    targetRoles: listText(profile.targetRoles),
  };
}

const styles = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.two,
  },
  headerWrap: {
    gap: spacing.four,
    marginBottom: spacing.three,
  },
  jobCard: {
    marginBottom: spacing.three,
  },
  jobCompany: {
    fontSize: 14,
    lineHeight: 20,
  },
  jobReason: {
    fontSize: 13,
    lineHeight: 19,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 24,
  },
  jobTitleWrap: {
    gap: spacing.one,
  },
  listContent: {
    padding: spacing.four,
    paddingBottom: spacing.seven,
  },
  mutedText: {
    fontSize: 13,
    lineHeight: 19,
  },
  screen: {
    flex: 1,
  },
  skillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.two,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.three,
  },
  taskActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.two,
  },
  taskTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.two,
    justifyContent: "space-between",
  },
  twoColumn: {
    flexDirection: "row",
    gap: spacing.three,
  },
});
