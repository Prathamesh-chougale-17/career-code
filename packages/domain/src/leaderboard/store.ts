import { getFriendsSummary } from "@careeright/domain/friends/store";
import type {
  FriendConnectionView,
  FriendUser,
} from "@careeright/domain/friends/schema";
import { getHistorySnapshot } from "@careeright/domain/history/store";
import {
  leaderboardSnapshotSchema,
  type LeaderboardActivityDay,
  type LeaderboardMember,
} from "@careeright/domain/leaderboard/schema";

function otherUserId(connection: FriendConnectionView, userId: string) {
  return connection.requesterId === userId
    ? connection.recipientId
    : connection.requesterId;
}

function currentUser(userId: string): FriendUser {
  return {
    id: userId,
    name: "You",
    email: null,
    image: null,
  };
}

function toActivityDays(
  days: Awaited<ReturnType<typeof getHistorySnapshot>>["days"],
) {
  return days.map(
    (day): LeaderboardActivityDay => ({
      date: day.date,
      dsaDone: day.solvedQuestions,
      jobsApplied: day.appliedJobs,
    }),
  );
}

function withRanks(members: Omit<LeaderboardMember, "rank">[]) {
  const sorted = [...members].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (right.dsaDone !== left.dsaDone) {
      return right.dsaDone - left.dsaDone;
    }

    if (right.jobsApplied !== left.jobsApplied) {
      return right.jobsApplied - left.jobsApplied;
    }

    if (left.isCurrentUser !== right.isCurrentUser) {
      return left.isCurrentUser ? -1 : 1;
    }

    return (left.user.name ?? left.user.email ?? left.userId).localeCompare(
      right.user.name ?? right.user.email ?? right.userId,
    );
  });

  return sorted.map((member, index) => ({
    ...member,
    rank: index + 1,
  }));
}

export async function getLeaderboardSnapshot(userId: string) {
  const friendsSummary = await getFriendsSummary(userId);
  const participants = [
    {
      userId,
      user: currentUser(userId),
      isCurrentUser: true,
    },
    ...friendsSummary.friends.map((connection) => ({
      userId: otherUserId(connection, userId),
      user: connection.otherUser,
      isCurrentUser: false,
    })),
  ];
  const histories = await Promise.all(
    participants.map((participant) => getHistorySnapshot(participant.userId)),
  );
  const members = participants.map((participant, index) => {
    const history = histories[index];

    if (!history) {
      throw new Error("Missing leaderboard history.");
    }

    const days = toActivityDays(history.days);
    const dsaDone = history.summary.solvedQuestions;
    const jobsApplied = history.summary.appliedJobs;

    return {
      ...participant,
      dsaDone,
      jobsApplied,
      score: dsaDone + jobsApplied,
      days,
    };
  });
  const firstHistory = histories[0];

  if (!firstHistory) {
    throw new Error("Missing leaderboard range.");
  }

  return leaderboardSnapshotSchema.parse({
    generatedAt: new Date().toISOString(),
    range: firstHistory.range,
    members: withRanks(members),
  });
}
