import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { creatorProfiles, videos } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { apiError, assertSameOrigin, jsonBody, HttpError } from "@/lib/http";
import { readyAsset, videoDetails } from "@/lib/video-admin";
import { DEFAULT_THUMBNAIL, formatDuration, getAdminVideos } from "@/lib/video-store";

export async function GET() {
  try { await requireAdmin(); return NextResponse.json({ videos: await getAdminVideos() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const body = await jsonBody(request);
    const details = videoDetails(body);
    const media = await readyAsset(body.mediaAssetId, "video", admin.id);
    const thumbnail = body.thumbnailAssetId ? await readyAsset(body.thumbnailAssetId, "thumbnail", admin.id) : null;
    const [existing] = await db.select({ id: videos.id, slug: videos.slug }).from(videos).where(and(eq(videos.mediaAssetId, media.id), ne(videos.status, "deleted"))).limit(1);
    if (existing) return NextResponse.json({ ok: true, id: existing.id, slug: existing.slug });
    const seconds = Number(body.durationSeconds || 0);
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 604800) throw new HttpError(400, "Invalid video duration.");
    const [creator] = await db.select({ displayName: creatorProfiles.displayName, avatarUrl: creatorProfiles.avatarUrl }).from(creatorProfiles).where(eq(creatorProfiles.adminId, admin.id)).limit(1);
    const stem = details.title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 120) || "video";
    const [video] = await db.insert(videos).values({
      ...details, slug: `${stem}-${randomBytes(4).toString("hex")}`, sourceType: "upload", mediaAssetId: media.id,
      thumbnailAssetId: thumbnail?.id || null, thumbnail: thumbnail ? `/api/media/${thumbnail.id}` : DEFAULT_THUMBNAIL,
      videoUrl: `/api/media/${media.id}`, fileSize: media.size, mimeType: media.mimeType, durationSeconds: Math.floor(seconds), duration: formatDuration(seconds),
      creator: creator?.displayName || "VELTRIO", creatorAvatar: creator?.avatarUrl || "/icon.svg", tags: [], isHd: true, publishedAt: details.status === "published" ? new Date() : null, updatedAt: new Date(),
    }).returning({ id: videos.id, slug: videos.slug });
    return NextResponse.json({ ok: true, ...video }, { status: 201 });
  } catch (error) { return apiError(error); }
}
