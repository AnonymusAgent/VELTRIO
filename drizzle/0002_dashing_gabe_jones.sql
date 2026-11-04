CREATE TABLE "creator_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"slug" varchar(120) NOT NULL,
	"display_name" varchar(160) NOT NULL,
	"bio" text DEFAULT 'Independent stories, published directly on VELTRIO.' NOT NULL,
	"avatar_url" text,
	"banner_url" text,
	"social_links" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer,
	"comment_id" integer,
	"reporter_email" varchar(254),
	"reason" varchar(80) NOT NULL,
	"details" text NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"kind" varchar(30) NOT NULL,
	"session_hash" varchar(64),
	"watch_seconds" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
UPDATE "dmca_requests" SET "status" = 'pending' WHERE "status" IS NULL;
--> statement-breakpoint
ALTER TABLE "dmca_requests" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "status" varchar(20) DEFAULT 'visible' NOT NULL;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "moderated_at" timestamp;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "status" varchar(20) DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "dmca_requests" ADD COLUMN "reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_reports" ADD CONSTRAINT "moderation_reports_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_events" ADD CONSTRAINT "video_events_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "creator_profiles_admin_unique" ON "creator_profiles" USING btree ("admin_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_profiles_slug_unique" ON "creator_profiles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "moderation_reports_status_idx" ON "moderation_reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "video_events_video_kind_idx" ON "video_events" USING btree ("video_id","kind","created_at");--> statement-breakpoint
CREATE INDEX "admin_sessions_admin_expiry_idx" ON "admin_sessions" USING btree ("admin_id","expires_at");--> statement-breakpoint
CREATE INDEX "comments_video_status_idx" ON "comments" USING btree ("video_slug","status","created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_status_idx" ON "contact_messages" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "dmca_requests_status_idx" ON "dmca_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "media_assets_admin_status_idx" ON "media_assets" USING btree ("admin_id","status");--> statement-breakpoint
CREATE INDEX "videos_public_feed_idx" ON "videos" USING btree ("status","source_type","published_at");--> statement-breakpoint
CREATE INDEX "videos_category_idx" ON "videos" USING btree ("category_slug","status");--> statement-breakpoint
CREATE INDEX "videos_creator_idx" ON "videos" USING btree ("creator","status");--> statement-breakpoint
CREATE INDEX "videos_media_asset_idx" ON "videos" USING btree ("media_asset_id");--> statement-breakpoint
INSERT INTO "creator_profiles" ("admin_id", "slug", "display_name", "bio")
SELECT "id", 'veltrio', 'VELTRIO', 'Independent stories, published directly on VELTRIO.'
FROM "admins"
WHERE "email" = 'alimukhtar@veltrio.com'
  AND NOT EXISTS (SELECT 1 FROM "creator_profiles" WHERE "slug" = 'veltrio');
