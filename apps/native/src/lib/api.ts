import { QueryClient } from "@tanstack/react-query";

import { createCareerightRpcClient } from "@careeright/api/client";

import { authClient } from "@/lib/auth-client";
import { getCareerightOrigin } from "@/lib/config";

export const queryClient = new QueryClient({
  defaultOptions: {
    mutations: {
      retry: false,
    },
    queries: {
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60_000,
    },
  },
});

export const rpcClient = createCareerightRpcClient({
  credentials: "omit",
  origin: getCareerightOrigin,
  headers: () => {
    const cookie = authClient.getCookie();

    return cookie ? { Cookie: cookie } : undefined;
  },
});

export function authenticatedHeaders() {
  const cookie = authClient.getCookie();

  return cookie ? { Cookie: cookie } : undefined;
}
