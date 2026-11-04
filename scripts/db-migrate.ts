import "dotenv/config";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

// Applies the SQL migrations in ./drizzle to the database. Uses the DIRECT
// (non-pooled) DATABASE_URL because migrations run DDL in a transaction and
// need a stable session. Safe to run repeatedly: Drizzle records applied
// migrations in drizzle.__drizzle_migrations and skips them on later runs.
//
// This is wired into the Vercel build command so the production schema is
// created/updated automatically on deploy (the Neon database starts empty).

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for migrations. Use the direct (non-pooled) Neon connection string.");
  }

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);

  try {
    await baselineIfSchemaAlreadyExists(pool);
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Database migrations are up to date.");
  } finally {
    await pool.end();
  }
}

// If the app tables already exist (for example they were created earlier with
// `drizzle-kit push`) but no migrations have been recorded yet, mark the first
// migration as applied instead of re-running its CREATE TABLE statements.
async function baselineIfSchemaAlreadyExists(pool: Pool) {
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
