import { expo } from "@better-auth/expo";
import { memoryAdapter, type MemoryDB } from "@better-auth/memory-adapter";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { betterAuth, type Auth, type BetterAuthPlugin } from "better-auth";
import { MongoClient } from "mongodb";

import { getMongoDatabaseName, isMongoConfigured } from "@careeright/db";

let authPromise: Promise<Auth> | undefined;

type AuthRuntimeEnv = Record<string, string | undefined>;
type AuthRuntimeConfig = {
  baseURL: string;
  plugins: BetterAuthPlugin[];
  requiresPersistentAuth: boolean;
  secret: string;
  socialProviders:
    | {
        google: {
          clientId: string;
          clientSecret: string;
        };
      }
    | undefined;
  trustedOrigins: string[];
  verification: {
    storeInDatabase: true;
  };
};

const globalForAuth = globalThis as typeof globalThis & {
  __careerightAuthMemoryDb?: MemoryDB;
  __careerightAuthMongoClientPromise?: Promise<MongoClient>;
};

export function getAuthRuntimeConfig(
  env: AuthRuntimeEnv = process.env,
): AuthRuntimeConfig {
  const isProduction = env.NODE_ENV === "production";
  const baseURL =
    env.BETTER_AUTH_URL?.trim() ||
    env.CAREERIGHT_AUTH_URL?.trim() ||
    env.CAREER_CODE_AUTH_URL?.trim() ||
    "http://localhost:3000";
  const secret =
    env.BETTER_AUTH_SECRET?.trim() ||
    env.CAREERIGHT_AUTH_SECRET?.trim() ||
    env.CAREER_CODE_AUTH_SECRET?.trim() ||
    (!isProduction ? "f4e7c2d9b8a14f0d9c3b6a217e5d8c0a" : undefined);
  const googleClientId = env.GOOGLE_CLIENT_ID?.trim();
  const googleClientSecret = env.GOOGLE_CLIENT_SECRET?.trim();
  const socialProviders =
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : undefined;
  const hasGoogleOAuth = Boolean(socialProviders);

  if (!secret) {
    throw new Error(
      "CAREERIGHT_AUTH_SECRET, CAREER_CODE_AUTH_SECRET, or BETTER_AUTH_SECRET is required.",
    );
  }

  if (isProduction && isLoopbackOrigin(baseURL)) {
    throw new Error(
      "BETTER_AUTH_URL or CAREERIGHT_AUTH_URL must be set to the public HTTPS app URL in production.",
    );
  }

  if (
    isProduction &&
    !hasGoogleOAuth
  ) {
    throw new Error(
      "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are required for Google OAuth.",
    );
  }

  return {
    baseURL,
    requiresPersistentAuth: isProduction || hasGoogleOAuth,
    secret,
    trustedOrigins: getTrustedOrigins(env, baseURL, isProduction),
    verification: {
      storeInDatabase: true,
    },
    plugins: [expo() as BetterAuthPlugin],
    socialProviders,
  };
}

export async function getAuth(): Promise<Auth> {
  if (!authPromise) {
    authPromise = createAuth();
  }

  return authPromise;
}

async function createAuth(): Promise<Auth> {
  const runtimeConfig = getAuthRuntimeConfig();
  const hasMongo = isMongoConfigured();

  if (!hasMongo && runtimeConfig.requiresPersistentAuth) {
    throw new Error(
      "MONGODB_URI is required for Google OAuth and production auth state.",
    );
  }

  const database = hasMongo
    ? await getAuthMongoAdapter()
    : memoryAdapter(getAuthMemoryDb());

  return betterAuth({
    appName: "Careeright",
    baseURL: runtimeConfig.baseURL,
    secret: runtimeConfig.secret,
    database,
    plugins: runtimeConfig.plugins,
    socialProviders: runtimeConfig.socialProviders,
    trustedOrigins: runtimeConfig.trustedOrigins,
    verification: runtimeConfig.verification,
  }) as Auth;
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

function getTrustedOrigins(
  env: AuthRuntimeEnv,
  baseURL: string,
  isProduction: boolean,
) {
  return Array.from(
    new Set(
      [
        baseURL,
        env.BETTER_AUTH_URL,
        env.CAREERIGHT_AUTH_URL,
        env.CAREER_CODE_AUTH_URL,
        env.NEXT_PUBLIC_APP_URL,
        env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined,
        "careeright://",
        "careeright://*",
        // Temporary Expo Go callback support while the native app is tested.
        "exp://",
        "exp://*",
        !isProduction ? "exp://192.168.*.*:*/**" : undefined,
        !isProduction ? "exp://10.*.*.*:*/**" : undefined,
        !isProduction ? "exp://172.*.*.*:*/**" : undefined,
        !isProduction ? "http://localhost:3000" : undefined,
      ]
        .map((value) => value?.trim())
        .filter((value): value is string => {
          if (!value) {
            return false;
          }

          return !isProduction || !isLoopbackOrigin(value);
        }),
    ),
  );
}

function isLoopbackOrigin(value: string) {
  try {
    const { hostname } = new URL(value);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "[::1]"
    );
  } catch {
    return false;
  }
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
