CREATE TABLE "page_views" (
	"id" serial PRIMARY KEY NOT NULL,
	"path" varchar(320) NOT NULL,
	"visitor_hash" varchar(64) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media_assets" ALTER COLUMN "admin_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "media_assets" ADD COLUMN "owner_user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "videos" ADD COLUMN "owner_user_id" varchar(255);--> statement-breakpoint
CREATE INDEX "page_views_created_idx" ON "page_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "media_assets_owner_user_idx" ON "media_assets" USING btree ("owner_user_id");--> statement-breakpoint
CREATE INDEX "videos_owner_user_idx" ON "videos" USING btree ("owner_user_id");