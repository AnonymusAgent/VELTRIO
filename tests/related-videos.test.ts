import assert from "node:assert/strict";
import type { Video } from "../src/lib/data";
import { selectRelatedVideos } from "../src/lib/related-videos";

const video = (id: number): Video => ({ id, title: `Video ${id}`, slug: `video-${id}`, description: "", thumbnail: "", duration: "0:00", views: 0, likes: 0, category: "Short films", categorySlug: "short-films", publishedAt: "2026-01-01" });
assert.deepEqual(selectRelatedVideos([video(1), video(2), video(3)], [video(2), video(4), video(5)], 1).map(v => v.id), [2, 3, 4, 5]);
assert.deepEqual(selectRelatedVideos([video(1)], [video(1), video(2), video(3)], 1, 1).map(v => v.id), [2]);
assert.deepEqual(selectRelatedVideos([], [video(2)], 1, 0), []);
console.log("PASS: related videos prioritize category, exclude the current video and deduplicate fallbacks.");
