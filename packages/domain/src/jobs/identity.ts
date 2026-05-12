import type { ParsedSeedJob, JobRecord } from "@career-code/domain/jobs/schema";

export function normalizeJobIdentityText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function jobFingerprintFromFields({
  title,
  company,
  location,
}: {
  title: string;
  company: string;
  location: string;
}) {
  return [title, company, location].map(normalizeJobIdentityText).join("|");
}

export function jobFingerprint(job: Pick<JobRecord, "title" | "company" | "location">) {
  return jobFingerprintFromFields(job);
}

export function seedJobFingerprint(input: ParsedSeedJob) {
  return jobFingerprintFromFields(input);
}

export function matchesJobFingerprint(job: JobRecord, input: ParsedSeedJob) {
  return jobFingerprint(job) === seedJobFingerprint(input);
}

export function jobIdentityKeySet(
  job: Pick<JobRecord, "sourceJobId" | "applyUrl" | "title" | "company" | "location">,
) {
  const keys = new Set<string>();

  if (job.sourceJobId) {
    keys.add(`sourceJobId:${normalizeJobIdentityText(job.sourceJobId)}`);
  }

  if (job.applyUrl) {
    keys.add(`applyUrl:${normalizeJobIdentityText(job.applyUrl)}`);
  }

  keys.add(`fingerprint:${jobFingerprintFromFields(job)}`);
  return keys;
}

export function seedJobIdentityKeySet(input: ParsedSeedJob) {
  const keys = new Set<string>();

  if (input.sourceJobId) {
    keys.add(`sourceJobId:${normalizeJobIdentityText(input.sourceJobId)}`);
  }

  if (input.applyUrl) {
    keys.add(`applyUrl:${normalizeJobIdentityText(input.applyUrl)}`);
  }

  keys.add(`fingerprint:${seedJobFingerprint(input)}`);
  return keys;
}
