import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { apiError } from "@/lib/http";
import { muxClient, muxReady } from "@/lib/mux-stream";

export const dynamic = "force-dynamic";

/**
 * Admin-only credential check. Makes one read-only Mux API call so an operator
 * can confirm the access token works from inside the deployment, without ever
 * returning the token itself.
 */
export async function GET() {
  try {
    await requireAdmin();
    const config = muxReady();
    if (!config) return NextResponse.json({ ok: false, reason: "MUX_TOKEN_ID and MUX_TOKEN_SECRET are not both set." }, { status: 200 });
    try {
      const { client } = muxClient();
      const assets = await client.video.assets.list({ limit: 1 });
      return NextResponse.json({
        ok: true,
        reachedMux: true,
        assetsVisible: Array.isArray(assets.data) ? assets.data.length : 0,
        maxResolution: config.maxResolution,
        signedPlayback: !!(config.playbackSigningKeyId && config.playbackPrivateKey),
        webhook: !!config.webhookSecret,
        corsOrigin: process.env.MUX_CORS_ORIGIN || null,
      }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Mux did not accept the request.";
      // Mux returns 401/403 for a bad token pair. Report the status, not the secret.
      const status = /40[13]/.test(message) ? "credentials_rejected" : "request_failed";
      return NextResponse.json({ ok: false, reason: status, detail: message.slice(0, 240) }, { status: 200 });
    }
  } catch (error) { return apiError(error); }
}
