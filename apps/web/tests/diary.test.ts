import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

import {
  diaryDaySchema,
  saveDiaryDayInputSchema,
  saveDiaryIntervalInputSchema,
} from "@career-code/domain/diary/schema";
import {
  deleteDiaryDay,
  getDiaryDay,
  listRecentDiaryDays,
  saveDiaryDay,
} from "@career-code/domain/diary/store";

process.env.MONGODB_URI = "";

describe("diary schemas", () => {
  test("accepts a daily-only draft", () => {
    const input = saveDiaryDayInputSchema.parse({
      dateKey: "2026-05-02",
      dailySummary: "Built a diary dashboard plan.",
    });

    expect(input.status).toBe("draft");
    expect(input.dailySummary).toBe("Built a diary dashboard plan.");
    expect(input.intervals).toEqual([]);
  });

  test("rejects invalid interval time formats", () => {
    expect(() =>
      saveDiaryIntervalInputSchema.parse({
        startTime: "9:00",
        endTime: "10:00",
        title: "Morning",
        notes: "",
        summary: "",
      }),
    ).toThrow();
  });

  test("rejects intervals where end time is not after start time", () => {
    expect(() =>
      saveDiaryIntervalInputSchema.parse({
        startTime: "11:00",
        endTime: "10:00",
        title: "Backwards",
        notes: "",
        summary: "",
      }),
    ).toThrow();
  });

  test("requires complete days to have content and interval summaries", () => {
    expect(() =>
      saveDiaryDayInputSchema.parse({
        dateKey: "2026-05-02",
        status: "complete",
      }),
    ).toThrow();

    expect(() =>
      saveDiaryDayInputSchema.parse({
        dateKey: "2026-05-02",
        status: "complete",
        intervals: [
          {
            startTime: "09:00",
            endTime: "10:00",
            title: "Morning",
            notes: "Worked through a tough problem.",
            summary: "",
          },
        ],
      }),
    ).toThrow();
  });
});

describe("diary store", () => {
  test("saves diary days with user scope", async () => {
    const userA = `diary-a-${crypto.randomUUID()}`;
    const userB = `diary-b-${crypto.randomUUID()}`;

    await saveDiaryDay(
      {
        dateKey: "2026-05-02",
        dailySummary: "User A private diary.",
      },
      userA,
    );
    await saveDiaryDay(
      {
        dateKey: "2026-05-02",
        dailySummary: "User B private diary.",
      },
      userB,
    );

    expect((await getDiaryDay({ dateKey: "2026-05-02" }, userA))?.dailySummary)
      .toBe("User A private diary.");
    expect((await getDiaryDay({ dateKey: "2026-05-02" }, userB))?.dailySummary)
      .toBe("User B private diary.");
  });

  test("upserts by date, preserves created date, and keeps existing interval ids", async () => {
    const userId = `diary-upsert-${crypto.randomUUID()}`;
    const first = await saveDiaryDay(
      {
        dateKey: "2026-05-03",
        dailySummary: "First version.",
        intervals: [
          {
            startTime: "10:00",
            endTime: "11:00",
            title: "Build",
            notes: "Initial notes.",
            summary: "Initial summary.",
          },
        ],
      },
      userId,
    );

    await new Promise((resolve) => setTimeout(resolve, 5));

    const second = await saveDiaryDay(
      {
        dateKey: "2026-05-03",
        dailySummary: "Second version.",
        intervals: [
          {
            id: first.intervals[0].id,
            startTime: "09:00",
            endTime: "10:00",
            title: "Earlier build",
            notes: "Updated notes.",
            summary: "Updated summary.",
          },
          {
            startTime: "08:00",
            endTime: "08:30",
            title: "Planning",
            notes: "",
            summary: "Planned the day.",
          },
        ],
      },
      userId,
    );

    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt > first.updatedAt).toBe(true);
    expect(second.intervals.map((interval) => interval.startTime)).toEqual([
      "08:00",
      "09:00",
    ]);
    expect(second.intervals[1].id).toBe(first.intervals[0].id);
    expect(await listRecentDiaryDays({ limit: 30 }, userId)).toHaveLength(1);
  });

  test("lists recent days latest first and validates stored records", async () => {
    const userId = `diary-sort-${crypto.randomUUID()}`;

    await saveDiaryDay(
      {
        dateKey: "2026-05-01",
        dailySummary: "First day.",
      },
      userId,
    );
    await saveDiaryDay(
      {
        dateKey: "2026-05-03",
        dailySummary: "Latest day.",
        status: "complete",
      },
      userId,
    );
    await saveDiaryDay(
      {
        dateKey: "2026-05-02",
        dailySummary: "Middle day.",
      },
      userId,
    );

    const days = await listRecentDiaryDays({ limit: 2 }, userId);

    expect(days.map((day) => day.dateKey)).toEqual([
      "2026-05-03",
      "2026-05-02",
    ]);
    expect(() => diaryDaySchema.parse(days[0])).not.toThrow();
  });

  test("deletes only the selected user's diary day", async () => {
    const userA = `diary-delete-a-${crypto.randomUUID()}`;
    const userB = `diary-delete-b-${crypto.randomUUID()}`;

    await saveDiaryDay(
      {
        dateKey: "2026-05-04",
        dailySummary: "Delete me.",
      },
      userA,
    );
    await saveDiaryDay(
      {
        dateKey: "2026-05-04",
        dailySummary: "Keep me.",
      },
      userB,
    );

    expect(await deleteDiaryDay({ dateKey: "2026-05-04" }, userA)).toEqual({
      deleted: true,
    });
    expect(await getDiaryDay({ dateKey: "2026-05-04" }, userA)).toBeNull();
    expect((await getDiaryDay({ dateKey: "2026-05-04" }, userB))?.dailySummary)
      .toBe("Keep me.");
  });
});

describe("diary routes and navigation", () => {
  test("dashboard route and sidebar expose diary", () => {
    const page = readFileSync("app/dashboard/diary/page.tsx", "utf8");
    const sidebar = readFileSync("components/dashboard-sidebar.tsx", "utf8");

    expect(page).toContain("DiaryApp");
    expect(page).toContain('requirePageSession("/dashboard/diary")');
    expect(sidebar).toContain('render={<Link href="/dashboard/diary" />}');
    expect(sidebar).toContain('pathname.startsWith("/dashboard/diary")');
  });
});
