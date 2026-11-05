import { NextResponse } from "next/server";
import { isMuxEnabled, muxReady } from "@/lib/mux-stream";

export const dynamic = "force-dynamic";

/**
 * Non-sensitive capability probe. Reports whether streaming is configured on
 * this deployment, which the UI uses to explain the upload path. No credential,
 * account, or key material is ever returned.
 */
export async function GET() {
  const config = muxReady();
  return NextResponse.json({
    streaming: isMuxEnabled(),
    provider: config ? "mux" : "none",
    signedPlayback: !!(config?.playbackSigningKeyId && config?.playbackPrivateKey),
    webhook: !!config?.webhookSecret,
    maxResolution: config?.maxResolution || null,
  }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
