import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

import {
  copySharedJobs,
  createJobShare,
  getFriendsSummary,
  getJobShare,
  respondFriendRequest,
  revokeJobShare,
  searchFriendUsers,
  sendFriendRequest,
  upsertFriendUserForTest,
} from "@careeright/domain/friends/store";
import {
  friendConnectionSchema,
  jobShareSchema,
} from "@careeright/domain/friends/schema";
import {
  listJobs,
  seedJobs,
  updateJobStatus,
} from "@careeright/domain/jobs/store";

function userId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
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

  return respondFriendRequest(
    { connectionId: request.id, action: "accept" },
    recipientId,
  );
}

async function seedFriendShareJobs(userId: string) {
  const [first, second] = await seedJobs(
    {
      source: "test-friends",
      jobs: [
        {
          title: "Backend Engineer",
          company: "Acme",
          location: "Remote",
          applyUrl: `https://example.com/jobs/${crypto.randomUUID()}`,
          sourceJobId: `backend-${crypto.randomUUID()}`,
          description: "Build APIs and worker systems.",
          fitScore: 95,
          fitBand: "excellent",
          fitReasons: ["Backend ownership"],
          matchedSkills: ["Node.js"],
          missingSkills: [],
          riskFlags: [],
        },
        {
          title: "Platform Engineer",
          company: "Northstar",
          location: "Bengaluru",
          applyUrl: `https://example.com/jobs/${crypto.randomUUID()}`,
          sourceJobId: `platform-${crypto.randomUUID()}`,
          description: "Own infrastructure and deployments.",
          fitScore: 88,
          fitBand: "strong",
          fitReasons: ["Infrastructure"],
          matchedSkills: ["Docker"],
          missingSkills: [],
          riskFlags: [],
        },
      ],
    },
    userId,
  );

  await updateJobStatus({ jobId: first.id, status: "applied" }, userId);

  return { first, second };
}

describe("friends connections", () => {
  test("normalizes nullable optional timestamps from persisted records", () => {
    const connection = friendConnectionSchema.parse({
      id: "connection-null-timestamps",
      requesterId: "requester-null-timestamps",
      recipientId: "recipient-null-timestamps",
      pairKey: "recipient-null-timestamps:requester-null-timestamps",
      status: "pending",
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      respondedAt: null,
      removedAt: null,
    });
    const share = jobShareSchema.parse({
      id: "share-null-timestamps",
      ownerId: "owner-null-timestamps",
      recipientId: "recipient-null-timestamps",
      connectionId: "connection-null-timestamps",
      scope: "all",
      dateKey: null,
      note: "",
      jobCount: 0,
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
      revokedAt: null,
    });

    expect(connection.respondedAt).toBeUndefined();
    expect(connection.removedAt).toBeUndefined();
    expect(share.revokedAt).toBeUndefined();
  });

  test("dashboard route and sidebar expose friends", () => {
    const page = readFileSync("app/dashboard/friends/page.tsx", "utf8");
    const sidebar = readFileSync(
      "../../packages/ui/src/components/dashboard-sidebar.tsx",
      "utf8",
    );
    const provider = readFileSync(
      "components/providers/dashboard-providers.tsx",
      "utf8",
    );

    expect(page).toContain("FriendsApp");
    expect(page).toContain('requirePageSession("/dashboard/friends")');
    expect(sidebar).toContain('href="/dashboard/friends"');
    expect(sidebar).toContain('currentRoute === "friends"');
    expect(provider).toContain('pathname.startsWith("/dashboard/friends")');
  });

  test("searches users only by exact email without returning the current user", async () => {
    const ownerId = await createFriendUser(
      "friend-owner",
      "Prathamesh Careeright",
      "owner@example.com",
    );
    const candidateId = await createFriendUser(
      "friend-candidate",
      "Asha Careeright",
      "asha@example.com",
    );

    await expect(searchFriendUsers({ query: "Asha" }, ownerId)).rejects.toThrow(
      /exact email/i,
    );

    const partialResults = await searchFriendUsers(
      { query: "ash@example.com" },
      ownerId,
    );
    const results = await searchFriendUsers(
      { query: "ASHA@example.com" },
      ownerId,
    );

    expect(partialResults).toHaveLength(0);
    expect(results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: candidateId,
          relationship: "none",
        }),
      ]),
    );
    expect(results.some((result) => result.id === ownerId)).toBe(false);
  });

  test("runs the friend request lifecycle without duplicates", async () => {
    const requesterId = await createFriendUser(
      "friend-requester",
      "Requester User",
      "requester@example.com",
    );
    const recipientId = await createFriendUser(
      "friend-recipient",
      "Recipient User",
      "recipient@example.com",
    );

    const firstRequest = await sendFriendRequest({ recipientId }, requesterId);
    const duplicateRequest = await sendFriendRequest(
      { recipientId },
      requesterId,
    );

    expect(duplicateRequest.id).toBe(firstRequest.id);

    const requesterSummary = await getFriendsSummary(requesterId);
    const recipientSummary = await getFriendsSummary(recipientId);

    expect(requesterSummary.outgoingRequests).toHaveLength(1);
    expect(recipientSummary.incomingRequests).toHaveLength(1);

    await respondFriendRequest(
      { connectionId: firstRequest.id, action: "accept" },
      recipientId,
    );

    expect((await getFriendsSummary(requesterId)).friends).toHaveLength(1);
    expect((await getFriendsSummary(recipientId)).friends).toHaveLength(1);
  });
});

