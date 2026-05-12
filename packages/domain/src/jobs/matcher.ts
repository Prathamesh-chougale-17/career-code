import {
  jobSearchProfileInputSchema,
  seedJobInputSchema,
  type JobFitBand,
  type JobSearchProfile,
  type ParsedSeedJob,
  type SeedJobInput,
} from "@career-code/domain/jobs/schema";

export const JOB_SCORE_VERSION = "job-match-v1";

export type ScoredJobCandidate = {
  job: ParsedSeedJob;
  fitScore: number;
  fitBand: JobFitBand;
  fitReasons: string[];
  matchedSkills: string[];
  missingSkills: string[];
  riskFlags: string[];
  scoreVersion: string;
  scoredAt: string;
};

const defaultTargetRoles = [
  "Software Engineer",
  "Software Developer",
  "Backend Engineer",
  "Backend Developer",
  "Full Stack Developer",
];

const defaultPrimarySkills = [
  "Node.js",
  "TypeScript",
  "JavaScript",
  "Backend APIs",
  "PostgreSQL",
  "Redis",
  "Docker",
];

const defaultSecondarySkills = [
  "React",
  "Next.js",
  "Python",
  "FastAPI",
  "Kafka",
  "AI",
  "LLM",
  "React Native",
];

const defaultLocations = [
  "Pune",
  "Remote India",
  "Bengaluru",
  "Hyderabad",
  "Mumbai",
  "Gurugram",
  "India",
];

const defaultCompanyPreferences = [
  "startup",
  "product company",
  "SaaS",
  "fintech",
  "AI",
  "devtools",
  "platform",
  "security",
];

const unrelatedSignals = [
  "sales",
  "marketing",
  "designer",
  "recruiter",
  "hr ",
  "customer support",
  "technical support",
  "qa tester",
  "manual testing",
  "business analyst",
  "data entry",
];

const seniorSignals = [
  "senior",
  "lead",
  "staff",
  "principal",
  "architect",
  "manager",
  "head of",
];

const backendSignals = [
  "backend",
  "back-end",
  "node",
  "api",
  "server",
  "platform",
  "distributed",
  "postgres",
  "redis",
  "kafka",
  "microservice",
];

const frontendSignals = ["frontend", "front-end", "react", "next.js", "ui "];

const companyQualitySignals = [
  "startup",
  "product",
  "saas",
  "fintech",
  "platform",
  "devtools",
  "developer tool",
  "cloud",
  "security",
  "auth",
  "ai",
  "ml",
  "funded",
  "engineering",
];

const weakCompanySignals = [
  "training",
  "institute",
  "commission",
  "unpaid",
  "walk-in",
  "placement",
  "consultancy",
  "consultant hiring",
];

function uniq(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9.+#/-]+/g, " ").trim();
}

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(normalize(value)));
}

function rawValueText(value: unknown): string {
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
    return value.map(rawValueText).join(" ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([key]) => !/salary|compensation|pay/i.test(key))
      .map(([, item]) => rawValueText(item))
      .join(" ");
  }

  return "";
}

function searchableJobText(job: ParsedSeedJob) {
  return normalize(
    [
      job.title,
      job.company,
      job.location,
      job.description,
      rawValueText(job.raw),
    ].join(" "),
  );
}

function skillAliases(skill: string) {
  const normalized = normalize(skill);

  if (normalized === "backend apis") {
    return ["backend api", "backend", "api", "rest api"];
  }

  if (normalized === "node.js") {
    return ["node.js", "nodejs", "node js"];
  }

  if (normalized === "next.js") {
    return ["next.js", "nextjs", "next js"];
  }

  if (normalized === "llm") {
    return ["llm", "large language model", "rag"];
  }

  return [normalized];
}

function matchSkills(text: string, skills: string[]) {
  return skills.filter((skill) =>
    skillAliases(skill).some((alias) => text.includes(alias)),
  );
}

