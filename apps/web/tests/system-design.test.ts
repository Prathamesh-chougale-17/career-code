import { describe, expect, test } from "vitest";

import {
  SYSTEM_DESIGN_CATALOG,
  SYSTEM_DESIGN_ITEMS,
  STATIC_SYSTEM_DESIGN_TRACKS,
  buildSystemDesignCatalogFromTrackMetadata,
} from "@careeright/domain/system-design/catalog";
import {
  updateSystemDesignItemProgressInputSchema,
  type SystemDesignItem,
} from "@careeright/domain/system-design/schema";
import {
  getSystemDesignSnapshot,
  recordSystemDesignVideoWatch,
  updateSystemDesignItemProgress,
} from "@careeright/domain/system-design/store";
import { buildSystemDesignVideoEmbedUrl } from "@careeright/domain/system-design/youtube";
import { appRouter } from "@careeright/api/router";

process.env.MONGODB_URI = "";

function trackById(trackId: string) {
  const track = SYSTEM_DESIGN_CATALOG.tracks.find((item) => item.id === trackId);

  if (!track) {
    throw new Error(`Missing System Design track: ${trackId}`);
  }

  return track;
}

function allItems(trackId?: string) {
  const tracks = trackId ? [trackById(trackId)] : SYSTEM_DESIGN_CATALOG.tracks;

  return tracks.flatMap((track) =>
    track.modules.flatMap((roadmapModule) => roadmapModule.items),
  );
}

function lessonItems(trackId?: string) {
  return allItems(trackId).filter((item) => item.sourceType === "lesson");
}

function assertAscii(value: string) {
  if (!value) {
    return;
  }

  expect(value).toMatch(/^[\x20-\x7E]+$/);
}

describe("System Design catalog", () => {
  test("ships a curated basic-to-core roadmap with stable tracks", () => {
    expect(SYSTEM_DESIGN_CATALOG.tracks.map((item) => item.id)).toEqual([
      "foundations",
      "hld-core",
      "lld-core",
    ]);
    expect(
      trackById("foundations").modules.map((roadmapModule) => roadmapModule.id),
    ).toEqual([
      "start-here",
      "web-apis-networking",
      "scaling-and-edge",
      "data-and-storage",
      "distributed-patterns",
    ]);
    expect(
      trackById("hld-core").modules.map((roadmapModule) => roadmapModule.id),
    ).toEqual([
      "hld-interview-designs",
      "hld-component-deep-dives",
      "hld-deep-walkthroughs",
    ]);
    expect(
      trackById("lld-core").modules.map((roadmapModule) => roadmapModule.id),
    ).toEqual([
      "lld-oop-and-modeling",
      "lld-design-patterns",
      "lld-case-studies",
    ]);
    expect(lessonItems()).toHaveLength(86);
    expect(SYSTEM_DESIGN_ITEMS).toHaveLength(86);
    expect(
      SYSTEM_DESIGN_ITEMS.every((item) => item.sourceType === "lesson"),
    ).toBe(true);
    expect(new Set(SYSTEM_DESIGN_ITEMS.map((item) => item.id)).size).toBe(
      SYSTEM_DESIGN_ITEMS.length,
    );

    for (const track of SYSTEM_DESIGN_CATALOG.tracks) {
      assertAscii(track.title);
      assertAscii(track.description);

      for (const roadmapModule of track.modules) {
        assertAscii(roadmapModule.title);
        assertAscii(roadmapModule.description);

        for (const item of roadmapModule.items) {
          assertAscii(item.title);
          assertAscii(item.description);
          assertAscii(item.lessonLabel);
        }
      }
    }
  });

  test("keeps lesson videos linked to their source playlists", () => {
    const lessons = lessonItems();

    expect(lessons.map((item) => item.lessonNumber)).toEqual(
      Array.from({ length: 86 }, (_, index) => index + 1),
    );
    expect(lessons.map((item) => item.videoId)).toEqual(
      expect.arrayContaining([
        "AK0hu0Zxua4",
        "i7twT3x5yv8",
        "UC5xf8FbdJc",
        "SqcXvc3ZmRU",
        "qqRYkcta6IE",
        "HHUi8F_qAXM",
        "YXkOdWBwqaA",
        "MtjZf7291zc",
        "MRx40JVmmF4",
        "DU8o-OTeoCc",
        "fmT5nlEkl3U",
        "BHCSL_ZifI0",
        "DOFflggE_0Q",
        "Qd76ZmfRs_Q",
      ]),
    );

    for (const item of lessons) {
      expect(item.videoUrl).toBeDefined();
      expect(item.playlistUrl).toBeDefined();

      const videoUrl = new URL(item.videoUrl ?? "");
      const playlistUrl = new URL(item.playlistUrl ?? "");

      expect(videoUrl.hostname).toBe("www.youtube.com");
      expect(videoUrl.searchParams.get("v")).toBe(item.videoId);
      expect(videoUrl.searchParams.get("list")).toBe(
        playlistUrl.searchParams.get("list"),
      );
    }
  });

  test("builds embeddable YouTube URLs for in-page playback", () => {
    const lesson = lessonItems()[0] as SystemDesignItem;
    const embedUrl = new URL(
      buildSystemDesignVideoEmbedUrl({
        videoId: lesson.videoId,
        videoUrl: lesson.videoUrl,
      }) ?? "",
    );

    expect(embedUrl.origin).toBe("https://www.youtube.com");
    expect(embedUrl.pathname).toBe(`/embed/${lesson.videoId}`);
    expect(embedUrl.searchParams.get("rel")).toBe("0");
    expect(embedUrl.searchParams.get("list")).toBe(
      new URL(lesson.videoUrl ?? "").searchParams.get("list"),
    );
  });

  test("rebuilds catalog from metadata and item documents", () => {
    const catalog = buildSystemDesignCatalogFromTrackMetadata(
      STATIC_SYSTEM_DESIGN_TRACKS,
      SYSTEM_DESIGN_ITEMS,
    );

    expect(catalog.tracks.map((track) => track.id)).toEqual([
      "foundations",
      "hld-core",
      "lld-core",
    ]);
    expect(catalog.tracks.flatMap((track) => track.modules)).toHaveLength(11);
    expect(
      catalog.tracks.flatMap((track) =>
        track.modules.flatMap((roadmapModule) => roadmapModule.items),
      ),
    ).toHaveLength(86);
  });
});

