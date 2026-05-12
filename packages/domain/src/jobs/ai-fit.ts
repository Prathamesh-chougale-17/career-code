import { generateText, Output } from "ai";
import { z } from "zod";

import type { ScoredJobCandidate } from "@career-code/domain/jobs/matcher";
import type { JobSearchProfile } from "@career-code/domain/jobs/schema";

const aiJobFitOutputSchema = z.object({
  fitReasons: z.array(z.string().trim().min(1).max(220)).max(4).default([]),
  riskFlags: z.array(z.string().trim().min(1).max(160)).max(3).default([]),
});

const AI_JOB_FIT_SYSTEM_PROMPT = [
  "You write concise job-fit explanations for Career Code.",
  "Do not change scores, invent facts, or use salary as a ranking signal.",
  "Prefer concrete reasons tied to role, skills, experience level, location, and company quality.",
  "Return only short fitReasons and riskFlags that are directly supported by the job data.",
].join("\n");

function configuredJobFitModel() {
  return process.env.AI_JOB_MATCH_MODEL?.trim() || "";
}

function uniq(values: string[]) {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export async function enrichScoredJobsWithAi(
  candidates: ScoredJobCandidate[],
  searchProfile: JobSearchProfile,
  limit: number,
) {
  const model = configuredJobFitModel();

  if (!model) {
    return candidates;
  }

  const selectedIds = new Set(
    candidates
      .slice()
      .sort((a, b) => b.fitScore - a.fitScore)
      .slice(0, Math.max(1, Math.min(25, limit)))
      .map(
        (candidate) =>
          candidate.job.sourceJobId || candidate.job.applyUrl || candidate.job.title,
      ),
  );
  const enriched: ScoredJobCandidate[] = [];

  for (const candidate of candidates) {
    const candidateId =
      candidate.job.sourceJobId || candidate.job.applyUrl || candidate.job.title;

    if (!selectedIds.has(candidateId)) {
      enriched.push(candidate);
      continue;
    }

    try {
      const result = await generateText({
        model,
        system: AI_JOB_FIT_SYSTEM_PROMPT,
        prompt: JSON.stringify({
          searchProfile: {
            targetRoles: searchProfile.targetRoles,
            primarySkills: searchProfile.primarySkills,
            secondarySkills: searchProfile.secondarySkills,
            locations: searchProfile.locations,
            experienceLevel: searchProfile.experienceLevel,
            companyPreferences: searchProfile.companyPreferences,
          },
          deterministicFit: {
            fitScore: candidate.fitScore,
            fitBand: candidate.fitBand,
            fitReasons: candidate.fitReasons,
            matchedSkills: candidate.matchedSkills,
            missingSkills: candidate.missingSkills,
            riskFlags: candidate.riskFlags,
          },
          job: {
            title: candidate.job.title,
            company: candidate.job.company,
            location: candidate.job.location,
            postedAt: candidate.job.postedAt,
            description: candidate.job.description,
            raw: candidate.job.raw,
          },
        }),
        output: Output.object({
          schema: aiJobFitOutputSchema,
          name: "job_fit_explanation",
          description:
            "Concise supported job-fit explanation and risk flags. Salary must not affect the result.",
        }),
      });

      enriched.push({
        ...candidate,
        fitReasons:
          result.output.fitReasons.length > 0
            ? result.output.fitReasons
            : candidate.fitReasons,
        riskFlags: uniq([...candidate.riskFlags, ...result.output.riskFlags]),
      });
    } catch (error) {
      console.error("[jobs/ai-fit] Failed to enrich job fit reasons.", error);
      enriched.push(candidate);
    }
  }

  return enriched;
}
