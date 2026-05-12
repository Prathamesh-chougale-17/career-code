import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
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
      "@better-auth/mongo-adapter":
        "./node_modules/@better-auth/mongo-adapter/dist/index.mjs",
      "@better-auth/kysely-adapter":
        "./node_modules/@better-auth/kysely-adapter/dist/index.mjs",
      "@better-auth/memory-adapter":
        "./node_modules/@better-auth/memory-adapter/dist/index.mjs",
    },
  },
};

export default nextConfig;
