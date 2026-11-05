import { NextResponse } from "next/server";
import { probeMuxCredentials } from "@/lib/mux-server";
import { isMuxEnabled, muxReady } from "@/lib/mux-stream";

export const dynamic = "force-dynamic";

/**
 * Non-sensitive capability probe. Reports whether streaming is configured on
 * this deployment, which the UI uses to explain the upload path. No credential,
 * account, or key material is ever returned.
 */
export async function GET(request: Request) {
  const config = muxReady();
  // `?deep=1` makes one read-only Mux API call so an operator can confirm the
  // deployment's token works end to end. Never cached, never returns keys.
  if (new URL(request.url).searchParams.has("deep")) {
    return NextResponse.json(await probeMuxCredentials(), { headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({
    streaming: isMuxEnabled(),
    provider: config ? "mux" : "none",
    signedPlayback: !!(config?.playbackSigningKeyId && config?.playbackPrivateKey),
    webhook: !!config?.webhookSecret,
    maxResolution: config?.maxResolution || null,
  }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
