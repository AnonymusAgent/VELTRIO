import { pgTable, serial, varchar, text, integer, bigint, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

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
  title: varchar("title", { length: 300 }).notNull(),
  slug: varchar("slug", { length: 320 }).notNull().unique(),
  description: text("description"),
  thumbnail: text("thumbnail").notNull(),
  videoUrl: text("video_url"),
  embedUrl: text("embed_url"),
  duration: varchar("duration", { length: 20 }).default("12:34"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  categoryId: integer("category_id").references(() => categories.id),
  categorySlug: varchar("category_slug", { length: 120 }),
  categoryName: varchar("category_name", { length: 120 }),
  creator: varchar("creator", { length: 160 }).default("Video Hub"),
  creatorAvatar: text("creator_avatar"),
  isTrending: boolean("is_trending").default(false),
  isFeatured: boolean("is_featured").default(false),
  isHd: boolean("is_hd").default(true),
  tags: jsonb("tags").default([]),
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  status: varchar("status", { length: 30 }).default("published").notNull(),
  sourceType: varchar("source_type", { length: 30 }).default("curated").notNull(),
  sourceUrl: text("source_url"),
  telegramPostUrl: text("telegram_post_url"),
  telegramFileId: text("telegram_file_id"),
  durationSeconds: integer("duration_seconds"),
  mimeType: varchar("mime_type", { length: 120 }),
  mediaAssetId: varchar("media_asset_id", { length: 36 }),
  thumbnailAssetId: varchar("thumbnail_asset_id", { length: 36 }),
  fileSize: bigint("file_size", { mode: "number" }).default(0),
  rightsConfirmed: boolean("rights_confirmed").default(false).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
});

export const authAttempts = pgTable("auth_attempts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  count: integer("count").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
});

export const mediaAssets = pgTable("media_assets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  adminId: integer("admin_id").notNull().references(() => admins.id),
  kind: varchar("kind", { length: 20 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  storageKey: varchar("storage_key", { length: 100 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: bigint("size", { mode: "number" }).notNull(),
  received: bigint("received", { mode: "number" }).notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("uploading"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const telegramPosts = pgTable("telegram_posts", {
  id: serial("id").primaryKey(),
  sourceKey: varchar("source_key", { length: 200 }).notNull().unique(),
  updateId: integer("update_id"),
  telegramMessageId: integer("telegram_message_id").notNull(),
  telegramChatId: varchar("telegram_chat_id", { length: 100 }).notNull(),
  channelTitle: varchar("channel_title", { length: 200 }),
  telegramPostUrl: text("telegram_post_url"),
  title: varchar("title", { length: 300 }).notNull(),
  caption: text("caption"),
  description: text("description"),
  sourceUrl: text("source_url"),
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  telegramFileId: text("telegram_file_id"),
  telegramThumbnailFileId: text("telegram_thumbnail_file_id"),
  mimeType: varchar("mime_type", { length: 120 }),
  fileSize: bigint("file_size", { mode: "number" }),
  durationSeconds: integer("duration_seconds"),
  sourceType: varchar("source_type", { length: 30 }).default("external").notNull(),
  categorySlug: varchar("category_slug", { length: 120 }).default("viral-clips"),
  status: varchar("status", { length: 30 }).default("pending").notNull(),
  videoId: integer("video_id").references(() => videos.id),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  publishedAt: timestamp("published_at"),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  videoId: integer("video_id").references(() => videos.id),
  videoSlug: varchar("video_slug", { length: 320 }),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 200 }),
  body: text("body").notNull(),
  likes: integer("likes").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  url: text("url").notNull(),
  category: varchar("category", { length: 120 }),
  description: text("description"),
  email: varchar("email", { length: 200 }),
  status: varchar("status", { length: 30 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dmcaRequests = pgTable("dmca_requests", {
  id: serial("id").primaryKey(),
  contentUrl: text("content_url").notNull(),
  claimant: varchar("claimant", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull(),
  details: text("details"),
  status: varchar("status", { length: 30 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 254 }).notNull(),
  subject: varchar("subject", { length: 200 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const newsletter = pgTable("newsletter", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adSettings = pgTable("ad_settings", {
  id: serial("id").primaryKey(),
  publisherId: varchar("publisher_id", { length: 100 }),
  headerSlot: varchar("header_slot", { length: 100 }),
  sidebarSlot: varchar("sidebar_slot", { length: 100 }),
  inFeedSlot: varchar("in_feed_slot", { length: 100 }),
  videoSlot: varchar("video_slot", { length: 100 }),
  footerSlot: varchar("footer_slot", { length: 100 }),
  autoAdsEnabled: boolean("auto_ads_enabled").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});
