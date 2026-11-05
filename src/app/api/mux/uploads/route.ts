import { NextResponse } from "next/server";
import { requireUser } from "@/lib/user-auth";
import { apiError, assertSameOrigin, HttpError, jsonBody } from "@/lib/http";
import { MUX_MAX_UPLOAD_BYTES, isMuxEnabled, startMuxUpload } from "@/lib/mux-stream";

export const dynamic = "force-dynamic";

// Creates a Mux direct upload URL. Video bytes never pass through this
// deployment; the browser uploads straight to Mux with resumable chunks.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    if (!isMuxEnabled()) throw new HttpError(503, "Video streaming is not configured yet.");
    const body = await jsonBody(request);
    const size = Number(body.size || 0);
    if (!Number.isSafeInteger(size) || size < 1 || size > MUX_MAX_UPLOAD_BYTES) throw new HttpError(400, "Choose a video up to 2 GB.");
    const title = typeof body.title === "string" ? body.title.slice(0, 300) : undefined;
    const upload = await startMuxUpload(user.id, size, title);
    return NextResponse.json(upload, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
