import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { shouldRunMigrations } from "../scripts/migration-policy";

assert.equal(shouldRunMigrations({ VERCEL_ENV: "preview" }), false);
assert.equal(shouldRunMigrations({ VERCEL_ENV: "preview", ALLOW_PREVIEW_DB_MIGRATIONS: "false" }), false);
assert.equal(shouldRunMigrations({ VERCEL_ENV: "preview", ALLOW_PREVIEW_DB_MIGRATIONS: "true" }), true);
assert.equal(shouldRunMigrations({ VERCEL_ENV: "production" }), true);
assert.equal(shouldRunMigrations({}), true);

// Exercise the real runner with an invalid URL: a preview without opt-in must
// exit before connecting or trying to modify any database.
const run = spawnSync(process.execPath, ["--import", "tsx", "scripts/db-migrate.ts"], {
  encoding: "utf8",
  env: { ...process.env, VERCEL_ENV: "preview", ALLOW_PREVIEW_DB_MIGRATIONS: "", DATABASE_URL: "invalid-url" },
});
assert.equal(run.status, 0, run.stderr);
assert.match(run.stdout, /Preview migrations skipped/);
console.log("PASS: preview migrations require an explicit isolation opt-in; production and local behavior remain unchanged.");
