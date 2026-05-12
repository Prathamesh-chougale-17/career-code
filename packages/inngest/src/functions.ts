import { eventType } from "inngest";
import { z } from "zod";

import { proposeTaskBreakdown } from "@career-code/domain/kanban/store";
import { inngest } from "@career-code/inngest/client";

const taskBreakdownRequestedSchema = z.object({
  prompt: z.string().trim().min(8).max(8000),
  userId: z.string().trim().min(1),
});

type CareerCodeInngestFunction = ReturnType<typeof inngest.createFunction>;

export const processTaskBreakdown: CareerCodeInngestFunction =
  inngest.createFunction(
  {
    id: "process-task-breakdown",
    triggers: [eventType("kanban/task-breakdown.requested")],
  },
  async ({ event, step }) => {
    const { prompt, userId } = taskBreakdownRequestedSchema.parse(event.data);

    return step.run("create-task-breakdown-proposal", () =>
      proposeTaskBreakdown(prompt, "ai", userId),
    );
  },
  );

export const inngestFunctions: CareerCodeInngestFunction[] = [
  processTaskBreakdown,
];
