import { and, count, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { admins, creatorProfiles, videos } from "@/db/schema";
import { getPublicVideos } from "./video-store";

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

export async function getCreatorVideos(profile: CreatorProfile, limit?: number) {
  return getPublicVideos({ creator: profile.displayName, limit, sort: "newest" });
}

export async function getCreatorStats(profile: CreatorProfile) {
  const [row] = await db.select({
    videos: count(videos.id),
    views: sql<number>`coalesce(sum(${videos.views}), 0)`,
    likes: sql<number>`coalesce(sum(${videos.likes}), 0)`,
  }).from(videos).where(and(eq(videos.creator, profile.displayName), eq(videos.status, "published"), eq(videos.sourceType, "upload")));
  return { videos: Number(row?.videos || 0), views: Number(row?.views || 0), likes: Number(row?.likes || 0) };
}
