"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import MuxPlayerReact from "@mux/mux-player-react";
import { CircleAlert, PictureInPicture2, RotateCcw, Settings2 } from "lucide-react";
import { parseSavedSlugs, useLocalStorageValue, writeLocalStorage } from "@/lib/browser-storage";
import { pullAccountProgress } from "@/lib/account-progress";

export type StreamInfo = { url: string; token: string | null; expiresAt: string | null };

type PlayerElement = HTMLElement & {
  currentTime: number;
  duration: number;
  paused: boolean;
  playbackRate: number;
  play: () => Promise<void>;
  pause: () => void;
  requestFullscreen?: () => Promise<void>;
  requestPictureInPicture?: () => Promise<unknown>;
};

const RATES = [0.75, 1, 1.25, 1.5, 2];

export default function MuxPlayer({ slug, title, playbackId, stream, poster, durationSeconds, onRefresh }: {
  slug: string;
  title: string;
  playbackId: string;
  stream: StreamInfo;
  poster?: string;
  durationSeconds?: number | null;
  onRefresh?: () => Promise<StreamInfo | null>;
}) {
  const playerRef = useRef<PlayerElement | null>(null);
  const [error, setError] = useState("");
  const [speed, setSpeed] = useState(1);
  const [showTools, setShowTools] = useState(false);
  const progressKey = `watch-progress:${slug}`;
  const storedProgress = useLocalStorageValue(progressKey);
  const resumeEnabled = useLocalStorageValue("vh-resume-enabled") !== "false";
  const resumeAt = Number(storedProgress || 0);
  const hasResume = resumeEnabled && Number.isFinite(resumeAt) && resumeAt >= 5 && (durationSeconds ? resumeAt < durationSeconds - 5 : resumeAt < 86400);
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const counted = useRef(false);
  const lastSaved = useRef(0);
  const lastTick = useRef<number | null>(null);
  const pendingWatch = useRef(0);

  const updateList = useCallback((key: string, add: boolean) => {
    let raw: string | null = null;
    try { raw = localStorage.getItem(key); } catch { return; }
    const list = parseSavedSlugs(raw).filter(value => value !== slug);
    writeLocalStorage(key, JSON.stringify(add ? [slug, ...list].slice(0, 100) : list));
  }, [slug]);

  // Server-side progress for signed-in viewers (the browser copy still works).
  const saveServerProgress = useCallback((value: number) => {
    if (!Number.isFinite(value) || value < 2) return;
    fetch(`/api/videos/${slug}/progress`, { method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true, body: JSON.stringify({ position: Math.floor(value) }) }).catch(() => {});
  }, [slug]);

  const recordEvent = useCallback((kind: "play" | "progress" | "complete", watchSeconds = 0) => {
    fetch(`/api/videos/${slug}/event`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, watchSeconds }) }).catch(() => {});
  }, [slug]);
  const saveProgress = useCallback((value: number) => {
    if (!Number.isFinite(value) || value < 1 || Math.abs(value - lastSaved.current) < 5) return;
    lastSaved.current = value;
    writeLocalStorage(progressKey, String(Math.floor(value)));
    updateList("vh-continue-watching", true);
    saveServerProgress(value);
  }, [progressKey, updateList, saveServerProgress]);

  function tickWatch() {
    const now = Date.now();
    if (lastTick.current !== null) pendingWatch.current += Math.min((now - lastTick.current) / 1000, 5);
    lastTick.current = now;
  }
  const flushWatch = useCallback((kind: "progress" | "complete") => {
    if (lastTick.current !== null) tickWatch();
    const seconds = Math.floor(pendingWatch.current);
    pendingWatch.current -= seconds;
    lastTick.current = null;
    recordEvent(kind, seconds);
  }, [recordEvent]);

  const countView = useCallback(() => {
    setResumeDismissed(true);
    lastTick.current = Date.now();
    if (counted.current) return;
    counted.current = true;
    updateList("vh-watch-history", true);
    fetch(`/api/videos/${slug}/view`, { method: "POST" }).catch(() => {});
    recordEvent("play");
  }, [recordEvent, slug, updateList]);

  useEffect(() => {
    let cancelled = false;
    void pullAccountProgress(slug).then(position => {
      if (cancelled || !position || !resumeEnabled) return;
      const element = playerRef.current;
      if (element && element.currentTime < 1) {
        try { element.currentTime = position; } catch { /* not seekable yet */ }
      }
    });
    return () => { cancelled = true; };
  }, [slug, resumeEnabled]);

  useEffect(() => {
    const element = playerRef.current;
    if (!element) return;
    const onLoaded = () => {
      element.playbackRate = speed;
      if (hasResume && !resumeDismissed) {
        try { element.currentTime = resumeAt; } catch { /* not seekable yet */ }
      }
    };
    const onError = () => setError("Playback failed. Check your connection, then reload the page.");
    element.addEventListener("loadedmetadata", onLoaded);
    element.addEventListener("playing", countView);
    element.addEventListener("error", onError);
    return () => {
      element.removeEventListener("loadedmetadata", onLoaded);
      element.removeEventListener("playing", countView);
      element.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackId]);

  // Periodic progress bookkeeping while the media plays.
  useEffect(() => {
    const timer = window.setInterval(() => {
      const element = playerRef.current;
      if (!element || element.paused || !Number.isFinite(element.currentTime)) return;
      tickWatch();
      saveProgress(element.currentTime);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [saveProgress]);

  // Signed stream URLs expire; refresh transparently before the token lapses.
  useEffect(() => {
    if (!stream.expiresAt || !onRefresh) return;
    const remaining = new Date(stream.expiresAt).getTime() - Date.now();
    if (remaining <= 0) return;
    const timer = window.setTimeout(async () => {
      const element = playerRef.current;
      const resume = element && !element.paused ? element.currentTime : null;
      const next = await onRefresh().catch(() => null);
      if (next && element && resume !== null) {
        window.setTimeout(() => { try { element.currentTime = resume; void element.play().catch(() => {}); } catch { /* ignore */ } }, 1200);
      }
    }, Math.max(30_000, remaining - 60_000));
    return () => window.clearTimeout(timer);
  }, [stream.expiresAt, onRefresh]);

  useEffect(() => {
    const element = playerRef.current;
    if (element) element.playbackRate = speed;
  }, [speed]);

  function changeSpeed(next: number) {
    setSpeed(next);
    writeLocalStorage("vh-playback-speed", String(next));
  }
  async function pictureInPicture() {
    try { await playerRef.current?.requestPictureInPicture?.(); } catch { setError("Picture in picture is unavailable for this stream."); }
  }
  function restart() {
    const element = playerRef.current;
    if (!element) return;
    element.currentTime = 0;
    writeLocalStorage(progressKey, "0");
    updateList("vh-continue-watching", false);
    setResumeDismissed(true);
    void element.play().catch(() => {});
  }

  return <div className="mux-shell">
    <div className="mux-stage">
      <MuxPlayerReact
        ref={playerRef as never}
        playbackId={playbackId}
        tokens={stream.token ? { playback: stream.token } : undefined}
        streamType="on-demand"
        metadata={{ video_id: slug, video_title: title }}
        primaryColor="#ffffff"
        secondaryColor="#0b0c14"
        accentColor="#8b7bff"
        poster={poster}
        playsInline
        preload="metadata"
        style={{ width: "100%", aspectRatio: "16 / 9", background: "#000" }}
        className="mux-video-element"
      />
      {hasResume && !resumeDismissed && <div className="video-resume-prompt" role="status"><RotateCcw size={14} /><span>Continue from {Math.floor(resumeAt / 60)}:{String(Math.floor(resumeAt % 60)).padStart(2, "0")}?</span><button type="button" onClick={() => setResumeDismissed(true)}>Continue</button><button type="button" aria-label="Restart video" onClick={restart}>Restart</button></div>}
    </div>
    <div className="mux-toolbar">
      <button type="button" className="player-tool-button" onClick={() => setShowTools(value => !value)} aria-expanded={showTools}><Settings2 size={14} /> Quality & speed</button>
      <button type="button" className="player-tool-button" onClick={pictureInPicture}><PictureInPicture2 size={14} /> Picture in picture</button>
      {showTools && <div className="mux-tools" role="group" aria-label="Playback options">
        <label><span>Playback speed</span><select value={speed} onChange={event => changeSpeed(Number(event.target.value))} aria-label="Playback speed">{RATES.map(rate => <option key={rate} value={rate}>{rate}×</option>)}</select></label>
        <p>Quality switches automatically with your connection. Open the in-player menu for manual levels, captions and audio.</p>
      </div>}
      <span className="mux-toolbar-note">Adaptive HD stream · Mux</span>
    </div>
    {error && <div className="mux-error" role="alert"><CircleAlert size={16} /><span>{error}</span></div>}
  </div>;
}
