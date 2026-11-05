import { NextResponse } from "next/server";
import { requireUser } from "@/lib/user-auth";
import { creatorStorageIssue } from "@/lib/creator-storage";
import { apiError } from "@/lib/http";
import { isMuxEnabled, muxReady } from "@/lib/mux-stream";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireUser();
    if (isMuxEnabled()) {
      const config = muxReady();
      return NextResponse.json({
        available: true,
        provider: "mux",
        maxResolution: config?.maxResolution || "1080p",
        signedPlayback: !!(config?.playbackSigningKeyId && config?.playbackPrivateKey),
        message: null,
      }, { headers: { "Cache-Control": "private, no-store" } });
    }
    const issue = creatorStorageIssue();
    return NextResponse.json({ available: !issue, provider: "local", message: issue }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
