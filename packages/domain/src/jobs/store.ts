import type { Collection, Document, Filter } from "mongodb";

import { getMongoDb, isMongoConfigured } from "@careeright/db";
import { enrichScoredJobsWithAi } from "@careeright/domain/jobs/ai-fit";
import {
  jobFingerprint,
  jobIdentityKeySet,
  matchesJobFingerprint,
  normalizeJobIdentityText,
  seedJobIdentityKeySet,
} from "@careeright/domain/jobs/identity";
import {
  defaultJobSearchProfileInput,
  enrichSeedJobWithScore,
  scoreJobCandidate,
  searchKeywordsForProfile,
  type ScoredJobCandidate,
} from "@careeright/domain/jobs/matcher";
import { SOLO_USER_ID } from "@careeright/domain/kanban/schema";
import {
  jobDigestListSchema,
  jobDigestSchema,
  jobApplicationAttemptSchema,
  jobApplicationRunListSchema,
  jobApplicationRunSchema,
  jobSearchBriefSchema,
  jobSearchProfileInputSchema,
  jobSearchProfileSchema,
  latestUnappliedJobBatchSchema,
  jobListSchema,
  jobSchema,
  createJobApplicationRunInputSchema,
  deleteJobInputSchema,
  listJobApplicationRunsInputSchema,
  scoreJobCandidatesInputSchema,
  seedJobInputSchema,
  seedRankedJobsInputSchema,
  seedJobsInputSchema,
  updateJobApplicationAttemptInputSchema,
  updateJobSearchProfileInputSchema,
  updateJobStatusInputSchema,
  type CreateJobApplicationRunInput,
  type DeleteJobInput,
  type JobDigest,
  type JobDigestMatch,
  type JobApplicationAttempt,
  type JobApplicationRun,
  type JobRecord,
  type JobSearchProfile,
  type JobSearchBrief,
  type ListJobApplicationRunsInput,
  type ParsedSeedJob,
  type ScoreJobCandidatesInput,
  type SeedRankedJobsInput,
  type SeedJobsInput,
  type UpdateJobApplicationAttemptInput,
  type UpdateJobSearchProfileInput,
  type UpdateJobStatusInput,
} from "@careeright/domain/jobs/schema";
import { getProfileSnapshot } from "@careeright/domain/profile/store";

type JobsMemoryState = {
  jobs: JobRecord[];
  searchProfiles: JobSearchProfile[];
  digests: JobDigest[];
  applicationRuns: JobApplicationRun[];
};

type JobsCollections = {
  jobs: Collection<JobRecord>;
  searchProfiles: Collection<JobSearchProfile>;
  digests: Collection<JobDigest>;
  applicationRuns: Collection<JobApplicationRun>;
};

const globalForJobs = globalThis as typeof globalThis & {
  __careerightJobsMemoryState?: JobsMemoryState;
};

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function withoutMongoId<T extends Document>(doc: T): Omit<T, "_id"> {
  const { _id: _id, ...rest } = doc;
  void _id;
  return rest;
}

function activeJobFilter(userId: string): Filter<JobRecord> {
  return {
    userId,
    $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
  };
}

function isActiveJob(job: JobRecord) {
  return !job.deletedAt;
}

function getMemoryState(): JobsMemoryState {
  if (!globalForJobs.__careerightJobsMemoryState) {
    globalForJobs.__careerightJobsMemoryState = {
      jobs: [],
      searchProfiles: [],
      digests: [],
      applicationRuns: [],
    };
  }

  return globalForJobs.__careerightJobsMemoryState;
}

async function getCollections(): Promise<JobsCollections> {
  const db = await getMongoDb();

  return {
    jobs: db.collection<JobRecord>("jobs"),
    searchProfiles: db.collection<JobSearchProfile>("jobSearchProfiles"),
    digests: db.collection<JobDigest>("jobDigests"),
    applicationRuns: db.collection<JobApplicationRun>("jobApplicationRuns"),
  };
}

function findMatchingJob(
  jobs: JobRecord[],
  source: string,
  input: ParsedSeedJob,
) {
  if (input.sourceJobId) {
    const sourceMatch = jobs.find(
      (job) => job.source === source && job.sourceJobId === input.sourceJobId,
    );

    if (sourceMatch) {
      return sourceMatch;
    }
  }

  if (input.applyUrl) {
    const urlMatch = jobs.find((job) => job.applyUrl === input.applyUrl);

    if (urlMatch) {
      return urlMatch;
    }
  }

  return jobs.find((job) => matchesJobFingerprint(job, input));
}