function titleMatchesRole(title: string, roles: string[]) {
  const normalizedTitle = normalize(title);

  return roles.some((role) => {
    const normalizedRole = normalize(role);
    const roleTerms = normalizedRole.split(/\s+/).filter(Boolean);
    return (
      normalizedTitle.includes(normalizedRole) ||
      roleTerms.every((term) => normalizedTitle.includes(term))
    );
  });
}

function locationMatches(location: string, profile: JobSearchProfile) {
  const text = normalize(location);

  if (!text) {
    return false;
  }

  return profile.locations.some((item) => {
    const normalizedLocation = normalize(item);
    return text.includes(normalizedLocation) || normalizedLocation.includes(text);
  });
}

function yearsRequirementTooHigh(text: string) {
  const matches = text.match(/\b([4-9]|1[0-9])\+?\s*(?:years|yrs|yr)\b/g) ?? [];
  return matches.length > 0;
}

function fitBand(score: number, riskFlags: string[]): JobFitBand {
  if (
    riskFlags.some((flag) =>
      /unrelated|senior-only|missing company|unsafe apply/i.test(flag),
    )
  ) {
    return "rejected";
  }

  if (score >= 90) {
    return "excellent";
  }

  if (score >= 75) {
    return "strong";
  }

  if (score >= 55) {
    return "needs_review";
  }

  return "rejected";
}

export function defaultJobSearchProfileInput() {
  return jobSearchProfileInputSchema.parse({
    targetRoles: defaultTargetRoles,
    primarySkills: defaultPrimarySkills,
    secondarySkills: defaultSecondarySkills,
    locations: defaultLocations,
    experienceLevel: "Early-career / entry-level / associate / 0-3 years",
    companyPreferences: defaultCompanyPreferences,
    excludedKeywords: [
      "senior",
      "lead",
      "staff",
      "principal",
      "architect",
      "manager",
      "unpaid",
      "commission only",
      "training institute",
    ],
    minimumFitScore: 75,
    maxSeededPerRun: 25,
  });
}

export function searchKeywordsForProfile(profile: JobSearchProfile) {
  const primarySkills = profile.primarySkills.slice(0, 4);
  const backendSkill =
    primarySkills.find((skill) => /node|typescript|backend/i.test(skill)) ??
    primarySkills[0] ??
    "Backend";
  const startupRoles = profile.targetRoles
    .filter((role) => /engineer|developer/i.test(role))
    .slice(0, 3)
    .map((role) => `Startup ${role} ${backendSkill}`);

  return uniq([
    ...profile.targetRoles.flatMap((role) => [
      `${role} ${backendSkill}`,
      `${role} ${primarySkills.slice(0, 2).join(" ")}`.trim(),
    ]),
    "Backend Engineer Node.js",
    "Software Engineer Node.js",
    "Node.js Developer TypeScript",
    "Product Engineer Backend Startup",
    "Founding Engineer Backend TypeScript",
    ...startupRoles,
  ]).slice(0, 20);
}

