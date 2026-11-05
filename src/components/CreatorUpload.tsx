"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createUpload, type UpChunk } from "@mux/upchunk";
import { CheckCircle2, CloudUpload, FileVideo, LoaderCircle, Pause, Play, RotateCcw, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { CATEGORIES } from "@/lib/data";

const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
const ACCEPTED = ".mp4,.mov,.m4v,video/mp4,video/quicktime,video/x-m4v";

async function json(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

type Phase = "idle" | "uploading" | "paused" | "processing" | "ready" | "error";
type UploadRow = { id: string; status: string; durationSeconds?: number | null; error?: string | null; videoId?: number | null };

export default function CreatorUpload({ signedPlayback }: { signedPlayback?: boolean }) {
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadId, setUploadId] = useState("");
  const [uploadRow, setUploadRow] = useState<UploadRow | null>(null);
  const [slug, setSlug] = useState("");
  const [published, setPublished] = useState(false);
  const [publishedFlag, setPublishedFlag] = useState("draft");
  const uploader = useRef<UpChunk | null>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { uploader.current?.abort(); if (pollTimer.current) clearTimeout(pollTimer.current); }, []);

  const pickFile = (next: File | null) => {
    setError(""); setMessage("");
    if (!next) return;
    if (next.size > MAX_VIDEO_BYTES) { setError("Choose a video up to 2 GB."); return; }
    if (!/\.(mp4|mov|m4v)$/i.test(next.name)) { setError("Use an MP4 or MOV file. H.264 video with AAC audio processes fastest."); return; }
    setFile(next);
    if (phase !== "uploading") { setPhase("idle"); setProgress(0); }
  };

  const startUpload = useCallback(async () => {
    if (!file || phase === "uploading") return;
    setError(""); setMessage(""); setProgress(0); setPhase("uploading");
    try {
      const start = await json(await fetch("/api/mux/uploads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ size: file.size, title: file.name.replace(/\.[^.]+$/, "") }) }));
      setUploadId(start.id);
      const up = createUpload({ endpoint: start.url, file, chunkSize: 5120, attempts: 4, dynamicChunkSize: true });
      uploader.current = up;
      up.on("progress", (event: CustomEvent<{ progress: number }>) => setProgress(Math.min(99, Math.round(event.detail.progress))));
      up.on("error", () => { setPhase("error"); setError("The upload was interrupted. Your progress is kept — press Resume to continue from where it stopped."); });
      up.on("success", () => {
        setProgress(100);
        setPhase("processing");
        void poll(start.id);
      });
    } catch (uploadError) {
      setPhase("error");
      setError(uploadError instanceof Error ? uploadError.message : "Upload could not start.");
    }
  }, [file, phase]);

  async function poll(id: string) {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    try {
      const row: UploadRow = await json(await fetch(`/api/mux/uploads/${id}`, { cache: "no-store" }));
      setUploadRow(row);
      if (row.status === "ready") { setPhase("ready"); return; }
      if (row.status === "errored" || row.status === "cancelled") { setPhase("error"); setError(row.error || "Mux could not process this video."); return; }
      setPhase("processing");
      pollTimer.current = setTimeout(() => void poll(id), 4000);
    } catch {
      pollTimer.current = setTimeout(() => void poll(id), 8000);
    }
  }

  function pause() { uploader.current?.pause(); setPhase("paused"); }
  function resume() { if (!uploader.current) { void startUpload(); return; } uploader.current.resume(); setPhase("uploading"); }
  function abort() { uploader.current?.abort(); uploader.current = null; if (uploadId) fetch(`/api/mux/uploads/${uploadId}`, { method: "DELETE" }).catch(() => {}); setPhase("idle"); setProgress(0); setFile(null); setUploadId(""); setUploadRow(null); }
  function reset() { abort(); setError(""); setMessage(""); setSlug(""); setPublishedFlag("draft"); }

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const status = String(form.get("status") || "draft");
    if (status === "published" && form.get("rightsConfirmed") !== "on") { setError("Confirm you own or are licensed to publish this video before publishing."); return; }
    setMessage(""); setError(""); setPhase("processing");
    try {
      const saved = await json(await fetch("/api/mux/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        uploadId,
        title: form.get("title"), description: form.get("description"), categorySlug: form.get("categorySlug"),
        status, rightsConfirmed: form.get("rightsConfirmed") === "on",
      }) }));
      setSlug(saved.slug); setPublished(status === "published"); setPublishedFlag(status); setMessage(saved.created ? "Your video is live on VELTRIO." : "Video details updated.");
      setPhase("ready");
    } catch (publishError) { setPhase("ready"); setError(publishError instanceof Error ? publishError.message : "Could not save your video."); }
  }

  const busy = phase === "uploading";
  const done = phase === "processing" || phase === "ready";
  const input = "vh-field";

  return <div className="studio-upload">
    <section className="studio-upload-stage">
      <div className="studio-upload-head">
        <div>
          <span className="section-kicker">STREAMING UPLOAD</span>
          <h1>Upload your story<span className="accent-dot">.</span></h1>
          <p>Upload straight to VELTRIO streaming. Your video is processed into adaptive quality — up to 1080p — and plays instantly on every device.</p>
        </div>
        <span className="studio-pill"><Sparkles size={13} /> Mux streaming{signedPlayback ? " · signed" : ""}</span>
      </div>

      {!file && <div
        className={`upload-drop ${dragging ? "is-dragging" : ""}`}
        onDragEnter={event => { event.preventDefault(); dragDepth.current++; setDragging(true); }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={() => { dragDepth.current = Math.max(0, dragDepth.current - 1); if (!dragDepth.current) setDragging(false); }}
        onDrop={event => { event.preventDefault(); dragDepth.current = 0; setDragging(false); const dropped = event.dataTransfer.files?.[0]; if (dropped) pickFile(dropped); }}
      >
        <div className="upload-drop-art"><CloudUpload size={30} strokeWidth={1.4} /></div>
        <strong>Drag a video here</strong>
        <span>MP4 or MOV · up to 2 GB · resumable</span>
        <label className="vh-button">Choose a file<input type="file" accept={ACCEPTED} className="sr-only" onChange={event => pickFile(event.target.files?.[0] || null)} disabled={busy} /></label>
      </div>}

      {file && <div className="upload-file-card">
        <span className="upload-file-icon"><FileVideo size={20} /></span>
        <div className="upload-file-copy">
          <strong>{file.name}</strong>
          <span>{(file.size / 1024 ** 2).toFixed(1)} MB · {phase === "processing" ? "Processing on Mux" : phase === "ready" ? "Ready" : phase === "paused" ? "Paused" : phase === "error" ? "Needs attention" : phase === "uploading" ? "Uploading" : "Ready to upload"}</span>
          <div className="upload-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Upload progress"><span style={{ width: `${phase === "processing" || phase === "ready" ? 100 : progress}%` }} /></div>
        </div>
        <span className="upload-percent">{phase === "processing" || phase === "ready" ? <LoaderCircle size={16} className="spin" /> : `${progress}%`}</span>
        {!busy && phase !== "processing" && phase !== "ready" && <div className="upload-controls">
          {phase === "paused" || phase === "error" ? <button type="button" className="vh-button small" onClick={resume}><Play size={13} /> Resume</button> : <button type="button" className="vh-button small" onClick={startUpload} disabled={!file}><CloudUpload size={13} /> {phase === "idle" ? "Start upload" : "Upload"}</button>}
          {busy && <button type="button" className="vh-button secondary small" onClick={pause}><Pause size={13} /> Pause</button>}
          <button type="button" className="vh-button secondary small" onClick={reset}><RotateCcw size={13} /> Reset</button>
        </div>}
        {busy && <div className="upload-controls"><button type="button" className="vh-button secondary small" onClick={pause}><Pause size={13} /> Pause</button></div>}
      </div>}

      {error && <p className="studio-alert" role="alert"><XCircle size={15} /> {error}</p>}

      {(phase === "processing" || phase === "ready") && <form className="upload-details" onSubmit={publish}>
        <div className="upload-details-head">
          <span className={`status-badge ${phase === "ready" ? "published" : "draft"}`}>{phase === "ready" ? "Processed" : "Processing…"}</span>
          <p>{phase === "processing" ? "Mux is building your adaptive stream. You can fill in the details while it finishes." : "Your video is ready. Save a draft or publish it to the library."}</p>
        </div>
        <div className="field-grid">
          <label className="upload-field"><span className="vh-label">Title *</span><input className={input} name="title" required minLength={3} maxLength={160} defaultValue={file?.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ")} /></label>
          <label className="upload-field"><span className="vh-label">Category *</span><select className={input} name="categorySlug" defaultValue={CATEGORIES[0].slug}>{CATEGORIES.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
        </div>
        <label className="upload-field"><span className="vh-label">Description</span><textarea className={input} name="description" rows={4} maxLength={5000} placeholder="Tell viewers what this story is about." /></label>
        <div className="field-grid">
          <label className="upload-field"><span className="vh-label">Visibility</span><select className={input} name="status" defaultValue="published"><option value="published">Published</option><option value="draft">Draft — only you</option></select></label>
          <label className="upload-check"><input type="checkbox" name="rightsConfirmed" defaultChecked /><span>I own this video or have the rights to publish it, and it follows the content guidelines.</span></label>
        </div>
        <div className="upload-details-actions">
          <button className="vh-button" type="submit" disabled={phase !== "ready"}>{phase === "ready" ? "Save video" : <><LoaderCircle size={14} className="spin" /> Waiting for processing…</>}</button>
          {phase !== "ready" && <button type="button" className="vh-button secondary" onClick={() => void poll(uploadId)}>Check status</button>}
        </div>
      </form>}

      {message && <div className="upload-success" role="status"><CheckCircle2 size={26} /><div><strong>{message}</strong><p>{published ? "Your audience can watch it now." : "It is saved as a draft in your studio."}</p><div className="upload-success-links">{slug && published && <Link className="vh-button small" href={`/video/${slug}`}>Watch video</Link>}{slug && !published && <Link className="vh-button small secondary" href="/studio">Open studio</Link>}<Link className="vh-button secondary small" href="/studio">Back to studio</Link></div></div></div>}
    </section>

    <aside className="studio-upload-aside">
      <div className="studio-note"><ShieldCheck size={17} /><div><strong>Direct, resumable upload</strong><p>Video bytes go straight to the streaming provider — not through this site — so large files survive slow connections and can resume after a pause.</p></div></div>
      <div className="studio-note"><Sparkles size={17} /><div><strong>Adaptive quality</strong><p>Each video is transcoded into an adaptive-quality stream that switches with the viewer&apos;s connection. 4K is opt-in on the project.</p></div></div>
      <div className="studio-note"><FileVideo size={17} /><div><strong>Best results</strong><p>MP4 (H.264 + AAC) is the most compatible source. Processing usually takes a few minutes for short videos.</p></div></div>
      {publishedFlag === "published" && slug && <Link className="studio-aside-link" href={`/video/${slug}`}>View your published video →</Link>}
    </aside>
  </div>;
}
