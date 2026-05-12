import { generateText, Output } from "ai";
import { z } from "zod";

import {
  type ProposedTask,
  proposedTaskSchema,
} from "@careeright/domain/kanban/schema";

export const taskBreakdownOutputSchema = z.object({
  tasks: z.array(proposedTaskSchema).min(1),
});

export const TASK_BREAKDOWN_SYSTEM_PROMPT = [
  "You create pending Careeright task_breakdown proposals. You do not create direct Todo cards.",
  "Create as many concise, actionable tasks as needed for the user's request; avoid padding, artificial caps, or stopping early when the plan needs more tasks.",
  "Use a foundation-to-advanced progression with exact dependencies that reference earlier task titles.",
  "Every task must include a short title, concrete description, priority, suggestedColumn, acceptanceCriteria, and dependencies.",
  "Acceptance criteria must be measurable and action-oriented. Prefer counts, artifacts, examples, redo loops, review logs, tests, diagrams, or timed practice over vague learning goals.",
  "Include topic-specific subpatterns, not only broad topic names. For study plans, cover fundamentals, core patterns, advanced variants, practical drills, and final assessment.",
  "When genuinely useful, include resourceLinks, helpfulLinks, or problemLinks as arrays of { title, url } objects. Use only accurate http or https URLs and do not force links onto every task.",
  "If learner context is missing, include an early baseline/scope task that captures skill level, timeline, daily study time, target interview type, preferred language/platform, and resource preference.",
  "Keep task titles under 80 characters when possible. Keep descriptions specific enough that the user knows exactly what to do.",
  "Use suggestedColumn \"todo\" for proposal tasks unless the prompt explicitly requests another column.",
  "Prefer high priority for foundations, critical core patterns, and final assessment; use medium or low for supporting or optional enrichment tasks.",
].join("\n");

export type TaskBreakdownResult = {
  tasks: ProposedTask[];
  provider: string;
  status: "completed";
};

export async function createTaskBreakdown(
  prompt: string,
): Promise<TaskBreakdownResult> {
  const configuredModel = process.env.AI_TASK_MODEL?.trim();

  if (!configuredModel) {
    throw new Error(
      "AI_TASK_MODEL is required to create task breakdown proposals.",
    );
  }

  try {
    const result = await generateText({
      model: configuredModel,
      system: TASK_BREAKDOWN_SYSTEM_PROMPT,
      prompt: `Break this work into Kanban tasks:\n\n${prompt}`,
      output: Output.object({
        schema: taskBreakdownOutputSchema,
        name: "task_breakdown",
        description:
          "Validated Kanban task breakdown with title, description, priority, acceptance criteria, suggested column, and dependencies.",
      }),
    });

    return {
      tasks: result.output.tasks,
      provider: configuredModel,
      status: "completed",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`AI task breakdown failed: ${message}`);
  }
}