function createJobRecord(
  input: ParsedSeedJob,
  source: string,
  userId: string,
  createdAt: string,
) {
  return jobSchema.parse({
    id: id("job"),
    userId,
    title: input.title,
    company: input.company,
    location: input.location,
    applyUrl: input.applyUrl,
    source,
    sourceJobId: input.sourceJobId,
    status: input.status ?? "not_applied",
    postedAt: input.postedAt,
    salary: input.salary,
    description: input.description,
    fitScore: input.fitScore ?? null,
    fitBand: input.fitBand ?? null,
    fitReasons: input.fitReasons,
    matchedSkills: input.matchedSkills,
    missingSkills: input.missingSkills,
    riskFlags: input.riskFlags,
    scoreVersion: input.scoreVersion,
    scoredAt: input.scoredAt,
    raw: input.raw,
    seededAt: createdAt,
    createdAt,
    updatedAt: createdAt,
  });
}

function updateExistingJob(
  existing: JobRecord,
  input: ParsedSeedJob,
  source: string,
  updatedAt: string,
) {
  return jobSchema.parse({
    ...existing,
    title: input.title,
    company: input.company,
    location: input.location,
    applyUrl: input.applyUrl,
    source,
    sourceJobId: input.sourceJobId,
    postedAt: input.postedAt,
    salary: input.salary,
    description: input.description,
    fitScore: input.fitScore === undefined ? existing.fitScore : input.fitScore,
    fitBand: input.fitBand === undefined ? existing.fitBand : input.fitBand,
    fitReasons:
      input.fitReasons.length === 0 ? existing.fitReasons : input.fitReasons,
    matchedSkills:
      input.matchedSkills.length === 0
        ? existing.matchedSkills
        : input.matchedSkills,
    missingSkills:
      input.missingSkills.length === 0
        ? existing.missingSkills
        : input.missingSkills,
    riskFlags: input.riskFlags.length === 0 ? existing.riskFlags : input.riskFlags,
    scoreVersion: input.scoreVersion || existing.scoreVersion,
    scoredAt: input.scoredAt || existing.scoredAt,
    raw: input.raw,
    updatedAt,
  });
}

function sortJobs(jobs: JobRecord[]) {
  return [...jobs].sort((a, b) => {
    const seededSort = b.seededAt.localeCompare(a.seededAt);

    if (seededSort !== 0) {
      return seededSort;
    }

    const updatedSort = b.updatedAt.localeCompare(a.updatedAt);

    if (updatedSort !== 0) {
      return updatedSort;
    }

    return a.title.localeCompare(b.title);
  });
}

export async function listJobs(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const jobs = await collections.jobs.find(activeJobFilter(userId)).toArray();

    return jobListSchema.parse(
      sortJobs(jobs.map((job) => jobSchema.parse(withoutMongoId(job)))),
    );
  }

  return jobListSchema.parse(
    sortJobs(
      getMemoryState().jobs.filter(
        (job) => job.userId === userId && isActiveJob(job),
      ),
    ),
  );
}

async function listAllJobRecords(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const jobs = await collections.jobs.find({ userId }).toArray();

    return jobListSchema.parse(
      sortJobs(jobs.map((job) => jobSchema.parse(withoutMongoId(job)))),
    );
  }

  return jobListSchema.parse(
    sortJobs(getMemoryState().jobs.filter((job) => job.userId === userId)),
  );
}