export function scoreJobCandidate(
  input: SeedJobInput,
  profile: JobSearchProfile,
  scoredAt = new Date().toISOString(),
): ScoredJobCandidate {
  const job = seedJobInputSchema.parse(input);
  const titleText = normalize(job.title);
  const fullText = searchableJobText(job);
  const companyText = normalize([job.company, rawValueText(job.raw)].join(" "));
  const fitReasons: string[] = [];
  const riskFlags: string[] = [];
  let score = 35;

  if (!job.company) {
    riskFlags.push("Missing company name");
    score -= 20;
  }

  if (!job.applyUrl && !/(https?:\/\/)/i.test(rawValueText(job.raw))) {
    riskFlags.push("Missing safe apply or job URL");
    score -= 12;
  }

  if (titleMatchesRole(job.title, profile.targetRoles)) {
    fitReasons.push("Role title matches target roles");
    score += 18;
  } else if (includesAny(titleText, ["software", "developer", "engineer"])) {
    fitReasons.push("Role title is near the target engineering family");
    score += 8;
  }

  const primaryMatches = matchSkills(fullText, profile.primarySkills);
  const secondaryMatches = matchSkills(fullText, profile.secondarySkills);
  const matchedSkills = uniq([...primaryMatches, ...secondaryMatches]);
  const missingSkills = profile.primarySkills
    .filter((skill) => !primaryMatches.includes(skill))
    .slice(0, 6);

  if (primaryMatches.length > 0) {
    fitReasons.push(`Matches primary skills: ${primaryMatches.slice(0, 5).join(", ")}`);
    score += Math.min(24, primaryMatches.length * 6);
  }

  if (secondaryMatches.length > 0) {
    fitReasons.push(
      `Matches secondary skills: ${secondaryMatches.slice(0, 4).join(", ")}`,
    );
    score += Math.min(10, secondaryMatches.length * 3);
  }

  if (includesAny(fullText, backendSignals)) {
    fitReasons.push("Includes meaningful backend/platform work");
    score += 10;
  }

  if (locationMatches(job.location, profile) || includesAny(fullText, ["remote india"])) {
    fitReasons.push("Location matches search preferences");
    score += 8;
  }

  if (
    includesAny(fullText, [
      "entry level",
      "entry-level",
      "fresher",
      "graduate",
      "associate",
      "0-2",
      "0 to 2",
      "0-3",
      "1-3",
    ])
  ) {
    fitReasons.push("Experience level appears early-career friendly");
    score += 8;
  }

  if (includesAny(companyText, companyQualitySignals)) {
    fitReasons.push("Company signals match preferred product/startup profile");
    score += 8;
  }

  if (job.applyUrl) {
    score += 3;
  }

  if (includesAny(fullText, unrelatedSignals)) {
    riskFlags.push("Unrelated or low-fit role family");
    score -= 35;
  }

  if (includesAny(titleText, seniorSignals) || yearsRequirementTooHigh(fullText)) {
    riskFlags.push("Senior-only or beyond target experience level");
    score -= 35;
  }

  if (
    includesAny(titleText, frontendSignals) &&
    !includesAny(fullText, backendSignals) &&
    !includesAny(titleText, ["full stack", "full-stack"])
  ) {
    riskFlags.push("Frontend-only listing without backend ownership");
    score -= 12;
  }

  if (includesAny(companyText, weakCompanySignals)) {
    riskFlags.push("Weak company or suspicious listing signal");
    score -= 18;
  }

  for (const excludedKeyword of profile.excludedKeywords) {
    if (fullText.includes(normalize(excludedKeyword))) {
      riskFlags.push(`Contains excluded keyword: ${excludedKeyword}`);
      score -= 10;
    }
  }

  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const band = fitBand(boundedScore, riskFlags);

  return {
    job,
    fitScore: boundedScore,
    fitBand: band,
    fitReasons: fitReasons.length > 0 ? uniq(fitReasons).slice(0, 6) : ["General software role match"],
    matchedSkills,
    missingSkills,
    riskFlags: uniq(riskFlags).slice(0, 6),
    scoreVersion: JOB_SCORE_VERSION,
    scoredAt,
  };
}

export function enrichSeedJobWithScore(candidate: ScoredJobCandidate) {
  return {
    ...candidate.job,
    fitScore: candidate.fitScore,
    fitBand: candidate.fitBand,
    fitReasons: candidate.fitReasons,
    matchedSkills: candidate.matchedSkills,
    missingSkills: candidate.missingSkills,
    riskFlags: candidate.riskFlags,
    scoreVersion: candidate.scoreVersion,
    scoredAt: candidate.scoredAt,
    raw: {
      ...candidate.job.raw,
      fitBand: candidate.fitBand,
      fitReasons: candidate.fitReasons,
      matchedSkills: candidate.matchedSkills,
      missingSkills: candidate.missingSkills,
      riskFlags: candidate.riskFlags,
      scoreVersion: candidate.scoreVersion,
      scoredAt: candidate.scoredAt,
    },
  };
}
