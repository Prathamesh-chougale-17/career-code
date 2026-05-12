import { describe, expect, test } from "vitest";

import {
  type JobRecord,
  jobSearchProfileInputSchema,
  jobSchema,
  seedJobInputSchema,
  seedJobsInputSchema,
} from "@career-code/domain/jobs/schema";
import {
  buildApplicationFormDefaults,
  buildSimpleFormFillPlan,
  classifyApplyUrl,
  generateJobApplicationRunReport,
} from "@career-code/domain/jobs/application-runner";
import { scoreJobCandidate } from "@career-code/domain/jobs/matcher";
import {
  createJobApplicationRun,
  deleteJob,
  getJobSearchProfile,
  getLatestUnappliedJobBatch,
  latestUnappliedJobBatchFromJobs,
  listJobDigests,
  listJobApplicationRuns,
  listJobs,
  prepareJobSearchBrief,
  seedRankedJobs,
  seedJobs,
  updateJobApplicationAttempt,
  updateJobSearchProfile,
  updateJobStatus,
} from "@career-code/domain/jobs/store";
import { profileSnapshotSchema } from "@career-code/domain/profile/schema";

process.env.MONGODB_URI = "";

function fixtureJob(overrides: Partial<JobRecord> = {}): JobRecord {
  const createdAt = overrides.createdAt ?? "2026-05-08T10:00:00.000Z";

  return jobSchema.parse({
    id: `job-${crypto.randomUUID()}`,
    userId: "fixture-user",
    title: "Backend Engineer",
    company: "Fixture Co",
    location: "Remote India",
    applyUrl: "https://docs.google.com/forms/d/e/example/viewform",
    source: "fixture",
    sourceJobId: "",
    status: "not_applied",
    postedAt: "",
    salary: "",
    description: "Build TypeScript APIs with MongoDB and React dashboards.",
    fitScore: 88,
    fitBand: "strong",
    fitReasons: ["Strong TypeScript backend match"],
    matchedSkills: ["TypeScript", "MongoDB"],
    missingSkills: ["AWS"],
    riskFlags: [],
    scoreVersion: "fixture",
    scoredAt: createdAt,
    raw: {
      jobUrl: "https://example.com/jobs/backend",
    },
    seededAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  });
}

describe("job schemas", () => {
  test("accepts a minimal seeded job", () => {
    const input = seedJobInputSchema.parse({
      title: "Backend Engineer",
    });

    expect(input.title).toBe("Backend Engineer");
    expect(input.company).toBe("");
    expect(input.status).toBeUndefined();
  });

  test("rejects unsafe apply URLs", () => {
    expect(() =>
      seedJobInputSchema.parse({
        title: "Unsafe job",
        applyUrl: "javascript:alert(1)",
      }),
    ).toThrow();
  });

  test("accepts a direct MCP seed payload", () => {
    const input = seedJobsInputSchema.parse({
      source: "apify",
      jobs: [
        {
          title: "Full Stack Engineer",
          company: "Career Code",
          applyUrl: "https://example.com/jobs/1",
          status: "expired",
        },
      ],
    });

    expect(input.source).toBe("apify");
    expect(input.jobs[0].status).toBe("expired");
  });

  test("accepts more than 100 well-fit jobs in one seed payload", () => {
    const jobs = Array.from({ length: 125 }, (_, index) => ({
      title: `Backend Engineer ${index + 1}`,
      company: "Fit Jobs Co",
      sourceJobId: `fit-job-${index + 1}`,
      fitScore: 80 + (index % 20),
    }));

    const input = seedJobsInputSchema.parse({
      source: "apify",
      jobs,
    });

    expect(input.jobs).toHaveLength(125);
  });

  test("accepts job fit metadata on seeded jobs", () => {
    const input = seedJobInputSchema.parse({
      title: "Backend Engineer",
      fitScore: 92,
      fitBand: "excellent",
      fitReasons: ["Strong backend match"],
      matchedSkills: ["Node.js"],
      riskFlags: [],
      scoreVersion: "job-match-v1",
      scoredAt: "2026-05-05T00:00:00.000Z",
    });

    expect(input.fitBand).toBe("excellent");
    expect(input.fitReasons).toEqual(["Strong backend match"]);
  });

  test("accepts editable job search profile preferences", () => {
    const profile = jobSearchProfileInputSchema.parse({
      targetRoles: ["Backend Engineer"],
      primarySkills: ["Node.js", "TypeScript"],
      secondarySkills: ["React"],
      locations: ["Pune", "Remote India"],
      experienceLevel: "Early-career",
      companyPreferences: ["startup"],
      excludedKeywords: ["senior"],
      minimumFitScore: 75,
      maxSeededPerRun: 25,
    });

    expect(profile.minimumFitScore).toBe(75);
    expect(profile.maxSeededPerRun).toBe(25);
  });
});

