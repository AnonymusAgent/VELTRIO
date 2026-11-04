"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CATEGORIES } from "@/lib/data";

type Props = { id: number; status: string; rightsConfirmed: boolean; title: string; description: string; categorySlug: string };
export default function CreatorVideoActions(video: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  async function request(action: "publish" | "draft" | "delete" | "edit", details: Record<string, unknown> = {}) {
    if (action === "delete" && !window.confirm("Delete this video?")) return;
    if (action === "publish" && !video.rightsConfirmed && !window.confirm("Confirm that you own the rights and this video meets the content guidelines.")) return;
    setBusy(true); setError("");
    try {
      const body = action === "edit" ? details : { status: action === "publish" ? "published" : "draft", rightsConfirmed: action === "publish" ? true : video.rightsConfirmed };
      const response = await fetch(`/api/creator/videos/${video.id}`, action === "delete" ? { method: "DELETE" } : { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) throw new Error((await response.json()).error || "Could not update video.");
      setEditing(false); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update video."); }
    finally { setBusy(false); }
  }
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void request("edit", Object.fromEntries(new FormData(event.currentTarget)));
  }
  const field = "mt-1 block w-full rounded border border-white/10 bg-black/30 p-2 text-white";
  return <div className="space-y-3"><div className="flex flex-wrap gap-3"><button type="button" className="text-[#b9b2ff]" disabled={busy} onClick={() => setEditing(!editing)}>Edit</button><button type="button" className="text-[#b9b2ff]" disabled={busy} onClick={() => request(video.status === "published" ? "draft" : "publish")}>{video.status === "published" ? "Make draft" : "Publish"}</button><button type="button" className="text-red-300" disabled={busy} onClick={() => request("delete")}>Delete</button></div>{editing && <form onSubmit={save} className="min-w-[240px] space-y-3 py-2 text-xs"><label className="block">Title<input name="title" defaultValue={video.title} className={field} minLength={3} maxLength={160} required /></label><label className="block">Description<textarea name="description" defaultValue={video.description} className={field} maxLength={5000} /></label><label className="block">Category<select name="categorySlug" defaultValue={video.categorySlug} className={field}>{CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select></label><div className="flex gap-3"><button className="vh-button secondary small" disabled={busy}>Save</button><button type="button" onClick={() => setEditing(false)}>Cancel</button></div></form>}{error && <p role="alert" className="text-red-300">{error}</p>}</div>;
}
