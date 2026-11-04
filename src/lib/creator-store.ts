import { and, count, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, creatorProfiles, mediaAssets, videos } from "@/db/schema";
import { mapVideo } from "./video-store";

export const DEFAULT_CREATOR_SLUG = "veltrio";

export type CreatorProfile = typeof creatorProfiles.$inferSelect;

export async function getCreatorProfile(slug = DEFAULT_CREATOR_SLUG) {
  const [profile] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.slug, slug)).limit(1);
  return profile;
}

export async function ensureCreatorProfile(adminId: number) {
  const [existing] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.adminId, adminId)).limit(1);
  if (existing) return existing;
  const [admin] = await db.select({ name: admins.name }).from(admins).where(eq(admins.id, adminId)).limit(1);
  const [created] = await db.insert(creatorProfiles).values({
    adminId,
    slug: DEFAULT_CREATOR_SLUG,
    displayName: "VELTRIO",
    bio: "Independent stories, published directly on VELTRIO.",
    avatarUrl: "/icon.svg",
    bannerUrl: "/images/veltrio-landscape.jpg",
    socialLinks: {},
  }).onConflictDoNothing().returning();
  if (created) return created;
  const [fallback] = await db.select().from(creatorProfiles).where(eq(creatorProfiles.slug, DEFAULT_CREATOR_SLUG)).limit(1);
  if (fallback) return fallback;
  throw new Error(`Could not create creator profile for ${admin?.name || "admin"}.`);
}

// Resolve authorship through the owned media asset, not a potentially shared display name.
export async function getCreatorProfileForVideo(videoId: number) {
  const [row] = await db.select({ profile: creatorProfiles }).from(videos)
    .innerJoin(mediaAssets, eq(videos.mediaAssetId, mediaAssets.id))
    .innerJoin(creatorProfiles, eq(mediaAssets.adminId, creatorProfiles.adminId))
    .where(and(eq(videos.id, videoId), eq(videos.status, "published"), eq(videos.sourceType, "upload"))).limit(1);
  return row?.profile;
}

export async function getCreatorVideos(profile: CreatorProfile, limit?: number, sort: "newest" | "popular" = "newest") {
  const query = db.select({ video: videos }).from(videos).innerJoin(mediaAssets, eq(videos.mediaAssetId, mediaAssets.id))
    .where(and(eq(mediaAssets.adminId, profile.adminId), eq(videos.status, "published"), eq(videos.sourceType, "upload")))
    .orderBy(...(sort === "popular" ? [desc(videos.views), desc(videos.publishedAt), desc(videos.id)] : [desc(videos.publishedAt), desc(videos.id)]));
  const rows = limit === undefined ? await query : await query.limit(Math.max(1, Math.min(100, limit)));
  return rows.map(row => mapVideo(row.video));
}

export async function getCreatorStats(profile: CreatorProfile) {
  const [row] = await db.select({ videos: count(videos.id), views: sql<number>`coalesce(sum(${videos.views}), 0)`, likes: sql<number>`coalesce(sum(${videos.likes}), 0)` })
    .from(videos).innerJoin(mediaAssets, eq(videos.mediaAssetId, mediaAssets.id))
    .where(and(eq(mediaAssets.adminId, profile.adminId), eq(videos.status, "published"), eq(videos.sourceType, "upload")));
  return { videos: Number(row?.videos || 0), views: Number(row?.views || 0), likes: Number(row?.likes || 0) };
}

// Search existing published creator profiles; no synthetic channel identities.
export async function searchCreatorProfiles(query: string) {
  const term = query.trim().slice(0, 160);
  if (!term) return [];
  const pattern = `%${term}%`;
  return db.select().from(creatorProfiles).where(or(ilike(creatorProfiles.displayName, pattern), ilike(creatorProfiles.bio, pattern))).limit(8);
}
