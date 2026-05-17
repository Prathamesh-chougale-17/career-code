import { expo } from "@better-auth/expo";
import { memoryAdapter, type MemoryDB } from "@better-auth/memory-adapter";
import {
  mongodbAdapter,
  type MongoDBAdapterConfig,
} from "@better-auth/mongo-adapter";
import {
  betterAuth,
  type Auth,
  type BetterAuthOptions,
  type BetterAuthPlugin,
  type DBAdapter,
  type DBAdapterInstance,
  type DBTransactionAdapter,
} from "better-auth";
import { MongoClient, ObjectId, UUID, type Db } from "mongodb";

import { getMongoDatabaseName, isMongoConfigured } from "@careeright/db";

import {
  getDesktopSessionFromBearerToken,
  readBearerToken,
} from "./desktop.js";

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

  return createMongoAuthAdapter(db, { client });
}

function createMongoAuthAdapter(
  db: Db,
  config: MongoDBAdapterConfig,
): DBAdapterInstance {
  const createAdapter = mongodbAdapter(db, config);

  return ((options: BetterAuthOptions) => {
    const adapter = createAdapter(options);

    return wrapMongoAuthAdapter(adapter);
  }) satisfies DBAdapterInstance;
}

function wrapMongoAuthAdapter(adapter: DBAdapter): DBAdapter {
  const wrapped = wrapMongoAuthAdapterMethods(adapter);

  return {
    ...wrapped,
    transaction: async <R>(
      callback: (trx: DBTransactionAdapter) => Promise<R>,
    ) => {
      const result = await adapter.transaction(async (trx) => {
        return callback(wrapMongoAuthAdapterMethods(trx));
      });

      return normalizeMongoAuthValue(result) as R;
    },
  };
}

const mongoAuthAdapterMethods = [
  "create",
  "findOne",
  "findMany",
  "count",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
] as const;

function wrapMongoAuthAdapterMethods<T extends object>(
  adapter: T,
): T {
  const wrapped: Record<string, unknown> = {
    ...(adapter as Record<string, unknown>),
  };
  const adapterRecord = adapter as Record<string, unknown>;

  for (const method of mongoAuthAdapterMethods) {
    const original = adapterRecord[method];

    if (typeof original !== "function") {
      continue;
    }

    wrapped[method] = async (...args: unknown[]) => {
      const normalizedArgs = args.map((arg) => normalizeMongoAuthValue(arg));
      const result = await original.apply(adapter, normalizedArgs);

      return normalizeMongoAuthValue(result);
    };
  }

  return wrapped as T;
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
        "careeright-desktop://",
        "careeright-desktop://*",
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
  const bearerToken = readBearerToken(requestHeaders);

  try {
    const session = normalizeSessionUserId(
      await auth.api.getSession({
        headers: requestHeaders,
      }),
    );

    if (session?.user?.id) {
      return session;
    }
  } catch (error) {
    if (!bearerToken) {
      throw error;
    }
  }

  if (bearerToken) {
    const desktopSession = await getDesktopSessionFromBearerToken(bearerToken);

    if (desktopSession) {
      return {
        session: {
          userId: desktopSession.userId,
          expiresAt: desktopSession.expiresAt,
        },
        user: {
          id: desktopSession.userId,
        },
      };
    }
  }

  return null;
}

export {
  createDesktopAuthCode,
  exchangeDesktopAuthCode,
  exchangeDesktopAuthState,
  getDesktopSessionFromBearerToken,
  readBearerToken,
  revokeDesktopBearerToken,
} from "./desktop.js";

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

export function normalizeMongoAuthValue<T>(value: T): T {
  return normalizeMongoAuthValueInner(value, new WeakMap()) as T;
}

function normalizeMongoAuthValueInner(
  value: unknown,
  seen: WeakMap<object, unknown>,
): unknown {
  const idValue = getBsonIdString(value);

  if (idValue) {
    return idValue;
  }

  if (
    !value ||
    typeof value !== "object" ||
    value instanceof Date ||
    value instanceof RegExp ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  ) {
    return value;
  }

  const existing = seen.get(value);

  if (existing) {
    return existing;
  }

  if (Array.isArray(value)) {
    const normalizedArray: unknown[] = [];
    let changed = false;

    seen.set(value, normalizedArray);

    for (const item of value) {
      const normalizedItem = normalizeMongoAuthValueInner(item, seen);
      changed ||= normalizedItem !== item;
      normalizedArray.push(normalizedItem);
    }

    return changed ? normalizedArray : value;
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  const normalizedObject: Record<string, unknown> = {};
  let changed = false;

  seen.set(value, normalizedObject);

  for (const [key, item] of Object.entries(
    value as Record<string, unknown>,
  )) {
    const normalizedItem = normalizeMongoAuthValueInner(item, seen);
    changed ||= normalizedItem !== item;
    normalizedObject[key] = normalizedItem;
  }

  return changed ? normalizedObject : value;
}

const objectIdPattern = /^[a-f0-9]{24}$/i;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getBsonIdString(value: unknown) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  if (value instanceof ObjectId) {
    return value.toHexString();
  }

  if (value instanceof UUID) {
    return value.toString();
  }

  const bsonValue = value as {
    _bsontype?: string;
    toHexString?: () => string;
    toString?: () => string;
  };

  if (typeof bsonValue.toHexString === "function") {
    const stringValue = bsonValue.toHexString();

    if (objectIdPattern.test(stringValue)) {
      return stringValue;
    }
  }

  if (
    bsonValue._bsontype === "ObjectId" &&
    typeof bsonValue.toString === "function"
  ) {
    const stringValue = bsonValue.toString();

    if (objectIdPattern.test(stringValue)) {
      return stringValue;
    }
  }

  if (
    bsonValue._bsontype === "UUID" &&
    typeof bsonValue.toString === "function"
  ) {
    const stringValue = bsonValue.toString();

    if (uuidPattern.test(stringValue)) {
      return stringValue;
    }
  }

  return undefined;
}
