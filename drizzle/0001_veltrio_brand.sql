ALTER TABLE "videos" ALTER COLUMN "creator" SET DEFAULT 'VELTRIO';
--> statement-breakpoint
UPDATE "admins" AS legacy
SET "email" = 'alimukhtar@veltrio.com'
WHERE legacy."email" = 'alomukhtar@playhub.vom'
  AND NOT EXISTS (
    SELECT 1 FROM "admins" AS current_admin
    WHERE current_admin."email" = 'alimukhtar@veltrio.com'
  );
