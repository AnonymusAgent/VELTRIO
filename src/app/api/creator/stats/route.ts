import { NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { requireUser } from "@/lib/user-auth";
import { apiError } from "@/lib/http";

export const dynamic = "force-dynamic";

// Per-video performance for the signed-in creator. Counts are first-party and
// intentionally limited to data this deployment already records.
export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db.select({
      id: videos.id, title: videos.title, slug: videos.slug, status: videos.status,
      views: videos.views, likes: videos.likes, createdAt: videos.createdAt, muxStatus: videos.muxStatus,
    }).from(videos).where(eq(videos.ownerUserId, user.id)).orderBy(desc(videos.views)).limit(50);
    const [totals] = await db.select({
      count: sql<number>`count(*)`,
      views: sql<number>`coalesce(sum(${videos.views}), 0)`,
      likes: sql<number>`coalesce(sum(${videos.likes}), 0)`,
      published: sql<number>`count(*) filter (where ${videos.status} = 'published')`,
    }).from(videos).where(eq(videos.ownerUserId, user.id));
    return NextResponse.json({
      totals: { videos: Number(totals?.count || 0), views: Number(totals?.views || 0), likes: Number(totals?.likes || 0), published: Number(totals?.published || 0) },
      videos: rows.map(row => ({ ...row, createdAt: (row.createdAt || new Date()).toISOString(), engagement: row.views ? Number(((row.likes || 0) / row.views * 100).toFixed(1)) : 0 })),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
