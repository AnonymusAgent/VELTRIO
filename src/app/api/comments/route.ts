import { NextResponse } from "next/server";
import { db } from "@/db";
import { comments } from "@/db/schema";
import { getCommentsForVideo, getPublicVideo } from "@/lib/video-store";
import { apiError, assertSameOrigin, HttpError, jsonBody } from "@/lib/http";
import { throttle } from "@/lib/admin-auth";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); await throttle(request, "comments");
    const input = await jsonBody(request);
    const videoSlug = String(input.videoSlug || ""), name = String(input.name || "").trim(), email = String(input.email || "").trim(), body = String(input.body || "").trim();
    if (name.length < 2 || name.length > 80 || body.length < 2 || body.length > 2000 || email.length > 200 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new HttpError(400, "Check your name, email and comment (up to 2,000 characters).");
    const video = await getPublicVideo(videoSlug);
    if (!video) throw new HttpError(404, "Video not found.");
    await db.insert(comments).values({ videoId: video.id, videoSlug, name, email: email || null, body });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function GET(request: Request) {
  try {
    const slug = new URL(request.url).searchParams.get("slug") || "";
    if (!await getPublicVideo(slug)) throw new HttpError(404, "Video not found.");
    return NextResponse.json({ comments: await getCommentsForVideo(slug) });
  } catch (error) { return apiError(error); }
}
