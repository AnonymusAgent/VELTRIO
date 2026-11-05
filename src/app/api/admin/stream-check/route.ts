import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { apiError } from "@/lib/http";
import { probeMuxCredentials, muxConfig } from "@/lib/mux-server";

export const dynamic = "force-dynamic";

/**
 * Admin-only credential check. Makes one read-only Mux API call so an operator
 * can confirm the access token works from inside the deployment, without ever
 * returning the token itself.
 */
export async function GET() {
  try {
    await requireAdmin();
    const config = muxConfig();
    if (!config) return NextResponse.json({ ok: false, reason: "MUX_TOKEN_ID and MUX_TOKEN_SECRET are not both set." }, { status: 200 });
    return NextResponse.json({
      ...await probeMuxCredentials(),
      maxResolution: config.maxResolution,
      signedPlayback: !!(config.playbackSigningKeyId && config.playbackPrivateKey),
      webhook: !!config.webhookSecret,
      corsOrigin: process.env.MUX_CORS_ORIGIN || null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
