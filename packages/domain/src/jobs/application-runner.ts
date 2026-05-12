import type { JobRecord } from "@career-code/domain/jobs/schema";
import type { ProfileSnapshot } from "@career-code/domain/profile/schema";

type ApplyClassification =
  | {
      kind: "google_form";
      reason: string;
    }
  | {
      kind: "simple_form_candidate";
      reason: string;
    }
  | {
      kind: "manual_review";
      reason: string;
    };

export type ApplicationFormDefaults = {
  fullName: string;
  email: string;
  phone: string;
  gender: string;
  source: string;
  joiningAvailabilityDays: string;
  linkedinUrl: string;
  currentLocation: string;
  resumeLocalPath: string;
  college: string;
  branch: string;
  graduationYear: string;
  graduationPercentage: string;
  xiiBoard: string;
  xiiPercentage: string;
  xBoard: string;
  xPercentage: string;
};

export type FormFixtureField = {
  label: string;
  type: "text" | "textarea" | "radio" | "select" | "file";
  options?: string[];
};

export type FormFillPlanItem = {
  label: string;
  value: string;
  action: "fill" | "choose" | "upload" | "skip";
  reason?: string;
};

const manualReviewHosts = [
  "linkedin.com",
  "workdayjobs.com",
  "myworkdayjobs.com",
  "myworkdaysite.com",
  "lever.co",
  "greenhouse.io",
  "workable.com",
  "smartrecruiters.com",
  "jobs.ashbyhq.com",
  "ashbyhq.com",
];

function hostnameMatches(hostname: string, domain: string) {
  return hostname === domain || hostname.endsWith(`.${domain}`);
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

export function jobUrl(job: JobRecord) {
  return rawString(job.raw, ["jobUrl", "job_url", "link", "url", "inputUrl"]);
}

export function classifyApplyUrl(applyUrl: string): ApplyClassification {
  if (!applyUrl.trim()) {
    return {
      kind: "manual_review",
      reason: "Missing application URL.",
    };
  }

  let url: URL;

  try {
    url = new URL(applyUrl);
  } catch {
    return {
      kind: "manual_review",
      reason: "Application URL is not valid.",
    };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return {
      kind: "manual_review",
      reason: "Application URL is not HTTP/HTTPS.",
    };
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "docs.google.com" && url.pathname.includes("/forms/")) {
    return {
      kind: "google_form",
      reason: "Google Forms is supported as a known-safe fill-and-pause target.",
    };
  }

  const blockedHost = manualReviewHosts.find((domain) =>
    hostnameMatches(hostname, domain),
  );

  if (blockedHost) {
    return {
      kind: "manual_review",
      reason: `${blockedHost} usually requires portal-specific review, login, or multi-step submission.`,
    };
  }

  return {
    kind: "simple_form_candidate",
    reason:
      "Unknown company-hosted form. Codex may fill obvious fields, then pause before submit.",
  };
}

export function buildApplicationFormDefaults(
  snapshot: ProfileSnapshot,
): ApplicationFormDefaults {
  const defaults = snapshot.profile.applicationDefaults;
  const linkedinUrl =
    defaults.linkedinUrl ||
    (snapshot.profile.website.includes("linkedin.com")
      ? snapshot.profile.website
      : "");

  return {
    fullName: snapshot.profile.displayName,
    email: snapshot.profile.email,
    phone: defaults.phone,
    gender: defaults.gender,
    source: defaults.defaultSource,
    joiningAvailabilityDays:
      defaults.joiningAvailabilityDays === null
        ? ""
        : String(defaults.joiningAvailabilityDays),
    linkedinUrl,
    currentLocation: snapshot.profile.location,
    resumeLocalPath: defaults.resumeLocalPath,
    college: defaults.college,
    branch: defaults.branch,
    graduationYear: defaults.graduationYear,
    graduationPercentage: defaults.graduationPercentage,
    xiiBoard: defaults.xiiBoard,
    xiiPercentage: defaults.xiiPercentage,
    xBoard: defaults.xBoard,
    xPercentage: defaults.xPercentage,
  };
}

function normalizedWords(value: string) {
  return new Set(
    value
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2),
  );
}

function chooseProject(job: JobRecord, snapshot: ProfileSnapshot) {
  const jobWords = normalizedWords(
    [
      job.title,
      job.description,
      job.matchedSkills.join(" "),
      job.missingSkills.join(" "),
    ].join(" "),
  );
  const projects = snapshot.items.filter((item) => item.type === "project");

  return projects
    .map((project) => {
      const projectWords = normalizedWords(
        [project.title, project.description, project.tags.join(" ")].join(" "),
      );
      let score = 0;

      for (const word of projectWords) {
        if (jobWords.has(word)) {
          score += 1;
        }
      }

      return { project, score };
    })
    .sort((a, b) => b.score - a.score || a.project.title.localeCompare(b.project.title))
    [0]?.project;
}

