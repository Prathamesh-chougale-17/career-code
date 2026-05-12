import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  createJobApplicationRun,
  getLatestUnappliedJobBatch,
} from "@career-code/domain/jobs/store";
import { generateJobApplicationRunReport } from "@career-code/domain/jobs/application-runner";
import { SOLO_USER_ID } from "@career-code/domain/kanban/schema";
import { getProfileSnapshot } from "@career-code/domain/profile/store";

function userIdFromArgs() {
  const userFlagIndex = process.argv.findIndex((arg) => arg === "--user");
  const userFlagValue =
    userFlagIndex === -1 ? undefined : process.argv[userFlagIndex + 1];

  return (
    userFlagValue?.trim() ||
    process.env.CAREER_CODE_USER_ID ||
    process.env.HABAGE_USER_ID ||
    SOLO_USER_ID
  );
}

async function main() {
  const userId = userIdFromArgs();
  const [batch, profile] = await Promise.all([
    getLatestUnappliedJobBatch(userId),
    getProfileSnapshot(userId),
  ]);
  const report = generateJobApplicationRunReport({
    jobs: batch.jobs,
    latestSeededDateKey: batch.latestSeededDateKey,
    profile,
  });
  const run = await createJobApplicationRun({ report }, userId);
  const outputDirectory = resolve(process.cwd(), "tmp", "job-apply");
  const outputPath = resolve(outputDirectory, `${run.id}.md`);

  await mkdir(outputDirectory, { recursive: true });
  await writeFile(outputPath, report, "utf8");

  console.log(report);
  console.log("");
  console.log(`Run ID: ${run.id}`);
  console.log(`Report: ${outputPath}`);
  console.log(
    "Next: use Codex with Chrome to open each supported Apply URL, fill known fields, and pause before Submit.",
  );
}

main().catch((error) => {
  console.error("[job-apply-runner] Failed to create run.", error);
  process.exitCode = 1;
});
