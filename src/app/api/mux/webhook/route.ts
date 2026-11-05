import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { muxUploads, muxWebhookReceipts, videos } from "@/db/schema";
import { readBounded } from "@/lib/http";
import { createMuxClient, formatMuxDuration, muxConfig, verifyMuxWebhook } from "@/lib/mux-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WebhookBody = { type?: string; id?: string; data?: { id?: string; asset_id?: string; playback_ids?: { id: string; policy: string }[]; duration?: number; passthrough?: string; errors?: { messages?: string[] } } };

/**
 * Opening this URL in a browser sends GET, not POST. Answer it explicitly so a
 * configuration check does not look like a broken page, and so the response
 * states whether the signing secret is actually configured. Nothing secret is
 * returned and no work is performed.
 */
export async function GET() {
  const config = muxConfig();
  // A receipt only exists if a delivery passed signature verification, which
  // proves the stored secret matches the Mux endpoint's secret.
  const last = await db.select({ eventType: muxWebhookReceipts.eventType, receivedAt: muxWebhookReceipts.receivedAt })
    .from(muxWebhookReceipts).orderBy(desc(muxWebhookReceipts.receivedAt)).limit(1)
    .then(rows => rows[0] || null).catch(() => null);
  return NextResponse.json({
    endpoint: "Mux webhook receiver",
    method: "POST only — Mux delivers events here automatically; there is nothing to open in a browser.",
    streamingConfigured: !!config,
    webhookConfigured: !!config?.webhookSecret,
    lastVerifiedDelivery: last ? { event: last.eventType, at: last.receivedAt.toISOString() } : null,
    verified: !!last,
  }, { status: 200, headers: { "Cache-Control": "no-store", Allow: "POST" } });
}

/**
 * Mux status callbacks. The raw body is verified before parsing, only a small
 * allowlist of event types is honoured, and every handler is idempotent so a
 * retried or out-of-order delivery cannot corrupt publication state.
 */
export async function POST(request: Request) {
  const config = muxConfig();
  if (!config) return NextResponse.json({ error: "Streaming is not configured." }, { status: 503 });
  if (!config.webhookSecret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  let body: WebhookBody;
  try {
    const raw = await readBounded(request, 256 * 1024);
    body = (await verifyMuxWebhook(createMuxClient(config), raw, request.headers)) as WebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  try {
    // Signature verified. Record a receipt so an operator can confirm the
    // endpoint and secret pair actually work; failures here must not block.
    await db.insert(muxWebhookReceipts)
      .values({ id: `${body.id || Date.now()}:${body.type || "unknown"}`.slice(0, 128), eventType: (body.type || "unknown").slice(0, 120) })
      .onConflictDoNothing()
      .catch(() => {});
    const data = body.data || {};
    if (body.type === "video.upload.asset_created" || body.type === "video.upload.errored") {
      if (data.id) await db.update(muxUploads).set({
        status: body.type === "video.upload.errored" ? "errored" : "processing",
        assetId: data.asset_id || null,
        error: body.type === "video.upload.errored" ? "Mux could not accept this file." : null,
        updatedAt: new Date(),
      }).where(eq(muxUploads.uploadId, data.id));
    }
    if ((body.type === "video.asset.ready" || body.type === "video.asset.errored") && data.id) {
      const ready = body.type === "video.asset.ready";
      const playbackId = data.playback_ids?.[0]?.id || null;
      const duration = typeof data.duration === "number" ? Math.round(data.duration) : null;
      const error = ready ? null : data.errors?.messages?.join(" ") || "Mux could not process this file.";
      const passthrough = typeof data.passthrough === "string" && /^[a-f0-9-]{36}$/i.test(data.passthrough) ? data.passthrough : null;
      await db.update(muxUploads).set({
        status: ready ? "ready" : "errored",
        assetId: data.id,
        ...(playbackId ? { playbackId } : {}),
        ...(duration ? { durationSeconds: duration } : {}),
        error,
        updatedAt: new Date(),
      }).where(passthrough ? eq(muxUploads.id, passthrough) : eq(muxUploads.assetId, data.id));
      await db.update(videos).set({
        muxStatus: ready ? "ready" : "errored",
        muxAssetId: data.id,
        ...(playbackId ? { muxPlaybackId: playbackId } : {}),
        muxError: error,
        ...(ready && duration ? { durationSeconds: duration, duration: formatMuxDuration(duration) } : {}),
      }).where(passthrough ? eq(videos.muxUploadId, passthrough) : eq(videos.muxAssetId, data.id));
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Mux webhook handling failed:", error instanceof Error ? error.message : "unknown");
    // A non-2xx response makes Mux retry so a transient database failure is not lost.
    return NextResponse.json({ error: "Retry later." }, { status: 500 });
  }
}