export function buildJobApplicationAdvice(
  job: JobRecord,
  snapshot: ProfileSnapshot,
) {
  const project = chooseProject(job, snapshot);
  const matchedSkills = job.matchedSkills.slice(0, 6).join(", ");
  const missingSkills = job.missingSkills.slice(0, 6).join(", ");
  const fitReasons = job.fitReasons.slice(0, 4).join("; ");
  const advice = [
    `Lead with ${project ? project.title : "your strongest backend/AI project"}.`,
    matchedSkills
      ? `Emphasize matched skills: ${matchedSkills}.`
      : "Emphasize backend ownership, product impact, and reliability work.",
    missingSkills
      ? `If truthful, add evidence for these gaps before applying: ${missingSkills}.`
      : "No major missing-skill signals were recorded for this job.",
    fitReasons ? `Fit context: ${fitReasons}.` : "",
    "Keep the final submit step for user review.",
  ].filter(Boolean);

  return advice.join(" ");
}

function markdownEscape(value: string) {
  return value.replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

export function generateJobApplicationRunReport({
  jobs,
  latestSeededDateKey,
  profile,
}: {
  jobs: JobRecord[];
  latestSeededDateKey: string | null;
  profile: ProfileSnapshot;
}) {
  const defaults = buildApplicationFormDefaults(profile);
  const lines = [
    `# Latest Batch Job Apply Run`,
    "",
    `Latest seeded date: ${latestSeededDateKey ?? "none"}`,
    `Selected not-applied jobs: ${jobs.length}`,
    "",
    "## Form Defaults",
    "",
    `- Name: ${defaults.fullName || "missing"}`,
    `- Email: ${defaults.email || "missing"}`,
    `- Phone: ${defaults.phone || "missing"}`,
    `- Resume path: ${defaults.resumeLocalPath || "missing"}`,
    `- LinkedIn: ${defaults.linkedinUrl || "missing"}`,
    "",
    "## Jobs",
    "",
    "| # | Job ID | Source | Role | Company | Fit | Apply | Job | Automation | Advice |",
    "| - | - | - | - | - | - | - | - | - | - |",
  ];

  jobs.forEach((job, index) => {
    const classification = classifyApplyUrl(job.applyUrl);
    const advice = buildJobApplicationAdvice(job, profile);

    lines.push(
      [
        index + 1,
        markdownEscape(job.id),
        markdownEscape(job.source || "Not listed"),
        markdownEscape(job.title),
        markdownEscape(job.company || "Not listed"),
        markdownEscape(job.fitScore === null ? "Unscored" : String(job.fitScore)),
        job.applyUrl ? `[Apply](${job.applyUrl})` : "Missing",
        jobUrl(job) ? `[Open](${jobUrl(job)})` : "Missing",
        markdownEscape(`${classification.kind}: ${classification.reason}`),
        markdownEscape(advice),
      ].join(" | "),
    );
  });

  lines.push(
    "",
    "## Runner Safety",
    "",
    "- Use Chrome with the signed-in user profile.",
    "- Fill supported forms only; pause before Submit.",
    "- Mark complex portals as manual review.",
    "- Do not change job status until the user submits or a confirmation page is detected.",
  );

  return lines.join("\n");
}

export function buildSimpleFormFillPlan(
  fields: FormFixtureField[],
  defaults: ApplicationFormDefaults,
) {
  return fields.map<FormFillPlanItem>((field) => {
    const label = field.label.toLowerCase();

    if (field.type === "file" || /resume|cv/.test(label)) {
      return defaults.resumeLocalPath
        ? { label: field.label, value: defaults.resumeLocalPath, action: "upload" }
        : {
            label: field.label,
            value: "",
            action: "skip",
            reason: "No saved resume path.",
          };
    }

    const value =
      label.includes("full name") || label === "name"
        ? defaults.fullName
        : label.includes("email")
          ? defaults.email
          : label.includes("mobile") || label.includes("phone")
            ? defaults.phone
            : label.includes("gender")
              ? defaults.gender
              : label.includes("source")
                ? defaults.source
                : label.includes("linkedin")
                  ? defaults.linkedinUrl
                  : label.includes("city") || label.includes("state")
                    ? defaults.currentLocation
                    : label.includes("college") || label.includes("university")
                      ? defaults.college
                      : label.includes("branch")
                        ? defaults.branch
                        : label.includes("graduate") || label.includes("year")
                          ? defaults.graduationYear
                          : label.includes("xii")
                            ? label.includes("board")
                              ? defaults.xiiBoard
                              : defaults.xiiPercentage
                            : label.includes("xth")
                              ? label.includes("board")
                                ? defaults.xBoard
                                : defaults.xPercentage
                              : label.includes("join")
                                ? defaults.joiningAvailabilityDays
                                : label.includes("cgpa") || label.includes("percentage")
                                  ? defaults.graduationPercentage
                                  : "";

    if (!value) {
      return {
        label: field.label,
        value: "",
        action: "skip",
        reason: "No matching saved default.",
      };
    }

    return {
      label: field.label,
      value,
      action: field.type === "radio" || field.type === "select" ? "choose" : "fill",
    };
  });
}
