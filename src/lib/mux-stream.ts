// Server-only orchestration for the Mux streaming pipeline. All provider calls
// happen here so routes only deal with authorization and HTTP concerns.
import { randomUUID, randomBytes } from "node:crypto";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { muxUploads, videos } from "@/db/schema";
import { HttpError } from "./http";
import { canSignPlayback, createMuxClient, createMuxDirectUpload, formatMuxDuration, muxConfig, pickPlaybackId, playbackPolicies, signPlaybackToken, type MuxConfig } from "./mux-server";
import { DEFAULT_THUMBNAIL } from "./video-store";

export const MUX_MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024;
export const MUX_FREE_UPLOAD_BYTES = 4 * 1024 * 1024 * 1024;
export const MUX_MAX_ACTIVE_UPLOADS = 3;

export type MuxUploadRecord = typeof muxUploads.$inferSelect;

/** Returns the config only when credentials exist. Never throws for the UI. */
export function muxReady(): MuxConfig | null {
  try { return muxConfig(); } catch { return null; }
}

export function isMuxEnabled() {
  return !!muxReady();
}

export function muxClient() {
  const config = muxReady();
  if (!config) throw new HttpError(503, "Video streaming is not configured yet.");
  return { config, client: createMuxClient(config) };
}

/** Where Mux serves playable streams. Overridable so tests never hit production. */
export function streamBaseUrl() {
  return (process.env.MUX_STREAM_BASE_URL || "https://stream.mux.com").replace(/\/+$/, "");
}

export async function assertMuxQuota(userId: string, incomingBytes: number) {
  const [row] = await db.select({ total: sql<number>`coalesce(sum(${muxUploads.size}), 0)`, active: sql<number>`count(*) filter (where ${muxUploads.status} in ('waiting','created'))` })
    .from(muxUploads).where(eq(muxUploads.ownerUserId, userId));
  const total = Number(row?.total || 0), active = Number(row?.active || 0);
  if (active >= MUX_MAX_ACTIVE_UPLOADS) throw new HttpError(429, `You already have ${active} uploads in progress. Finish or wait for one to complete.`);
  const limit = Math.max(1, Number(process.env.UPLOAD_STORAGE_GB || 10)) * 1024 ** 3;
  if (total + incomingBytes > limit) throw new HttpError(413, "Your storage allowance is full. Delete an older video to free space.");
}

/**
 * Reserve a database row, then request one Mux direct upload URL. The row comes
 * first so a crash or a slow provider can never orphan a billable session.
 */
export async function startMuxUpload(userId: string, size: number, title?: string) {
  const { config, client } = muxClient();
  await assertMuxQuota(userId, size);
  const id = randomUUID();
  await db.insert(muxUploads).values({ id, ownerUserId: userId, status: "created", size, title: title?.slice(0, 300) || null });
  try {
    const upload = await createMuxDirectUpload(client, config, id);
    if (!upload?.url) throw new Error("Mux did not return an upload URL.");
    await db.update(muxUploads).set({ uploadId: upload.id, status: "waiting", updatedAt: new Date() }).where(eq(muxUploads.id, id));
    return { id, uploadId: upload.id, url: upload.url, expiresAt: new Date(Date.now() + (upload.timeout || 3600) * 1000).toISOString(), resumable: true as const };
  } catch (error) {
    await db.delete(muxUploads).where(eq(muxUploads.id, id));
    throw error;
  }
}

export async function ownedMuxUpload(id: string, userId: string) {
  if (!/^[a-f0-9-]{36}$/i.test(id)) throw new HttpError(400, "Invalid upload.");
  const [row] = await db.select().from(muxUploads).where(and(eq(muxUploads.id, id), eq(muxUploads.ownerUserId, userId))).limit(1);
  if (!row) throw new HttpError(404, "Upload not found.");
  return row;
}

type ProviderState = { status: string; assetId: string | null; playbackId: string | null; duration?: number; errors?: string | null; maxResolution?: string | null };

