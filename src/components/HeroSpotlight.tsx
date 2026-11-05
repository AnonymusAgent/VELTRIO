"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Info, Play } from "lucide-react";
import type { Video } from "@/lib/data";
import { formatViews } from "@/lib/data";

export type SpotlightItem = Pick<Video, "id" | "title" | "slug" | "description" | "thumbnail" | "category" | "duration" | "creator" | "views" | "muxPlaybackId">;

/**
 * Netflix-style billboard that rotates through featured stories every few
 * seconds. Each slide fades and parallaxes independently; the rotation pauses
 * for reduced-motion users, keyboard focus and hovering.
 */
export default function HeroSpotlight({ items }: { items: SpotlightItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  useEffect(() => {
    if (count < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex(current => (current + 1) % count), 8000);
    return () => window.clearInterval(timer);
  }, [count, paused]);

  if (!count) return null;
  const active = items[index];

  return <section className="billboard" aria-roledescription="carousel" aria-label="Featured stories"
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}>
    {items.map((item, position) => <div key={item.id} className={`billboard-slide${position === index ? " is-active" : ""}`} aria-hidden={position !== index}>
      <Image src={item.thumbnail} alt="" fill priority={position === 0} sizes="100vw" unoptimized={/^https?:|^\/api\//i.test(item.thumbnail)} className="billboard-art" />
    </div>)}
    <div className="billboard-vignette" aria-hidden="true" />
    <div className="billboard-grain" aria-hidden="true" />

    <div className="billboard-content site-container" key={active.id}>
      <span className="billboard-badge"><i /> VELTRIO ORIGINAL</span>
      <h1 className="billboard-title">{active.title}</h1>
      <div className="billboard-meta">
        <span className="billboard-match">98% match</span>
        <span>{active.category}</span>
        <span>{active.duration}</span>
        <span className="billboard-views">{formatViews(active.views)} views</span>
      </div>
      <p className="billboard-copy">{active.description.slice(0, 190) || "An original story, streaming now on VELTRIO."}</p>
      <div className="billboard-actions">
        <Link href={`/video/${active.slug}`} className="cta cta-play"><Play size={17} fill="currentColor" /> Play</Link>
        <Link href={`/video/${active.slug}#about`} className="cta cta-info"><Info size={17} /> More info</Link>
      </div>
      <p className="billboard-credit">Starring <strong>{active.creator || "VELTRIO"}</strong> · Streaming in HD</p>
    </div>

    {count > 1 && <div className="billboard-pager" role="group" aria-label="Choose a featured story">
      <button type="button" className="billboard-step" onClick={() => setIndex((index - 1 + count) % count)} aria-label="Previous featured story">‹</button>
      {items.map((item, position) => <button key={item.id} type="button" aria-pressed={position === index} aria-label={item.title} className={`billboard-dot${position === index ? " is-active" : ""}`} onClick={() => setIndex(position)}><span /></button>)}
      <button type="button" className="billboard-step right" onClick={() => setIndex((index + 1) % count)} aria-label="Next featured story">›</button>
    </div>}
  </section>;
}
