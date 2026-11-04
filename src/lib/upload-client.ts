"use client";
import { upload as uploadBlob } from "@vercel/blob/client";
import { CHUNK_SIZE } from "./admin-shared";

function key(file: File, kind: string) { return `vh-upload:${kind}:${file.name}:${file.size}:${file.lastModified}`; }
async function responseData(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Upload failed (${response.status}). Please retry.`);
  return body;
}

export async function getStorageProvider(signal?: AbortSignal): Promise<"local" | "vercel_blob"> {
  const data = await responseData(await fetch("/api/admin/storage-provider", { signal }));
  return data.provider === "vercel_blob" ? "vercel_blob" : "local";
}

export async function uploadBlobFile(file: File, kind: "video" | "thumbnail", onProgress: (received: number) => void, signal?: AbortSignal) {
  let existingId: string | null = null;
  try { existingId = sessionStorage.getItem(key(file, kind)); } catch {}
  if (existingId) {
    const existing = await fetch(`/api/admin/uploads/${existingId}`, { signal });
    if (existing.ok) {
      const info = await responseData(existing);
      if (info.status === "ready") { onProgress(file.size); return existingId; }
    }
    forgetUpload(file, kind);
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^[-.]+|[-.]+$/g, "") || `${kind}.bin`;
  const contentType = file.type || (kind === "video" ? (/\.webm$/i.test(file.name) ? "video/webm" : "video/mp4") : (/\.png$/i.test(file.name) ? "image/png" : /\.webp$/i.test(file.name) ? "image/webp" : "image/jpeg"));
  const blob = await uploadBlob(`veltrio/${kind}/${safeName}`, file, {
    access: "public",
    handleUploadUrl: "/api/admin/blob-upload",
    clientPayload: JSON.stringify({ filename: file.name, size: file.size, kind }),
    contentType,
    multipart: kind === "video" && file.size > 8 * 1024 * 1024,
    abortSignal: signal,
    onUploadProgress: progress => onProgress(progress.loaded),
  });
  const info = await responseData(await fetch("/api/admin/blob-assets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: blob.url, filename: file.name, kind }),
  }));
  try { sessionStorage.setItem(key(file, kind), info.id); } catch {}
  onProgress(file.size);
  return info.id as string;
}

export function forgetUpload(file: File, kind: string) {
  try { sessionStorage.removeItem(key(file, kind)); } catch {}
}
export async function discardUpload(file: File, kind: string) {
  let id: string | null = null;
  try { id = sessionStorage.getItem(key(file, kind)); } catch {}
  if (id) await fetch(`/api/admin/uploads/${id}`, { method: "DELETE" });
  forgetUpload(file, kind);
}
export async function uploadFile(file: File, kind: "video" | "thumbnail", onProgress: (received: number) => void, signal?: AbortSignal) {
  let id: string | null = null;
  let received = 0;
  try { id = sessionStorage.getItem(key(file, kind)); } catch {}
  if (id) {
    const response = await fetch(`/api/admin/uploads/${id}`, { signal });
    if (response.status === 404) { id = null; forgetUpload(file, kind); }
    else {
      const info = await responseData(response);
      received = info.received;
      if (info.status === "ready") { onProgress(file.size); return id; }
    }
  }
  if (!id) {
    const info = await responseData(await fetch("/api/admin/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, size: file.size, kind }), signal }));
    id = info.id as string;
    try { sessionStorage.setItem(key(file, kind), id); } catch {}
  }
  onProgress(received);
  let retries = 0;
  while (received < file.size) {
    if (signal?.aborted) throw new DOMException("Upload paused", "AbortError");
    try {
      const result = await responseData(await fetch(`/api/admin/uploads/${id}?offset=${received}`, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: file.slice(received, received + CHUNK_SIZE), signal }));
      received = result.received;
      onProgress(received);
      retries = 0;
    } catch (error) {
      if (signal?.aborted || retries >= 2) throw error;
      retries++;
      await new Promise(resolve => setTimeout(resolve, 700 * retries));
      const info = await responseData(await fetch(`/api/admin/uploads/${id}`, { signal }));
      received = info.received;
    }
  }
  await responseData(await fetch(`/api/admin/uploads/${id}`, { method: "POST", signal }));
  return id;
}

export async function inspectVideo(file: File): Promise<{ duration: number; thumbnail: File | null }> {
  return new Promise(resolve => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.muted = true; video.preload = "auto"; video.playsInline = true;
    let finished = false;
    const timeout = setTimeout(() => finish(0, null), 15000);
    function finish(duration: number, thumbnail: File | null) {
      if (finished) return; finished = true;
      clearTimeout(timeout); video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url);
      resolve({ duration: Number.isFinite(duration) ? duration : 0, thumbnail });
    }
    video.onerror = () => finish(0, null);
    video.onloadeddata = () => { video.currentTime = Math.min(1, video.duration * 0.2); };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = Math.min(video.videoWidth || 1280, 1280);
        canvas.height = Math.round(canvas.width * (video.videoHeight || 720) / (video.videoWidth || 1280));
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const duration = video.duration;
        canvas.toBlob(blob => finish(duration, blob ? new File([blob], "thumbnail.jpg", { type: "image/jpeg" }) : null), "image/jpeg", 0.85);
      } catch { finish(video.duration, null); }
    };
    video.src = url;
  });
}
