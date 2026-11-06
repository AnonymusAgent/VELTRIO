import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { savedTitles, videos } from "@/db/schema";
import { publishedUpload } from "@/lib/video-store";

const LIST_LIMIT = 100;

export async function listSavedSlugs(userId: string) {
  const rows = await db.select({ slug: videos.slug }).from(savedTitles)
    .innerJoin(videos, eq(savedTitles.videoId, videos.id))
    .where(and(eq(savedTitles.userId, userId), publishedUpload()))
    .orderBy(desc(savedTitles.createdAt))
    .limit(LIST_LIMIT);
  return rows.map(row => row.slug);
}

export async function addSavedSlugs(userId: string, slugs: string[]) {
  const unique = [...new Set(slugs.map(slug => slug.trim()).filter(slug => slug.length > 0 && slug.length <= 320))].slice(0, LIST_LIMIT);
  if (!unique.length) return;
  const rows = await db.select({ id: videos.id }).from(videos).where(and(publishedUpload(), inArray(videos.slug, unique)));
  if (!rows.length) return;
  await db.insert(savedTitles).values(rows.map(row => ({ userId, videoId: row.id }))).onConflictDoNothing({ target: [savedTitles.userId, savedTitles.videoId] });
}

export async function removeSavedSlug(userId: string, slug: string) {
  const [video] = await db.select({ id: videos.id }).from(videos).where(eq(videos.slug, slug)).limit(1);
  if (!video) return;
  await db.delete(savedTitles).where(and(eq(savedTitles.userId, userId), eq(savedTitles.videoId, video.id)));
}