function sortApplicationRuns(runs: JobApplicationRun[]) {
  return [...runs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function createQueuedAttempt(
  job: JobRecord,
  createdAt: string,
): JobApplicationAttempt {
  return jobApplicationAttemptSchema.parse({
    jobId: job.id,
    status: "queued",
    createdAt,
    updatedAt: createdAt,
  });
}

export async function getLatestUnappliedJobBatch(userId = SOLO_USER_ID) {
  return latestUnappliedJobBatchFromJobs(await listJobs(userId));
}

export function latestUnappliedJobBatchFromJobs(activeJobs: JobRecord[]) {
  const sortedActiveJobs = sortJobs(activeJobs.filter(isActiveJob));
  const latestSeededDateKey =
    sortedActiveJobs[0]?.seededAt.slice(0, 10) ?? null;
  const jobs = latestSeededDateKey
    ? sortedActiveJobs.filter(
        (job) =>
          job.seededAt.startsWith(latestSeededDateKey) &&
          job.status === "not_applied",
      )
    : [];

  return latestUnappliedJobBatchSchema.parse({
    latestSeededDateKey,
    jobs,
  });
}

export async function createJobApplicationRun(
  input: CreateJobApplicationRunInput = {},
  userId = SOLO_USER_ID,
) {
  const parsed = createJobApplicationRunInputSchema.parse(input);
  const batch = await getLatestUnappliedJobBatch(userId);
  const createdAt = now();
  const run = jobApplicationRunSchema.parse({
    id: id("job-application-run"),
    userId,
    latestSeededDateKey: batch.latestSeededDateKey,
    selectedJobIds: batch.jobs.map((job) => job.id),
    attempts: batch.jobs.map((job) => createQueuedAttempt(job, createdAt)),
    report: parsed.report,
    createdAt,
    updatedAt: createdAt,
  });

  if (isMongoConfigured()) {
    const collections = await getCollections();
    await collections.applicationRuns.insertOne(run);
  } else {
    getMemoryState().applicationRuns.unshift(run);
  }

  return run;
}

export async function listJobApplicationRuns(
  input: ListJobApplicationRunsInput = {},
  userId = SOLO_USER_ID,
) {
  const { limit } = listJobApplicationRunsInputSchema.parse(input);

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const runs = await collections.applicationRuns
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return jobApplicationRunListSchema.parse(
      runs.map((run) => jobApplicationRunSchema.parse(withoutMongoId(run))),
    );
  }

  return jobApplicationRunListSchema.parse(
    sortApplicationRuns(
      getMemoryState().applicationRuns.filter((run) => run.userId === userId),
    ).slice(0, limit),
  );
}

export async function updateJobApplicationAttempt(
  input: UpdateJobApplicationAttemptInput,
  userId = SOLO_USER_ID,
) {
  const parsed = updateJobApplicationAttemptInputSchema.parse(input);
  const updatedAt = now();

  function updateRun(run: JobApplicationRun) {
    const attemptIndex = run.attempts.findIndex(
      (attempt) => attempt.jobId === parsed.jobId,
    );

    if (attemptIndex === -1) {
      throw new Error("Job application attempt not found.");
    }

    const attempt = run.attempts[attemptIndex];
    const nextAttempt = jobApplicationAttemptSchema.parse({
      ...attempt,
      status: parsed.status,
      advice: parsed.advice ?? attempt.advice,
      skipReason: parsed.skipReason ?? attempt.skipReason,
      error: parsed.error ?? attempt.error,
      formUrl: parsed.formUrl ?? attempt.formUrl,
      updatedAt,
      completedAt:
        parsed.status === "queued"
          ? attempt.completedAt
          : attempt.completedAt ?? updatedAt,
    });
    const attempts = [...run.attempts];
    attempts[attemptIndex] = nextAttempt;

    return jobApplicationRunSchema.parse({
      ...run,
      attempts,
      updatedAt,
    });
  }

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const existing = await collections.applicationRuns.findOne({
      id: parsed.runId,
      userId,
    });

    if (!existing) {
      throw new Error("Job application run not found.");
    }

    const updated = updateRun(jobApplicationRunSchema.parse(withoutMongoId(existing)));
    await collections.applicationRuns.updateOne(
      { id: parsed.runId, userId },
      { $set: updated },
    );
    return updated;
  }

  const memory = getMemoryState();
  const runIndex = memory.applicationRuns.findIndex(
    (run) => run.id === parsed.runId && run.userId === userId,
  );

  if (runIndex === -1) {
    throw new Error("Job application run not found.");
  }

  const updated = updateRun(memory.applicationRuns[runIndex]);
  memory.applicationRuns[runIndex] = updated;
  return updated;
}

