import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, moderationReports, videos } from "@/db/schema";
import { throttle } from "@/lib/admin-auth";
import { apiError, assertSameOrigin, HttpError, isEmail, jsonBody } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await throttle(request, "reports");
    const body = await jsonBody(request);
    const videoSlug = typeof body.videoSlug === "string" ? body.videoSlug.trim() : "";
    const commentId = body.commentId === undefined ? null : Number(body.commentId);
    const reason = String(body.reason || "").trim();
    const details = String(body.details || "").trim();
    const reporterEmail = String(body.reporterEmail || "").trim();
    if (!videoSlug && (commentId === null || !Number.isSafeInteger(commentId) || commentId < 1)) throw new HttpError(400, "Choose a video or comment to report.");
    if (reason.length < 3 || reason.length > 80 || details.length < 10 || details.length > 2000 || (reporterEmail && (!isEmail(reporterEmail) || reporterEmail.length > 254))) throw new HttpError(400, "Check the report details.");
    const [video] = videoSlug ? await db.select({ id: videos.id }).from(videos).where(and(eq(videos.slug, videoSlug), eq(videos.status, "published"))).limit(1) : [];
    if (videoSlug && !video) throw new HttpError(404, "Video not found.");
    if (commentId !== null) {
      const [comment] = await db.select({ id: comments.id, videoId: comments.videoId }).from(comments).where(eq(comments.id, commentId)).limit(1);
      if (!comment || (video && comment.videoId !== video.id)) throw new HttpError(404, "Comment not found.");
    }
    await db.insert(moderationReports).values({ videoId: video?.id || null, commentId, reporterEmail: reporterEmail || null, reason, details });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
