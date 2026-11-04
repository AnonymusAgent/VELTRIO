import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { comments, mediaAssets, videos } from "@/db/schema";
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
export function mapVideo(row: typeof videos.$inferSelect): Video {
  return {
    id: row.id, title: row.title, slug: row.slug, description: row.description || "", thumbnail: row.thumbnail || DEFAULT_THUMBNAIL,
    duration: formatDuration(row.durationSeconds, row.duration), views: row.views || 0, likes: row.likes || 0,
    category: row.categoryName || "Short films", categorySlug: row.categorySlug || "short-films",
    isFeatured: row.isFeatured || false,
    publishedAt: (row.publishedAt || row.createdAt || new Date()).toISOString(), videoUrl: row.videoUrl,
  };
}
export async function getPublicVideos(): Promise<Video[]> {
  const rows = await db.select().from(videos).where(publishedUpload()).orderBy(desc(videos.publishedAt), desc(videos.id));
  return rows.map(mapVideo);
}
export async function getPublicVideo(slug: string) {
  const [row] = await db.select().from(videos).where(publishedUpload(slug)).limit(1);
  return row ? mapVideo(row) : undefined;
}
export async function getCommentsForVideo(slug: string) {
  return db.select({ id: comments.id, name: comments.name, body: comments.body, createdAt: comments.createdAt }).from(comments).where(eq(comments.videoSlug, slug)).orderBy(desc(comments.createdAt)).limit(100);
}
export async function getAdminVideos(): Promise<AdminVideo[]> {
  const rows = await db.select().from(videos).where(and(eq(videos.sourceType, "upload"), ne(videos.status, "deleted"))).orderBy(desc(videos.createdAt));
  return rows.map((row) => ({
    id: row.id, slug: row.slug, title: row.title, description: row.description || "", thumbnail: row.thumbnail || DEFAULT_THUMBNAIL,
    videoUrl: row.videoUrl || "", status: row.status, categorySlug: row.categorySlug || "short-films", categoryName: row.categoryName || "Short films",
    isFeatured: row.isFeatured || false, views: row.views || 0, likes: row.likes || 0, duration: formatDuration(row.durationSeconds, row.duration),
    fileSize: row.fileSize || 0, createdAt: (row.createdAt || new Date()).toISOString(), rightsConfirmed: row.rightsConfirmed,
  }));
}
export async function getStorageUsage() {
  const [row] = await db.select({ size: sql<number>`coalesce(sum(${mediaAssets.size}), 0)`, count: sql<number>`count(*)` }).from(mediaAssets);
  return { size: Number(row.size), count: Number(row.count) };
}
