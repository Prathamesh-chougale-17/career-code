import { Inngest } from "inngest";

if (
  process.env.NODE_ENV !== "production" &&
  !process.env.INNGEST_DEV &&
  !process.env.INNGEST_SIGNING_KEY
) {
  process.env.INNGEST_DEV = "1";
}

export const inngest = new Inngest({
  id: "career-code",
});

