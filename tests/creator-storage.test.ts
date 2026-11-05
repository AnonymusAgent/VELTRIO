import assert from "node:assert/strict";
import { creatorStorageIssue } from "../src/lib/creator-storage";
assert.equal(creatorStorageIssue({}), null);
assert.equal(creatorStorageIssue({ STORAGE_PROVIDER: "local" }), null);
assert.equal(creatorStorageIssue({ MUX_TOKEN_ID: "id", MUX_TOKEN_SECRET: "secret" }), null);
assert.equal(creatorStorageIssue({ VERCEL: "1", MUX_TOKEN_ID: "id", MUX_TOKEN_SECRET: "secret" }), null);
assert.match(creatorStorageIssue({ VERCEL: "1" }) || "", /Mux/i);
assert.match(creatorStorageIssue({ STORAGE_PROVIDER: "vercel_blob" }) || "", /not available/i);
// Local (non-Vercel) hosts keep the legacy chunked path as a fallback.
assert.equal(creatorStorageIssue({ MUX_TOKEN_ID: "id", MUX_TOKEN_SECRET: "secret", MUX_ENABLED: "false" }), null);
assert.match(creatorStorageIssue({ VERCEL: "1", MUX_TOKEN_ID: "id", MUX_TOKEN_SECRET: "secret", MUX_ENABLED: "false" }) || "", /Mux/i);
console.log("PASS: creator uploads prefer Mux streaming, stay available on a persistent host and fail safely elsewhere.");
