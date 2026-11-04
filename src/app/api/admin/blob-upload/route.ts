import path from "node:path";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { assertSameOrigin, apiError, HttpError } from "@/lib/http";
import { validateUpload } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (process.env.STORAGE_PROVIDER !== "vercel_blob" || !process.env.BLOB_READ_WRITE_TOKEN) throw new HttpError(503, "Durable blob storage is not configured.");
    const body = await request.json() as HandleUploadBody;
    if (body.type === "blob.generate-client-token") assertSameOrigin(request);

    const result = await handleUpload({
      request,
      body,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const admin = await requireAdmin();
        let payload: { filename?: unknown; size?: unknown; kind?: unknown } = {};
        try { payload = JSON.parse(clientPayload || "{}"); } catch { throw new HttpError(400, "Invalid upload metadata."); }
        const filename = path.basename(String(payload.filename || "")).slice(0, 250);
        const size = Number(payload.size);
        const kind = String(payload.kind || "");
        const info = validateUpload(filename, size, kind);
        if (!/^veltrio\/(video|thumbnail)\//.test(pathname)) throw new HttpError(400, "Invalid blob pathname.");
        return {
          allowedContentTypes: [info.mime],
          maximumSizeInBytes: size,
          addRandomSuffix: true,
          allowOverwrite: false,
          cacheControlMaxAge: 31536000,
          tokenPayload: JSON.stringify({ adminId: admin.id, filename, size, kind, mimeType: info.mime }),
        };
      },
    });
    return NextResponse.json(result);
  } catch (error) { return apiError(error); }
}
