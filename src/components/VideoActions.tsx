"use client";
import { useState } from "react";
import { Bookmark, Check, Download, Heart, Share2 } from "lucide-react";
import { formatViews, type Video } from "@/lib/data";
import { parseSavedSlugs, useLocalStorageValue, writeLocalStorage } from "@/lib/browser-storage";
export default function VideoActions({ video }: { video: Video }) {
  const [likes, setLikes] = useState(video.likes);
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const likedKey = `liked:${video.slug}`;
  const liked = useLocalStorageValue(likedKey) === "1";
  const savedSlugs = parseSavedSlugs(useLocalStorageValue("saved-videos"));
  const saved = savedSlugs.includes(video.slug);
  async function like() {
    if (liked || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/videos/${video.slug}/like`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your like. Try again.");
      setLikes(data.likes);
      writeLocalStorage(likedKey, "1");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save your like."); }
    finally { setBusy(false); }
  }
  async function share() {
    setMessage("");
    try {
      if (navigator.share) await navigator.share({ title: video.title, text: video.description.slice(0, 140), url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); setShared(true); setTimeout(() => setShared(false), 2500); }
    } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setMessage("Sharing is unavailable. Copy the page address from your browser."); }
  }
  function save() {
    setMessage("");
    const next = saved ? savedSlugs.filter(slug => slug !== video.slug) : [...savedSlugs, video.slug];
    if (!writeLocalStorage("saved-videos", JSON.stringify(next))) setMessage("Browser storage is disabled. Enable it to save videos to My list.");
  }
  return <><button onClick={like} disabled={liked || busy} className={`vh-button secondary small ${liked ? "!border-[#7f4747] !text-[#ff9483]" : ""}`}><Heart size={13} className={liked ? "fill-current" : ""} />{formatViews(likes)}{liked ? " · Liked" : ""}</button><button onClick={share} className="vh-button secondary small">{shared ? <Check size={13} /> : <Share2 size={13} />}{shared ? "Link copied" : "Share"}</button><button onClick={save} className={`vh-button secondary small ${saved ? "!text-[#ffd0a7]" : ""}`}><Bookmark size={13} className={saved ? "fill-current" : ""} />{saved ? "Saved" : "Save"}</button>{video.videoUrl && <a href={`${video.videoUrl}?download=1`} download className="vh-button secondary small"><Download size={13} /> Download</a>}{message && <p className="w-full text-xs text-amber-300" role="status">{message}</p>}</>;
}
