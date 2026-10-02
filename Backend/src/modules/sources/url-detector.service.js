// this file is basically a service file to identify the url

const YOUTUBE_HOST_PATTERN = ["youtube.com", "youtu.be", "m.youtube.com"];

export function detectSourceTypes(url) {
  const parsed = new URL(url);
  const isYoutube = YOUTUBE_HOST_PATTERN.some((pattern) =>
    parsed.hostname.includes(pattern),
  );
  return isYoutube ? "YOUTUBE" : "URL";
}

function extractYoutubeVideoId(url) {
  const parsed = new URL(url);

  // https://youtu.be/asOlKsDOKas
  if (parsed.hostname === "youtu.be") {
    return parsed.pathname.slice(1).split("/")[0] || null;
  }
  // https://youtube.com/shorts/j4eNGuDeuWk?si=QKSVo4zqtMxFU02u
  if (
    parsed.pathname.startsWith("/shorts/") ||
    parsed.pathname.startsWith("/embed")
  ) {
    return parsed.pathname.split("/")[2] || null;
  }

  // standard youtube.com/watch?v=VIDEO_ID
  const id = parsed.searchParams.get("v");
  return id || null;
}
export function extractVideoUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    throw new Error("Invalid URL");
  }

  const videoId = extractYoutubeVideoId(url);
  if (!videoId || videoId.length !== 11) {
    throw new Error("No video ID found in the URL");
  }

  // playlists are not supported yet — explicit rejection, not silent partial behavior
  if (parsed.searchParams.has("list") && !parsed.searchParams.has("v")) {
    throw new Error(
      "Playlist URLs are not supported yet. Paste a single video URL.",
    );
  }
  return videoId
}

export function getSourceComparisonKey(sourceUrl) {
  try {
    const parsed = new URL(sourceUrl);
    if (detectSourceTypes(parsed) === "YOUTUBE") {
      return `YOUTUBE:${extractVideoUrl(parsed)}`;
    }
  } catch {
    // Keep malformed or unsupported URLs distinct by their original value.
  }

  return `URL:${sourceUrl}`;
}
