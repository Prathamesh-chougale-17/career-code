import {
  getDesktopSessionFromBearerToken,
  readBearerToken,
} from "@careeright/auth/server";

import {
  desktopCorsPreflight,
  withDesktopCors,
} from "@/lib/desktop-cors";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return desktopCorsPreflight(request);
}

export async function GET(request: Request) {
  const token = readBearerToken(request.headers);

  if (!token) {
    return withDesktopCors(
      Response.json({ error: "Unauthorized" }, { status: 401 }),
      request,
    );
  }

  const session = await getDesktopSessionFromBearerToken(token);

  if (!session) {
    return withDesktopCors(
      Response.json({ error: "Unauthorized" }, { status: 401 }),
      request,
    );
  }

  return withDesktopCors(
    Response.json({
      expiresAt: session.expiresAt,
      user: session.user,
    }),
    request,
  );
}