function uniq(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function wordsFrom(value: string) {
  return value
    .split(/[,|/;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function deriveJobSearchProfileInput(userId: string) {
  return getProfileSnapshot(userId).then((snapshot) => {
    const defaults = defaultJobSearchProfileInput();
    const profile = snapshot.profile;
    const skillItems = snapshot.items.filter((item) => item.type === "skill");
    const projectItems = snapshot.items.filter((item) => item.type === "project");
    const experienceItems = snapshot.items.filter(
      (item) => item.type === "experience",
    );
    const profileText = [
      profile.headline,
      profile.summary,
      ...snapshot.items.flatMap((item) => [
        item.title,
        item.organization,
        item.description,
        item.tags.join(", "),
      ]),
    ].join(" ");

    const profileSkills = uniq([
      ...skillItems.flatMap((item) => [
        item.title,
        ...item.tags,
        ...wordsFrom(item.description),
      ]),
      ...projectItems.flatMap((item) => item.tags),
      ...experienceItems.flatMap((item) => item.tags),
    ]).slice(0, 30);
    const profileRoles = uniq([
      ...wordsFrom(profile.headline).filter((item) =>
        /engineer|developer|backend|software|full.?stack/i.test(item),
      ),
      ...defaults.targetRoles,
    ]).slice(0, 12);
    const profileLocations = uniq([
      profile.location,
      ...defaults.locations,
    ]).slice(0, 12);
    const secondarySkills = uniq([
      ...projectItems.flatMap((item) => item.tags),
      ...experienceItems.flatMap((item) => item.tags),
      ...defaults.secondarySkills,
    ]).slice(0, 30);
    const primarySkills =
      profileSkills.length > 0
        ? uniq([...profileSkills, ...defaults.primarySkills]).slice(0, 30)
        : defaults.primarySkills;

    return jobSearchProfileInputSchema.parse({
      ...defaults,
      targetRoles: profileRoles.length > 0 ? profileRoles : defaults.targetRoles,
      primarySkills,
      secondarySkills,
      locations: profileLocations,
      experienceLevel: /intern|student|graduate|fresher|0-3|0 to 3/i.test(
        profileText,
      )
        ? "Early-career / entry-level / associate / 0-3 years"
        : defaults.experienceLevel,
    });
  });
}

async function createDefaultSearchProfileRecord(userId: string, createdAt = now()) {
  const input = await deriveJobSearchProfileInput(userId);

  return jobSearchProfileSchema.parse({
    ...input,
    id: id("job-search-profile"),
    userId,
    createdAt,
    updatedAt: createdAt,
  });
}

export async function getJobSearchProfile(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const existing = await collections.searchProfiles.findOne({ userId });

    if (existing) {
      return jobSearchProfileSchema.parse(withoutMongoId(existing));
    }

    const created = await createDefaultSearchProfileRecord(userId);
    await collections.searchProfiles.insertOne(created);
    return created;
  }

  const memory = getMemoryState();
  const existing = memory.searchProfiles.find((profile) => profile.userId === userId);

  if (existing) {
    return existing;
  }

  const created = await createDefaultSearchProfileRecord(userId);
  memory.searchProfiles.push(created);
  return created;
}

export async function updateJobSearchProfile(
  input: UpdateJobSearchProfileInput,
  userId = SOLO_USER_ID,
) {
  const patch = updateJobSearchProfileInputSchema.parse(input);
  const current = await getJobSearchProfile(userId);
  const updatedAt = now();
  const updated = jobSearchProfileSchema.parse({
    ...current,
    ...jobSearchProfileInputSchema.parse({
      targetRoles: current.targetRoles,
      primarySkills: current.primarySkills,
      secondarySkills: current.secondarySkills,
      locations: current.locations,
      experienceLevel: current.experienceLevel,
      companyPreferences: current.companyPreferences,
      excludedKeywords: current.excludedKeywords,
      minimumFitScore: current.minimumFitScore,
      maxSeededPerRun: current.maxSeededPerRun,
      ...patch,
    }),
    updatedAt,
  });

  if (isMongoConfigured()) {
    const collections = await getCollections();
    await collections.searchProfiles.updateOne(
      { id: current.id, userId },
      { $set: updated },
    );
  } else {
    const memory = getMemoryState();
    const index = memory.searchProfiles.findIndex(
      (profile) => profile.id === current.id,
    );
    memory.searchProfiles[index] = updated;
  }

  return updated;
}

export async function prepareJobSearchBrief(
  userId = SOLO_USER_ID,
): Promise<JobSearchBrief> {
  const searchProfile = await getJobSearchProfile(userId);
  const allJobs = await listAllJobRecords(userId);
  const activeJobs = allJobs.filter(isActiveJob);
  const latestSeededDateKey = activeJobs[0]?.seededAt.slice(0, 10) ?? null;
  const latestSeededJobs = latestSeededDateKey
    ? activeJobs.filter((job) => job.seededAt.startsWith(latestSeededDateKey))
    : [];

  return jobSearchBriefSchema.parse({
    searchProfile,
    searchKeywords: searchKeywordsForProfile(searchProfile),
    locationStrategy: searchProfile.locations,
    exclusionFingerprints: {
      sourceJobIds: uniq(
        allJobs.map((job) => normalizeJobIdentityText(job.sourceJobId)),
      ),
      applyUrls: uniq(allJobs.map((job) => normalizeJobIdentityText(job.applyUrl))),
      titleCompanyLocations: uniq(allJobs.map(jobFingerprint)),
    },
    latestSeededDateKey,
    latestSeededJobFingerprints: latestSeededJobs.map(jobFingerprint),
    minimumFitScore: searchProfile.minimumFitScore,
    maxSeededPerRun: searchProfile.maxSeededPerRun,
  });
}

export async function scoreJobCandidates(
  input: ScoreJobCandidatesInput,
  userId = SOLO_USER_ID,
) {
  const parsed = scoreJobCandidatesInputSchema.parse(input);
  const searchProfile = await getJobSearchProfile(userId);
  const scoredAt = now();
  const scoredJobs = parsed.jobs
    .map((job) => scoreJobCandidate(job, searchProfile, scoredAt))
    .sort((a, b) => b.fitScore - a.fitScore);
  const enrichedJobs = await enrichScoredJobsWithAi(
    scoredJobs,
    searchProfile,
    searchProfile.maxSeededPerRun,
  );

  return {
    searchProfile,
    scoredJobs: enrichedJobs.sort((a, b) => b.fitScore - a.fitScore),
  };
}

function hasAnyKey(source: Set<string>, keys: Set<string>) {
  for (const key of keys) {
    if (source.has(key)) {
      return true;
    }
  }

  return false;
}

function rawString(raw: JobRecord["raw"], keys: string[]) {
  for (const key of keys) {
    const value = raw[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return "";
}

function digestMatchFromJob(job: JobRecord): JobDigestMatch {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    applyUrl: job.applyUrl,
    jobUrl: rawString(job.raw, ["jobUrl", "job_url", "link", "url"]),
    salary: job.salary,
    fitScore: job.fitScore,
    fitBand: job.fitBand,
    fitReasons: job.fitReasons,
    riskFlags: job.riskFlags,
  };
}

async function findDigestByRunKey(userId: string, runKey: string) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const digest = await collections.digests.findOne({ userId, runKey });

    return digest ? jobDigestSchema.parse(withoutMongoId(digest)) : null;
  }

  return (
    getMemoryState().digests.find(
      (digest) => digest.userId === userId && digest.runKey === runKey,
    ) ?? null
  );
}

async function createJobDigest(digest: JobDigest) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    await collections.digests.insertOne(digest);
  } else {
    getMemoryState().digests.unshift(digest);
  }

  return digest;
}

