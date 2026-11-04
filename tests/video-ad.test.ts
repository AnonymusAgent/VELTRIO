import assert from "node:assert/strict";
import { getPrerollPath } from "../src/lib/video-ad";
assert.equal(getPrerollPath(""), undefined);
assert.equal(getPrerollPath("/sponsors/promo.mp4"), "/sponsors/promo.mp4");
assert.equal(getPrerollPath("  /sponsors/clip.WEBM  "), "/sponsors/clip.WEBM");
for (const invalid of ["https://example.com/ad.mp4", "//example.com/ad.mp4", "/../secret.mp4", "/sponsors/../../video.mp4", "/sponsors/ad.mp4?tracking=1", "/sponsors/ad.svg", "/sponsors/%2e%2e/ad.mp4", "/sponsors/a\\b.mp4"]) assert.equal(getPrerollPath(invalid), undefined, invalid);
console.log("PASS: only first-party media paths can be configured as pre-roll.");
