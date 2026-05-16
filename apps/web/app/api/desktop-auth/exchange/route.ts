import { exchangeDesktopAuthCode } from "@careeright/auth/server";

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

  const { code, state } = parseExchangeBody(body);

  if (!code || !state) {
    return withDesktopCors(
      Response.json({ error: "Missing desktop auth code or state." }, { status: 400 }),
      request,
    );
  }

  try {
    const result = await exchangeDesktopAuthCode({ code, state });

    return withDesktopCors(
      Response.json({
        token: result.token,
        expiresAt: result.expiresAt,
        user: {
          id: result.userId,
        },
      }),
      request,
    );
  } catch (error) {
    return withDesktopCors(
      Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Desktop sign-in failed.",
        },
        { status: 401 },
      ),
      request,
    );
  }
}

function parseExchangeBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return {};
  }

  const value = body as Record<string, unknown>;

  return {
    code: typeof value.code === "string" ? value.code.trim() : "",
    state: typeof value.state === "string" ? value.state.trim() : "",
  };
}
