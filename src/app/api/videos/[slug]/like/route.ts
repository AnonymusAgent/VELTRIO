import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { hashToken, throttle } from "@/lib/admin-auth";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOrigin(request);
    const { slug } = await params;
    const key = `vh_like_${hashToken(slug).slice(0, 16)}`;
    const condition = and(eq(videos.slug, slug), eq(videos.status, "published"), eq(videos.sourceType, "upload"));
    if ((await cookies()).get(key)) {
      const [video] = await db.select({ likes: videos.likes }).from(videos).where(condition).limit(1);
      if (!video) throw new HttpError(404, "Video not found.");
      return NextResponse.json({ ok: true, likes: video.likes || 0 });
    }
    await throttle(request, "likes");
    const [video] = await db.update(videos).set({ likes: sql`coalesce(${videos.likes}, 0) + 1` }).where(condition).returning({ likes: videos.likes });
    if (!video) throw new HttpError(404, "Video not found.");
    const response = NextResponse.json({ ok: true, likes: video.likes || 0 });
    response.cookies.set(key, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
  } catch (error) { return apiError(error); }
}
