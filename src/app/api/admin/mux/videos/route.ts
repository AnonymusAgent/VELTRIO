import { NextResponse } from "next/server";
import { CATEGORIES } from "@/lib/data";
import { requireAdmin } from "@/lib/admin-auth";
import { ensureCreatorProfile } from "@/lib/creator-store";
import { apiError, assertSameOrigin, HttpError, jsonBody } from "@/lib/http";
import { adminStreamOwner, isMuxEnabled, publishMuxVideo } from "@/lib/mux-stream";

export const dynamic = "force-dynamic";

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    if (!isMuxEnabled()) throw new HttpError(503, "Video streaming is not configured yet.");
    const body = await jsonBody(request);
    const title = cleanText(body.title, 160);
    const description = cleanText(body.description, 5000);
    const category = CATEGORIES.find(item => item.slug === body.categorySlug);
    const status = body.status === "published" ? "published" : "draft";
    if (title.length < 3) throw new HttpError(400, "Add a title of at least 3 characters.");
    if (!category) throw new HttpError(400, "Choose a category.");
    if (body.rightsConfirmed !== true) throw new HttpError(400, "Confirm you have the rights to publish this video.");
    const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
    const profile = await ensureCreatorProfile(admin.id);
    const result = await publishMuxVideo(
      { id: adminStreamOwner(admin.id), name: profile.displayName || admin.name },
      uploadId,
      { title, description, categorySlug: category.slug, categoryName: category.name, status, rightsConfirmed: true },
    );
    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) { return apiError(error); }
}