export async function seedRankedJobs(
  input: SeedRankedJobsInput,
  userId = SOLO_USER_ID,
) {
  const parsed = seedRankedJobsInputSchema.parse(input);
  const runKey =
    parsed.runKey ?? `${parsed.source}-${new Date().toISOString().slice(0, 10)}`;
  const existingDigest = await findDigestByRunKey(userId, runKey);

  if (existingDigest) {
    return {
      digest: existingDigest,
      seededJobs: (await listJobs(userId)).filter((job) =>
        existingDigest.seededJobIds.includes(job.id),
      ),
      scoredJobs: [] as ScoredJobCandidate[],
      duplicateCount: existingDigest.duplicateCount,
      rejectedCount: existingDigest.rejectedCount,
    };
  }

  const searchProfile = await getJobSearchProfile(userId);
  const allJobs = await listAllJobRecords(userId);
  const existingKeys = new Set(
    allJobs.flatMap((job) => Array.from(jobIdentityKeySet(job))),
  );
  const seenKeys = new Set<string>();
  const scoredJobs: ScoredJobCandidate[] = [];
  let duplicateCount = 0;
  const scoredAt = now();

  for (const candidate of parsed.jobs) {
    const parsedCandidate = seedJobInputSchema.parse(candidate);
    const keys = seedJobIdentityKeySet(parsedCandidate);

    if (hasAnyKey(existingKeys, keys) || hasAnyKey(seenKeys, keys)) {
      duplicateCount += 1;
      continue;
    }

    for (const key of keys) {
      seenKeys.add(key);
    }

    scoredJobs.push(scoreJobCandidate(parsedCandidate, searchProfile, scoredAt));
  }

  const sortedScoredJobs = (
    await enrichScoredJobsWithAi(
      scoredJobs.sort((a, b) => b.fitScore - a.fitScore),
      searchProfile,
      searchProfile.maxSeededPerRun,
    )
  ).sort((a, b) => b.fitScore - a.fitScore);
  const selectedCandidates = sortedScoredJobs
    .filter(
      (candidate) =>
        candidate.fitScore >= searchProfile.minimumFitScore &&
        candidate.fitBand !== "rejected",
    )
    .slice(0, searchProfile.maxSeededPerRun);
  const rejectedCount = Math.max(0, scoredJobs.length - selectedCandidates.length);
  const seededJobs =
    selectedCandidates.length > 0
      ? await seedJobs(
          {
            source: parsed.source,
            jobs: selectedCandidates.map(enrichSeedJobWithScore),
          },
          userId,
        )
      : [];
  const createdAt = now();
  const digest = await createJobDigest(
    jobDigestSchema.parse({
      id: id("job-digest"),
      userId,
      runKey,
      source: parsed.source,
      status: "completed",
      summary: parsed.summary,
      candidatesSeen: parsed.jobs.length,
      scoredCount: scoredJobs.length,
      seededCount: seededJobs.length,
      duplicateCount,
      rejectedCount,
      minimumFitScore: searchProfile.minimumFitScore,
      maxSeeded: searchProfile.maxSeededPerRun,
      seededJobIds: seededJobs.map((job) => job.id),
      topMatches: seededJobs.slice(0, 10).map(digestMatchFromJob),
      createdAt,
      updatedAt: createdAt,
    }),
  );

  return {
    digest,
    seededJobs,
    scoredJobs: sortedScoredJobs,
    duplicateCount,
    rejectedCount,
  };
}