describe("System Design progress store", () => {
  test("toggles progress idempotently and isolates users", async () => {
    const itemId = allItems()[0].id;
    const userA = `system-design-a-${crypto.randomUUID()}`;
    const userB = `system-design-b-${crypto.randomUUID()}`;
    const initialSnapshot = await getSystemDesignSnapshot(userA);

    expect(initialSnapshot.summary).toEqual({
      totalItems: 86,
      completedItems: 0,
      completionPercentage: 0,
      totalLessons: 86,
      totalDrills: 0,
      watchedVideos: 0,
    });

    const completed = await updateSystemDesignItemProgress(
      { itemId, completed: true },
      userA,
    );

    expect(completed.progress.completed).toBe(true);
    expect(completed.progress.completedAt).toBeDefined();
    expect(completed.snapshot.summary.completedItems).toBe(1);

    const completedAgain = await updateSystemDesignItemProgress(
      { itemId, completed: true },
      userA,
    );

    expect(completedAgain.progress.id).toBe(completed.progress.id);
    expect(completedAgain.snapshot.progress).toHaveLength(1);

    const userBSnapshot = await getSystemDesignSnapshot(userB);
    expect(userBSnapshot.summary.completedItems).toBe(0);

    const cleared = await updateSystemDesignItemProgress(
      { itemId, completed: false },
      userA,
    );

    expect(cleared.progress.id).toBe(completed.progress.id);
    expect(cleared.progress.completed).toBe(false);
    expect(cleared.progress.completedAt).toBeUndefined();
    expect(cleared.snapshot.summary.completedItems).toBe(0);
  });

  test("rejects unknown item ids", async () => {
    await expect(
      updateSystemDesignItemProgress(
        {
          itemId: "missing-system-design-item",
          completed: true,
        },
        `system-design-invalid-${crypto.randomUUID()}`,
      ),
    ).rejects.toThrow("Unknown System Design item");
  });

  test("returns watched lesson videos in the snapshot", async () => {
    const userId = `system-design-video-${crypto.randomUUID()}`;
    const lesson = lessonItems()[0];
    const initialSnapshot = await getSystemDesignSnapshot(userId);

    expect(initialSnapshot.videoWatches).toEqual([]);

    const event = await recordSystemDesignVideoWatch(
      { itemId: lesson.id },
      userId,
    );

    expect(event.itemId).toBe(lesson.id);

    const watchedSnapshot = await getSystemDesignSnapshot(userId);

    expect(watchedSnapshot.videoWatches).toHaveLength(1);
    expect(watchedSnapshot.videoWatches[0]?.itemId).toBe(lesson.id);
    expect(watchedSnapshot.summary.watchedVideos).toBe(1);

    await expect(
      recordSystemDesignVideoWatch(
        { itemId: "missing-system-design-video" },
        userId,
      ),
    ).rejects.toThrow("Unknown System Design video");
  });
});

describe("System Design RPC", () => {
  test("validates progress input and returns a snapshot", async () => {
    const userId = `system-design-rpc-${crypto.randomUUID()}`;
    const itemId = allItems()[1].id;
    const snapshot = await appRouter.systemDesign.snapshot.callable({
      context: { userId },
    })();
    const updateProgress = appRouter.systemDesign.updateItemProgress.callable({
      context: { userId },
    });

    expect(snapshot.summary.totalItems).toBe(86);

    const result = await updateProgress({ itemId, completed: true });

    expect(result.progress.itemId).toBe(itemId);
    expect(result.snapshot.summary.completedItems).toBe(1);
    expect(() =>
      updateSystemDesignItemProgressInputSchema.parse({
        itemId,
        completed: "yes",
      }),
    ).toThrow();
    await expect(
      updateProgress({
        itemId: "missing-item",
        completed: true,
      }),
    ).rejects.toThrow("Unknown System Design item");
  });
});