/** Poll the provider and persist the latest authoritative state. */
export async function syncMuxUpload(row: MuxUploadRecord): Promise<MuxUploadRecord> {
  if (row.status === "ready" || row.status === "errored" || row.status === "cancelled") return row;
  if (!row.uploadId) return row;
  const { client } = muxClient();
  const state: ProviderState = { status: row.status, assetId: row.assetId, playbackId: row.playbackId };
  try {
    const upload = await client.video.uploads.retrieve(row.uploadId);
    if (upload.status === "cancelled" || upload.status === "timed_out") state.status = upload.status === "cancelled" ? "cancelled" : "errored";
    else if (upload.status === "errored") { state.status = "errored"; state.errors = upload.error?.message || "The upload failed during processing."; }
    if (upload.asset_id) state.assetId = upload.asset_id;
    if (upload.asset_id) {
      const asset = await client.video.assets.retrieve(upload.asset_id);
      if (asset.status === "ready") {
        state.status = "ready";
        state.duration = asset.duration;
        state.maxResolution = asset.max_resolution_tier;
        state.playbackId = pickPlaybackId(asset, playbackPolicies(muxReady()!).includes("signed") ? "signed" : "public");
      } else if (asset.status === "errored") {
        state.status = "errored";
        state.errors = asset.errors?.messages?.join(" ") || "Mux could not process this file. Try a standard MP4 with H.264/AAC audio.";
      } else {
        state.status = "processing";
      }
    }
  } catch (error) {
    // Transient network/provider failures keep the previous state; the client
    // retries, and the webhook or cleanup job reconciles anything abandoned.
    if (error instanceof HttpError) throw error;
    return row;
  }
  const [updated] = await db.update(muxUploads).set({
    status: state.status,
    assetId: state.assetId,
    playbackId: state.playbackId,
    durationSeconds: state.duration ? Math.round(state.duration) : row.durationSeconds,
    error: state.errors ?? row.error,
    updatedAt: new Date(),
  }).where(eq(muxUploads.id, row.id)).returning();
  if (state.assetId && (state.status === "ready" || state.status === "errored")) {
    await db.update(videos).set({
      muxStatus: state.status,
      muxAssetId: state.assetId,
      muxPlaybackId: state.playbackId,
      muxError: state.errors ?? null,
      ...(state.status === "ready" && state.duration ? { durationSeconds: Math.round(state.duration), duration: formatMuxDuration(state.duration) } : {}),
    }).where(and(eq(videos.muxUploadId, row.id), ne(videos.status, "deleted")));
  }
  return updated || row;
}

export function muxUploadView(row: MuxUploadRecord) {
  return {
    id: row.id,
    status: row.status,
    uploadId: row.uploadId,
    assetId: row.assetId,
    size: row.size,
    durationSeconds: row.durationSeconds,
    error: row.error,
    videoId: row.videoId,
  };
}

export type PublishDetails = { title: string; description: string; categorySlug: string; categoryName: string; status: string; rightsConfirmed: boolean; isFeatured?: boolean };

/**
 * Attach a finished Mux asset to a video row. Re-publishing the same upload
 * updates the existing row instead of creating duplicates.
 */
