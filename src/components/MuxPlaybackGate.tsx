"use client";
import { useCallback, useEffect, useState } from "react";
import MuxPlayer from "@/components/MuxPlayer";
import VideoPlayer from "@/components/VideoPlayer";
import type { Video } from "@/lib/data";
import type { StreamInfo } from "@/components/MuxPlayer";

export default function MuxPlaybackGate({ video, prerollPath }: { video: Video; prerollPath?: string }) {
  const playbackId = video.muxPlaybackId || "";
  const [stream, setStream] = useState<StreamInfo | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async (): Promise<StreamInfo | null> => {
    const response = await fetch(`/api/mux/playback/${video.slug}`, { cache: "no-store" });
    if (!response.ok) throw new Error("The stream could not be authorized.");
    const data = await response.json();
    const next = { url: String(data.url), token: data.token ?? null, expiresAt: data.expiresAt ?? null };
    setStream(next);
    return next;
  }, [video.slug]);

  useEffect(() => {
    let cancelled = false;
    // Resolve asynchronously so the first paint is never blocked by the effect.
    Promise.resolve().then(() => load()).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [load]);

  if (failed) return <div className="mux-blocked" role="alert"><strong>This stream is temporarily unavailable.</strong><span>The playback token could not be issued. Reload the page in a moment; if it keeps failing the publisher may need to re-enable streaming.</span></div>;

  if (!playbackId) return <VideoPlayer key={video.slug} video={video} prerollPath={prerollPath} />;

  if (!stream) return <div className="mux-stage mux-standby" aria-busy="true"><span className="mux-standby-mark" /><p>Securing your stream…</p></div>;

  return <MuxPlayer
    key={`${video.slug}:${stream.url.slice(0, 40)}`}
    slug={video.slug}
    title={video.title}
    playbackId={playbackId}
    stream={stream}
    poster={video.thumbnail}
    durationSeconds={video.durationSeconds}
    onRefresh={() => load().catch(() => null)}
  />;
}
