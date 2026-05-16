import {
  createHash,
  randomBytes,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

import { getMongoDb } from "@careeright/db";

const desktopExchangeCodeTtlMs = 5 * 60 * 1000;
const desktopSessionTtlMs = 90 * 24 * 60 * 60 * 1000;

type DesktopAuthCode = {
  id: string;
  codeHash: string;
  stateHash: string;
  userId: string;
  expiresAt: string;
  consumedAt?: string;
  createdAt: string;
};

type DesktopSession = {
  id: string;
  tokenHash: string;
  userId: string;
  expiresAt: string;
  revokedAt?: string;
  createdAt: string;
  lastUsedAt?: string;
};

function now() {
  return new Date().toISOString();
}

function expiresIn(ms: number) {
  return new Date(Date.now() + ms).toISOString();
}

function id(prefix: string) {
  return `${prefix}-${randomUUID()}`;
}

function secretValue() {
  return randomBytes(32).toString("base64url");
}

function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function sameHash(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function createDesktopAuthCode({
  state,
  userId,
}: {
  state: string;
  userId: string;
}) {
  const code = secretValue();
  const createdAt = now();
  const db = await getMongoDb();
  const codeDoc: DesktopAuthCode = {
    id: id("desktop-auth-code"),
    codeHash: hashSecret(code),
    stateHash: hashSecret(state),
    userId,
    expiresAt: expiresIn(desktopExchangeCodeTtlMs),
    createdAt,
  };

  await db.collection<DesktopAuthCode>("desktopAuthCodes").insertOne(codeDoc);

  return code;
}

export async function exchangeDesktopAuthCode({
  code,
  state,
}: {
  code: string;
  state: string;
}) {
  const db = await getMongoDb();
  const codeHash = hashSecret(code);
  const stateHash = hashSecret(state);
  const codeDoc = await db.collection<DesktopAuthCode>("desktopAuthCodes").findOne({
    codeHash,
  });

  if (
    !codeDoc ||
    codeDoc.consumedAt ||
    codeDoc.expiresAt <= now() ||
    !sameHash(codeDoc.stateHash, stateHash)
  ) {
    throw new Error("Invalid or expired desktop sign-in code.");
  }

  const consumedAt = now();
  const consumeResult = await db.collection<DesktopAuthCode>("desktopAuthCodes").updateOne(
    { id: codeDoc.id, consumedAt: { $exists: false } },
    { $set: { consumedAt } },
  );

  if (consumeResult.modifiedCount !== 1) {
    throw new Error("Desktop sign-in code was already used.");
  }

  const token = `cdt_${secretValue()}`;
  const session: DesktopSession = {
    id: id("desktop-session"),
    tokenHash: hashSecret(token),
    userId: codeDoc.userId,
    expiresAt: expiresIn(desktopSessionTtlMs),
    createdAt: consumedAt,
    lastUsedAt: consumedAt,
  };

  await db.collection<DesktopSession>("desktopSessions").insertOne(session);

  return {
    token,
    userId: session.userId,
    expiresAt: session.expiresAt,
  };
}

export async function getDesktopSessionFromBearerToken(token: string) {
  const db = await getMongoDb();
  const session = await db.collection<DesktopSession>("desktopSessions").findOne({
    tokenHash: hashSecret(token),
  });

  if (!session || session.revokedAt || session.expiresAt <= now()) {
    return null;
  }

  await db
    .collection<DesktopSession>("desktopSessions")
    .updateOne({ id: session.id }, { $set: { lastUsedAt: now() } });

  return {
    userId: session.userId,
    expiresAt: session.expiresAt,
  };
}

export async function revokeDesktopBearerToken(token: string) {
  const db = await getMongoDb();
  const result = await db.collection<DesktopSession>("desktopSessions").updateOne(
    {
      tokenHash: hashSecret(token),
      revokedAt: { $exists: false },
    },
    { $set: { revokedAt: now() } },
  );

  return result.modifiedCount > 0;
}

export function readBearerToken(headers: Headers) {
  const header = headers.get("authorization");

  if (!header?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = header.slice("bearer ".length).trim();

  return token || null;
}
