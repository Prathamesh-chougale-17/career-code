import { serve } from "inngest/next";

import { inngest } from "@careeright/inngest/client";
import { inngestFunctions } from "@careeright/inngest/functions";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: inngestFunctions,
});

