import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets, videos } from "@/db/schema";
import { getAdmin } from "@/lib/admin-auth";
import { userAuth } from "@/lib/user-auth";
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
    if (!published) {
      const admin = await getAdmin();
      let owner = false;
      if (asset.ownerUserId) {
        try { owner = (await userAuth().getSession()).data?.user?.id === asset.ownerUserId; } catch { /* No user session. */ }
      }
      if (!owner && !admin) throw new HttpError(404, "Media not found.");
    }
    const headers = new Headers({ "Content-Type": asset.mimeType, "Accept-Ranges": "bytes", "Cache-Control": published ? "public, max-age=300, must-revalidate" : "private, no-store", "X-Content-Type-Options": "nosniff", "Cross-Origin-Resource-Policy": "same-origin" });
    if (new URL(request.url).searchParams.get("download") === "1") headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(asset.filename)}`);

    if (asset.storageProvider === "vercel_blob") {
      const rangeHeader = request.headers.get("range");
      const remote = await fetch(asset.storageKey, { method: head ? "HEAD" : "GET", headers: !head && rangeHeader ? { Range: rangeHeader } : undefined });
      if (remote.status === 416) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${asset.size}` } });
      if (!remote.ok) throw new HttpError(404, "Media not found.");
      const remoteLength = remote.headers.get("content-length");
      const remoteRange = remote.headers.get("content-range");
      if (remoteLength) headers.set("Content-Length", remoteLength);
      else if (!remoteRange) headers.set("Content-Length", String(asset.size));
      if (remoteRange) headers.set("Content-Range", remoteRange);
      return new Response(head ? null : remote.body, { status: remote.status, headers });
    }

    const filename = assetPath(asset.storageKey);
    const { size } = await stat(filename);
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
