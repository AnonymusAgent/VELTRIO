CREATE TABLE "mux_uploads" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"owner_user_id" varchar(255) NOT NULL,
	"video_id" integer,
	"upload_id" varchar(128),
	"asset_id" varchar(128),
	"playback_id" varchar(128),
	"status" varchar(30) DEFAULT 'waiting' NOT NULL,
	"size" bigint DEFAULT 0 NOT NULL,
	"duration_seconds" integer,
	"title" varchar(300),
	"error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watch_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"video_id" integer NOT NULL,
	"position" double precision DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "mux_upload_id" varchar(128);--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "mux_asset_id" varchar(128);--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "mux_playback_id" varchar(128);--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "mux_status" varchar(30);--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "mux_max_resolution" varchar(10);--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "mux_error" text;--> statement-breakpoint
ALTER TABLE "mux_uploads" ADD CONSTRAINT "mux_uploads_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_progress" ADD CONSTRAINT "watch_progress_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mux_uploads_owner_status_idx" ON "mux_uploads" USING btree ("owner_user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "mux_uploads_upload_idx" ON "mux_uploads" USING btree ("upload_id");--> statement-breakpoint
CREATE INDEX "mux_uploads_asset_idx" ON "mux_uploads" USING btree ("asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watch_progress_user_video_idx" ON "watch_progress" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE INDEX "watch_progress_user_updated_idx" ON "watch_progress" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "videos_mux_upload_idx" ON "videos" USING btree ("mux_upload_id");--> statement-breakpoint
CREATE UNIQUE INDEX "videos_mux_asset_idx" ON "videos" USING btree ("mux_asset_id");