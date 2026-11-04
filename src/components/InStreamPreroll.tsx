"use client";
import { useEffect, useRef, useState } from "react";
import { Play, SkipForward } from "lucide-react";

// A first-party video creative, not an ad-network SDK. The content player stays
// independent so an unavailable or blocked creative can never strand viewers.
export default function InStreamPreroll({ src, poster, onFinish }: { src: string; poster: string; onFinish: (startContent: boolean) => void }) {
  const media = useRef<HTMLVideoElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const started = useRef(false);
  const finished = useRef(false);
  const [attempted, setAttempted] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  function clearTimer() { if (timer.current) clearTimeout(timer.current); timer.current = null; }
  function finish() {
    if (finished.current) return;
    finished.current = true;
    clearTimer();
    media.current?.pause();
    onFinish(started.current);
  }
  function waitForPlayback() {
    clearTimer();
    timer.current = setTimeout(finish, 12000);
  }
  function start() {
    started.current = true;
    setAttempted(true);
    waitForPlayback();
    const promise = media.current?.play();
    if (!promise) { finish(); return; }
    promise.catch(finish);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const remaining = Number.isFinite(duration) && duration > 0 ? Math.max(0, Math.ceil(duration - elapsed)) : null;
  return <div className="preroll-stage">
    <video ref={media} src={src} poster={poster} controls={attempted} playsInline preload="none" className="aspect-video w-full bg-black object-contain" aria-label="Advertisement" onPlaying={clearTimer} onWaiting={() => { if (started.current) waitForPlayback(); }} onLoadedMetadata={event => setDuration(event.currentTarget.duration)} onTimeUpdate={event => setElapsed(event.currentTarget.currentTime)} onEnded={finish} onError={finish}>Your browser does not support video.</video>
    <div className="preroll-label" aria-live="polite">Advertisement{remaining !== null && attempted ? ` · ${remaining}s remaining` : ""}</div>
    {!attempted && <button type="button" className="preroll-start" onClick={start} aria-label="Play video"><span><Play size={22} fill="currentColor" /></span><strong>Play video</strong><small>Includes an advertisement</small></button>}
    {attempted && elapsed >= 5 && <button type="button" className="preroll-skip" onClick={finish}>Skip ad <SkipForward size={14} /></button>}
  </div>;
}
