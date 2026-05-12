import { serve } from "inngest/next";

import { inngest } from "@career-code/inngest/client";
import { inngestFunctions } from "@career-code/inngest/functions";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});

