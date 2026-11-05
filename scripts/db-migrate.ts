import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool, type PoolClient } from "pg";
import { auditSnapshot, readSnapshot } from "./schema-audit";
import { shouldRunMigrations } from "./migration-policy";

// Applies the SQL migrations in ./drizzle to the database. Uses the DIRECT
// (non-pooled) DATABASE_URL because migrations run DDL in a transaction and
// need a stable session. Safe to run repeatedly: Drizzle records applied
// migrations in drizzle.__drizzle_migrations and skips them on later runs.
//
// This is wired into the Vercel build command so the production schema is
// created/updated automatically on deploy (the Neon database starts empty).

async function main() {
  if (!shouldRunMigrations(process.env)) {
    console.log("Preview migrations skipped. Configure a separate preview database before opting in; runtime database access is not isolated by this setting.");
    return;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for migrations. Use the direct (non-pooled) Neon connection string.");
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  let client: PoolClient | undefined;
  let locked = false;
  try {
    client = await pool.connect();
    // Preview and production builds may run together against one database.
    // Keep the lock and migration transaction on the same direct connection.
    await client.query("select pg_advisory_lock(6577202)");
    locked = true;
    const db = drizzle(client);
    await baselineIfSchemaAlreadyExists(client);
    await migrate(db, { migrationsFolder: "./drizzle" });
    const journal = JSON.parse(readFileSync("./drizzle/meta/_journal.json", "utf8")) as { entries: { tag: string }[] };
    const latest = journal.entries.at(-1);
    if (!latest) throw new Error("Migration journal is empty; schema cannot be verified.");
    const problems = await auditSnapshot(client, readSnapshot(latest.tag));
    if (problems.length) throw new Error(`Database schema does not match the latest migration:\n${problems.join("\n")}`);
    console.log("Database migrations and schema audit are up to date.");
  } finally {
    if (client) {
      try { if (locked) await client.query("select pg_advisory_unlock(6577202)"); }
      finally { client.release(); }
    }
    await pool.end();
  }
}

// If the app tables already exist (for example they were created earlier with
// `drizzle-kit push`) but no migrations have been recorded yet, mark the first
// migration as applied instead of re-running its CREATE TABLE statements.
async function baselineIfSchemaAlreadyExists(pool: PoolClient) {
  const journal = JSON.parse(readFileSync("./drizzle/meta/_journal.json", "utf8")) as {
    entries: { tag: string; when: number }[];
  };
  const first = journal.entries[0];
  if (!first) return;

  const videosTable = (await pool.query("select to_regclass('public.videos') as t")).rows[0].t;
  if (!videosTable) return; // Empty database: let the migrator create everything.

  const journalTable = (await pool.query("select to_regclass('drizzle.__drizzle_migrations') as t")).rows[0].t;
  let appliedCount = 0;
  if (journalTable) {
    appliedCount = (await pool.query("select count(*)::int as n from drizzle.__drizzle_migrations")).rows[0].n;
  }
  if (appliedCount > 0) return; // Migrations already tracked: nothing to baseline.

  // A videos table alone is not evidence that the entire initial migration was
  // applied. Refuse to baseline a partial or incompatible legacy database.
  const problems = await auditSnapshot(pool, readSnapshot(first.tag));
  if (problems.length) throw new Error(`Cannot safely baseline an incomplete existing schema:\n${problems.join("\n")}`);

  const sqlText = readFileSync(`./drizzle/${first.tag}.sql`, "utf8");
  const hash = createHash("sha256").update(sqlText).digest("hex");
  await pool.query("create schema if not exists drizzle");
  await pool.query(
    "create table if not exists drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)"
  );
  await pool.query("insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)", [hash, first.when]);
  console.log("Existing schema detected; baselined the initial migration.");
}

main().catch((error) => {
  console.error("Database migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
