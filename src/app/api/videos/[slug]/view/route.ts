import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { hashToken } from "@/lib/admin-auth";
import { assertSameOrigin, apiError } from "@/lib/http";
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOrigin(request);
    const { slug } = await params;
    const key = `vh_view_${hashToken(slug).slice(0, 16)}`;
    if ((await cookies()).get(key)) return NextResponse.json({ ok: true });
    const [video] = await db.update(videos).set({ views: sql`coalesce(${videos.views}, 0) + 1` }).where(and(eq(videos.slug, slug), eq(videos.status, "published"), eq(videos.sourceType, "upload"))).returning({ views: videos.views });
    if (!video) return NextResponse.json({ error: "Video not found." }, { status: 404 });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(key, "1", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 });
    return response;
  } catch (error) { return apiError(error); }
}
