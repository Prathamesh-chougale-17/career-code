const CACHE_NAME = "career-code-pwa-v2";
const OFFLINE_URL = "/offline.html";
const CORE_ASSETS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/career-code-logo.png",
  "/career-code-icon-192.png",
  "/career-code-icon-512.png",
  "/career-code-maskable-512.png",
  "/career-code-apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || isNetworkOnly(url.pathname)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

function isNetworkOnly(pathname) {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/rpc/") ||
    pathname === "/mcp" ||
    pathname.startsWith("/mcp/")
  );
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    /\.(?:css|js|mjs|svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$/i.test(
      pathname,
    )
  );
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    return (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  const networkResponsePromise = fetch(request).then((response) => {
    if (response.ok) {
      void cache.put(request, response.clone());
    }

    return response;
  });

  return cachedResponse || networkResponsePromise;
}
