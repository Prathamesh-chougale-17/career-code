import { exchangeDesktopAuthState } from "@careeright/auth/server";

import {
  desktopCorsPreflight,
  withDesktopCors,
} from "@/lib/desktop-cors";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return desktopCorsPreflight(request);
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return withDesktopCors(
      Response.json({ error: "Invalid JSON body." }, { status: 400 }),
      request,
    );
  }

  const state =
    body && typeof body === "object" && typeof (body as { state?: unknown }).state === "string"
      ? (body as { state: string }).state.trim()
      : "";

  if (!state) {
    return withDesktopCors(
      Response.json({ error: "Missing desktop auth state." }, { status: 400 }),
      request,
    );
  }

  const result = await exchangeDesktopAuthState({ state });

  if (!result) {
    return withDesktopCors(Response.json({ pending: true }), request);
  }

  return withDesktopCors(
    Response.json({
      pending: false,
      token: result.token,
      expiresAt: result.expiresAt,
      user: result.user,
    }),
    request,
  );
}
