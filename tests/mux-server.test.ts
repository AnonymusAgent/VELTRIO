import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import Mux from "@mux/ts";
import { muxConfig, createMuxClient, createMuxDirectUpload, verifyMuxWebhook } from "../src/lib/mux-server";

async function main() {
  const env = { MUX_ENABLED: "true", MUX_TOKEN_ID: "unit-id", MUX_TOKEN_SECRET: "unit-secret", MUX_WEBHOOK_SECRET: "unit-webhook-secret", MUX_PLAYBACK_SIGNING_KEY_ID: "unit-key", MUX_PLAYBACK_PRIVATE_KEY: "unit-private-key", MUX_CORS_ORIGIN: "https://veltrio.example", VERCEL_ENV: "preview" };
  assert.equal(muxConfig({}), null);
  assert.throws(() => muxConfig({ MUX_ENABLED: "true" }), /incomplete/);
  assert.throws(() => muxConfig({ ...env, MUX_CORS_ORIGIN: "https://veltrio.example/path" }), /origin/);
  assert.throws(() => muxConfig({ ...env, MUX_CORS_ORIGIN: "http://veltrio.example" }), /origin/);
  assert.throws(() => muxConfig({ ...env, MUX_MAX_RESOLUTION: "4k" }), /RESOLUTION/);
  const config = muxConfig(env)!;
  assert.equal(config.test, true);
  assert.equal(config.maxResolution, "1080p");
  assert.equal(muxConfig({ ...env, VERCEL_ENV: "production", MUX_MAX_RESOLUTION: "2160p" })!.test, false);
  assert.equal(muxConfig({ ...env, VERCEL_ENV: "production", MUX_TEST_MODE: "true" })!.test, true);
  assert.equal(createMuxClient(config).maxRetries, 0);

  let sent: Record<string, unknown> | undefined;
  const client = new Mux({ tokenId: config.tokenId, tokenSecret: config.tokenSecret, webhookSecret: config.webhookSecret, maxRetries: 0, fetch: async (_input, init) => {
    sent = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ data: { id: "upload-id", url: "https://upload.example/token", status: "waiting", timeout: 3600, cors_origin: config.corsOrigin } }), { status: 201, headers: { "content-type": "application/json" } });
  } });
  const id = "f02a2987-7a9b-4c32-9412-773406512e15";
  await createMuxDirectUpload(client, { ...config, maxResolution: "2160p" }, id);
  assert.deepEqual(sent, { cors_origin: config.corsOrigin, timeout: 3600, test: true, new_asset_settings: { playback_policies: ["signed"], video_quality: "basic", max_resolution_tier: "2160p", passthrough: id } });
  await assert.rejects(() => createMuxDirectUpload(client, config, "invalid"), /upload ID/);

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
  console.log("PASS: disabled-by-default Mux configuration, signed 4K upload options and verified webhook signatures.");
}
void main();
