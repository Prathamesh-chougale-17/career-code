import {
  readBearerToken,
  revokeDesktopBearerToken,
} from "@careeright/auth/server";

import {
  desktopCorsPreflight,
  withDesktopCors,
} from "@/lib/desktop-cors";

export const runtime = "nodejs";

export async function OPTIONS(request: Request) {
  return desktopCorsPreflight(request);
}

export async function POST(request: Request) {
  const token = readBearerToken(request.headers);

  if (!token) {
    return withDesktopCors(
      Response.json({ error: "Unauthorized" }, { status: 401 }),
      request,
    );
  }

  const revoked = await revokeDesktopBearerToken(token);

  return withDesktopCors(Response.json({ revoked }), request);
}