export async function listJobDigests(userId = SOLO_USER_ID, limit = 10) {
  const boundedLimit = Math.max(1, Math.min(50, Math.floor(limit)));

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const digests = await collections.digests
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(boundedLimit)
      .toArray();

    return jobDigestListSchema.parse(
      digests.map((digest) => jobDigestSchema.parse(withoutMongoId(digest))),
    );
  }

  return jobDigestListSchema.parse(
    getMemoryState()
      .digests.filter((digest) => digest.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, boundedLimit),
  );
}

export async function seedJobs(input: SeedJobsInput, userId = SOLO_USER_ID) {
  const parsed = seedJobsInputSchema.parse(input);
  const updatedAt = now();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    let existingJobs = (
      await collections.jobs.find({ userId }).toArray()
    ).map((job) => jobSchema.parse(withoutMongoId(job)));
    const seededJobs: JobRecord[] = [];

    for (const seedJob of parsed.jobs) {
      const existing = findMatchingJob(existingJobs, parsed.source, seedJob);

      if (existing) {
        const updated = updateExistingJob(
          existing,
          seedJob,
          parsed.source,
          updatedAt,
        );

        await collections.jobs.updateOne(
          { id: existing.id, userId },
          { $set: updated },
        );

        existingJobs = existingJobs.map((job) =>
          job.id === updated.id ? updated : job,
        );
        seededJobs.push(updated);
      } else {
        const created = createJobRecord(
          seedJob,
          parsed.source,
          userId,
          updatedAt,
        );

        await collections.jobs.insertOne(created);
        existingJobs.push(created);
        seededJobs.push(created);
      }
    }

    return jobListSchema.parse(sortJobs(seededJobs.filter(isActiveJob)));
  }

  const memory = getMemoryState();
  const seededJobs: JobRecord[] = [];

  for (const seedJob of parsed.jobs) {
    const existing = findMatchingJob(
      memory.jobs.filter((job) => job.userId === userId),
      parsed.source,
      seedJob,
    );

    if (existing) {
      const updated = updateExistingJob(
        existing,
        seedJob,
        parsed.source,
        updatedAt,
      );
      const index = memory.jobs.findIndex((job) => job.id === existing.id);

      memory.jobs[index] = updated;
      seededJobs.push(updated);
    } else {
      const created = createJobRecord(
        seedJob,
        parsed.source,
        userId,
        updatedAt,
      );

      memory.jobs.push(created);
      seededJobs.push(created);
    }
  }

  return jobListSchema.parse(sortJobs(seededJobs.filter(isActiveJob)));
}

