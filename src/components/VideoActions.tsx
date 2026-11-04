"use client";
import { useEffect, useState } from "react";
import { Bookmark, Check, Download, Heart, Share2 } from "lucide-react";
import { formatViews, type Video } from "@/lib/data";
export default function VideoActions({ video }: { video: Video }) {
  const [likes, setLikes] = useState(video.likes);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    try { setLiked(localStorage.getItem(`liked:${video.slug}`) === "1"); const list = JSON.parse(localStorage.getItem("saved-videos") || "[]"); setSaved(Array.isArray(list) && list.includes(video.slug)); } catch {}
  }, [video.slug]);
  async function like() {
    if (liked || busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/videos/${video.slug}/like`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your like. Try again.");
      setLikes(data.likes); setLiked(true);
      try { localStorage.setItem(`liked:${video.slug}`, "1"); } catch {}
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
    try {
      const value = JSON.parse(localStorage.getItem("saved-videos") || "[]");
      const items: string[] = Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
      const next = items.includes(video.slug) ? items.filter(slug => slug !== video.slug) : [...items, video.slug];
      localStorage.setItem("saved-videos", JSON.stringify(next)); setSaved(next.includes(video.slug));
    } catch { setMessage("Browser storage is disabled. Enable it to save videos to My list."); }
  }
  return <><button onClick={like} disabled={liked || busy} className={`vh-button secondary small ${liked ? "!border-[#7f4747] !text-[#ff9483]" : ""}`}><Heart size={13} className={liked ? "fill-current" : ""} />{formatViews(likes)}{liked ? " · Liked" : ""}</button><button onClick={share} className="vh-button secondary small">{shared ? <Check size={13} /> : <Share2 size={13} />}{shared ? "Link copied" : "Share"}</button><button onClick={save} className={`vh-button secondary small ${saved ? "!text-[#ffd0a7]" : ""}`}><Bookmark size={13} className={saved ? "fill-current" : ""} />{saved ? "Saved" : "Save"}</button>{video.videoUrl && <a href={`${video.videoUrl}?download=1`} download className="vh-button secondary small"><Download size={13} /> Download</a>}{message && <p className="w-full text-xs text-amber-300" role="status">{message}</p>}</>;
}
