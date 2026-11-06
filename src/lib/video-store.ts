import { and, count, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, mediaAssets, videos, watchProgress } from "@/db/schema";
import type { Video } from "./data";
import type { AdminVideo } from "./admin-shared";

export const DEFAULT_THUMBNAIL = "/images/veltrio-landscape.jpg";

// The single source of truth for "visible on the public site": published
// direct uploads only. Optionally narrowed to one slug.
export function publishedUpload(slug?: string) {
  const conditions = [eq(videos.status, "published"), eq(videos.sourceType, "upload")];
  if (slug !== undefined) conditions.unshift(eq(videos.slug, slug));
  return and(...conditions);
}

export function formatDuration(seconds?: number | null, fallback?: string | null) {
  if (!seconds || seconds < 1) return fallback || "0:00";
  const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60), secs = Math.floor(seconds % 60);
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
}
export type PublicVideoQuery = {
  category?: string;
  creator?: string;
  query?: string;
  sort?: "newest" | "popular" | "duration";
  featured?: boolean;
  trending?: boolean;
  limit?: number;
  offset?: number;
};

function publicVideoWhere(options: PublicVideoQuery = {}) {
  const conditions = [publishedUpload()];
  if (options.category && options.category !== "all") conditions.push(eq(videos.categorySlug, options.category));
  if (options.creator) conditions.push(eq(videos.creator, options.creator));
  if (options.featured) conditions.push(eq(videos.isFeatured, true));
  if (options.trending) conditions.push(eq(videos.isTrending, true));
  const query = options.query?.trim();
  if (query) {
    const pattern = `%${query}%`;
    const search = or(
      ilike(videos.title, pattern),
      ilike(videos.description, pattern),
      ilike(videos.categoryName, pattern),
      ilike(videos.creator, pattern),
      sql`${videos.tags}::text ilike ${pattern}`,
    );
    if (search) conditions.push(search);
  }
  return and(...conditions);
}

export function mapVideo(row: typeof videos.$inferSelect): Video {
  return {
    id: row.id, title: row.title, slug: row.slug, description: row.description || "", thumbnail: row.thumbnail || DEFAULT_THUMBNAIL,
    duration: formatDuration(row.durationSeconds, row.duration), views: row.views || 0, likes: row.likes || 0,
    category: row.categoryName || "Short films", categorySlug: row.categorySlug || "short-films", creator: row.creator || "VELTRIO",
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    isFeatured: row.isFeatured || false,
    publishedAt: (row.publishedAt || row.createdAt || new Date()).toISOString(), videoUrl: row.videoUrl,
    muxPlaybackId: row.muxPlaybackId, muxStatus: row.muxStatus, durationSeconds: row.durationSeconds,
  };
}
export async function getPublicVideos(options: PublicVideoQuery = {}): Promise<Video[]> {
  const query = db.select().from(videos).where(publicVideoWhere(options)).orderBy(
    ...(options.sort === "popular" ? [desc(videos.views), desc(videos.publishedAt), desc(videos.id)] : options.sort === "duration" ? [sql`${videos.durationSeconds} desc nulls last`, desc(videos.publishedAt), desc(videos.id)] : [desc(videos.publishedAt), desc(videos.id)])
  );
  const offset = Math.max(0, options.offset || 0);
  const rows = options.limit !== undefined
    ? await query.limit(Math.max(1, Math.min(100, options.limit))).offset(offset)
    : offset ? await query.offset(offset) : await query;
  return rows.map(mapVideo);
}
export async function getPublicVideoCount(options: Omit<PublicVideoQuery, "limit" | "offset"> = {}) {
  const [row] = await db.select({ count: count() }).from(videos).where(publicVideoWhere(options));
  return Number(row?.count || 0);
}
export async function getPublicVideo(slug: string) {
  const [row] = await db.select().from(videos).where(and(publishedUpload(slug))).limit(1);
  return row ? mapVideo(row) : undefined;
}

export async function getPublicVideosBySlugs(slugs: string[]): Promise<Video[]> {
  const unique = [...new Set(slugs.filter(Boolean))].slice(0, 24);
  if (!unique.length) return [];
  const rows = await db.select().from(videos).where(and(publishedUpload(), inArray(videos.slug, unique)));
  const bySlug = new Map(rows.map(row => [row.slug, mapVideo(row)]));
  return unique.flatMap(slug => {
    const video = bySlug.get(slug);
    return video ? [video] : [];
  });
}

export type AccountWatch = { slug: string; position: number; durationSeconds: number | null };

export function isContinuing(item: Pick<AccountWatch, "position" | "durationSeconds">) {
  return item.position >= 5 && (item.durationSeconds == null || item.position < item.durationSeconds - 8);
}

// Signed-in playback positions, newest first. Signed-out history stays in the browser.
export async function getAccountWatching(userId: string): Promise<AccountWatch[]> {
  if (!userId) return [];
  const rows = await db.select({
    slug: videos.slug,
    position: watchProgress.position,
    durationSeconds: videos.durationSeconds,
  }).from(watchProgress)
    .innerJoin(videos, eq(watchProgress.videoId, videos.id))
    .where(and(eq(watchProgress.userId, userId), publishedUpload()))
    .orderBy(desc(watchProgress.updatedAt))
    .limit(40);
  return rows.filter(row => row.position >= 1).map(row => ({
    slug: row.slug,
    position: row.position,
    durationSeconds: row.durationSeconds,
  }));
}
export async function getCommentsForVideo(slug: string) {
  return db.select({ id: comments.id, name: comments.name, body: comments.body, createdAt: comments.createdAt }).from(comments).where(and(eq(comments.videoSlug, slug), eq(comments.status, "visible"))).orderBy(desc(comments.createdAt)).limit(100);
}
export async function getAdminVideos(): Promise<AdminVideo[]> {
  const rows = await db.select().from(videos).where(and(eq(videos.sourceType, "upload"), ne(videos.status, "deleted"))).orderBy(desc(videos.createdAt));
  return rows.map((row) => ({
    id: row.id, slug: row.slug, title: row.title, description: row.description || "", thumbnail: row.thumbnail || DEFAULT_THUMBNAIL,
    videoUrl: row.videoUrl || "", status: row.status, categorySlug: row.categorySlug || "short-films", categoryName: row.categoryName || "Short films",
    isFeatured: row.isFeatured || false, views: row.views || 0, likes: row.likes || 0, duration: formatDuration(row.durationSeconds, row.duration),
    fileSize: row.fileSize || 0, createdAt: (row.createdAt || new Date()).toISOString(), rightsConfirmed: row.rightsConfirmed,
    muxStatus: row.muxStatus, muxPlaybackId: row.muxPlaybackId,
  }));
}
export async function getStorageUsage() {
  const [row] = await db.select({ size: sql<number>`coalesce(sum(${mediaAssets.size}), 0)`, count: sql<number>`count(*)` }).from(mediaAssets);
  return { size: Number(row.size), count: Number(row.count) };
}
