import { sql } from "drizzle-orm";
import { db } from "@/db";
import { videoEvents } from "@/db/schema";

export async function getPlatformAnalytics() {
  const [row] = await db.select({
    plays: sql<number>`count(*) filter (where ${videoEvents.kind} = 'play')`,
    uniqueViewers: sql<number>`count(distinct ${videoEvents.sessionHash})`,
    watchSeconds: sql<number>`coalesce(sum(${videoEvents.watchSeconds}) filter (where ${videoEvents.kind} in ('progress', 'complete')), 0)`,
  }).from(videoEvents);
  return {
    plays: Number(row?.plays || 0),
    uniqueViewers: Number(row?.uniqueViewers || 0),
    watchSeconds: Number(row?.watchSeconds || 0),
  };
}

export function formatWatchTime(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/** Opt-in page traffic for the last 30 days; not comparable to total video views. */
export async function getPageAnalytics() {
  const { pageViews } = await import("@/db/schema");
  const { gte, desc } = await import("drizzle-orm");
  const since = new Date(Date.now() - 30 * 86400 * 1000);
  const [totals] = await db.select({ views: sql<number>`count(*)`, visitors: sql<number>`count(distinct ${pageViews.visitorHash})` }).from(pageViews).where(gte(pageViews.createdAt, since));
  const pages = await db.select({ path: pageViews.path, views: sql<number>`count(*)` }).from(pageViews).where(gte(pageViews.createdAt, since)).groupBy(pageViews.path).orderBy(desc(sql`count(*)`)).limit(10);
  return { views: Number(totals.views), visitors: Number(totals.visitors), pages: pages.map(p => ({ ...p, views: Number(p.views) })) };
}
