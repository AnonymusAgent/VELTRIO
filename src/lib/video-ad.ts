/** Optional, directly sold pre-roll served from this site's public files.
 * This is not an ad-network tag or a server-side ad-insertion service. */
export function getPrerollPath(value = process.env.VIDEO_PREROLL_PATH || ""): string | undefined {
  const path = value.trim();
  if (path.length > 512 || !/^\/(?:[a-zA-Z0-9_~-][a-zA-Z0-9._~-]*\/)*[a-zA-Z0-9_~-][a-zA-Z0-9._~-]*\.(?:mp4|webm)$/i.test(path)) return undefined;
  return path;
}
