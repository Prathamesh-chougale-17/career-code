import { eventType } from "inngest";
import { z } from "zod";

import { proposeTaskBreakdown } from "@careeright/domain/kanban/store";
import { inngest } from "@careeright/inngest/client";

const taskBreakdownRequestedSchema = z.object({
  prompt: z.string().trim().min(8).max(8000),
  userId: z.string().trim().min(1),
});

type CareerightInngestFunction = ReturnType<typeof inngest.createFunction>;

export const processTaskBreakdown: CareerightInngestFunction =
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

export const inngestFunctions: CareerightInngestFunction[] = [
  processTaskBreakdown,
];
