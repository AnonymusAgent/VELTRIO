import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// Runtime queries use Neon's pooled endpoint when available. Drizzle migrations
// and other schema tools should use the direct DATABASE_URL instead.
const databaseUrl = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL or DATABASE_URL_POOLED is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __videoHubPool?: Pool;
};

export const pool =
  globalForDb.__videoHubPool ??
  new Pool({
    connectionString: databaseUrl,
    max: process.env.VERCEL ? 5 : 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__videoHubPool = pool;
}

export const db = drizzle(pool);
