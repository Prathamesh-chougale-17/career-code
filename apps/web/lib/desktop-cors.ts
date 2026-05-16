const allowedDesktopOrigins = new Set([
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost",
]);

export function getDesktopCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers();

  if (origin && isAllowedDesktopOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
  }

  headers.set(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  headers.set(
    "Access-Control-Allow-Headers",
    request.headers.get("access-control-request-headers") ??
      "authorization,content-type",
  );

  return headers;
}

export function desktopCorsPreflight(request: Request) {
  return new Response(null, {
    status: 204,
    headers: getDesktopCorsHeaders(request),
  });
}

export function withDesktopCors(response: Response, request: Request) {
  const headers = new Headers(response.headers);

  getDesktopCorsHeaders(request).forEach((value, key) => {
    headers.set(key, value);
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function isAllowedDesktopOrigin(origin: string) {
  if (allowedDesktopOrigins.has(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);

    return (
      (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
      url.port === "1420"
    );
  } catch {
    return false;
  }
}
