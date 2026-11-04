"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadCloud, FileVideo, ImagePlus, X, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2, Pause, LoaderCircle, CircleAlert, Clapperboard, HardDrive } from "lucide-react";
import { CATEGORIES } from "@/lib/data";
import { formatBytes, MAX_VIDEO_BYTES, MAX_IMAGE_BYTES } from "@/lib/admin-shared";
import { discardUpload, forgetUpload, getStorageProvider, inspectVideo, uploadBlobFile, uploadFile } from "@/lib/upload-client";

// One object URL per File, cached so renders stay pure and StrictMode-safe.
// URLs are released by the browser when the upload page is left.
const objectUrls = new WeakMap<File, string>();
const noSubscription = () => () => {};
function useObjectUrl(file: File | null) {
  return useSyncExternalStore(noSubscription, () => {
    if (!file) return "";
    let url = objectUrls.get(file);
    if (!url) { url = URL.createObjectURL(file); objectUrls.set(file, url); }
    return url;
  }, () => "");
}
export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(0);
  const [visibility, setVisibility] = useState("draft");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ slug: string; published: boolean } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const thumbInput = useRef<HTMLInputElement>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const videoUrl = useObjectUrl(file);
  const thumbnailUrl = useObjectUrl(thumbnail);
  const router = useRouter();

  useEffect(() => {
    if (!busy) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);
  useEffect(() => () => controller.current?.abort(), []);

  async function chooseFile(selected?: File) {
    if (!selected || busy) return;
    setError("");
    if (!/\.(mp4|webm)$/i.test(selected.name) || selected.size > MAX_VIDEO_BYTES || selected.size < 12) { setError("Choose an MP4 or WebM video, up to 2 GB."); return; }
    const current = ++generation.current;
    setFile(selected); setThumbnail(null); setDuration(0); setPaused(false); setProgress(0); setInspecting(true);
    setTitle(selected.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").slice(0, 160));
    const info = await inspectVideo(selected);
    if (current !== generation.current) return;
    setDuration(info.duration); setThumbnail(info.thumbnail); setInspecting(false);
  }
  function chooseThumbnail(selected?: File) {
    if (!selected) return;
    if (!/\.(jpe?g|png|webp)$/i.test(selected.name) || selected.size > MAX_IMAGE_BYTES) { setError("Use a JPG, PNG or WebP image under 10 MB."); return; }
    setThumbnail(selected); setError("");
  }
  async function removeFile() {
    generation.current++;
    if (file) await discardUpload(file, "video").catch(() => {});
    if (thumbnail) await discardUpload(thumbnail, "thumbnail").catch(() => {});
    setFile(null); setThumbnail(null); setTitle(""); setProgress(0); setPaused(false); setInspecting(false);
    if (fileInput.current) fileInput.current.value = "";
  }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) { setError("Select a video file first."); fileInput.current?.focus(); return; }
    const details = Object.fromEntries(new FormData(event.currentTarget));
    if (visibility === "published" && details.rightsConfirmed !== "on") { setError("Confirm publishing rights and content guidelines before publishing."); return; }
    setBusy(true); setError(""); setPaused(false); setStage("Uploading your video");
    controller.current = new AbortController();
    const signal = controller.current.signal;
    try {
      const provider = await getStorageProvider(signal);
      const uploader = provider === "vercel_blob" ? uploadBlobFile : uploadFile;
      const mediaAssetId = await uploader(file, "video", bytes => setProgress(bytes / file.size * 94), signal);
      let thumbnailAssetId: string | null = null;
      if (thumbnail) { setStage(provider === "vercel_blob" ? "Saving your thumbnail to durable storage" : "Saving your thumbnail"); thumbnailAssetId = await uploader(thumbnail, "thumbnail", bytes => setProgress(94 + bytes / thumbnail.size * 4), signal); }
      setStage(visibility === "published" ? "Publishing your story" : "Saving your draft");
      const response = await fetch("/api/admin/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...details, title, mediaAssetId, thumbnailAssetId, durationSeconds: duration, status: visibility, isFeatured: details.isFeatured === "on", rightsConfirmed: details.rightsConfirmed === "on" }), signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The video could not be saved.");
      forgetUpload(file, "video"); if (thumbnail) forgetUpload(thumbnail, "thumbnail");
      setProgress(100); setResult({ slug: data.slug, published: visibility === "published" }); router.refresh();
    } catch (err) {
      if (signal.aborted) { setPaused(true); setStage("Upload paused — your progress is saved"); }
      else { setError(err instanceof Error ? err.message : "The upload was interrupted. Retry to resume."); setPaused(true); }
    } finally { setBusy(false); }
  }
  if (result) return <div className="vh-panel upload-success"><div className="success-icon"><CheckCircle2 size={30} /></div><span className="eyebrow text-[#86b49a]">A NEW CHAPTER</span><h2 className="mt-3">{result.published ? "Your story is live." : "Your story is taking shape."}</h2><p>{result.published ? "Your video is published on VELTRIO. It is ready to watch, discover and share." : "Your video is safely saved as a private draft. Find it in the library whenever you’re ready to publish."}</p><div className="buttons">{result.published && <Link href={`/video/${result.slug}`} className="vh-button">Watch your video <ArrowRight size={15} /></Link>}<Link href="/admin/videos" className="vh-button secondary">Go to video library</Link><button className="vh-button ghost" onClick={() => { setResult(null); setFile(null); setThumbnail(null); setTitle(""); setProgress(0); setVisibility("draft"); }}>Upload another</button></div></div>;
  return <><div className="admin-page-heading"><div><h1>Give your story a home<span className="text-[#a99bff]">.</span></h1><p>Upload directly from your device. You&apos;re in control of when it goes live.</p></div><Link href="/admin/videos" className="text-[11px] text-zinc-500 hover:text-white"><span className="flex items-center gap-2"><ArrowLeft size={13} /> Back to library</span></Link></div><form onSubmit={submit}><div className="upload-layout"><div className="upload-main"><section className="vh-panel"><div className="panel-heading"><h2 className="flex items-center gap-2"><span className="step-number !h-5 !w-5 !text-[9px]">1</span> The video</h2><span className="text-[9px] text-zinc-600">MAX. 2 GB</span></div><div className="upload-panel-body"><input ref={fileInput} type="file" accept="video/mp4,video/webm,.mp4,.webm" className="sr-only" aria-label="Choose video file" disabled={busy} onChange={e => chooseFile(e.target.files?.[0])} />{!file ? <div className={`upload-dropzone ${dragging ? "dragging" : ""}`} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files[0]); }}><div><span className="drop-icon"><UploadCloud size={27} strokeWidth={1.5} /></span><h3>Drop your next great story here.</h3><p>Drag and drop your video, or browse your files.</p><button type="button" className="vh-button secondary small" onClick={() => fileInput.current?.click()}>Choose a video <ArrowRight size={13} /></button><p className="!text-[9px]">MP4 or WebM &nbsp; · &nbsp; Up to 2 GB &nbsp; · &nbsp; Direct upload</p></div></div> : <><div className="upload-file"><FileVideo size={27} /><div><strong>{file.name}</strong><small>{formatBytes(file.size)} · {duration ? `${Math.floor(duration / 60)}m ${Math.floor(duration % 60)}s` : inspecting ? "Reading video information…" : "Video selected"}</small></div><button type="button" className="icon-button" onClick={removeFile} disabled={busy} aria-label="Remove selected video"><X size={15} /></button></div><video key={videoUrl} src={videoUrl} poster={thumbnailUrl} controls playsInline preload="metadata" className="mt-4 max-h-[300px] w-full rounded-lg bg-black" /></>}{(busy || paused) && <div className="upload-progress mt-4" role="status"><div className="row"><span>{stage}</span><strong>{Math.round(progress)}%</strong></div><div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div><div className="flex justify-between gap-3 text-[9px] text-[#9b8cff]"><span>{paused ? "Press Resume below. After a reload, reselect the same file to continue." : "Keep this page open while your video uploads."}</span>{busy && <button type="button" onClick={() => controller.current?.abort()} className="flex shrink-0 items-center gap-1"><Pause size={10} /> Pause</button>}</div></div>}</div></section><section className="vh-panel"><div className="panel-heading"><h2 className="flex items-center gap-2"><span className="step-number !h-5 !w-5 !text-[9px]">2</span> The details</h2></div><div className="upload-panel-body upload-details"><div><label htmlFor="video-title" className="vh-label">Video title <span className="text-[#a99bff]">*</span></label><input id="video-title" className="vh-field" name="title" required minLength={3} maxLength={160} value={title} onChange={e => setTitle(e.target.value)} disabled={busy} placeholder="Give your story a great first impression" /><div className="field-help flex justify-between"><span>Keep it clear, memorable and true to your video.</span><span>{title.length}/160</span></div></div><div><label htmlFor="description" className="vh-label">Description</label><textarea id="description" name="description" className="vh-field" rows={4} disabled={busy} maxLength={5000} placeholder="What’s the story? Add a little context, credits or a reason to press play." /></div><div><label htmlFor="category" className="vh-label">Category <span className="text-[#a99bff]">*</span></label><select id="category" className="vh-field" name="categorySlug" disabled={busy}>{CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div><div><label className="vh-label">Thumbnail</label><div className="thumbnail-area"><div className="thumbnail-preview">{thumbnailUrl ? <img src={thumbnailUrl} alt="Video thumbnail preview" /> : inspecting ? <LoaderCircle className="animate-spin" size={23} /> : <ImagePlus size={28} strokeWidth={1.2} />}</div><div><p>{thumbnail ? "A first look that makes people stop scrolling. Use this frame or choose your own." : "We’ll capture a frame from your video, or you can upload custom artwork."}</p><input type="file" ref={thumbInput} accept="image/jpeg,image/png,image/webp" aria-label="Choose custom thumbnail" className="sr-only" onChange={e => chooseThumbnail(e.target.files?.[0])} disabled={busy || inspecting} /><button type="button" className="vh-button secondary small" disabled={busy || inspecting} onClick={() => thumbInput.current?.click()}><ImagePlus size={13} /> {thumbnail ? "Change thumbnail" : "Upload thumbnail"}</button><p className="!mt-2 !mb-0 !text-[9px]">JPG, PNG or WebP · 16:9 recommended · Max. 10 MB</p></div></div></div></div></section></div><aside><section className="vh-panel publish-options"><h3>Ready for the world?</h3>{[{ value: "draft", title: "Save as draft", text: "Only you can see it. Publish when you’re ready." }, { value: "published", title: "Publish now", text: "Make your video available on VELTRIO." }].map(option => <label key={option.value} className={`radio-option ${visibility === option.value ? "selected" : ""}`}><input type="radio" name="visibility" checked={visibility === option.value} disabled={busy} onChange={() => setVisibility(option.value)} /><span><b>{option.title}</b><small>{option.text}</small></span></label>)}<div className="publish-divider" /><label className="check-row"><input type="checkbox" name="isFeatured" disabled={busy} /><span>Feature this video in the homepage spotlight.</span></label><div className="publish-divider" /><label className="check-row"><input type="checkbox" name="rightsConfirmed" disabled={busy} required={visibility === "published"} /><span>I own this video or have permission to publish it, and it meets the <Link href="/terms" target="_blank" className="text-[#a99bff] underline">content guidelines</Link>. No adult or non-consensual content.</span></label>{error && <div className="form-message mt-4" role="alert"><CircleAlert size={14} className="mt-1 shrink-0" /><span>{error}</span></div>}<button type="submit" className="vh-button mt-6 w-full" disabled={busy || inspecting}>{busy ? <LoaderCircle size={15} className="animate-spin" /> : <UploadCloud size={15} />}{busy ? "Uploading…" : inspecting ? "Preparing thumbnail…" : paused ? "Resume upload" : visibility === "published" ? "Upload & publish" : "Upload & save draft"}</button><p className="mt-3 text-center text-[9px] text-zinc-600">Your files. Your website. No external links.</p></section><section className="vh-panel upload-tips"><h3 className="flex items-center gap-2"><Clapperboard size={15} className="text-[#a99bff]" /> A few finishing touches</h3><ul><li>Use H.264 video and AAC audio in an MP4 for the best browser compatibility.</li><li>A 1280 × 720 thumbnail looks great on every screen.</li><li>Write an original title and description to help viewers find your story.</li></ul><div className="mt-4 flex items-center gap-2 border-t border-zinc-800 pt-4 text-[9px] text-zinc-500"><HardDrive size={12} /> Files are stored in your configured storage provider with private draft access.</div></section><div className="mt-5 flex items-start gap-2 px-2 text-[9px] leading-5 text-zinc-600"><ShieldCheck size={14} className="mt-1 shrink-0" /> Drafts and unfinished uploads are private. Only published videos can be streamed publicly.</div></aside></div></form></>;
}
