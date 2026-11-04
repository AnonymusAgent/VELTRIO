"use client";
import type { Video } from "@/lib/data";
import { parseSavedSlugs, useLocalStorageValue } from "@/lib/browser-storage";
import VideoShelf from "./VideoShelf";
export default function ContinueShelf({ videos }: { videos: Video[] }) {
  const history = parseSavedSlugs(useLocalStorageValue("vh-continue-watching"));
  const available = new Map(videos.map(video => [video.slug, video]));
  const recent = history.map(slug => available.get(slug)).filter((video): video is Video => !!video).slice(0, 12);
  return <VideoShelf title="Pick up where you left off" description="Your recently watched stories, saved on this device." href="/my-list" videos={recent} />;
}
