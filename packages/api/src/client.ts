"use client";

import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import type { RouterClient } from "@orpc/server";

import type { appRouter } from "@careeright/api/router";

type HeaderSource =
  | HeadersInit
  | (() => HeadersInit | Promise<HeadersInit | undefined> | undefined);

type CareerightRpcClientOptions = {
  credentials?: RequestCredentials;
  origin: string | (() => string);
  headers?: HeaderSource;
};

export function createCareerightRpcClient({
  credentials = "same-origin",
  origin,
  headers,
}: CareerightRpcClientOptions): RouterClient<typeof appRouter> {
  const link = new RPCLink({
    url: () => `${resolveOrigin(origin).replace(/\/$/, "")}/rpc`,
    fetch: async (request, init, _options, _path, _input) => {
      const requestHeaders = new Headers(request.headers);
      const extraHeaders =
        typeof headers === "function" ? await headers() : headers;

      if (extraHeaders) {
        new Headers(extraHeaders).forEach((value, key) => {
          requestHeaders.set(key, value);
        });
      }

      const authenticatedRequest = new Request(request, {
        credentials,
        headers: requestHeaders,
      });

      return fetch(authenticatedRequest, {
        ...init,
        credentials,
      } as RequestInit);
    },
  });

  return createORPCClient(link);
}

function resolveOrigin(origin: string | (() => string)) {
  return typeof origin === "function" ? origin() : origin;
}

export const rpcClient = createCareerightRpcClient({
  origin: () => {
    if (typeof window === "undefined" || !window.location?.origin) {
      return "";
    }

    return window.location.origin;
  },
});
export const orpc = createTanstackQueryUtils(rpcClient);
