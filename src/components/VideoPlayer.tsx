"use client";
import { useEffect, useRef, useState } from "react";
import { CircleAlert, Gauge, PictureInPicture2, RotateCcw } from "lucide-react";
import type { Video } from "@/lib/data";
import { useLocalStorageValue, writeLocalStorage } from "@/lib/browser-storage";

type VideoElementWithPip = HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> };

export default function VideoPlayer({ video }: { video: Video }) {
  const [error, setError] = useState(false);
  const preferredSpeed = useLocalStorageValue("vh-playback-speed");
  const resumeEnabled = useLocalStorageValue("vh-resume-enabled") !== "false";
  const speedValue = Number(preferredSpeed);
  const speed = [0.75, 1, 1.25, 1.5, 2].includes(speedValue) ? speedValue : 1;
  const [resumeDismissed, setResumeDismissed] = useState(false);
  const videoRef = useRef<VideoElementWithPip | null>(null);
  const counted = useRef(false);
  const lastSaved = useRef(0);
  const lastTick = useRef<number | null>(null);
  const pendingWatch = useRef(0);
  const progressKey = `watch-progress:${video.slug}`;
  const storedProgress = useLocalStorageValue(progressKey);
  const resumeAt = Number(storedProgress || 0);
  const hasResume = resumeEnabled && Number.isFinite(resumeAt) && resumeAt >= 5 && resumeAt < 86400;

  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = speed; }, [speed]);

  function saveProgress(currentTime: number) {
    if (!Number.isFinite(currentTime) || currentTime < 1 || currentTime - lastSaved.current < 5) return;
    lastSaved.current = currentTime;
    writeLocalStorage(progressKey, String(Math.floor(currentTime)));
  }
  function recordEvent(kind: "play" | "progress" | "complete", watchSeconds = 0) {
    fetch(`/api/videos/${video.slug}/event`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, watchSeconds }) }).catch(() => {});
  }
  function tickWatch() {
    const now = Date.now();
    if (lastTick.current !== null) pendingWatch.current += Math.min((now - lastTick.current) / 1000, 5);
    lastTick.current = now;
  }
  function flushWatch(kind: "progress" | "complete") {
    if (lastTick.current !== null) tickWatch();
    const seconds = Math.floor(pendingWatch.current);
    pendingWatch.current -= seconds;
    lastTick.current = null;
    recordEvent(kind, seconds);
  }
  function countView() {
    lastTick.current = Date.now();
    if (counted.current) return;
    counted.current = true;
    fetch(`/api/videos/${video.slug}/view`, { method: "POST" }).catch(() => {});
    recordEvent("play");
  }
  function handleMetadata() {
    if (!videoRef.current || !hasResume || resumeDismissed) return;
    if (videoRef.current.duration > resumeAt + 5) videoRef.current.currentTime = resumeAt;
  }
  function changeSpeed(value: string) {
    const next = Number(value);
    writeLocalStorage("vh-playback-speed", String(next));
    if (videoRef.current) videoRef.current.playbackRate = next;
  }
  async function pictureInPicture() {
    try { await videoRef.current?.requestPictureInPicture?.(); } catch { /* Browser does not support PiP for this media. */ }
  }
  function restart() {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    writeLocalStorage(progressKey, "0");
    setResumeDismissed(true);
    void videoRef.current.play().catch(() => {});
  }

  return <div className="video-player-shell overflow-hidden rounded-xl border border-white/10 bg-black">
    <div className="video-stage">
      <video ref={videoRef} key={video.videoUrl} src={video.videoUrl || undefined} poster={video.thumbnail} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-contain" onLoadedMetadata={handleMetadata} onPlaying={countView} onTimeUpdate={event => { if (!event.currentTarget.paused && lastTick.current !== null) tickWatch(); saveProgress(event.currentTarget.currentTime); }} onPause={event => { saveProgress(event.currentTarget.currentTime); flushWatch("progress"); }} onEnded={() => { writeLocalStorage(progressKey, "0"); flushWatch("complete"); }} onError={() => setError(true)} aria-label={video.title}>Your browser does not support HTML5 video.</video>
      {hasResume && !resumeDismissed && <div className="video-resume-prompt" role="status"><RotateCcw size={14} /><span>Continue from {Math.floor(resumeAt / 60)}:{String(Math.floor(resumeAt % 60)).padStart(2, "0")}?</span><button type="button" onClick={() => setResumeDismissed(true)}>Continue</button><button type="button" aria-label="Restart video" onClick={restart}>Restart</button></div>}
    </div>
    <div className="video-player-tools" aria-label="Player options">
      <label><Gauge size={13} /><span>Speed</span><select value={speed} onChange={event => changeSpeed(event.target.value)} aria-label="Playback speed"><option value="0.75">0.75×</option><option value="1">1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label>
      <button type="button" onClick={pictureInPicture} className="player-tool-button"><PictureInPicture2 size={14} /> Picture in picture</button>
      <p>Keyboard shortcuts and native fullscreen controls are supported by your browser.</p>
    </div>
    {error && <div className="flex items-start gap-2 bg-red-950/50 p-4 text-xs leading-relaxed text-red-200"><CircleAlert size={16} className="shrink-0" /><span>This video cannot be played in this browser. Try downloading it or contact the publisher. MP4 with H.264/AAC offers the widest compatibility.</span></div>}
  </div>;
}
