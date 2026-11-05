import { and, eq, ne, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { mediaAssets, videos } from "@/db/schema";
import { removeStoredAsset } from "@/lib/storage";
import { requireUser } from "@/lib/user-auth";
import { assertSameOrigin, apiError, HttpError, jsonBody } from "@/lib/http";
import { videoDetails } from "@/lib/video-admin";
import { deleteMuxAsset } from "@/lib/mux-stream";

type Context = { params: Promise<{ id: string }> };
async function ownedVideo(id: string, userId: string) {
  if (!/^\d+$/.test(id)) throw new HttpError(400, "Invalid video.");
  const [video] = await db.select().from(videos).where(and(eq(videos.id, Number(id)), eq(videos.ownerUserId, userId), ne(videos.status, "deleted"))).limit(1);
  if (!video) throw new HttpError(404, "Video not found.");
  return video;
}
export async function PATCH(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const video = await ownedVideo((await params).id, user.id);
    const body = await jsonBody(request);
    const details = videoDetails({ ...video, ...body, isFeatured: false });
    await db.update(videos).set({ ...details, isFeatured: false, publishedAt: details.status === "published" ? video.publishedAt || new Date() : video.publishedAt, updatedAt: new Date() }).where(and(eq(videos.id, video.id), eq(videos.ownerUserId, user.id)));
    await deleteMuxAsset(video);
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const video = await ownedVideo((await params).id, user.id);
    // Soft-delete first to immediately revoke public playback.
    await db.update(videos).set({ status: "deleted", updatedAt: new Date() }).where(and(eq(videos.id, video.id), eq(videos.ownerUserId, user.id)));
    for (const assetId of [video.mediaAssetId, video.thumbnailAssetId]) {
      if (!assetId) continue;
      const [referenced] = await db.select({ id: videos.id }).from(videos).where(and(ne(videos.status, "deleted"), or(eq(videos.mediaAssetId, assetId), eq(videos.thumbnailAssetId, assetId)))).limit(1);
      if (referenced) continue;
      const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, assetId), eq(mediaAssets.ownerUserId, user.id))).limit(1);
      if (asset) { await removeStoredAsset(asset); await db.delete(mediaAssets).where(eq(mediaAssets.id, asset.id)); }
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
