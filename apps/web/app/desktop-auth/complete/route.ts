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

  await createDesktopAuthCode({
    state,
    userId: session.user.id,
  });

  return new Response(desktopAuthCompletePage(), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function desktopAuthCompletePage() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex" />
    <title>Careeright Desktop sign-in complete</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #070806;
        color: #f8fafc;
      }

      * {
        box-sizing: border-box;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 32px;
        background:
          radial-gradient(circle at 20% 18%, rgba(132, 204, 22, 0.22), transparent 34%),
          radial-gradient(circle at 82% 82%, rgba(56, 189, 248, 0.16), transparent 30%),
          #070806;
      }

      main {
        width: min(100%, 520px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 28px;
        background: rgba(20, 24, 18, 0.9);
        padding: 28px;
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.32);
      }

      .mark {
        display: grid;
        width: 48px;
        height: 48px;
        place-items: center;
        border-radius: 14px;
        background: #070806;
        color: #a3e635;
        font-weight: 900;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.14);
      }

      h1 {
        margin: 22px 0 0;
        font-size: clamp(2rem, 6vw, 3rem);
        line-height: 1;
      }

      p {
        margin: 14px 0 0;
        color: #cbd5e1;
        line-height: 1.7;
      }

      small {
        margin-top: 18px;
        display: block;
        color: #94a3b8;
        line-height: 1.6;
      }

      .status {
        margin-top: 24px;
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: #a3e635;
        color: #182206;
        padding: 12px 18px;
        font-weight: 800;
      }
    </style>
  </head>
  <body>
    <main>
      <div class="mark" aria-hidden="true">CR</div>
      <h1>Sign-in complete.</h1>
      <p>Return to Careeright Desktop. The app will finish sign-in automatically.</p>
      <div class="status">You can close this tab</div>
      <small>The browser prompt has been removed. Careeright Desktop checks this sign-in request securely in the background.</small>
    </main>
  </body>
</html>`;
}
