import { createCareerightRpcClient } from "@careeright/api/client";

import { loadDesktopSession } from "./auth";
import { getCareerightOrigin } from "./config";
import { createOfflineCapableRpcClient } from "./offline-mutations";
import { queryClient } from "./query-client";

export const remoteRpcClient = createCareerightRpcClient({
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

export const rpcClient = createOfflineCapableRpcClient(
  remoteRpcClient,
  queryClient,
);

export async function createAuthenticatedHeaders(): Promise<Record<string, string>> {
  const session = await loadDesktopSession();

  return session?.token
    ? {
        authorization: `Bearer ${session.token}`,
      }
    : {};
}
