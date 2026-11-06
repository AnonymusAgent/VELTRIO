CREATE TABLE "saved_titles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"video_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_titles" ADD CONSTRAINT "saved_titles_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_titles_user_video_idx" ON "saved_titles" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE INDEX "saved_titles_user_created_idx" ON "saved_titles" USING btree ("user_id","created_at");