describe("job matcher", () => {
  const profile = jobSearchProfileInputSchema.parse({
    targetRoles: ["Backend Engineer", "Software Engineer"],
    primarySkills: ["Node.js", "TypeScript", "PostgreSQL"],
    secondarySkills: ["React", "Docker"],
    locations: ["Pune", "Remote India", "India"],
    experienceLevel: "Early-career / 0-3 years",
    companyPreferences: ["startup", "product company"],
    excludedKeywords: ["commission only"],
    minimumFitScore: 75,
    maxSeededPerRun: 25,
  });
  const searchProfile = {
    ...profile,
    id: "job-search-profile-test",
    userId: "job-matcher-test",
    createdAt: "2026-05-05T00:00:00.000Z",
    updatedAt: "2026-05-05T00:00:00.000Z",
  };

  test("does not let salary change the score", () => {
    const baseJob = {
      title: "Backend Engineer",
      company: "Product Startup",
      location: "Remote India",
      applyUrl: "https://example.com/jobs/backend",
      description:
        "Build Node.js TypeScript APIs with PostgreSQL for an early-career product team.",
    };
    const lowSalary = scoreJobCandidate(
      { ...baseJob, salary: "3 LPA" },
      searchProfile,
    );
    const highSalary = scoreJobCandidate(
      { ...baseJob, salary: "50 LPA" },
      searchProfile,
    );

    expect(lowSalary.fitScore).toBe(highSalary.fitScore);
  });

  test("rejects senior-only roles beyond the search profile", () => {
    const scored = scoreJobCandidate(
      {
        title: "Senior Backend Architect",
        company: "Enterprise Product Co",
        location: "India",
        applyUrl: "https://example.com/jobs/senior",
        description:
          "Requires 7+ years leading backend architecture with Node.js and PostgreSQL.",
      },
      searchProfile,
    );

    expect(scored.fitBand).toBe("rejected");
    expect(scored.riskFlags.join(" ")).toContain("Senior-only");
  });

  test("downranks frontend-only work without backend ownership", () => {
    const frontend = scoreJobCandidate(
      {
        title: "Frontend Developer",
        company: "Product Startup",
        location: "Remote India",
        applyUrl: "https://example.com/jobs/frontend",
        description: "Build React UI components for a design system.",
      },
      searchProfile,
    );
    const backend = scoreJobCandidate(
      {
        title: "Backend Engineer",
        company: "Product Startup",
        location: "Remote India",
        applyUrl: "https://example.com/jobs/backend-node",
        description:
          "Build Node.js TypeScript APIs with PostgreSQL and Docker.",
      },
      searchProfile,
    );

    expect(backend.fitScore).toBeGreaterThan(frontend.fitScore);
    expect(frontend.riskFlags.join(" ")).toContain("Frontend-only");
  });

  test("boosts credible startup and product company signals", () => {
    const startup = scoreJobCandidate(
      {
        title: "Backend Engineer",
        company: "AI Product Startup",
        location: "Remote India",
        applyUrl: "https://example.com/jobs/startup",
        description:
          "Early-career Node.js TypeScript API work at a funded SaaS startup.",
      },
      searchProfile,
    );
    const vague = scoreJobCandidate(
      {
        title: "Backend Engineer",
        company: "Generic Services",
        location: "Remote India",
        applyUrl: "https://example.com/jobs/services",
        description: "Node.js TypeScript API work.",
      },
      searchProfile,
    );

    expect(startup.fitScore).toBeGreaterThan(vague.fitScore);
    expect(startup.fitReasons.join(" ")).toContain("Company signals");
  });
});

