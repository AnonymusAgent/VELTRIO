"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CHUNK_SIZE, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@/lib/admin-shared";
import { CATEGORIES } from "@/lib/data";
import { inspectVideo } from "@/lib/upload-client";

async function result(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Upload failed.");
  return data;
}
export default function CreatorUpload() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [slug, setSlug] = useState("");
  const [published, setPublished] = useState(false);
  const [storageMessage, setStorageMessage] = useState("");
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/creator/storage-status", { signal: controller.signal }).then(result).then(data => setStorageMessage(data.available ? "" : data.message)).catch(error => { if (error.name !== "AbortError") setStorageMessage("Could not check storage. Please try again later."); }).finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const file = form.get("file");
    const suppliedThumbnail = form.get("thumbnail");
    if (!(file instanceof File) || !file.size || file.size > MAX_VIDEO_BYTES) { setMessage("Choose a video up to 2 GB."); return; }
    if (suppliedThumbnail instanceof File && suppliedThumbnail.size && suppliedThumbnail.size > MAX_IMAGE_BYTES) { setMessage("Choose a thumbnail under 10 MB."); return; }
    if (form.get("status") === "published" && form.get("rightsConfirmed") !== "on") { setMessage("Confirm publishing rights before publishing."); return; }
    setBusy(true); setMessage(""); setSlug(""); setProgress(0);
    const ids: string[] = [];
    try {
      const info = await inspectVideo(file);
      const thumbnail = suppliedThumbnail instanceof File && suppliedThumbnail.size ? suppliedThumbnail : info.thumbnail;
      const total = file.size + (thumbnail?.size || 0);
      let completed = 0;
      async function upload(media: File, kind: "video" | "thumbnail") {
        const start = await result(await fetch("/api/creator/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: media.name, size: media.size, kind }) }));
        const id = String(start.id); ids.push(id);
        for (let offset = 0; offset < media.size;) {
          const next = await result(await fetch(`/api/creator/uploads/${id}?offset=${offset}`, { method: "PUT", body: media.slice(offset, offset + CHUNK_SIZE) }));
          offset = next.received;
          setProgress(Math.round((completed + offset) / total * 100));
        }
        await result(await fetch(`/api/creator/uploads/${id}`, { method: "POST" }));
        completed += media.size;
        return id;
      }
      const mediaAssetId = await upload(file, "video");
      const thumbnailAssetId = thumbnail ? await upload(thumbnail, "thumbnail") : null;
      const saved = await result(await fetch("/api/creator/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description"), categorySlug: form.get("categorySlug"), status: form.get("status"), rightsConfirmed: form.get("rightsConfirmed") === "on", mediaAssetId, thumbnailAssetId, durationSeconds: info.duration }) }));
      setSlug(saved.slug); setPublished(form.get("status") === "published"); setMessage("Your video has been saved."); ids.length = 0; formElement.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
      await Promise.all(ids.map(id => fetch(`/api/creator/uploads/${id}`, { method: "DELETE" }).catch(() => {})));
    } finally { setBusy(false); }
  }
  const input = "mt-2 block w-full rounded border border-white/10 bg-black/30 p-3 text-white";
  return <div className="vh-panel p-6"><h1 className="text-2xl text-white">Upload your story</h1><p className="mt-2 text-sm text-zinc-400">MP4 or WebM, up to 2 GB. Only upload content you have the right to share.</p>{storageMessage && <p role="alert" className="mt-4 text-sm text-amber-300">{storageMessage}</p>}<form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm">Video<input className={input} type="file" name="file" accept=".mp4,.webm,video/mp4,video/webm" required disabled={busy} /></label><label className="block text-sm">Thumbnail (optional)<input className={input} type="file" name="thumbnail" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={busy} /></label><label className="block text-sm">Title<input className={input} name="title" minLength={3} maxLength={160} required disabled={busy} /></label><label className="block text-sm">Description<textarea className={input} name="description" maxLength={5000} disabled={busy} /></label><label className="block text-sm">Category<select className={input} name="categorySlug" disabled={busy}>{CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label><label className="block text-sm">Visibility<select className={input} name="status" disabled={busy}><option value="draft">Draft</option><option value="published">Published</option></select></label><label className="flex gap-2 text-sm"><input type="checkbox" name="rightsConfirmed" disabled={busy} /> I have the rights to upload this video and it meets the content guidelines.</label><button className="vh-button" disabled={busy || checking || !!storageMessage}>{checking ? "Checking storage…" : busy ? `Uploading ${progress}%` : "Save video"}</button>{message && <p role="status" className="text-sm text-[#b9b2ff]">{message} {slug && published && <Link className="underline" href={`/video/${slug}`}>View published video</Link>} {slug && <Link className="underline" href="/studio">Go to your studio</Link>}</p>}</form></div>;
}
