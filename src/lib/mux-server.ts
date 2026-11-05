// Server-only Mux helpers for the streaming pipeline. Never import this module
// from a client component: it holds API credentials and the playback signing key.
import crypto from "node:crypto";
import Mux from "@mux/ts";

type Environment = Record<string, string | undefined>;
export type Resolution = "1080p" | "1440p" | "2160p";

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

/**
 * Returns null unless MUX_TOKEN_ID and MUX_TOKEN_SECRET are both set. The
 * webhook secret and playback signing keys are optional: without them, Mux
 * assets fall back to a public playback policy and status is reconciled by
 * polling instead of push. Every credential stays server-side.
 */
export function muxConfig(env: Environment = process.env): MuxConfig | null {
  if (env.MUX_ENABLED === "false") return null;
  const tokenId = env.MUX_TOKEN_ID?.trim();
  const tokenSecret = env.MUX_TOKEN_SECRET?.trim();
  if (!tokenId || !tokenSecret) return null;
  const maxResolution = env.MUX_MAX_RESOLUTION || "1080p";
  if (maxResolution !== "1080p" && maxResolution !== "1440p" && maxResolution !== "2160p") throw new Error("Unsupported MUX_MAX_RESOLUTION.");
  const production = env.VERCEL_ENV === "production" || (!env.VERCEL_ENV && env.NODE_ENV === "production");
  return {
    tokenId,
    tokenSecret,
    webhookSecret: env.MUX_WEBHOOK_SECRET?.trim() || "",
    playbackSigningKeyId: env.MUX_PLAYBACK_SIGNING_KEY_ID?.trim() || "",
    playbackPrivateKey: (env.MUX_PLAYBACK_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim(),
    corsOrigin: resolveCorsOrigin(env, production),
    maxResolution,
    test: !production || env.MUX_TEST_MODE === "true",
  };
}

function resolveCorsOrigin(env: Environment, production: boolean) {
  const configured = env.MUX_CORS_ORIGIN?.trim();
  const candidates = [configured, env.NEXT_PUBLIC_SITE_URL?.trim(), env.VERCEL_PROJECT_PRODUCTION_URL?.trim() && `https://${env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`, env.VERCEL_URL?.trim() && `https://${env.VERCEL_URL.trim()}`].filter((value): value is string => !!value);
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate);
      if (url.protocol === "https:" || url.protocol === "http:") return url.origin;
    } catch { /* Try the next candidate. */ }
  }
  return production ? "https://veltrio-new.vercel.app" : "http://localhost:3000";
}

/** True when playback tokens can be minted for private (signed) playback. */
export function canSignPlayback(config: MuxConfig | null): config is MuxConfig {
  if (!config?.playbackSigningKeyId || !config.playbackPrivateKey) return false;
  try { return crypto.createPrivateKey(normalizePem(config.playbackPrivateKey)).asymmetricKeyType === "rsa"; } catch { return false; }
}

function normalizePem(value: string) {
  return value.includes("BEGIN") ? value : `-----BEGIN RSA PRIVATE KEY-----\n${value}\n-----END RSA PRIVATE KEY-----`;
}

export function createMuxClient(config: MuxConfig, options: { baseURL?: string } = {}) {
  // Creating a direct upload is billable; automatic retries after an ambiguous
  // response could duplicate provider resources. The routes reconcile instead.
  return new Mux({ tokenId: config.tokenId, tokenSecret: config.tokenSecret, webhookSecret: config.webhookSecret || undefined, maxRetries: 0, baseURL: options.baseURL || process.env.MUX_API_BASE_URL || undefined });
}

export type MuxProbe = { ok: true; assetsVisible: number } | { ok: false; reason: "not_configured" | "credentials_rejected" | "unreachable" | "request_failed" };

/**
 * Read-only credential probe. Makes a single "list one asset" call so an
 * operator can confirm a deployment can actually reach Mux. Never returns the
 * token, the account, or any asset data; only pass/fail and a reason.
 */
export async function probeMuxCredentials(env: Environment = process.env): Promise<MuxProbe> {
  const config = muxConfig(env);
  if (!config) return { ok: false, reason: "not_configured" };
  try {
    const assets = await createMuxClient(config).video.assets.list({ limit: 1 });
    return { ok: true, assetsVisible: Array.isArray(assets.data) ? assets.data.length : 0 };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mux request failed.";
    const reason = /40[13]/.test(message) ? "credentials_rejected" as const
      : /ENOTFOUND|fetch failed|ETIMEDOUT|ECONN/i.test(message) ? "unreachable" as const
      : "request_failed" as const;
    console.warn("Mux credential probe failed:", reason, message.slice(0, 160));
    return { ok: false, reason };
  }
}

/** Signed playback is used whenever a signing key exists; otherwise public. */
export function playbackPolicies(config: MuxConfig): ("signed" | "public")[] {
  return canSignPlayback(config) ? ["signed"] : ["public"];
}

export async function createMuxDirectUpload(client: Mux, config: MuxConfig, internalId: string) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(internalId)) throw new Error("Invalid internal upload ID.");
  return client.video.uploads.create({
    cors_origin: config.corsOrigin,
    timeout: 3600,
    test: config.test,
    new_asset_settings: {
      playback_policies: playbackPolicies(config),
      video_quality: "basic",
      max_resolution_tier: config.maxResolution,
      passthrough: internalId,
      meta: { external_id: internalId },
    },
  });
}

export type PlaybackClaims = {
  playbackId: string;
  audience: "t" | "g";
  expiresIn?: number;
  thumbnailTime?: number;
};

/**
 * Mux signs short-lived JWT playback tokens. `aud` picks the claim audience,
 * `sub` is the playback ID and `exp` bounds how long a shared link works.
 */
export function signPlaybackToken(config: MuxConfig, claims: PlaybackClaims) {
  if (!canSignPlayback(config)) throw new Error("Playback signing is not configured.");
  const payload: Record<string, unknown> = { sub: claims.playbackId, aud: claims.audience, kid: config.playbackSigningKeyId };
  if (claims.expiresIn) payload.exp = Math.floor(Date.now() / 1000) + claims.expiresIn;
  if (claims.thumbnailTime !== undefined) payload.thumbtime = Math.round(claims.thumbnailTime);
  const header = { alg: "RS256", typ: "JWT", kid: config.playbackSigningKeyId };
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode(header)}.${encode(payload)}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), crypto.createPrivateKey(normalizePem(config.playbackPrivateKey)));
  return `${unsigned}.${signature.toString("base64url")}`;
}

/** Returns the ready playback ID for an asset, preferring the requested policy. */
export function pickPlaybackId(asset: { playback_ids?: { id: string; policy: string }[] }, policy: "signed" | "public") {
  const ids = asset.playback_ids || [];
  return ids.find(entry => entry.policy === policy)?.id || ids[0]?.id || null;
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

export function formatMuxDuration(seconds?: number | null) {
  if (!seconds || seconds < 1) return "0:00";
  const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60), secs = Math.floor(seconds % 60);
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${minutes}:${String(secs).padStart(2, "0")}`;
}
