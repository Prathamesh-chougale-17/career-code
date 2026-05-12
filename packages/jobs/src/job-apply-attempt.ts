import { jobApplicationAttemptStatusSchema } from "@careeright/domain/jobs/schema";
import { updateJobApplicationAttempt } from "@careeright/domain/jobs/store";
import { SOLO_USER_ID } from "@careeright/domain/kanban/schema";

function readFlag(name: string) {
  const index = process.argv.findIndex((arg) => arg === name);

  if (index === -1) {
    return "";
  }

  return process.argv[index + 1]?.trim() ?? "";
}

function requireFlag(name: string) {
  const value = readFlag(name);

  if (!value) {
    throw new Error(`Missing required flag: ${name}`);
  }

  return value;
}

async function main() {
  const userId =
    readFlag("--user") ||
    process.env.CAREERIGHT_USER_ID ||
    process.env.CAREER_CODE_USER_ID ||
    process.env.HABAGE_USER_ID ||
    SOLO_USER_ID;
  const status = jobApplicationAttemptStatusSchema.parse(
    requireFlag("--status"),
  );
  const run = await updateJobApplicationAttempt(
    {
      runId: requireFlag("--run"),
      jobId: requireFlag("--job"),
      status,
      advice: readFlag("--advice") || undefined,
      skipReason: readFlag("--reason") || undefined,
      error: readFlag("--error") || undefined,
      formUrl: readFlag("--form-url") || undefined,
    },
    userId,
  );
  const attempt = run.attempts.find((item) => item.jobId === readFlag("--job"));

  console.log(
    JSON.stringify(
      {
        runId: run.id,
        latestSeededDateKey: run.latestSeededDateKey,
        attempt,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[job-apply-attempt] Failed to update attempt.", error);
  process.exitCode = 1;
});
