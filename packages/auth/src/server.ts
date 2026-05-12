import { randomUUID } from "node:crypto";

import { memoryAdapter, type MemoryDB } from "@better-auth/memory-adapter";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";

import { getMongoDatabaseName, isMongoConfigured } from "@careeright/db";

let authPromise: ReturnType<typeof createAuth> | undefined;

type AuthRuntimeEnv = Record<string, string | undefined>;

const globalForAuth = globalThis as typeof globalThis & {
  __careerightAuthMemoryDb?: MemoryDB;
  __careerightAuthMongoClientPromise?: Promise<MongoClient>;
};

export function getAuthRuntimeConfig(env: AuthRuntimeEnv = process.env) {
  const isProduction = env.NODE_ENV === "production";
  const baseURL =
    env.CAREERIGHT_AUTH_URL?.trim() ||
    env.CAREER_CODE_AUTH_URL?.trim() ||
    env.BETTER_AUTH_URL?.trim() ||
    "http://localhost:3000";
  const secret =
    env.CAREERIGHT_AUTH_SECRET?.trim() ||
    env.CAREER_CODE_AUTH_SECRET?.trim() ||
    env.BETTER_AUTH_SECRET?.trim() ||
    (!isProduction ? "f4e7c2d9b8a14f0d9c3b6a217e5d8c0a" : undefined);
  const googleClientId = env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim();

  if (!secret) {
    throw new Error(
      "CAREERIGHT_AUTH_SECRET, CAREER_CODE_AUTH_SECRET, or BETTER_AUTH_SECRET is required.",
    );
  }

  if (
    isProduction &&
    (!googleClientId || !googleClientSecret)
  ) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for Google OAuth.",
    );
  }

  return {
    advanced: {
      database: {
        generateId: generateAuthDatabaseId,
      },
    },
    baseURL,
    secret,
    trustedOrigins: [baseURL],
    socialProviders:
      googleClientId && googleClientSecret
        ? {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            },
          }
        : undefined,
  };
}

export function generateAuthDatabaseId() {
  return randomUUID();
}

export async function getAuth() {
  if (!authPromise) {
    authPromise = createAuth();
  }

  return authPromise;
}

async function createAuth() {
  const runtimeConfig = getAuthRuntimeConfig();
  const database = isMongoConfigured()
    ? await getAuthMongoAdapter()
    : memoryAdapter(getAuthMemoryDb());

  return betterAuth({
    appName: "Careeright",
    baseURL: runtimeConfig.baseURL,
    secret: runtimeConfig.secret,
    advanced: runtimeConfig.advanced,
    database,
    socialProviders: runtimeConfig.socialProviders,
    trustedOrigins: runtimeConfig.trustedOrigins,
  });
}

async function getAuthMongoAdapter() {
  const client = await getAuthMongoClient();
  const db = client.db(getMongoDatabaseName());

  return mongodbAdapter(db, { client });
}

async function getAuthMongoClient() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  globalForAuth.__careerightAuthMongoClientPromise ??= new MongoClient(
    uri,
  ).connect();

  return globalForAuth.__careerightAuthMongoClientPromise;
}

function getAuthMemoryDb() {
  globalForAuth.__careerightAuthMemoryDb ??= {};

  return globalForAuth.__careerightAuthMemoryDb;
}

export function normalizeAuthCallbackPath(
  value?: string | string[],
  fallback = "/",
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  return candidate;
}

export async function getSessionFromHeaders(requestHeaders: Headers) {
  const auth = await getAuth();
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  return normalizeSessionUserId(session);
}

type SessionLike = {
  session?: {
    userId?: unknown;
  } & Record<string, unknown>;
  user?: {
    _id?: unknown;
    id?: unknown;
  } & Record<string, unknown>;
};

function normalizeSessionUserId<T>(session: T): T {
  if (!session || typeof session !== "object") {
    return session;
  }

  const sessionLike = session as SessionLike;
  const userId =
    normalizeId(sessionLike.user?.id) ??
    normalizeId(sessionLike.user?._id) ??
    normalizeId(sessionLike.session?.userId);

  if (!userId || sessionLike.user?.id === userId) {
    return session;
  }

  return {
    ...sessionLike,
    session: sessionLike.session
      ? {
          ...sessionLike.session,
          userId,
        }
      : sessionLike.session,
    user: {
      ...sessionLike.user,
      id: userId,
    },
  } as T;
}

function normalizeId(value: unknown) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (!value || typeof value !== "object") {
    return undefined;
  }

  const maybeObjectId = value as {
    toHexString?: () => string;
    toString?: () => string;
  };
  const stringValue =
    typeof maybeObjectId.toHexString === "function"
      ? maybeObjectId.toHexString()
      : typeof maybeObjectId.toString === "function"
        ? maybeObjectId.toString()
        : "";

  return /^[a-f0-9]{24}$/i.test(stringValue) ? stringValue : undefined;
}
