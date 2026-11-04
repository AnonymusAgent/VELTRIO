"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function CreatorVideoActions({ id, status, rightsConfirmed }: { id: number; status: string; rightsConfirmed: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function change(action: "publish" | "draft" | "delete") {
    if (action === "delete" && !window.confirm("Delete this video?")) return;
    if (action === "publish" && !rightsConfirmed && !window.confirm("Confirm that you own the rights and this video meets the content guidelines.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/creator/videos/${id}`, action === "delete" ? { method: "DELETE" } : { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: action === "publish" ? "published" : "draft", rightsConfirmed: action === "publish" ? true : rightsConfirmed }) });
      if (!response.ok) throw new Error((await response.json()).error || "Could not update video.");
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update video."); }
    finally { setBusy(false); }
  }
  return <div className="flex flex-wrap gap-2"><button className="text-[#b9b2ff]" disabled={busy} onClick={() => change(status === "published" ? "draft" : "publish")}>{status === "published" ? "Make draft" : "Publish"}</button><button className="text-red-300" disabled={busy} onClick={() => change("delete")}>Delete</button>{error && <span role="alert">{error}</span>}</div>;
}
