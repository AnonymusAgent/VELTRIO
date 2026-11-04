"use client";
import { CHUNK_SIZE } from "./admin-shared";

function key(file: File, kind: string) { return `vh-upload:${kind}:${file.name}:${file.size}:${file.lastModified}`; }
async function responseData(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `Upload failed (${response.status}). Please retry.`);
  return body;
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