describe("job store", () => {
  test("seeds jobs with default status and user scope", async () => {
    const userA = `jobs-a-${crypto.randomUUID()}`;
    const userB = `jobs-b-${crypto.randomUUID()}`;

    const [job] = await seedJobs(
      {
        source: "apify",
        jobs: [
          {
            title: "Backend Engineer",
            company: "Weekday AI",
            location: "Bengaluru",
          },
        ],
      },
      userA,
    );

    await seedJobs(
      {
        source: "apify",
        jobs: [
          {
            title: "React Native Developer",
            company: "Mobile Co",
          },
        ],
      },
      userB,
    );

    expect(job.status).toBe("not_applied");
    expect(jobSchema.parse(job).title).toBe("Backend Engineer");
    expect((await listJobs(userA)).map((item) => item.title)).toEqual([
      "Backend Engineer",
    ]);
    expect((await listJobs(userB)).map((item) => item.title)).toEqual([
      "React Native Developer",
    ]);
  });

  test("dedupes by source job id and preserves seeded date and status", async () => {
    const userId = `jobs-source-id-${crypto.randomUUID()}`;
    const [first] = await seedJobs(
      {
        source: "linkedin",
        jobs: [
          {
            sourceJobId: "job-123",
            title: "Backend Engineer",
            company: "SourceMatch",
            status: "applied",
          },
        ],
      },
      userId,
    );

    await new Promise((resolve) => setTimeout(resolve, 5));

    const [second] = await seedJobs(
      {
        source: "linkedin",
        jobs: [
          {
            sourceJobId: "job-123",
            title: "Backend Platform Engineer",
            company: "SourceMatch",
            status: "rejected",
          },
        ],
      },
      userId,
    );

    expect(second.id).toBe(first.id);
    expect(second.seededAt).toBe(first.seededAt);
    expect(second.status).toBe("applied");
    expect(second.title).toBe("Backend Platform Engineer");
    expect(await listJobs(userId)).toHaveLength(1);
  });

  test("dedupes by apply URL and normalized role company location", async () => {
    const userId = `jobs-dedupe-${crypto.randomUUID()}`;

    const [urlJob] = await seedJobs(
      {
        source: "apify",
        jobs: [
          {
            title: "Full Stack Engineer",
            company: "VendorBay",
            location: "India",
            applyUrl: "https://example.com/jobs/vendorbay",
          },
        ],
      },
      userId,
    );

    const [urlUpdate] = await seedJobs(
      {
        source: "linkedin",
        jobs: [
          {
            title: "Full Stack Developer",
            company: "VendorBay",
            location: "India",
            applyUrl: "https://example.com/jobs/vendorbay",
          },
        ],
      },
      userId,
    );

    const [fingerprintJob] = await seedJobs(
      {
        source: "apify",
        jobs: [
          {
            title: "Backend Developer",
            company: "Recrew AI",
            location: "Bangalore",
          },
        ],
      },
      userId,
    );

    const [fingerprintUpdate] = await seedJobs(
      {
        source: "other",
        jobs: [
          {
            title: "  backend   developer ",
            company: "recrew ai",
            location: "Bangalore",
            salary: "12 LPA",
          },
        ],
      },
      userId,
    );

    expect(urlUpdate.id).toBe(urlJob.id);
    expect(fingerprintUpdate.id).toBe(fingerprintJob.id);
    expect(fingerprintUpdate.salary).toBe("12 LPA");
    expect(await listJobs(userId)).toHaveLength(2);
  });

  test("lists latest seeded date first and updates status", async () => {
    const userId = `jobs-sort-${crypto.randomUUID()}`;
    const [first] = await seedJobs(
      {
        source: "apify",
        jobs: [
          {
            title: "First Job",
          },
        ],
      },
      userId,
    );

    await new Promise((resolve) => setTimeout(resolve, 5));

    const [second] = await seedJobs(
      {
        source: "apify",
        jobs: [
          {
            title: "Second Job",
          },
        ],
      },
      userId,
    );

    expect((await listJobs(userId)).map((job) => job.id)).toEqual([
      second.id,
      first.id,
    ]);

    const updated = await updateJobStatus(
      {
        jobId: first.id,
        status: "interviewing",
      },
      userId,
    );

    expect(updated.status).toBe("interviewing");
    expect(
      (await listJobs(userId)).find((job) => job.id === first.id)?.status,
    ).toBe("interviewing");

    const expired = await updateJobStatus(
      {
        jobId: first.id,
        status: "expired",
      },
      userId,
    );

    expect(expired.status).toBe("expired");
  });

  test("filters only latest seeded date and not-applied jobs", () => {
    const latestOpen = fixtureJob({
      id: "latest-open",
      seededAt: "2026-05-08T10:00:00.000Z",
      status: "not_applied",
    });
    const latestApplied = fixtureJob({
      id: "latest-applied",
      seededAt: "2026-05-08T09:00:00.000Z",
      status: "applied",
    });
    const olderOpen = fixtureJob({
      id: "older-open",
      title: "Older Backend Engineer",
      seededAt: "2026-05-07T23:59:00.000Z",
      status: "not_applied",
    });
    const latestDeleted = fixtureJob({
      id: "latest-deleted",
      seededAt: "2026-05-08T08:00:00.000Z",
      status: "not_applied",
      deletedAt: "2026-05-08T11:00:00.000Z",
    });

    const batch = latestUnappliedJobBatchFromJobs([
      olderOpen,
      latestApplied,
      latestOpen,
      latestDeleted,
    ]);

    expect(batch.latestSeededDateKey).toBe("2026-05-08");
    expect(batch.jobs.map((job) => job.id)).toEqual(["latest-open"]);
  });

  test("creates application runs and updates attempt status safely", async () => {
    const userId = `jobs-apply-run-${crypto.randomUUID()}`;
    const seededJobs = await seedJobs(
      {
        source: "apify",
        jobs: [
          {
            title: "Latest Open Job",
            applyUrl: "https://docs.google.com/forms/d/e/open/viewform",
          },
          {
            title: "Already Applied Job",
            applyUrl: "https://docs.google.com/forms/d/e/applied/viewform",
          },
        ],
      },
      userId,
    );
    const openJob = seededJobs.find((job) => job.title === "Latest Open Job");
    const appliedJob = seededJobs.find(
      (job) => job.title === "Already Applied Job",
    );

    expect(openJob).toBeDefined();
    expect(appliedJob).toBeDefined();

    await updateJobStatus({ jobId: appliedJob!.id, status: "applied" }, userId);

    const batch = await getLatestUnappliedJobBatch(userId);
    const run = await createJobApplicationRun(
      {
        report: "# Test run",
      },
      userId,
    );
    const updatedRun = await updateJobApplicationAttempt(
      {
        runId: run.id,
        jobId: openJob!.id,
        status: "filled_waiting_user",
        advice: "Lead with the API project.",
        formUrl: openJob!.applyUrl,
      },
      userId,
    );
    const listedRuns = await listJobApplicationRuns({ limit: 5 }, userId);
    const currentOpenJob = (await listJobs(userId)).find(
      (job) => job.id === openJob!.id,
    );

    expect(batch.jobs.map((job) => job.id)).toEqual([openJob!.id]);
    expect(run.selectedJobIds).toEqual([openJob!.id]);
    expect(updatedRun.attempts[0].status).toBe("filled_waiting_user");
    expect(updatedRun.attempts[0].completedAt).toBeDefined();
    expect(listedRuns[0].id).toBe(run.id);
    expect(currentOpenJob?.status).toBe("not_applied");
  });

  test("soft deletes jobs without recreating them on reseed", async () => {
    const userId = `jobs-delete-${crypto.randomUUID()}`;
    const [job] = await seedJobs(
      {
        source: "linkedin",
        jobs: [
          {
            sourceJobId: "soft-delete-job",
            title: "Soft Delete Engineer",
            company: "Hidden Co",
          },
        ],
      },
      userId,
    );

    const deleted = await deleteJob({ jobId: job.id }, userId);

    expect(deleted.deletedAt).toBeDefined();
    expect(await listJobs(userId)).toHaveLength(0);
    await expect(
      updateJobStatus({ jobId: job.id, status: "applied" }, userId),
    ).rejects.toThrow("Job not found.");

    const reseeded = await seedJobs(
      {
        source: "linkedin",
        jobs: [
          {
            sourceJobId: "soft-delete-job",
            title: "Soft Delete Engineer",
            company: "Hidden Co",
          },
        ],
      },
      userId,
    );

    expect(reseeded).toHaveLength(0);
    expect(await listJobs(userId)).toHaveLength(0);
  });

  test("creates and updates profile-derived search preferences", async () => {
    const userId = `jobs-profile-${crypto.randomUUID()}`;
    const defaultProfile = await getJobSearchProfile(userId);

    expect(defaultProfile.minimumFitScore).toBe(75);
    expect(defaultProfile.maxSeededPerRun).toBe(25);

    const updated = await updateJobSearchProfile(
      {
        targetRoles: ["Backend Engineer"],
        primarySkills: ["Node.js", "TypeScript"],
        secondarySkills: ["React"],
        locations: ["Remote India"],
        experienceLevel: "Entry level",
        companyPreferences: ["startup"],
        excludedKeywords: ["senior"],
        minimumFitScore: 85,
        maxSeededPerRun: 10,
      },
      userId,
    );

    expect(updated.minimumFitScore).toBe(85);
    expect((await getJobSearchProfile(userId)).targetRoles).toEqual([
      "Backend Engineer",
    ]);
  });

  test("prepares strict exclusions for automation", async () => {
    const userId = `jobs-brief-${crypto.randomUUID()}`;
    await seedJobs(
      {
        source: "linkedin",
        jobs: [
          {
            title: "Backend Engineer",
            company: "Brief Co",
            location: "Pune",
            applyUrl: "https://example.com/jobs/brief",
            sourceJobId: "brief-1",
          },
        ],
      },
      userId,
    );

    const brief = await prepareJobSearchBrief(userId);

    expect(brief.minimumFitScore).toBe(75);
    expect(brief.maxSeededPerRun).toBe(25);
    expect(brief.exclusionFingerprints.sourceJobIds).toContain("brief-1");
    expect(brief.exclusionFingerprints.applyUrls).toContain(
      "https://example.com/jobs/brief",
    );
    expect(brief.searchKeywords.length).toBeGreaterThan(0);
  });

  test("ranked seeding enforces duplicate, score, and top-25 limits", async () => {
    const userId = `jobs-ranked-${crypto.randomUUID()}`;
    await updateJobSearchProfile(
      {
        targetRoles: ["Backend Engineer"],
        primarySkills: ["Node.js", "TypeScript", "PostgreSQL"],
        secondarySkills: ["React", "Docker"],
        locations: ["Remote India", "India"],
        experienceLevel: "Early-career",
        companyPreferences: ["startup", "product"],
        excludedKeywords: ["commission only"],
        minimumFitScore: 75,
        maxSeededPerRun: 25,
      },
      userId,
    );
    await seedJobs(
      {
        source: "linkedin",
        jobs: [
          {
            title: "Backend Engineer Duplicate",
            company: "Duplicate Co",
            location: "Remote India",
            applyUrl: "https://example.com/jobs/duplicate",
            sourceJobId: "duplicate-job",
          },
        ],
      },
      userId,
    );

    const strongJobs = Array.from({ length: 30 }, (_, index) => ({
      title: `Backend Engineer ${index + 1}`,
      company: `AI Product Startup ${index + 1}`,
      location: "Remote India",
      applyUrl: `https://example.com/jobs/ranked-${index + 1}`,
      sourceJobId: `ranked-${index + 1}`,
      description:
        "Early-career Node.js TypeScript PostgreSQL API work on a SaaS product platform.",
    }));
    const result = await seedRankedJobs(
      {
        source: "apify:test",
        runKey: `ranked-${crypto.randomUUID()}`,
        jobs: [
          {
            title: "Backend Engineer Duplicate",
            company: "Duplicate Co",
            location: "Remote India",
            applyUrl: "https://example.com/jobs/duplicate",
            sourceJobId: "duplicate-job",
          },
          {
            title: "Sales Executive",
            company: "Weak Co",
            location: "India",
            applyUrl: "https://example.com/jobs/sales",
            sourceJobId: "sales-job",
            description: "Commission only sales work.",
          },
          ...strongJobs,
        ],
      },
      userId,
    );
    const jobs = await listJobs(userId);
    const digests = await listJobDigests(userId);

    expect(result.seededJobs).toHaveLength(25);
    expect(result.digest.seededCount).toBe(25);
    expect(result.digest.duplicateCount).toBe(1);
    expect(result.digest.rejectedCount).toBeGreaterThanOrEqual(5);
    expect(digests[0].id).toBe(result.digest.id);
    expect(jobs.filter((job) => job.source === "apify:test")).toHaveLength(25);
  });

  test("ranked seeding is idempotent for a run key", async () => {
    const userId = `jobs-idempotent-${crypto.randomUUID()}`;
    const runKey = `idempotent-${crypto.randomUUID()}`;
    const input = {
      source: "apify:test",
      runKey,
      jobs: [
        {
          title: "Backend Engineer",
          company: "Idempotent Startup",
          location: "Remote India",
          applyUrl: "https://example.com/jobs/idempotent",
          sourceJobId: "idempotent-job",
          description:
            "Early-career Node.js TypeScript PostgreSQL API work for a product startup.",
        },
      ],
    };

    const first = await seedRankedJobs(input, userId);
    const second = await seedRankedJobs(input, userId);

    expect(first.digest.id).toBe(second.digest.id);
    expect(await listJobDigests(userId)).toHaveLength(1);
    expect((await listJobs(userId)).filter((job) => job.source === input.source))
      .toHaveLength(1);
  });
});

