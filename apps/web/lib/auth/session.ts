import { headers } from "next/headers";
import { redirect } from "next/navigation";

import {
  getSessionFromHeaders,
  normalizeAuthCallbackPath,
} from "@career-code/auth/server";

export { getSessionFromHeaders, normalizeAuthCallbackPath };

export async function getSessionFromServerHeaders() {
  return getSessionFromHeaders(await headers());
}

export async function requirePageSession(callbackPath = "/") {
  let session: Awaited<ReturnType<typeof getSessionFromServerHeaders>>;

  try {
    session = await getSessionFromServerHeaders();
  } catch {
    redirect(
      `/sign-in?callbackURL=${encodeURIComponent(
        normalizeAuthCallbackPath(callbackPath),
      )}&authError=configuration`,
    );
  }

  if (!session?.user) {
    redirect(
      `/sign-in?callbackURL=${encodeURIComponent(
        normalizeAuthCallbackPath(callbackPath),
      )}`,
    );
  }

  return session;
}
