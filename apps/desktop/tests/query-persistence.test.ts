import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";

import {
  boardSnapshotQueryKey,
  dashboardMetricsQueryKey,
} from "@careeright/api/query-keys";

import {
  createDesktopQueryCacheSnapshot,
  serializeDesktopQueryCacheState,
  shouldDehydrateDesktopQuery,
  shouldSaveDesktopQueryCacheEvent,
} from "../src/lib/query-persistence";

describe("desktop query persistence", () => {
  test("persists only successful tracked desktop query roots", () => {
    expect(
      shouldDehydrateDesktopQuery({
        queryKey: boardSnapshotQueryKey,
        state: { status: "success" },
      }),
    ).toBe(true);
    expect(
      shouldDehydrateDesktopQuery({
        queryKey: boardSnapshotQueryKey,
        state: { status: "error" },
      }),
    ).toBe(false);
    expect(
      shouldDehydrateDesktopQuery({
        queryKey: ["notifications"],
        state: { status: "success" },
      }),
    ).toBe(false);
  });

  test("ignores observer churn and fetch-only updates", () => {
    const query = {
      queryKey: boardSnapshotQueryKey,
      state: { status: "success" },
    };

    expect(
      shouldSaveDesktopQueryCacheEvent({
        query,
        type: "observerResultsUpdated",
      }),
    ).toBe(false);
    expect(
      shouldSaveDesktopQueryCacheEvent({
        action: { type: "fetch" },
        query,
        type: "updated",
      }),
    ).toBe(false);
    expect(
      shouldSaveDesktopQueryCacheEvent({
        action: { type: "success" },
        query,
        type: "updated",
      }),
    ).toBe(true);
    expect(
      shouldSaveDesktopQueryCacheEvent({
        query,
        type: "removed",
      }),
    ).toBe(true);
  });

  test("creates stable snapshots without volatile dehydrated timestamps", () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(boardSnapshotQueryKey, { board: "cached" });
    queryClient.setQueryData(dashboardMetricsQueryKey, { taskCount: 3 });
    queryClient.setQueryData(["notifications"], { unread: 2 });

    const firstSnapshot = createDesktopQueryCacheSnapshot(queryClient);
    const secondSnapshot = createDesktopQueryCacheSnapshot(queryClient);

    expect(firstSnapshot.queries.map((query) => query.queryKey)).toEqual([
      boardSnapshotQueryKey,
      dashboardMetricsQueryKey,
    ]);
    expect(firstSnapshot.queries.every((query) => !query.dehydratedAt)).toBe(
      true,
    );
    expect(firstSnapshot.queries.every((query) => query.state.fetchStatus === "idle"))
      .toBe(true);
    expect(serializeDesktopQueryCacheState(firstSnapshot)).toBe(
      serializeDesktopQueryCacheState(secondSnapshot),
    );
  });
});
