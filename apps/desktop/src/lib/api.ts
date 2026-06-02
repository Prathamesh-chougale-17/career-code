import { createCareerightRpcClient } from "@careeright/api/client";

import { loadDesktopSession } from "./auth";
import { getCareerightOrigin } from "./config";
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

type CareerightRpcClient = typeof remoteRpcClient;
type OfflineBranch =
  | "diary"
  | "dsa"
  | "jobs"
  | "profile"
  | "projects"
  | "systemDesign"
  | "task";

const offlineMethodNames: Record<OfflineBranch, ReadonlySet<string>> = {
  diary: new Set(["deleteDay", "saveDay"]),
  dsa: new Set(["recordVideoWatch", "updateQuestionProgress"]),
  jobs: new Set(["delete", "updateSearchProfile", "updateStatus"]),
  profile: new Set([
    "createItem",
    "deleteItem",
    "update",
    "updateApplicationDefaults",
    "updateItem",
  ]),
  projects: new Set([
    "archive",
    "create",
    "createAttribute",
    "createNote",
    "createResource",
    "delete",
    "deleteAttribute",
    "deleteNote",
    "deleteResource",
    "update",
    "updateAttribute",
    "updateNote",
    "updateResource",
  ]),
  systemDesign: new Set(["recordVideoWatch", "updateItemProgress"]),
  task: new Set(["create", "delete", "reorder", "revertToProposal", "update"]),
};

const lazyOfflineBranchProxies = new Map<OfflineBranch, unknown>();
let offlineRpcClientPromise: Promise<CareerightRpcClient> | undefined;

export const rpcClient = new Proxy(remoteRpcClient, {
  get(target, property, receiver) {
    if (typeof property === "string" && isOfflineBranch(property)) {
      return getLazyOfflineBranchProxy(property);
    }

    return Reflect.get(target, property, receiver);
  },
}) as CareerightRpcClient;

export async function createAuthenticatedHeaders(): Promise<Record<string, string>> {
  const session = await loadDesktopSession();

  return session?.token
    ? {
        authorization: `Bearer ${session.token}`,
      }
    : {};
}

function getLazyOfflineBranchProxy(branch: OfflineBranch) {
  const existingProxy = lazyOfflineBranchProxies.get(branch);

  if (existingProxy) {
    return existingProxy;
  }

  const branchTarget = remoteRpcClient[branch] as Record<PropertyKey, unknown>;
  const branchProxy = new Proxy(branchTarget, {
    get(target, property, receiver) {
      if (
        typeof property === "string" &&
        offlineMethodNames[branch].has(property)
      ) {
        return async (...args: unknown[]) => {
          const offlineRpcClient = await getOfflineRpcClient();
          const offlineBranch = offlineRpcClient[branch] as Record<
            string,
            (...methodArgs: unknown[]) => unknown
          >;

          return offlineBranch[property](...args);
        };
      }

      return Reflect.get(target, property, receiver);
    },
  });

  lazyOfflineBranchProxies.set(branch, branchProxy);
  return branchProxy;
}

function getOfflineRpcClient() {
  offlineRpcClientPromise ??= import("./offline-mutations").then((module) =>
    module.createOfflineCapableRpcClient(remoteRpcClient, queryClient),
  );

  return offlineRpcClientPromise;
}

function isOfflineBranch(value: string): value is OfflineBranch {
  return Object.prototype.hasOwnProperty.call(offlineMethodNames, value);
}
