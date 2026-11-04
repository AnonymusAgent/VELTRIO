import { pgTable, serial, varchar, text, integer, bigint, boolean, timestamp, jsonb, index, uniqueIndex } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  description: text("description"),
  thumbnail: text("thumbnail"),
  videoCount: integer("video_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  ownerUserId: varchar("owner_user_id", { length: 255 }),
  title: varchar("title", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 320 }).notNull().unique(),
  description: text("description"),
  thumbnail: text("thumbnail").notNull(),
  videoUrl: text("video_url"),
  duration: varchar("duration", { length: 20 }).default("12:34"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  categorySlug: varchar("category_slug", { length: 120 }),
  categoryName: varchar("category_name", { length: 120 }),
  creator: varchar("creator", { length: 160 }).default("VELTRIO"),
  creatorAvatar: text("creator_avatar"),
  isTrending: boolean("is_trending").default(false),
  isFeatured: boolean("is_featured").default(false),
  isHd: boolean("is_hd").default(true),
  tags: jsonb("tags").default([]),
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  status: varchar("status", { length: 30 }).default("published").notNull(),
  sourceType: varchar("source_type", { length: 30 }).default("curated").notNull(),
  durationSeconds: integer("duration_seconds"),
  mimeType: varchar("mime_type", { length: 120 }),
  mediaAssetId: varchar("media_asset_id", { length: 36 }),
  thumbnailAssetId: varchar("thumbnail_asset_id", { length: 36 }),
  fileSize: bigint("file_size", { mode: "number" }).default(0),
  rightsConfirmed: boolean("rights_confirmed").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  publicFeedIdx: index("videos_public_feed_idx").on(table.status, table.sourceType, table.publishedAt),
  categoryIdx: index("videos_category_idx").on(table.categorySlug, table.status),
  creatorIdx: index("videos_creator_idx").on(table.creator, table.status),
  mediaAssetIdx: index("videos_media_asset_idx").on(table.mediaAssetId),
  ownerUserIdx: index("videos_owner_user_idx").on(table.ownerUserId),
}));

export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull().default("Alomukhtar"),
  passwordHash: text("password_hash").notNull(),
  recoveryHash: text("recovery_hash"),
  mustChangePassword: boolean("must_change_password").notNull().default(true),
  introEnabled: boolean("intro_enabled").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  passwordChangedAt: timestamp("password_changed_at").notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at"),
});

export const adminSessions = pgTable("admin_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  adminId: integer("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  adminExpiryIdx: index("admin_sessions_admin_expiry_idx").on(table.adminId, table.expiresAt),
}));

export const authAttempts = pgTable("auth_attempts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
});

export const mediaAssets = pgTable("media_assets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  adminId: integer("admin_id").references(() => admins.id),
  ownerUserId: varchar("owner_user_id", { length: 255 }),
  kind: varchar("kind", { length: 20 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  storageKey: varchar("storage_key", { length: 2048 }).notNull(),
  storageProvider: varchar("storage_provider", { length: 30 }).notNull().default("local"),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  received: bigint("received", { mode: "number" }).notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("uploading"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  adminStatusIdx: index("media_assets_admin_status_idx").on(table.adminId, table.status),
  ownerUserIdx: index("media_assets_owner_user_idx").on(table.ownerUserId),
}));

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videos.id),
  videoSlug: varchar("video_slug", { length: 320 }),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 200 }),
  body: text("body").notNull(),
  likes: integer("likes").default(0),
  status: varchar("status", { length: 20 }).notNull().default("visible"),
  moderatedAt: timestamp("moderated_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  videoStatusIdx: index("comments_video_status_idx").on(table.videoSlug, table.status, table.createdAt),
}));

export const dmcaRequests = pgTable("dmca_requests", {
  id: serial("id").primaryKey(),
  contentUrl: text("content_url").notNull(),
  claimant: varchar("claimant", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  details: text("details"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  statusIdx: index("dmca_requests_status_idx").on(table.status, table.createdAt),
}));

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  message: text("message").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  statusIdx: index("contact_messages_status_idx").on(table.status, table.createdAt),
}));


export const creatorProfiles = pgTable("creator_profiles", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull().references(() => admins.id, { onDelete: "cascade" }),
  slug: varchar("slug", { length: 120 }).notNull(),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  bio: text("bio").notNull().default("Independent stories, published directly on VELTRIO."),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  socialLinks: jsonb("social_links").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  adminUnique: uniqueIndex("creator_profiles_admin_unique").on(table.adminId),
  slugUnique: uniqueIndex("creator_profiles_slug_unique").on(table.slug),
}));

export const videoEvents = pgTable("video_events", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").notNull().references(() => videos.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 30 }).notNull(),
  sessionHash: varchar("session_hash", { length: 64 }),
  watchSeconds: integer("watch_seconds").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  videoEventIdx: index("video_events_video_kind_idx").on(table.videoId, table.kind, table.createdAt),
}));

export const moderationReports = pgTable("moderation_reports", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videos.id, { onDelete: "set null" }),
  commentId: integer("comment_id").references(() => comments.id, { onDelete: "set null" }),
  reporterEmail: varchar("reporter_email", { length: 254 }),
  reason: varchar("reason", { length: 80 }).notNull(),
  details: text("details").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  reportStatusIdx: index("moderation_reports_status_idx").on(table.status, table.createdAt),
}));

// First-party, opt-in page views. No query strings, IP addresses or user IDs are stored.
export const pageViews = pgTable("page_views", {
  id: serial("id").primaryKey(),
  path: varchar("path", { length: 320 }).notNull(),
  visitorHash: varchar("visitor_hash", { length: 64 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  createdIdx: index("page_views_created_idx").on(table.createdAt),
}));
