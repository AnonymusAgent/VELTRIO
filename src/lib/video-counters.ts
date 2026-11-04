import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { hashToken, throttle } from "./admin-auth";
import { HttpError } from "./http";
import { publishedUpload } from "./video-store";

const DAY_SECONDS = 60 * 60 * 24;

// Shared once-per-browser counting for likes and views. A hashed HTTP-only
// cookie prevents repeat counts; likes are additionally throttled by IP.
export async function countEngagement(request: Request, slug: string, kind: "like" | "view") {
  const column = kind === "like" ? videos.likes : videos.views;
  const cookieName = `vh_${kind}_${hashToken(slug).slice(0, 16)}`;
  if ((await cookies()).get(cookieName)) {
    if (kind === "view") return NextResponse.json({ ok: true });
    const [video] = await db.select({ value: column }).from(videos).where(publishedUpload(slug)).limit(1);
    if (!video) throw new HttpError(404, "Video not found.");
    return NextResponse.json({ ok: true, likes: video.value || 0 });
  }
  if (kind === "like") await throttle(request, "likes");
  const [video] = await db.update(videos)
    .set(kind === "like" ? { likes: sql`coalesce(${videos.likes}, 0) + 1` } : { views: sql`coalesce(${videos.views}, 0) + 1` })
    .where(publishedUpload(slug))
    .returning({ value: column });
  if (!video) throw new HttpError(404, "Video not found.");
  const response = NextResponse.json(kind === "like" ? { ok: true, likes: video.value || 0 } : { ok: true });
  response.cookies.set(cookieName, "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: kind === "like" ? DAY_SECONDS * 365 : DAY_SECONDS,
  });
  return response;
}
