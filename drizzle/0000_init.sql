CREATE TABLE "admin_sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admins" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(254) NOT NULL,
	"name" varchar(100) DEFAULT 'Alomukhtar' NOT NULL,
	"password_hash" text NOT NULL,
	"recovery_hash" text,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"intro_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"password_changed_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "admins_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_attempts" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"description" text,
	"thumbnail" text,
	"video_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer,
	"video_slug" varchar(320),
	"name" varchar(120) NOT NULL,
	"email" varchar(200),
	"body" text NOT NULL,
	"likes" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(120) NOT NULL,
	"email" varchar(254) NOT NULL,
	"subject" varchar(200) NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dmca_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"content_url" text NOT NULL,
	"claimant" varchar(200) NOT NULL,
	"email" varchar(200) NOT NULL,
	"details" text,
	"status" varchar(30) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"admin_id" integer NOT NULL,
	"kind" varchar(20) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"storage_key" varchar(100) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size" bigint NOT NULL,
	"received" bigint DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'uploading' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(300) NOT NULL,
	"slug" varchar(320) NOT NULL,
	"description" text,
	"thumbnail" text NOT NULL,
	"video_url" text,
	"duration" varchar(20) DEFAULT '12:34',
	"views" integer DEFAULT 0,
	"likes" integer DEFAULT 0,
	"category_slug" varchar(120),
	"category_name" varchar(120),
	"creator" varchar(160) DEFAULT 'Video Hub',
	"creator_avatar" text,
	"is_trending" boolean DEFAULT false,
	"is_featured" boolean DEFAULT false,
	"is_hd" boolean DEFAULT true,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"published_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"status" varchar(30) DEFAULT 'published' NOT NULL,
	"source_type" varchar(30) DEFAULT 'curated' NOT NULL,
	"duration_seconds" integer,
	"mime_type" varchar(120),
	"media_asset_id" varchar(36),
	"thumbnail_asset_id" varchar(36),
	"file_size" bigint DEFAULT 0,
	"rights_confirmed" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "videos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments" ADD CONSTRAINT "comments_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "public"."admins"("id") ON DELETE no action ON UPDATE no action;