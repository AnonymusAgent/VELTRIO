import { NextResponse } from "next/server";
import { and, eq, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, videos } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { apiError, assertSameOrigin, jsonBody, HttpError } from "@/lib/http";
import { readyAsset, videoDetails } from "@/lib/video-admin";
import { removeStoredAsset } from "@/lib/storage";

type Context = { params: Promise<{ id: string }> };
async function find(id: string) {
  if (!/^\d+$/.test(id)) throw new HttpError(400, "Invalid video.");
  const [video] = await db.select().from(videos).where(and(eq(videos.id, Number(id)), eq(videos.sourceType, "upload"), ne(videos.status, "deleted"))).limit(1);
  if (!video) throw new HttpError(404, "Video not found.");
  return video;
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const video = await find((await params).id);
    const body = await jsonBody(request);
    const details = videoDetails({ ...video, ...body });
    if (video.ownerUserId) {
      const [media] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, video.mediaAssetId || ""), eq(mediaAssets.ownerUserId, video.ownerUserId), eq(mediaAssets.status, "ready"), eq(mediaAssets.kind, "video"))).limit(1);
      if (!media) throw new HttpError(400, "The video upload is incomplete or invalid.");
    } else await readyAsset(video.mediaAssetId, "video", admin.id);
    const thumb = body.thumbnailAssetId ? await readyAsset(body.thumbnailAssetId, "thumbnail", admin.id) : null;
    await db.update(videos).set({ ...details, ...(thumb ? { thumbnailAssetId: thumb.id, thumbnail: `/api/media/${thumb.id}` } : {}), publishedAt: details.status === "published" ? video.publishedAt || new Date() : video.publishedAt, updatedAt: new Date() }).where(eq(videos.id, video.id));
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const video = await find((await params).id);
    await db.update(videos).set({ status: "deleted", updatedAt: new Date() }).where(eq(videos.id, video.id));
    for (const id of [video.mediaAssetId, video.thumbnailAssetId].filter((value): value is string => Boolean(value))) {
      const [other] = await db.select({ id: videos.id }).from(videos).where(and(ne(videos.status, "deleted"), or(eq(videos.mediaAssetId, id), eq(videos.thumbnailAssetId, id)))).limit(1);
      if (other) continue;
      const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
      if (asset) { await removeStoredAsset(asset); await db.delete(mediaAssets).where(eq(mediaAssets.id, id)); }
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
