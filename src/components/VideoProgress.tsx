"use client";
import { useLocalStorageValue } from "@/lib/browser-storage";
export default function VideoProgress({ slug, duration }: { slug: string; duration: string }) {
  const progress = Number(useLocalStorageValue(`watch-progress:${slug}`) || 0);
  const seconds = duration.split(":").reduce((total, part) => total * 60 + (Number(part) || 0), 0);
  if (!Number.isFinite(progress) || progress <= 0 || seconds <= 0 || progress >= seconds) return null;
  return <span className="video-card-progress" role="progressbar" aria-label="Viewing progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, progress / seconds * 100))}><span style={{ width: `${Math.min(100, progress / seconds * 100)}%` }} /></span>;
}