export async function updateJobStatus(
  input: UpdateJobStatusInput,
  userId = SOLO_USER_ID,
) {
  const parsed = updateJobStatusInputSchema.parse(input);
  const updatedAt = now();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const job = await collections.jobs.findOneAndUpdate(
      { id: parsed.jobId, ...activeJobFilter(userId) },
      {
        $set: {
          status: parsed.status,
          updatedAt,
        },
      },
      { returnDocument: "after" },
    );

    if (!job) {
      throw new Error("Job not found.");
    }

    return jobSchema.parse(withoutMongoId(job));
  }

  const memory = getMemoryState();
  const index = memory.jobs.findIndex(
    (job) =>
      job.id === parsed.jobId && job.userId === userId && isActiveJob(job),
  );

  if (index === -1) {
    throw new Error("Job not found.");
  }

  const job = jobSchema.parse({
    ...memory.jobs[index],
    status: parsed.status,
    updatedAt,
  });

  memory.jobs[index] = job;
  return job;
}

export async function deleteJob(
  input: DeleteJobInput,
  userId = SOLO_USER_ID,
) {
  const parsed = deleteJobInputSchema.parse(input);
  const deletedAt = now();

  if (isMongoConfigured()) {
    const collections = await getCollections();
    const job = await collections.jobs.findOneAndUpdate(
      { id: parsed.jobId, ...activeJobFilter(userId) },
      {
        $set: {
          deletedAt,
          updatedAt: deletedAt,
        },
      },
      { returnDocument: "after" },
    );

    if (!job) {
      throw new Error("Job not found.");
    }

    return jobSchema.parse(withoutMongoId(job));
  }

  const memory = getMemoryState();
  const index = memory.jobs.findIndex(
    (job) =>
      job.id === parsed.jobId && job.userId === userId && isActiveJob(job),
  );

  if (index === -1) {
    throw new Error("Job not found.");
  }

  const job = jobSchema.parse({
    ...memory.jobs[index],
    deletedAt,
    updatedAt: deletedAt,
  });

  memory.jobs[index] = job;
  return job;
}

export async function deleteJobUserData(userId = SOLO_USER_ID) {
  if (isMongoConfigured()) {
    const collections = await getCollections();
    const [jobs, searchProfiles, digests, applicationRuns] = await Promise.all([
      collections.jobs.deleteMany({ userId }),
      collections.searchProfiles.deleteMany({ userId }),
      collections.digests.deleteMany({ userId }),
      collections.applicationRuns.deleteMany({ userId }),
    ]);

    return {
      jobs: jobs.deletedCount,
      jobSearchProfiles: searchProfiles.deletedCount,
      jobDigests: digests.deletedCount,
      jobApplicationRuns: applicationRuns.deletedCount,
    };
  }

  const memory = getMemoryState();
  const count = memory.jobs.filter((job) => job.userId === userId).length;
  const searchProfileCount = memory.searchProfiles.filter(
    (profile) => profile.userId === userId,
  ).length;
  const digestCount = memory.digests.filter(
    (digest) => digest.userId === userId,
  ).length;
  const applicationRunCount = memory.applicationRuns.filter(
    (run) => run.userId === userId,
  ).length;
  memory.jobs = memory.jobs.filter((job) => job.userId !== userId);
  memory.searchProfiles = memory.searchProfiles.filter(
    (profile) => profile.userId !== userId,
  );
  memory.digests = memory.digests.filter((digest) => digest.userId !== userId);
  memory.applicationRuns = memory.applicationRuns.filter(
    (run) => run.userId !== userId,
  );

  return {
    jobs: count,
    jobSearchProfiles: searchProfileCount,
    jobDigests: digestCount,
    jobApplicationRuns: applicationRunCount,
  };
}
