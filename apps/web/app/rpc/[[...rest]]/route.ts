import { RPCHandler } from "@orpc/server/fetch";

import { getSessionFromHeaders } from "@career-code/auth/server";
import { appRouter } from "@career-code/api/router";

export const runtime = "nodejs";

const handler = new RPCHandler(appRouter);

async function handle(request: Request) {
  const url = new URL(request.url);
  let session: Awaited<ReturnType<typeof getSessionFromHeaders>>;

  try {
    session = await getSessionFromHeaders(request.headers);
  } catch (error) {
    console.error(`[rpc] Auth failed for ${url.pathname}.`, error);
    return Response.json(
      {
        error:
          "Authentication storage is temporarily unavailable. Check MongoDB connectivity and try again.",
      },
      { status: 503 },
    );
  }

  if (!session?.user?.id) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
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

    return response;
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

export {
  handle as DELETE,
  handle as GET,
  handle as HEAD,
  handle as PATCH,
  handle as POST,
  handle as PUT,
};
