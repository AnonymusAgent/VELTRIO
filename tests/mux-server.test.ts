import assert from "node:assert/strict";
import { createHmac, generateKeyPairSync } from "node:crypto";
import Mux from "@mux/ts";
import { muxConfig, createMuxClient, createMuxDirectUpload, verifyMuxWebhook, signPlaybackToken, canSignPlayback, playbackPolicies } from "../src/lib/mux-server";

async function main() {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs1", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
  const env = {
    MUX_TOKEN_ID: "unit-id", MUX_TOKEN_SECRET: "unit-secret", MUX_WEBHOOK_SECRET: "unit-webhook-secret",
    MUX_PLAYBACK_SIGNING_KEY_ID: "unit-key", MUX_PLAYBACK_PRIVATE_KEY: privateKey,
    MUX_CORS_ORIGIN: "https://veltrio.example", VERCEL_ENV: "preview",
  };

  // Credentials alone are enough to enable the streaming pipeline; MUX_ENABLED
  // can still hard-disable it.
  assert.equal(muxConfig({}), null);
  assert.equal(muxConfig({ MUX_TOKEN_ID: "id" }), null);
  assert.equal(muxConfig({ MUX_TOKEN_ID: "id", MUX_TOKEN_SECRET: "secret", MUX_ENABLED: "false" }), null);
  assert.throws(() => muxConfig({ ...env, MUX_MAX_RESOLUTION: "4k" }), /RESOLUTION/);

  const config = muxConfig(env)!;
  assert.equal(config.test, true);
  assert.equal(config.maxResolution, "1080p");
  assert.equal(muxConfig({ ...env, VERCEL_ENV: "production", MUX_MAX_RESOLUTION: "2160p" })!.test, false);
  assert.equal(muxConfig({ MUX_TOKEN_ID: "id", MUX_TOKEN_SECRET: "secret" })!.corsOrigin.includes("localhost"), true);
  assert.equal(createMuxClient(config).maxRetries, 0);

  // Signed playback whenever a usable RSA key is present, public otherwise.
  assert.equal(canSignPlayback(config), true);
  assert.deepEqual(playbackPolicies(config), ["signed"]);
  const unsignedConfig = muxConfig({ MUX_TOKEN_ID: "id", MUX_TOKEN_SECRET: "secret" })!;
  assert.equal(canSignPlayback(unsignedConfig), false);
  assert.deepEqual(playbackPolicies(unsignedConfig), ["public"]);

  // Credential probe classifies failures without ever echoing the token:
  // 401/403 means the token pair is wrong; a bad host means Mux is unreachable.
  const { probeMuxCredentials } = await import("../src/lib/mux-server");
  const probeEnv = { MUX_TOKEN_ID: "probe-id", MUX_TOKEN_SECRET: "probe-secret", MUX_API_BASE_URL: "https://api.mux.test" };
  const probeWith = async (status: number, body: unknown) => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    try { return await probeMuxCredentials(probeEnv); } finally { globalThis.fetch = realFetch; }
  };
  assert.deepEqual(await probeMuxCredentials({}), { ok: false, reason: "not_configured" });
  assert.deepEqual(await probeMuxCredentials({ MUX_TOKEN_ID: "id", MUX_TOKEN_SECRET: "secret", MUX_ENABLED: "false" }), { ok: false, reason: "not_configured" });
  assert.deepEqual(await probeWith(401, { error: "unauthorized" }), { ok: false, reason: "credentials_rejected" });
  assert.deepEqual(await probeWith(403, { error: "forbidden" }), { ok: false, reason: "credentials_rejected" });
  assert.deepEqual(await probeWith(500, { error: "boom" }), { ok: false, reason: "request_failed" });
  // A successful list proves the credentials work; the count is incidental.
  const okProbe = await probeWith(200, { data: { id: "asset-1" } });
  assert.equal(okProbe.ok, true);

  let sent: Record<string, unknown> | undefined;
  const client = new Mux({ tokenId: config.tokenId, tokenSecret: config.tokenSecret, webhookSecret: config.webhookSecret, maxRetries: 0, fetch: async (_input, init) => {
    sent = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ data: { id: "upload-id", url: "https://upload.example/token", status: "waiting", timeout: 3600, cors_origin: config.corsOrigin } }), { status: 201, headers: { "content-type": "application/json" } });
  } });
  const id = "f02a2987-7a9b-4c32-9412-773406512e15";
  await createMuxDirectUpload(client, { ...config, maxResolution: "2160p" }, id);
  assert.deepEqual((sent as { new_asset_settings: unknown }).new_asset_settings, { playback_policies: ["signed"], video_quality: "basic", max_resolution_tier: "2160p", passthrough: id, meta: { external_id: id } });
  await assert.rejects(() => createMuxDirectUpload(client, config, "invalid"), /upload ID/);

  // Playback tokens are RS256 JWTs with the playback ID as `sub`.
  const token = signPlaybackToken(config, { playbackId: "abc123", audience: "t", expiresIn: 3600, thumbnailTime: 12 });
  const [header, payload] = token.split(".");
  assert.equal(JSON.parse(Buffer.from(header, "base64url").toString()).alg, "RS256");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  assert.equal(claims.sub, "abc123");
  assert.equal(claims.aud, "t");
  assert.equal(claims.thumbtime, 12);
  assert.ok(claims.exp > Math.floor(Date.now() / 1000));
  assert.throws(() => signPlaybackToken(unsignedConfig, { playbackId: "abc", audience: "t" }), /signing/);

  const body = JSON.stringify({ id: "evt_123", type: "video.asset.ready", data: { id: "asset_123" } });
  const bytes = new TextEncoder().encode(body);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = (t: number, payload = body) => createHmac("sha256", config.webhookSecret).update(`${t}.${payload}`).digest("hex");
  const headers = (t: number, sig = signature(t)) => new Headers({ "mux-signature": `t=${t},v1=${sig}` });
  assert.equal((await verifyMuxWebhook(client, bytes, headers(timestamp))).type, "video.asset.ready");
  await assert.rejects(() => verifyMuxWebhook(client, bytes, headers(timestamp, "bad")));
  await assert.rejects(() => verifyMuxWebhook(client, new TextEncoder().encode(`${body} `), headers(timestamp)));
  await assert.rejects(() => verifyMuxWebhook(client, bytes, headers(timestamp - 301)));
  await assert.rejects(() => verifyMuxWebhook(client, bytes, headers(timestamp + 301)));
  await assert.rejects(() => verifyMuxWebhook(client, bytes, new Headers({ "mux-signature": `t=${timestamp},t=${timestamp},v1=${signature(timestamp)}` })));
  console.log("PASS: credentials enable Mux, signed 4K upload options, RS256 playback tokens and verified webhook signatures.");
}
void main();
