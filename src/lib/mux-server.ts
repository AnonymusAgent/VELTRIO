// Server-only foundation for a future Mux upload route. This module is not
// connected to the UI or any endpoint; configuring it alone cannot enable
// uploads. Never import it from a client component.
import Mux from "@mux/ts";

type Environment = Record<string, string | undefined>;
type Resolution = "1080p" | "1440p" | "2160p";
export type MuxConfig = {
  tokenId: string;
  tokenSecret: string;
  webhookSecret: string;
  playbackSigningKeyId: string;
  playbackPrivateKey: string;
  corsOrigin: string;
  maxResolution: Resolution;
  test: boolean;
};

/** Returns null by default. All credentials are required before opting in. */
export function muxConfig(env: Environment = process.env): MuxConfig | null {
  if (env.MUX_ENABLED !== "true") return null;
  const required = ["MUX_TOKEN_ID", "MUX_TOKEN_SECRET", "MUX_WEBHOOK_SECRET", "MUX_PLAYBACK_SIGNING_KEY_ID", "MUX_PLAYBACK_PRIVATE_KEY", "MUX_CORS_ORIGIN"] as const;
  if (required.some(key => !env[key]?.trim())) throw new Error("Mux is enabled but its server configuration is incomplete.");
  const production = env.VERCEL_ENV === "production" || (!env.VERCEL_ENV && env.NODE_ENV === "production");
  let origin: URL;
  try { origin = new URL(env.MUX_CORS_ORIGIN!); } catch { throw new Error("MUX_CORS_ORIGIN must be an exact application origin."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname);
  if (origin.origin !== env.MUX_CORS_ORIGIN || (origin.protocol !== "https:" && !(origin.protocol === "http:" && local && !production))) {
    throw new Error("MUX_CORS_ORIGIN must be an exact HTTPS application origin, or a local HTTP origin in development.");
  }
  const maxResolution = env.MUX_MAX_RESOLUTION || "1080p";
  if (maxResolution !== "1080p" && maxResolution !== "1440p" && maxResolution !== "2160p") throw new Error("Unsupported MUX_MAX_RESOLUTION.");
  return {
    tokenId: env.MUX_TOKEN_ID!, tokenSecret: env.MUX_TOKEN_SECRET!, webhookSecret: env.MUX_WEBHOOK_SECRET!,
    playbackSigningKeyId: env.MUX_PLAYBACK_SIGNING_KEY_ID!, playbackPrivateKey: env.MUX_PLAYBACK_PRIVATE_KEY!,
    corsOrigin: origin.origin, maxResolution, test: !production || env.MUX_TEST_MODE === "true",
  };
}

export function createMuxClient(config: MuxConfig) {
  // Creating an upload is a billable-resource operation; automatic retries
  // after an ambiguous response can produce duplicates. Reconciliation is
  // required before the future route can safely retry a failed request.
  return new Mux({ tokenId: config.tokenId, tokenSecret: config.tokenSecret, webhookSecret: config.webhookSecret, maxRetries: 0 });
}

/** A future route must authenticate, reserve quota and persist the ID first. */
export async function createMuxDirectUpload(client: Mux, config: MuxConfig, internalUploadId: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(internalUploadId)) throw new Error("Invalid internal upload ID.");
  return client.video.uploads.create({
    cors_origin: config.corsOrigin,
    timeout: 3600,
    test: config.test,
    new_asset_settings: {
      playback_policies: ["signed"],
      video_quality: "basic",
      max_resolution_tier: config.maxResolution,
      passthrough: internalUploadId,
    },
  });
}

/** Pass the bounded, unmodified request bytes and original headers. */
export async function verifyMuxWebhook(client: Mux, body: Uint8Array, headers: Headers) {
  const timestamps = (headers.get("mux-signature") || "").split(",").map(part => part.trim()).filter(part => part.startsWith("t="));
  if (timestamps.length !== 1 || !/^t=\d+$/.test(timestamps[0])) throw new Error("Invalid webhook timestamp.");
  const timestamp = Number(timestamps[0].slice(2));
  // The SDK rejects old signatures; also reject future timestamps and values
  // outside the integer range so a stolen signature has a bounded lifetime.
  if (!Number.isSafeInteger(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) throw new Error("Invalid webhook timestamp.");
  return client.webhooks.unwrap(body, headers);
}
