import { NextResponse } from "next/server";
import { requireUser } from "@/lib/user-auth";
import { apiError, assertSameOrigin, HttpError, jsonBody } from "@/lib/http";
import { publishMuxVideo } from "@/lib/mux-stream";
import { videoDetails } from "@/lib/video-admin";

export const dynamic = "force-dynamic";

// Publishes (or saves as a draft) a finished Mux upload. Requires a signed-in
// creator, same-origin request and an explicit rights confirmation to publish.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = await jsonBody(request);
    const details = videoDetails(body);
    if (typeof body.uploadId !== "string") throw new HttpError(400, "Upload a video first.");
    const result = await publishMuxVideo({ id: user.id, name: user.name }, body.uploadId, details);
    return NextResponse.json(result, { status: result.created ? 201 : 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