export async function publishMuxVideo(user: { id: string; name?: string | null }, uploadId: string, details: PublishDetails) {
  const row = await ownedMuxUpload(uploadId, user.id);
  const synced = await syncMuxUpload(row);
  if (synced.status === "errored" || synced.status === "cancelled") throw new HttpError(409, synced.error || "This upload failed and cannot be published. Start a new upload.");
  if (synced.status !== "ready" || !synced.assetId || !synced.playbackId) throw new HttpError(409, "Your video is still processing. Try again in a moment.");
  if (synced.videoId) {
    const [existing] = await db.select({ slug: videos.slug }).from(videos).where(eq(videos.id, synced.videoId)).limit(1);
    if (existing) {
      await db.update(videos).set({ ...details, muxStatus: "ready", muxPlaybackId: synced.playbackId, muxAssetId: synced.assetId, muxError: null, ...(details.status === "published" ? { publishedAt: new Date() } : {}) }).where(eq(videos.id, synced.videoId));
      return { slug: existing.slug, created: false };
    }
  }
  const stem = details.title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 120) || "video";
  const slug = `${stem}-${randomBytes(4).toString("hex")}`;
  const durationSeconds = synced.durationSeconds || null;
  const [created] = await db.insert(videos).values({
    ...details,
    ownerUserId: user.id,
    slug,
    sourceType: "upload",
    muxUploadId: synced.id,
    muxAssetId: synced.assetId,
    muxPlaybackId: synced.playbackId,
    muxStatus: "ready",
    muxMaxResolution: synced.durationSeconds ? muxReady()?.maxResolution || null : null,
    videoUrl: `/api/mux/playback/${slug}`,
    thumbnail: `/api/mux/thumb/${slug}`,
    duration: formatMuxDuration(durationSeconds),
    durationSeconds,
    fileSize: synced.size,
    mimeType: "video/mp4",
    creator: (user.name || "Creator").slice(0, 160),
    creatorAvatar: "/icon.svg",
    publishedAt: details.status === "published" ? new Date() : null,
    isFeatured: false,
  }).returning({ id: videos.id, slug: videos.slug });
  await db.update(muxUploads).set({ videoId: created.id, status: "ready", updatedAt: new Date() }).where(eq(muxUploads.id, synced.id));
  return { slug: created.slug, created: true };
}

/** Signed (or public) playback URL for one playback ID. */
/**
 * Deletes the Mux asset behind a soft-deleted video. Best effort: a failure
 * here leaves an orphaned (billable) asset, so it is logged for the cleanup
 * script rather than surfaced to the creator who just deleted their video.
 * Ownership is re-checked so a shared asset referenced by a live video stays.
 */
export async function deleteMuxAsset(video: { muxAssetId: string | null; muxPlaybackId: string | null }) {
  const config = muxReady();
  if (!config || !video.muxAssetId) return false;
  const [referenced] = await db.select({ id: videos.id }).from(videos).where(and(eq(videos.muxAssetId, video.muxAssetId), ne(videos.status, "deleted"))).limit(1);
  if (referenced) return false;
  try {
    const { client } = muxClient();
    await client.video.assets.delete(video.muxAssetId);
    return true;
  } catch (error) {
    console.warn(`Mux asset ${video.muxAssetId} was not deleted:`, error instanceof Error ? error.message : error);
    return false;
  }
}

export function muxStreamUrl(config: MuxConfig, playbackId: string, audience: "t" | "g" = "t", expiresIn = 60 * 60 * 4) {
  if (canSignPlayback(config)) {
    const token = signPlaybackToken(config, { playbackId, audience, expiresIn });
    return { url: `${streamBaseUrl()}/${playbackId}.m3u8?token=${encodeURIComponent(token)}`, token, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
  }
  return { url: `${streamBaseUrl()}/${playbackId}.m3u8`, token: null, expiresAt: null };
}

/** Poster image URL. Signed thumbnails need a fresh token each render. */
export function muxThumbnailUrl(config: MuxConfig, playbackId: string, options: { width?: number; time?: number } = {}) {
  const query = new URLSearchParams({ width: String(options.width || 1280) });
  if (options.time) query.set("time", String(Math.round(options.time)));
  if (canSignPlayback(config)) {
    const token = signPlaybackToken(config, { playbackId, audience: "t", expiresIn: 60 * 60 * 6, thumbnailTime: options.time });
    query.set("token", token);
  }
  return `${(process.env.MUX_IMAGE_BASE_URL || "https://image.mux.com").replace(/\/+$/, "")}/${playbackId}/thumbnail.jpg?${query}`;
}

export function publicMuxPoster(playbackId: string, time?: number) {
  const config = muxReady();
  if (!config) return DEFAULT_THUMBNAIL;
  return muxThumbnailUrl(config, playbackId, { width: 1280, time });
}
