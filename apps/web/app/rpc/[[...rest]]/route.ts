import { RPCHandler } from "@orpc/server/fetch";

import { getSessionFromHeaders } from "@careeright/auth/server";
import { appRouter } from "@careeright/api/router";

import {
  desktopCorsPreflight,
  withDesktopCors,
} from "@/lib/desktop-cors";

export const runtime = "nodejs";

const handler = new RPCHandler(appRouter);

async function handle(request: Request) {
  if (request.method === "OPTIONS") {
    return desktopCorsPreflight(request);
  }

  const url = new URL(request.url);
  let session: Awaited<ReturnType<typeof getSessionFromHeaders>>;

  try {
    session = await getSessionFromHeaders(request.headers);
  } catch (error) {
    console.error(`[rpc] Auth failed for ${url.pathname}.`, error);
    return withDesktopCors(
      Response.json(
        {
          error:
            "Authentication storage is temporarily unavailable. Check MongoDB connectivity and try again.",
        },
        { status: 503 },
      ),
      request,
    );
  }

  if (!session?.user?.id) {
    return withDesktopCors(
      Response.json({ error: "Unauthorized" }, { status: 401 }),
      request,
    );
  }

  const { matched, response } = await handler.handle(request, {
    prefix: "/rpc",
    context: {
      userId: session.user.id,
    },
  });

  if (matched) {
    if (response.status >= 500) {
      console.error(
        `[rpc] ${request.method} ${url.pathname} returned ${response.status}.`,
        await response.clone().text(),
      );
    }

    return withDesktopCors(response, request);
  }

  return withDesktopCors(
    Response.json({ error: "Not found" }, { status: 404 }),
    request,
  );
}

export {
  handle as DELETE,
  handle as GET,
  handle as HEAD,
  handle as OPTIONS,
  handle as PATCH,
  handle as POST,
  handle as PUT,
};
