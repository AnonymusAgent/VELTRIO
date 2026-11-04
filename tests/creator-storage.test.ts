import assert from "node:assert/strict";
import { creatorStorageIssue } from "../src/lib/creator-storage";
assert.equal(creatorStorageIssue({}), null);
assert.equal(creatorStorageIssue({ STORAGE_PROVIDER: "local" }), null);
assert.match(creatorStorageIssue({ VERCEL: "1" }) || "", /durable storage/i);
assert.match(creatorStorageIssue({ STORAGE_PROVIDER: "vercel_blob" }) || "", /not available/i);
console.log("PASS: creator storage is available on a persistent host and fails safely on unsupported deployments.");
