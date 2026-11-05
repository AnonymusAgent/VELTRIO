import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { getAdmin } from "@/lib/admin-auth";
import { userAuth } from "@/lib/user-auth";
import { isMuxEnabled, muxReady, muxStreamUrl } from "@/lib/mux-stream";

export const dynamic = "force-dynamic";

// Short-lived playback tokens. Published videos are playable by anyone; drafts
// are limited to their owner and the fixed admin studio.
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isMuxEnabled()) return NextResponse.json({ error: "Streaming is not configured." }, { status: 503 });
  const [video] = await db.select({ ownerUserId: videos.ownerUserId, playbackId: videos.muxPlaybackId, status: videos.status, sourceType: videos.sourceType }).from(videos).where(eq(videos.slug, (await params).slug)).limit(1);
  if (!video?.playbackId || video.sourceType !== "upload") return NextResponse.json({ error: "Video not found." }, { status: 404 });
  if (video.status !== "published") {
    let allowed = !!(await getAdmin());
    if (!allowed && video.ownerUserId) {
      try { allowed = (await userAuth().getSession()).data?.user?.id === video.ownerUserId; } catch { /* no user session */ }
    }
    if (!allowed) return NextResponse.json({ error: "Video not found." }, { status: 404 });
  }
  return NextResponse.json(muxStreamUrl(muxReady()!, video.playbackId, "t", 60 * 60 * 4), { headers: { "Cache-Control": "private, no-store" } });
}
