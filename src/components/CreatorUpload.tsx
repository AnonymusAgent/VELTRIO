"use client";
import { useState } from "react";
import Link from "next/link";
import { CHUNK_SIZE, MAX_VIDEO_BYTES } from "@/lib/admin-shared";
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
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_VIDEO_BYTES) { setMessage("Choose a video up to 2 GB."); return; }
    setBusy(true); setMessage(""); setSlug("");
    let id: string | null = null;
    try {
      const info = await inspectVideo(file);
      const start = await result(await fetch("/api/creator/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, size: file.size, kind: "video" }) }));
      id = start.id;
      for (let offset = 0; offset < file.size;) {
        const chunk = file.slice(offset, offset + CHUNK_SIZE);
        const next = await result(await fetch(`/api/creator/uploads/${id}?offset=${offset}`, { method: "PUT", body: chunk }));
        offset = next.received;
        setProgress(Math.round(offset / file.size * 100));
      }
      await result(await fetch(`/api/creator/uploads/${id}`, { method: "POST" }));
      const saved = await result(await fetch("/api/creator/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: form.get("title"), description: form.get("description"), categorySlug: form.get("categorySlug"), status: form.get("status"), rightsConfirmed: form.get("rightsConfirmed") === "on", mediaAssetId: id, durationSeconds: info.duration }) }));
      setSlug(saved.slug); setPublished(form.get("status") === "published"); setMessage("Your video has been saved."); id = null;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
      if (id) await fetch(`/api/creator/uploads/${id}`, { method: "DELETE" }).catch(() => {});
    } finally { setBusy(false); }
  }
  const input = "mt-2 block w-full rounded border border-white/10 bg-black/30 p-3 text-white";
  return <div className="vh-panel p-6"><h1 className="text-2xl text-white">Upload your story</h1><p className="mt-2 text-sm text-zinc-400">MP4 or WebM, up to 2 GB. Only upload content you have the right to share.</p><form onSubmit={submit} className="mt-6 space-y-4"><label className="block text-sm">Video<input className={input} type="file" name="file" accept=".mp4,.webm,video/mp4,video/webm" required disabled={busy} /></label><label className="block text-sm">Title<input className={input} name="title" minLength={3} maxLength={160} required disabled={busy} /></label><label className="block text-sm">Description<textarea className={input} name="description" maxLength={5000} disabled={busy} /></label><label className="block text-sm">Category<select className={input} name="categorySlug" disabled={busy}>{CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label><label className="block text-sm">Visibility<select className={input} name="status" disabled={busy}><option value="draft">Draft</option><option value="published">Published</option></select></label><label className="flex gap-2 text-sm"><input type="checkbox" name="rightsConfirmed" /> I have the rights to upload this video and it meets the content guidelines.</label><button className="vh-button" disabled={busy}>{busy ? `Uploading ${progress}%` : "Save video"}</button>{message && <p role="status" className="text-sm text-[#b9b2ff]">{message} {slug && published && <Link className="underline" href={`/video/${slug}`}>View published video</Link>}</p>}</form></div>;
}
