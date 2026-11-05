import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { apiError, assertSameOrigin, HttpError, jsonBody } from "@/lib/http";
import { MUX_MAX_UPLOAD_BYTES, adminStreamOwner, isMuxEnabled, startMuxUpload } from "@/lib/mux-stream";

export const dynamic = "force-dynamic";

// Admin studio upload. Bytes go straight to Mux; this route only issues the URL.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    if (!isMuxEnabled()) throw new HttpError(503, "Video streaming is not configured yet.");
    const body = await jsonBody(request);
    const size = Number(body.size || 0);
    if (!Number.isSafeInteger(size) || size < 1 || size > MUX_MAX_UPLOAD_BYTES) throw new HttpError(400, "Choose a video up to 2 GB.");
    const title = typeof body.title === "string" ? body.title.slice(0, 300) : undefined;
    const upload = await startMuxUpload(adminStreamOwner(admin.id), size, title);
    return NextResponse.json(upload, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
