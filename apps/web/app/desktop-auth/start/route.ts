import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET(request: Request) {
  const url = new URL(request.url);
  const state = url.searchParams.get("state")?.trim();

  if (!state) {
    return Response.json({ error: "Missing desktop auth state." }, { status: 400 });
  }

  const callbackURL = `/desktop-auth/complete?state=${encodeURIComponent(state)}`;
  const signInUrl = new URL("/sign-in", url.origin);

  signInUrl.searchParams.set("callbackURL", callbackURL);

  return NextResponse.redirect(signInUrl);
}
