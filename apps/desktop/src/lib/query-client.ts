import { QueryClient } from "@repo/ui/providers/query-provider";

const desktopQueryCacheTtlMs = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: desktopQueryCacheTtlMs,
      networkMode: "offlineFirst",
      refetchOnReconnect: true,
      retry: (failureCount) => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          return false;
        }

        return failureCount < 1;
      },
      staleTime: 2 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});
