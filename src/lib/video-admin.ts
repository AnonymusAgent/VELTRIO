import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { CATEGORIES } from "./data";
import { HttpError } from "./http";

export function videoDetails(body: Record<string, unknown>) {
  const title = String(body.title || "").trim();
  const description = String(body.description || "").trim();
  const category = CATEGORIES.find((c) => c.slug === body.categorySlug);
  if (title.length < 3 || title.length > 160) throw new HttpError(400, "Title must contain 3–160 characters.");
  if (description.length > 5000) throw new HttpError(400, "Description must be 5,000 characters or fewer.");
  if (!category) throw new HttpError(400, "Choose a category.");
  const status = body.status === "published" ? "published" : "draft";
  const rightsConfirmed = body.rightsConfirmed === true;
  if (status === "published" && !rightsConfirmed) throw new HttpError(400, "Confirm that you have publishing rights and the video meets the content guidelines.");
  return { title, description, categorySlug: category.slug, categoryName: category.name, status, rightsConfirmed, isFeatured: body.isFeatured === true };
}
export async function readyAsset(id: unknown, kind: string, adminId: number) {
  if (typeof id !== "string") throw new HttpError(400, `Upload a ${kind} first.`);
  const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  if (!asset || asset.adminId !== adminId || asset.kind !== kind || asset.status !== "ready") throw new HttpError(400, `The ${kind} upload is incomplete or invalid.`);
  return asset;
}
