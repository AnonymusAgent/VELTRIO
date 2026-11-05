import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { videos, watchProgress } from "@/db/schema";
import { apiError, assertSameOrigin, HttpError, jsonBody } from "@/lib/http";
import { userAuth } from "@/lib/user-auth";
import { publishedUpload } from "@/lib/video-store";

export const dynamic = "force-dynamic";

// Remember a signed-in viewer's position. Signed-out viewers keep using the
// browser copy, so this endpoint is a silent no-op without a session.
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOrigin(request);
    let userId: string | undefined;
    try { userId = (await userAuth().getSession()).data?.user?.id || undefined; } catch { userId = undefined; }
    if (!userId) return NextResponse.json({ ok: true, stored: false });
    const body = await jsonBody(request);
    const position = Number(body.position);
    if (!Number.isFinite(position) || position < 0 || position > 604800) throw new HttpError(400, "Invalid playback position.");
    const [video] = await db.select({ id: videos.id }).from(videos).where(publishedUpload((await params).slug)).limit(1);
    if (!video) throw new HttpError(404, "Video not found.");
    await db.insert(watchProgress).values({ userId, videoId: video.id, position })
      .onConflictDoUpdate({ target: [watchProgress.userId, watchProgress.videoId], set: { position, updatedAt: new Date() } });
    return NextResponse.json({ ok: true, stored: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    let userId: string | undefined;
    try { userId = (await userAuth().getSession()).data?.user?.id || undefined; } catch { userId = undefined; }
    if (!userId) return NextResponse.json({ position: null });
    const [row] = await db.select({ position: watchProgress.position }).from(watchProgress)
      .innerJoin(videos, eq(watchProgress.videoId, videos.id))
      .where(and(eq(watchProgress.userId, userId), eq(videos.slug, (await params).slug))).limit(1);
    return NextResponse.json({ position: row?.position ?? null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
