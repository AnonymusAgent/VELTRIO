import { open, rename, stat } from "node:fs/promises";
import { NextResponse } from "next/server";
import { and, eq, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, videos } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { CHUNK_SIZE } from "@/lib/admin-shared";
import { assertSameOrigin, readBounded, HttpError, apiError } from "@/lib/http";
import { assetPath, verifySignature, removeAssetFile } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: Context) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.adminId, admin.id))).limit(1);
    if (!asset) throw new HttpError(404, "Upload not found.");
    return NextResponse.json({ id, received: asset.received, size: asset.size, status: asset.status }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await params;
    const offset = Number(new URL(request.url).searchParams.get("offset"));
    if (!Number.isSafeInteger(offset) || offset < 0) throw new HttpError(400, "Invalid upload offset.");
    const chunk = await readBounded(request, CHUNK_SIZE);
    if (!chunk.length) throw new HttpError(400, "Empty chunk.");
    const received = await db.transaction(async (tx) => {
      const [asset] = await tx.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.adminId, admin.id))).for("update");
      if (!asset) throw new HttpError(404, "Upload not found.");
      if (asset.status !== "uploading") throw new HttpError(409, "Upload is already complete.");
      if (asset.received !== offset) throw new HttpError(409, `Resume from byte ${asset.received}.`);
      if (offset + chunk.length > asset.size) throw new HttpError(413, "Upload exceeds its declared size.");
      const handle = await open(assetPath(`${id}.part`), "r+");
      try {
        let written = 0;
        while (written < chunk.length) {
          const result = await handle.write(chunk, written, chunk.length - written, offset + written);
          if (!result.bytesWritten) throw new Error("Disk write failed");
          written += result.bytesWritten;
        }
      } finally { await handle.close(); }
      await tx.update(mediaAssets).set({ received: offset + chunk.length }).where(eq(mediaAssets.id, id));
      return offset + chunk.length;
    });
    return NextResponse.json({ received });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await params;
    await db.transaction(async (tx) => {
      const [asset] = await tx.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.adminId, admin.id))).for("update");
      if (!asset) throw new HttpError(404, "Upload not found.");
      if (asset.status === "ready") return;
      if (asset.received !== asset.size) throw new HttpError(409, "Upload is incomplete. Resume before finishing.");
      const partial = assetPath(`${id}.part`);
      const finalPath = assetPath(asset.storageKey);
      const partialInfo = await stat(partial).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return null; throw error; });
      // An interrupted DB commit can leave an already-renamed file. Finalization remains retryable.
      const info = partialInfo || await stat(finalPath);
      if (info.size !== asset.size) throw new HttpError(409, "Stored file size does not match the completed upload.");
      await verifySignature(partialInfo ? partial : finalPath, asset.mimeType);
      if (partialInfo) await rename(partial, finalPath);
      await tx.update(mediaAssets).set({ status: "ready" }).where(eq(mediaAssets.id, id));
    });
    return NextResponse.json({ id, url: `/api/media/${id}`, status: "ready" });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await params;
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.adminId, admin.id))).limit(1);
    if (!asset) return NextResponse.json({ ok: true });
    const [used] = await db.select({ id: videos.id }).from(videos).where(and(ne(videos.status, "deleted"), or(eq(videos.mediaAssetId, id), eq(videos.thumbnailAssetId, id)))).limit(1);
    if (used) throw new HttpError(409, "This file is attached to a video. Delete the video first.");
    await removeAssetFile(`${id}.part`);
    await removeAssetFile(asset.storageKey);
    await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
