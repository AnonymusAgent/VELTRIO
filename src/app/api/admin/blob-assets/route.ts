import { randomUUID } from "node:crypto";
import { head } from "@vercel/blob";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { assertSameOrigin, apiError, jsonBody, HttpError } from "@/lib/http";
import { STORAGE_QUOTA, validateUpload, verifyRemoteSignature } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function blobUrl(value: unknown) {
  try {
    const url = new URL(String(value || ""));
    if (url.protocol !== "https:" || !/(?:^|\.)blob\.vercel-storage\.com$/.test(url.hostname)) throw new Error("invalid host");
    return url.toString();
  } catch { throw new HttpError(400, "Invalid blob URL."); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (process.env.STORAGE_PROVIDER !== "vercel_blob" || !process.env.BLOB_READ_WRITE_TOKEN) throw new HttpError(503, "Durable blob storage is not configured.");
    const admin = await requireAdmin();
    const body = await jsonBody(request);
    const url = blobUrl(body.url);
    const filename = String(body.filename || "").slice(0, 250);
    const kind = String(body.kind || "");
    const blob = await head(url);
    if (!/^veltrio\/(video|thumbnail)\//.test(blob.pathname) || !blob.pathname.startsWith(`veltrio/${kind}/`)) throw new HttpError(400, "Invalid blob pathname.");
    const info = validateUpload(filename, blob.size, kind);
    if (blob.contentType && blob.contentType !== info.mime) throw new HttpError(400, "The blob content type does not match its extension.");
    const [existing] = await db.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.storageKey, url)).limit(1);
    if (existing) return NextResponse.json({ id: existing.id, url: `/api/media/${existing.id}`, status: "ready" });
    const id = randomUUID();

    const assetId = await db.transaction(async tx => {
      await tx.execute(sql`select pg_advisory_xact_lock(6577201)`);
      // Finalization can be retried or arrive concurrently. Check again under
      // the reservation lock so one blob never gets duplicate database rows.
      const [existingAsset] = await tx.select({ id: mediaAssets.id }).from(mediaAssets).where(eq(mediaAssets.storageKey, url)).limit(1);
      if (existingAsset) return existingAsset.id;
      await verifyRemoteSignature(url, info.mime);
      const [usage] = await tx.select({ total: sql<number>`coalesce(sum(${mediaAssets.size}), 0)` }).from(mediaAssets);
      if (Number(usage.total) + blob.size > STORAGE_QUOTA) throw new HttpError(413, "The server storage allowance is full. Delete unused uploads or increase UPLOAD_STORAGE_GB.");
      await tx.insert(mediaAssets).values({
        id,
        adminId: admin.id,
        kind: info.kind,
        filename,
        storageKey: url,
        storageProvider: "vercel_blob",
        mimeType: info.mime,
        size: blob.size,
        received: blob.size,
        status: "ready",
      });
      return id;
    });
    return NextResponse.json({ id: assetId, url: `/api/media/${assetId}`, status: "ready" });
  } catch (error) {
    // A supplied URL may already be referenced (or a DB commit may have
    // succeeded). Never delete it here; aged, unreferenced blobs are cleaned
    // up separately after checking database references.
    return apiError(error);
  }
}
