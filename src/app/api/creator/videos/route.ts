import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, videos } from "@/db/schema";
import { requireUser } from "@/lib/user-auth";
import { apiError, assertSameOrigin, HttpError, jsonBody } from "@/lib/http";
import { videoDetails } from "@/lib/video-admin";
import { DEFAULT_THUMBNAIL, formatDuration } from "@/lib/video-store";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await jsonBody(request);
    const details = videoDetails({ ...body, isFeatured: false });
    if (typeof body.mediaAssetId !== "string") throw new HttpError(400, "Upload a video first.");
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, body.mediaAssetId), eq(mediaAssets.ownerUserId, user.id), eq(mediaAssets.status, "ready"), eq(mediaAssets.kind, "video"))).limit(1);
    if (!asset) throw new HttpError(400, "The video upload is incomplete or invalid.");
    const [existing] = await db.select({ id: videos.id, slug: videos.slug }).from(videos).where(and(eq(videos.mediaAssetId, asset.id), ne(videos.status, "deleted"))).limit(1);
    if (existing) return NextResponse.json(existing);
    const seconds = Number(body.durationSeconds || 0);
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > 604800) throw new HttpError(400, "Invalid duration.");
    const stem = details.title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 120) || "video";
    const [video] = await db.insert(videos).values({ ...details, isFeatured: false, ownerUserId: user.id, slug: `${stem}-${randomBytes(4).toString("hex")}`, sourceType: "upload", mediaAssetId: asset.id, thumbnail: DEFAULT_THUMBNAIL, videoUrl: `/api/media/${asset.id}`, fileSize: asset.size, mimeType: asset.mimeType, durationSeconds: Math.floor(seconds), duration: formatDuration(seconds), creator: (user.name || "Creator").slice(0, 160), creatorAvatar: "/icon.svg", publishedAt: details.status === "published" ? new Date() : null }).returning({ id: videos.id, slug: videos.slug });
    return NextResponse.json(video, { status: 201 });
  } catch (error) { return apiError(error); }
}
