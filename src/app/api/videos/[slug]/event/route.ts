import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { videoEvents, videos } from "@/db/schema";
import { hashToken } from "@/lib/admin-auth";
import { apiError, assertSameOrigin, HttpError, jsonBody } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOrigin(request);
    const store = await cookies();
    if (store.get("vh_analytics_consent")?.value !== "yes") return NextResponse.json({ ok: true });
    const body = await jsonBody(request);
    const kind = body.kind === "play" || body.kind === "progress" || body.kind === "complete" ? body.kind : null;
    const watchSeconds = Number(body.watchSeconds || 0);
    if (!kind || !Number.isSafeInteger(watchSeconds) || watchSeconds < 0 || watchSeconds > 86400) throw new HttpError(400, "Invalid playback event.");
    const slug = (await params).slug;
    const [video] = await db.select({ id: videos.id }).from(videos).where(and(eq(videos.slug, slug), eq(videos.status, "published"), eq(videos.sourceType, "upload"))).limit(1);
    if (!video) throw new HttpError(404, "Video not found.");
    let token = store.get("vh_analytics_session")?.value;
    const created = !token || !/^[a-f0-9]{64}$/.test(token);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) token = randomBytes(32).toString("hex");
    await db.insert(videoEvents).values({ videoId: video.id, kind, watchSeconds, sessionHash: hashToken(token) });
    const response = NextResponse.json({ ok: true });
    if (created) response.cookies.set("vh_analytics_session", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
  } catch (error) { return apiError(error); }
}
