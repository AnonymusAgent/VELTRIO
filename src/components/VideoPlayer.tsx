"use client";
import { useRef, useState } from "react";
import { CircleAlert } from "lucide-react";
import type { Video } from "@/lib/data";
export default function VideoPlayer({ video }: { video: Video }) {
  const [error, setError] = useState(false);
  const counted = useRef(false);
  function countView() {
    if (counted.current) return;
    counted.current = true;
    fetch(`/api/videos/${video.slug}/view`, { method: "POST" }).catch(() => {});
  }
  return <div className="overflow-hidden rounded-xl border border-white/10 bg-black"><video key={video.videoUrl} src={video.videoUrl || undefined} poster={video.thumbnail} controls playsInline preload="metadata" className="aspect-video w-full bg-black object-contain" onPlaying={countView} onError={() => setError(true)} aria-label={video.title}>Your browser does not support HTML5 video.</video>{error && <div className="flex items-start gap-2 bg-red-950/50 p-4 text-xs leading-relaxed text-red-200"><CircleAlert size={16} className="shrink-0" /><span>This video cannot be played in this browser. Try downloading it or contact the publisher. MP4 with H.264/AAC offers the widest compatibility.</span></div>}</div>;
}
