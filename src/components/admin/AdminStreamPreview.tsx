"use client";
import { useEffect, useState } from "react";
import MuxPlayerReact from "@mux/mux-player-react";

export default function AdminStreamPreview({ slug, title, playbackId, poster }: { slug: string; title: string; playbackId: string; poster: string }) {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancel = false;
    fetch(`/api/mux/playback/${slug}`, { cache: "no-store" })
      .then(async response => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Preview unavailable");
        if (!cancel) setToken(data.token ?? null);
      })
      .catch(() => { if (!cancel) setFailed(true); });
    return () => { cancel = true; };
  }, [slug]);
  if (failed) return <div className="admin-preview-wait" role="alert">This preview could not be loaded. Open the public page if the video is published.</div>;
  if (token === undefined) return <div className="admin-preview-wait" aria-busy="true">Loading preview…</div>;
  return <MuxPlayerReact playbackId={playbackId} tokens={token ? { playback: token } : undefined} streamType="on-demand" metadata={{ video_title: title }} poster={poster} accentColor="#8068ff" style={{ aspectRatio: "16 / 9", width: "100%", borderRadius: 12, overflow: "hidden" }} />;
}
