import { NextResponse } from "next/server";
import { getPublicVideoCount, getPublicVideos } from "@/lib/video-store";
import { apiError, HttpError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const query = (params.get("q") || "").slice(0, 160);
    const category = (params.get("category") || "all").slice(0, 120);
    const sortParam = params.get("sort");
    const sort = sortParam === "popular" ? "popular" : sortParam === "duration" ? "duration" : "newest";
    const rawLimit = Number(params.get("limit") || 24);
    const rawOffset = Number(params.get("offset") || 0);
    if (!Number.isSafeInteger(rawLimit) || !Number.isSafeInteger(rawOffset) || rawLimit < 1 || rawOffset < 0) throw new HttpError(400, "Invalid catalog pagination.");
    const limit = Math.min(rawLimit, 48);
    const offset = rawOffset;
    const options = { query, category, sort } as const;
    const [videos, total] = await Promise.all([getPublicVideos({ ...options, limit, offset }), getPublicVideoCount(options)]);
    return NextResponse.json({ videos, total, hasMore: offset + videos.length < total }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
    });
  } catch (error) { return apiError(error); }
}