describe("job application runner helpers", () => {
  const profile = profileSnapshotSchema.parse({
    profile: {
      id: "profile-runner",
      userId: "runner-user",
      displayName: "Prathamesh Chougale",
      headline: "Full-stack developer",
      location: "Pune, India",
      email: "prathamesh@example.com",
      website: "https://linkedin.com/in/prathamesh",
      summary: "Builds practical AI and web systems.",
      applicationDefaults: {
        phone: "+91 9876543210",
        gender: "Male",
        defaultSource: "LinkedIn",
        joiningAvailabilityDays: 60,
        resumeLocalPath:
          "C:\\Users\\prath\\OneDrive\\Documents\\resume\\mncs\\Prathamesh_Chougale_Resume.pdf",
        college: "Example Institute",
        branch: "Computer Science",
        graduationYear: "2026",
        graduationPercentage: "78",
        xiiBoard: "HSC",
        xiiPercentage: "84",
        xBoard: "SSC",
        xPercentage: "78",
      },
      createdAt: "2026-05-08T00:00:00.000Z",
      updatedAt: "2026-05-08T00:00:00.000Z",
    },
    items: [
      {
        id: "profile-item-project",
        userId: "runner-user",
        type: "project",
        title: "Career Code Job Tracker",
        organization: "Open Source",
        location: "",
        startDate: "2026",
        endDate: "",
        description:
          "Built TypeScript APIs, MongoDB persistence, and a React dashboard.",
        url: "https://example.com/career-code",
        tags: ["TypeScript", "MongoDB", "React"],
        createdAt: "2026-05-08T00:00:00.000Z",
        updatedAt: "2026-05-08T00:00:00.000Z",
      },
    ],
  });

  test("generates a dry-run report for the latest batch only", () => {
    const latestJob = fixtureJob({
      title: "TypeScript Backend Engineer",
      seededAt: "2026-05-08T10:00:00.000Z",
      matchedSkills: ["TypeScript", "MongoDB"],
    });
    const olderJob = fixtureJob({
      title: "Older Frontend Engineer",
      seededAt: "2026-05-07T10:00:00.000Z",
    });
    const batch = latestUnappliedJobBatchFromJobs([olderJob, latestJob]);
    const report = generateJobApplicationRunReport({
      jobs: batch.jobs,
      latestSeededDateKey: batch.latestSeededDateKey,
      profile,
    });

    expect(report).toContain("Latest seeded date: 2026-05-08");
    expect(report).toContain("TypeScript Backend Engineer");
    expect(report).toContain("Career Code Job Tracker");
    expect(report).toContain("Prathamesh_Chougale_Resume.pdf");
    expect(report).not.toContain("Older Frontend Engineer");
  });

  test("classifies complex portals for manual review", () => {
    expect(classifyApplyUrl("https://docs.google.com/forms/d/e/123/viewform").kind)
      .toBe("google_form");
    expect(classifyApplyUrl("https://example.com/careers/apply").kind).toBe(
      "simple_form_candidate",
    );
    expect(classifyApplyUrl("https://jobs.lever.co/acme/123").kind).toBe(
      "manual_review",
    );
  });

  test("builds a browser-fixture fill plan and pauses before submit", () => {
    const defaults = buildApplicationFormDefaults(profile);
    const plan = buildSimpleFormFillPlan(
      [
        { label: "Full Name", type: "text" },
        { label: "Email address", type: "text" },
        { label: "Gender", type: "radio", options: ["Male", "Female"] },
        { label: "Resume / CV", type: "file" },
        { label: "XII percentage", type: "text" },
        { label: "Available to join in days", type: "text" },
      ],
      defaults,
    );

    expect(plan).toEqual([
      { label: "Full Name", value: "Prathamesh Chougale", action: "fill" },
      { label: "Email address", value: "prathamesh@example.com", action: "fill" },
      { label: "Gender", value: "Male", action: "choose" },
      {
        label: "Resume / CV",
        value:
          "C:\\Users\\prath\\OneDrive\\Documents\\resume\\mncs\\Prathamesh_Chougale_Resume.pdf",
        action: "upload",
      },
      { label: "XII percentage", value: "84", action: "fill" },
      { label: "Available to join in days", value: "60", action: "fill" },
    ]);
  });
});
