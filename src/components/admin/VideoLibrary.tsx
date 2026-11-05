"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Film, Pencil, Trash2, Play, Eye, EyeOff, Star, X, LoaderCircle, CircleAlert, ArrowUpRight, CheckCircle2, ImagePlus } from "lucide-react";
import type { AdminVideo } from "@/lib/admin-shared";
import { formatBytes } from "@/lib/admin-shared";
import { CATEGORIES } from "@/lib/data";
import { getStorageProvider, uploadBlobFile, uploadFile, forgetUpload } from "@/lib/upload-client";
import AdminStreamPreview from "./AdminStreamPreview";

export default function VideoLibrary({ videos, initialEdit }: { videos: AdminVideo[]; initialEdit?: number }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [edit, setEdit] = useState<AdminVideo | null>(() => videos.find(v => v.id === initialEdit) || null);
  const [preview, setPreview] = useState<AdminVideo | null>(null);
  const [deleting, setDeleting] = useState<AdminVideo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [newThumb, setNewThumb] = useState<File | null>(null);
  const modal = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const modalOpen = Boolean(edit || preview || deleting);
  useEffect(() => {
    if (modalOpen) modal.current?.showModal(); else modal.current?.close();
  }, [modalOpen]);
  const list = videos.filter(v => (filter === "all" || v.status === filter) && `${v.title} ${v.categoryName}`.toLowerCase().includes(query.toLowerCase()));
  function close() { if (busy) return; setEdit(null); setPreview(null); setDeleting(null); setError(""); setNewThumb(null); }
  async function update(video: AdminVideo, changes: Record<string, unknown>) {
    const response = await fetch(`/api/admin/videos/${video.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(changes) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save changes.");
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!edit) return;
    setBusy(true); setError("");
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const provider = newThumb ? await getStorageProvider() : "local";
      const uploader = provider === "vercel_blob" ? uploadBlobFile : uploadFile;
      const thumbnailAssetId = newThumb ? await uploader(newThumb, "thumbnail", () => {}) : undefined;
      await update(edit, { ...fields, isFeatured: fields.isFeatured === "on", rightsConfirmed: fields.rightsConfirmed === "on", thumbnailAssetId });
      if (newThumb) forgetUpload(newThumb, "thumbnail");
      setEdit(null); setNewThumb(null); setNotice("Your video has been updated."); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Update failed."); } finally { setBusy(false); }
  }
  async function toggle(video: AdminVideo) {
    if (video.status !== "published" && !video.rightsConfirmed) { setEdit(video); return; }
    setBusy(true); setNotice(""); setError("");
    try { await update(video, { status: video.status === "published" ? "draft" : "published" }); setNotice(video.status === "published" ? "Moved to drafts. This video is no longer public." : "Your video is live on VELTRIO."); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Update failed."); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleting) return; setBusy(true); setError("");
    try { const response = await fetch(`/api/admin/videos/${deleting.id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not delete video."); setDeleting(null); setNotice("Video deleted. Its uploaded files have been removed."); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : "Delete failed."); } finally { setBusy(false); }
  }
  return <><div className="admin-page-heading"><div><h1>Your video library<span className="text-[#a99bff]">.</span></h1><p>Every story, every draft. Keep your collection in focus.</p></div><Link href="/admin/upload" className="vh-button"><Plus size={15} /> Upload video</Link></div>{notice && <div className="form-message success mb-5" role="status"><CheckCircle2 size={16} />{notice}</div>}{error && !modalOpen && <div className="form-message mb-5" role="alert"><CircleAlert size={16} />{error}</div>}<div className="library-toolbar"><label className="admin-search"><Search size={15} /><input placeholder="Search your videos…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search your videos" /></label><div className="library-filters">{[{ value: "all", label: "All videos" }, { value: "published", label: "Published" }, { value: "draft", label: "Drafts" }].map(f => <button key={f.value} onClick={() => setFilter(f.value)} className={filter === f.value ? "active" : ""}>{f.label} <span className="ml-1 text-[9px] opacity-60">{videos.filter(v => f.value === "all" || v.status === f.value).length}</span></button>)}</div></div><section className="vh-panel">{list.length ? <div className="table-scroll"><table className="admin-table"><thead><tr><th>Video</th><th>Visibility</th><th>Views</th><th>Date uploaded</th><th>Actions</th></tr></thead><tbody>{list.map(video => <tr key={video.id}><td><div className="table-title"><button className="shrink-0" onClick={() => setPreview(video)} aria-label={`Preview ${video.title}`}><img src={video.thumbnail} alt="" /></button><div><button className="text-left" onClick={() => { setEdit(video); setError(""); }}><strong>{video.title} {video.isFeatured && <Star size={10} className="ml-1 inline text-amber-500" />}</strong></button><small>{video.duration} · {formatBytes(video.fileSize)} · {video.categoryName}</small></div></div></td><td><span className={`status-badge ${video.status}`}>{video.status === "published" ? "Published" : "Draft"}</span></td><td>{video.views.toLocaleString()}</td><td>{new Date(video.createdAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</td><td><div className="table-actions"><button className="icon-button" aria-label={`Preview ${video.title}`} title="Preview" onClick={() => setPreview(video)}><Play size={13} /></button><button className="icon-button" aria-label={`Edit ${video.title}`} title="Edit details" onClick={() => { setEdit(video); setError(""); }}><Pencil size={13} /></button><button className="icon-button" disabled={busy} aria-label={video.status === "published" ? "Unpublish video" : "Publish video"} title={video.status === "published" ? "Unpublish" : "Publish"} onClick={() => toggle(video)}>{video.status === "published" ? <EyeOff size={14} /> : <Eye size={14} />}</button><button className="icon-button hover:!text-red-400" aria-label={`Delete ${video.title}`} title="Delete video" onClick={() => { setDeleting(video); setError(""); }}><Trash2 size={13} /></button></div></td></tr>)}</tbody></table></div> : <div className="empty-state !py-20"><div className="empty-icon"><Film size={28} /></div><h3>{query ? "No videos match that search." : filter === "all" ? "A blank canvas. A world of possibilities." : `No ${filter === "draft" ? "drafts" : "published videos"} yet.`}</h3><p>{query ? "Try another title or category." : "Add your first upload and start building a library that’s unmistakably yours."}</p><Link href="/admin/upload" className="vh-button secondary small"><Plus size={14} /> Upload a video</Link></div>}</section><p className="mt-4 text-[9px] text-zinc-600">{videos.length} videos · Only published videos appear on your website.</p><dialog ref={modal} onCancel={e => { e.preventDefault(); close(); }} className="admin-dialog" onClick={e => { if (e.target === modal.current) close(); }}>{modalOpen && <><div className="modal-title"><h2>{deleting ? "Delete this story?" : preview ? "Your video, in focus." : "The finishing touches."}</h2><button type="button" className="icon-button" onClick={close} disabled={busy} aria-label="Close dialog"><X size={16} /></button></div>{deleting ? <><div className="modal-body"><p className="text-sm text-zinc-300">“{deleting.title}” will be permanently removed.</p><p className="mt-3 text-xs leading-6 text-zinc-500">Its video and thumbnail files will be deleted from your configured storage provider. This cannot be undone. Download a backup first if you need one.</p>{error && <p className="form-message mt-4">{error}</p>}</div><div className="modal-actions"><button className="vh-button secondary" onClick={close} disabled={busy}>Keep video</button><button className="vh-button danger" onClick={remove} disabled={busy}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete permanently</button></div></> : preview ? <div className="modal-body">{preview.muxPlaybackId ? <AdminStreamPreview slug={preview.slug} title={preview.title} playbackId={preview.muxPlaybackId} poster={preview.thumbnail} /> : <video autoPlay controls playsInline preload="metadata" src={preview.videoUrl} poster={preview.thumbnail} className="aspect-video w-full rounded-lg bg-black" />}<h3 className="mt-4 text-xl">{preview.title}</h3><p className="mt-2 text-xs text-zinc-500">{preview.status === "published" ? "Published on VELTRIO" : "Private preview · Only visible to you"}</p>{preview.status === "published" && <Link href={`/video/${preview.slug}`} target="_blank" className="vh-button secondary small mt-5">Open public page <ArrowUpRight size={13} /></Link>}</div> : edit ? <form onSubmit={save}><div className="modal-body space-y-5 max-h-[65vh] overflow-y-auto"><div><label htmlFor="edit-title" className="vh-label">Video title</label><input id="edit-title" name="title" defaultValue={edit.title} className="vh-field" required minLength={3} maxLength={160} /></div><div><label htmlFor="edit-description" className="vh-label">Description</label><textarea id="edit-description" name="description" defaultValue={edit.description} className="vh-field" rows={3} maxLength={5000} /></div><div className="field-grid"><div><label htmlFor="edit-category" className="vh-label">Category</label><select id="edit-category" name="categorySlug" defaultValue={edit.categorySlug} className="vh-field">{CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></div><div><label htmlFor="edit-status" className="vh-label">Visibility</label><select id="edit-status" name="status" defaultValue={edit.status} className="vh-field"><option value="draft">Private draft</option><option value="published">Published</option></select></div></div><div><label htmlFor="edit-thumb" className="vh-label flex items-center gap-2"><ImagePlus size={13} /> Replace thumbnail (optional)</label><input id="edit-thumb" type="file" accept="image/jpeg,image/png,image/webp" className="vh-field" onChange={e => setNewThumb(e.target.files?.[0] || null)} /></div><label className="check-row"><input type="checkbox" name="isFeatured" defaultChecked={edit.isFeatured} /> Feature in the homepage spotlight</label><label className="check-row"><input type="checkbox" name="rightsConfirmed" defaultChecked={edit.rightsConfirmed} /> I own this video or have permission to publish it, and it meets the content guidelines.</label>{error && <div className="form-message" role="alert"><CircleAlert size={15} />{error}</div>}</div><div className="modal-actions"><button type="button" className="vh-button secondary" onClick={close} disabled={busy}>Cancel</button><button className="vh-button" disabled={busy}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}{busy ? "Saving…" : "Save changes"}</button></div></form> : null}</>}</dialog></>;
}
