import { describe, expect, test } from "vitest";
import { readFileSync, statSync } from "node:fs";

import manifest from "../app/manifest";

describe("pwa", () => {
  test("publishes an installable app manifest", () => {
    const appManifest = manifest();

    expect(appManifest.name).toBe("Careeright");
    expect(appManifest.start_url).toBe("/dashboard");
    expect(appManifest.display).toBe("standalone");
    expect(appManifest.icons?.some((icon) => icon.purpose === "maskable"))
      .toBe(true);
    expect(appManifest.icons?.some((icon) => icon.src === "/careeright-logo.png"))
      .toBe(true);
  });

  test("includes generated app icons", () => {
    for (const path of [
      "public/careeright-logo.png",
      "public/careeright-icon-192.png",
      "public/careeright-icon-512.png",
      "public/careeright-maskable-512.png",
      "public/careeright-apple-touch-icon.png",
      "app/favicon.ico",
    ]) {
      expect(statSync(path).size).toBeGreaterThan(0);
    }
  });

  test("keeps authenticated routes network-only in the service worker", () => {
    const serviceWorker = readFileSync("public/sw.js", "utf8");

    expect(serviceWorker).toContain("careeright-pwa-v1");
    expect(serviceWorker).toContain("/offline.html");
    expect(serviceWorker).toContain("/careeright-logo.png");
    expect(serviceWorker).toContain('pathname.startsWith("/api/")');
    expect(serviceWorker).toContain('pathname.startsWith("/rpc/")');
    expect(serviceWorker).toContain('pathname === "/mcp"');
  });
});
