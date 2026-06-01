const YOUTUBE_HOSTNAMES = new Set(["youtube.com", "www.youtube.com", "youtu.be"]);

function parseYouTubeUrl(url: string | undefined) {
  if (!url) {
    return undefined;
  }

  try {
    const parsedUrl = new URL(url);

    if (!YOUTUBE_HOSTNAMES.has(parsedUrl.hostname)) {
      return undefined;
    }

    return parsedUrl;
  } catch {
    return undefined;
  }
}

function extractVideoId(videoUrl: URL | undefined) {
  if (!videoUrl) {
    return undefined;
  }

  if (videoUrl.hostname === "youtu.be") {
    return videoUrl.pathname.split("/").filter(Boolean)[0];
  }

  if (videoUrl.pathname === "/watch") {
    return videoUrl.searchParams.get("v") ?? undefined;
  }

  if (videoUrl.pathname.startsWith("/embed/")) {
    return videoUrl.pathname.split("/").filter(Boolean)[1];
  }

  return undefined;
}

export function buildSystemDesignVideoEmbedUrl({
  videoId,
  videoUrl,
}: {
  videoId?: string;
  videoUrl?: string;
}) {
  const parsedVideoUrl = parseYouTubeUrl(videoUrl);
  const resolvedVideoId = videoId?.trim() || extractVideoId(parsedVideoUrl);

  if (!resolvedVideoId) {
    return undefined;
  }

  const embedUrl = new URL(
    `https://www.youtube.com/embed/${encodeURIComponent(resolvedVideoId)}`,
  );
  const playlistId = parsedVideoUrl?.searchParams.get("list");

  embedUrl.searchParams.set("rel", "0");

  if (playlistId) {
    embedUrl.searchParams.set("list", playlistId);
  }

  return embedUrl.toString();
}

export function buildSystemDesignPlaylistEmbedUrl(playlistUrl: string) {
  const playlistId = parseYouTubeUrl(playlistUrl)?.searchParams.get("list");

  if (!playlistId) {
    return undefined;
  }

  const embedUrl = new URL("https://www.youtube.com/embed/videoseries");

  embedUrl.searchParams.set("list", playlistId);
  embedUrl.searchParams.set("rel", "0");

  return embedUrl.toString();
}
