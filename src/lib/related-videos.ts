import type { Video } from "./data";

// Preserve category relevance, then fill remaining positions with recent
// uploads. Exclude the current video and never repeat the same video.
export function selectRelatedVideos(category: Video[], recent: Video[], currentId: number, limit = 6): Video[] {
  if (limit <= 0) return [];
  const result: Video[] = [];
  const seen = new Set([currentId]);
  for (const video of [...category, ...recent]) {
    if (seen.has(video.id)) continue;
    seen.add(video.id);
    result.push(video);
    if (result.length >= limit) break;
  }
  return result;
}
