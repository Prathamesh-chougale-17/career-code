import { createCareerightRpcClient } from "@careeright/api/client";
import { QueryClient } from "@repo/ui/providers/query-provider";

import { loadDesktopSession } from "./auth";
import { getCareerightOrigin } from "./config";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const rpcClient = createCareerightRpcClient({
  origin: getCareerightOrigin,
  credentials: "omit",
  headers: async () => {
    const session = await loadDesktopSession();

    return session?.token
      ? {
          authorization: `Bearer ${session.token}`,
        }
      : undefined;
  },
});

export async function createAuthenticatedHeaders(): Promise<Record<string, string>> {
  const session = await loadDesktopSession();

  return session?.token
    ? {
        authorization: `Bearer ${session.token}`,
      }
    : {};
}
