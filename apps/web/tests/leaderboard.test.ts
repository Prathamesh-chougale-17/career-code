import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

import { DSA_CATALOG } from "@careeright/domain/dsa/catalog";
import { updateDsaQuestionProgress } from "@careeright/domain/dsa/store";
import {
  respondFriendRequest,
  sendFriendRequest,
  upsertFriendUserForTest,
} from "@careeright/domain/friends/store";
import { getLeaderboardSnapshot } from "@careeright/domain/leaderboard/store";
import { seedJobs } from "@careeright/domain/jobs/store";

process.env.MONGODB_URI = "";

function userId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function leetcodeQuestion(index: number) {
  const question = DSA_CATALOG.tracks
    .flatMap((track) => track.subtopics)
    .flatMap((subtopic) => subtopic.questions)
    .filter((item) => item.sourceType === "leetcode")[index];

  if (!question) {
    throw new Error(`Missing LeetCode DSA question fixture ${index}.`);
  }

  return question;
}

async function createFriendUser(prefix: string, name: string, email: string) {
  const id = userId(prefix);

  await upsertFriendUserForTest({
    id,
    name,
    email,
    image: null,
  });

  return id;
}

async function connectUsers(requesterId: string, recipientId: string) {
  const request = await sendFriendRequest({ recipientId }, requesterId);

  await respondFriendRequest(
    { connectionId: request.id, action: "accept" },
    recipientId,
  );
}

async function completeDsaQuestions(userId: string, count: number) {
  await Promise.all(
    Array.from({ length: count }, (_, index) =>
      updateDsaQuestionProgress(
        { questionId: leetcodeQuestion(index).id, completed: true },
        userId,
      ),
    ),
  );
}

async function seedAppliedJobs(userId: string, count: number) {
  await seedJobs(
    {
      source: "leaderboard-test",
      jobs: Array.from({ length: count }, (_, index) => ({
        title: `Leaderboard Applied Job ${index + 1}`,
        sourceJobId: `leaderboard-${crypto.randomUUID()}`,
        status: "applied",
      })),
    },
    userId,
  );
}

describe("leaderboard", () => {
  test("dashboard route and sidebar expose the leaderboard tab", () => {
    const page = readFileSync("app/dashboard/leaderboard/page.tsx", "utf8");
    const sidebar = readFileSync(
      "../../packages/ui/src/components/dashboard-sidebar.tsx",
      "utf8",
    );
    const provider = readFileSync(
      "components/providers/dashboard-providers.tsx",
      "utf8",
    );
    const desktopApp = readFileSync("../desktop/src/App.tsx", "utf8");

    expect(page).toContain("LeaderboardApp");
    expect(page).toContain('requirePageSession("/dashboard/leaderboard")');
    expect(sidebar).toContain('href="/dashboard/leaderboard"');
    expect(provider).toContain('pathname.startsWith("/dashboard/leaderboard")');
    expect(desktopApp).toContain('route === "leaderboard"');
  });

  test("ranks the current user against accepted friends with 30-day chart data", async () => {
    const currentUserId = await createFriendUser(
      "leaderboard-current",
      "Current User",
      "leaderboard-current@example.com",
    );
    const friendId = await createFriendUser(
      "leaderboard-friend",
      "Leaderboard Friend",
      "leaderboard-friend@example.com",
    );

    await connectUsers(currentUserId, friendId);
    await completeDsaQuestions(currentUserId, 1);
    await seedAppliedJobs(currentUserId, 1);
    await completeDsaQuestions(friendId, 2);
    await seedAppliedJobs(friendId, 2);

    const snapshot = await getLeaderboardSnapshot(currentUserId);
    const currentUser = snapshot.members.find((member) => member.isCurrentUser);
    const friend = snapshot.members.find((member) => member.userId === friendId);
    const today = new Date().toISOString().slice(0, 10);

    expect(snapshot.range.days).toBe(30);
    expect(snapshot.members).toHaveLength(2);
    expect(currentUser).toMatchObject({
      dsaDone: 1,
      jobsApplied: 1,
      score: 2,
    });
    expect(friend).toMatchObject({
      dsaDone: 2,
      jobsApplied: 2,
      score: 4,
      rank: 1,
    });
    expect(currentUser?.days).toHaveLength(30);
    expect(currentUser?.days.find((day) => day.date === today)).toMatchObject({
      dsaDone: 1,
      jobsApplied: 1,
    });
    expect(friend?.days.find((day) => day.date === today)).toMatchObject({
      dsaDone: 2,
      jobsApplied: 2,
    });
  });
});
