import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, contactMessages, dmcaRequests, moderationReports, videos } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { apiError, assertSameOrigin, HttpError, jsonBody } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    const [commentRows, dmcaRows, contactRows, reportRows] = await Promise.all([
      db.select({ id: comments.id, videoId: comments.videoId, videoSlug: comments.videoSlug, name: comments.name, email: comments.email, body: comments.body, status: comments.status, createdAt: comments.createdAt }).from(comments).orderBy(desc(comments.createdAt)).limit(100),
      db.select().from(dmcaRequests).orderBy(desc(dmcaRequests.createdAt)).limit(100),
      db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(100),
      db.select({ id: moderationReports.id, videoId: moderationReports.videoId, commentId: moderationReports.commentId, reporterEmail: moderationReports.reporterEmail, reason: moderationReports.reason, details: moderationReports.details, status: moderationReports.status, createdAt: moderationReports.createdAt, videoTitle: videos.title }).from(moderationReports).leftJoin(videos, eq(moderationReports.videoId, videos.id)).orderBy(desc(moderationReports.createdAt)).limit(100),
    ]);
    return NextResponse.json({ comments: commentRows, dmca: dmcaRows, contact: contactRows, reports: reportRows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const body = await jsonBody(request);
    const entity = body.entity;
    const id = Number(body.id);
    const status = String(body.status || "");
    if (!Number.isSafeInteger(id) || id < 1 || typeof entity !== "string") throw new HttpError(400, "Invalid moderation item.");
    if (entity === "comment") {
      if (!(["visible", "hidden", "removed"] as string[]).includes(status)) throw new HttpError(400, "Invalid comment status.");
      await db.update(comments).set({ status, moderatedAt: new Date() }).where(eq(comments.id, id));
    } else if (entity === "dmca") {
      if (!(["pending", "reviewing", "resolved", "rejected"] as string[]).includes(status)) throw new HttpError(400, "Invalid removal status.");
      await db.update(dmcaRequests).set({ status, reviewedAt: new Date() }).where(eq(dmcaRequests.id, id));
    } else if (entity === "contact") {
      if (!(["new", "read", "closed"] as string[]).includes(status)) throw new HttpError(400, "Invalid message status.");
      await db.update(contactMessages).set({ status }).where(eq(contactMessages.id, id));
    } else if (entity === "report") {
      if (!(["open", "reviewing", "resolved", "rejected"] as string[]).includes(status)) throw new HttpError(400, "Invalid report status.");
      await db.update(moderationReports).set({ status, reviewedAt: new Date() }).where(eq(moderationReports.id, id));
    } else throw new HttpError(400, "Unknown moderation item.");
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
