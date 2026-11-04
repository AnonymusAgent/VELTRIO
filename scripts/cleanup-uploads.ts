import "dotenv/config";
import { del as deleteBlob, list } from "@vercel/blob";
import { and, eq, lt, sql } from "drizzle-orm";
import { db, pool } from "../src/db";
import { mediaAssets } from "../src/db/schema";
import { removeAssetFile, removeStoredAsset } from "../src/lib/storage";

const ageHours = Math.max(1, Number(process.env.UPLOAD_CLEANUP_AGE_HOURS || 24));
const cutoff = new Date(Date.now() - ageHours * 60 * 60 * 1000);

async function removeOrphanedBlobs() {
  if (process.env.STORAGE_PROVIDER !== "vercel_blob" || !process.env.BLOB_READ_WRITE_TOKEN) return 0;
  const knownRows = await db.select({ storageKey: mediaAssets.storageKey }).from(mediaAssets).where(eq(mediaAssets.storageProvider, "vercel_blob"));
  const known = new Set(knownRows.map(row => row.storageKey));
  const orphaned: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "veltrio/", limit: 1000, ...(cursor ? { cursor } : {}) });
    orphaned.push(...page.blobs.filter(blob => blob.uploadedAt < cutoff && !known.has(blob.url)).map(blob => blob.url));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  let removed = 0;
  for (const url of orphaned) {
    // Finalization uses the same lock. Recheck references after listing so a
    // newly finalized object is never removed from a stale snapshot.
    const deleted = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(6577201)`);
      const [referenced] = await tx.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.storageKey, url)).limit(1);
      if (referenced) return false;
      await deleteBlob(url);
      return true;
    });
    if (deleted) removed++;
  }
  return removed;
}

async function main() {
  const stale = await db.select().from(mediaAssets).where(and(eq(mediaAssets.status, "uploading"), lt(mediaAssets.createdAt, cutoff)));
  for (const asset of stale) {
    await removeAssetFile(`${asset.id}.part`).catch(() => {});
    if (asset.storageProvider !== "vercel_blob") await removeStoredAsset(asset).catch(() => {});
    await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
  }
  const orphanedBlobs = await removeOrphanedBlobs();
  console.log(`Removed ${stale.length} abandoned upload${stale.length === 1 ? "" : "s"} and ${orphanedBlobs} orphaned blob${orphanedBlobs === 1 ? "" : "s"}.`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : "Upload cleanup failed."); process.exitCode = 1; }).finally(() => pool.end());
