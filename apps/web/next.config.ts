import { realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);
const configDirectory = fileURLToPath(new URL(".", import.meta.url));
const resolvePackageEntry = (packageName: string) => {
  const packageEntry = realpathSync(require.resolve(packageName));
  const relativeEntry = relative(configDirectory, packageEntry).replaceAll(
    "\\",
    "/",
  );

  return relativeEntry.startsWith(".") ? relativeEntry : `./${relativeEntry}`;
};

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ["@repo/ui"],
  outputFileTracingIncludes: {
    "/api/profile/resume": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
  serverExternalPackages: [
    "pdf-parse",
    "@careeright/auth",
    "@careeright/db",
    "better-auth",
    "@better-auth/mongo-adapter",
    "@better-auth/kysely-adapter",
    "@better-auth/memory-adapter",
    "mongodb",
  ],
  turbopack: {
    resolveAlias: {
      "@better-auth/mongo-adapter": resolvePackageEntry(
        "@better-auth/mongo-adapter",
      ),
      "@better-auth/kysely-adapter": resolvePackageEntry(
        "@better-auth/kysely-adapter",
      ),
      "@better-auth/memory-adapter": resolvePackageEntry(
        "@better-auth/memory-adapter",
      ),
    },
  },
};

export default nextConfig;
