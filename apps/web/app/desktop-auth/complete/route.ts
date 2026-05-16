import { NextResponse } from "next/server";

import { createDesktopAuthCode, getSessionFromHeaders } from "@careeright/auth/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state")?.trim();

  if (!state) {
    return Response.json({ error: "Missing desktop auth state." }, { status: 400 });
  }

  const session = await getSessionFromHeaders(request.headers);

  if (!session?.user?.id) {
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set(
      "callbackURL",
      `/desktop-auth/complete?state=${encodeURIComponent(state)}`,
    );

    return NextResponse.redirect(signInUrl);
  }

  const code = await createDesktopAuthCode({
    state,
    userId: session.user.id,
  });
  const callbackUrl = new URL("careeright-desktop://auth/callback");

  callbackUrl.searchParams.set("code", code);
  callbackUrl.searchParams.set("state", state);

  return NextResponse.redirect(callbackUrl);
}