describe("friend job sharing", () => {
  test("only lets accepted friends receive shared jobs", async () => {
    const ownerId = await createFriendUser(
      "friend-share-owner",
      "Share Owner",
      "share-owner@example.com",
    );
    const friendId = await createFriendUser(
      "friend-share-recipient",
      "Share Recipient",
      "share-recipient@example.com",
    );
    const strangerId = await createFriendUser(
      "friend-share-stranger",
      "Share Stranger",
      "share-stranger@example.com",
    );
    await connectUsers(ownerId, friendId);
    await seedFriendShareJobs(ownerId);

    await expect(
      createJobShare({ recipientId: strangerId, scope: "latest" }, ownerId),
    ).rejects.toThrow(/accepted friends/i);

    const share = await createJobShare(
      { recipientId: friendId, scope: "latest", note: "Fresh batch" },
      ownerId,
    );

    expect(share.items).toHaveLength(2);
    expect(share.items[0]?.snapshot).not.toHaveProperty("raw");
    expect((await getJobShare({ shareId: share.id }, friendId)).note).toBe(
      "Fresh batch",
    );
  });

  test("shares date, latest, and all scopes from active jobs", async () => {
    const ownerId = await createFriendUser(
      "friend-scope-owner",
      "Scope Owner",
      "scope-owner@example.com",
    );
    const friendId = await createFriendUser(
      "friend-scope-recipient",
      "Scope Recipient",
      "scope-recipient@example.com",
    );
    await connectUsers(ownerId, friendId);
    await seedFriendShareJobs(ownerId);

    const summary = await getFriendsSummary(ownerId);
    const dateKey = summary.jobDateOptions[0]?.dateKey;

    expect(dateKey).toBeTruthy();

    const dateShare = await createJobShare(
      { recipientId: friendId, scope: "date", dateKey },
      ownerId,
    );
    const latestShare = await createJobShare(
      { recipientId: friendId, scope: "latest" },
      ownerId,
    );
    const allShare = await createJobShare(
      { recipientId: friendId, scope: "all" },
      ownerId,
    );

    expect(dateShare.jobCount).toBe(2);
    expect(latestShare.jobCount).toBe(2);
    expect(allShare.jobCount).toBe(2);
  });

  test("copies shared jobs into the recipient tracker without editing the owner", async () => {
    const ownerId = await createFriendUser(
      "friend-copy-owner",
      "Copy Owner",
      "copy-owner@example.com",
    );
    const friendId = await createFriendUser(
      "friend-copy-recipient",
      "Copy Recipient",
      "copy-recipient@example.com",
    );
    await connectUsers(ownerId, friendId);
    await seedFriendShareJobs(ownerId);

    const share = await createJobShare(
      { recipientId: friendId, scope: "all" },
      ownerId,
    );
    const firstItemId = share.items[0]?.id;

    expect(firstItemId).toBeTruthy();

    await copySharedJobs({ shareId: share.id, itemIds: [firstItemId!] }, friendId);

    const copiedOnce = await listJobs(friendId);
    expect(copiedOnce).toHaveLength(1);
    expect(copiedOnce[0]?.userId).toBe(friendId);
    expect(copiedOnce[0]?.status).toBe("not_applied");

    await copySharedJobs({ shareId: share.id }, friendId);

    expect(await listJobs(friendId)).toHaveLength(2);
    expect((await listJobs(ownerId)).filter((job) => job.status === "applied"))
      .toHaveLength(1);
  });

  test("revokes received share access", async () => {
    const ownerId = await createFriendUser(
      "friend-revoke-owner",
      "Revoke Owner",
      "revoke-owner@example.com",
    );
    const friendId = await createFriendUser(
      "friend-revoke-recipient",
      "Revoke Recipient",
      "revoke-recipient@example.com",
    );
    await connectUsers(ownerId, friendId);
    await seedFriendShareJobs(ownerId);

    const share = await createJobShare(
      { recipientId: friendId, scope: "latest" },
      ownerId,
    );

    await revokeJobShare({ shareId: share.id }, ownerId);

    await expect(getJobShare({ shareId: share.id }, friendId)).rejects.toThrow(
      /revoked/i,
    );
  });
});
