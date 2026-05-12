"use client";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { RouterClient } from "@orpc/server";

import type { appRouter } from "@careeright/api/router";

const link = new RPCLink({
  url: () => `${window.location.origin}/rpc`,
});

export const rpcClient: RouterClient<typeof appRouter> = createORPCClient(link);
export const orpc = createTanstackQueryUtils(rpcClient);
