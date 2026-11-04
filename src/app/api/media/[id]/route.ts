import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, videos } from "@/db/schema";
import { getAdmin } from "@/lib/admin-auth";
import { assetPath } from "@/lib/storage";
import { apiError, HttpError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function serve(request: Request, { params }: { params: Promise<{ id: string }> }, head = false) {
  try {
    const { id } = await params;
    const [asset] = await db.select().from(mediaAssets).where(and(eq(mediaAssets.id, id), eq(mediaAssets.status, "ready"))).limit(1);
    if (!asset) throw new HttpError(404, "Media not found.");
    const [published] = await db.select({ id: videos.id }).from(videos).where(and(eq(videos.status, "published"), eq(videos.sourceType, "upload"), or(eq(videos.mediaAssetId, id), eq(videos.thumbnailAssetId, id)))).limit(1);
    if (!published && (await getAdmin())?.id !== asset.adminId) throw new HttpError(404, "Media not found.");
    const filename = assetPath(asset.storageKey);
    const { size } = await stat(filename);
    const headers = new Headers({ "Content-Type": asset.mimeType, "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" });
    if (new URL(request.url).searchParams.get("download") === "1") headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(asset.filename)}`);
    let start = 0, end = size - 1, status = 200;
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      if (!match[1]) start = Math.max(0, size - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(Number(match[2]), size - 1); }
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
      status = 206;
      headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    }
    headers.set("Content-Length", String(end - start + 1));
    const body = head ? null : Readable.toWeb(createReadStream(filename, { start, end })) as ReadableStream<Uint8Array>;
    return new Response(body, { status, headers });
  } catch (error) { return apiError(error); }
}
export function GET(request: Request, context: { params: Promise<{ id: string }> }) { return serve(request, context); }
export function HEAD(request: Request, context: { params: Promise<{ id: string }> }) { return serve(request, context, true); }
