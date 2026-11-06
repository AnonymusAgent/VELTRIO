"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Video } from "@/lib/data";
import { parseSavedSlugs, useLocalStorageValue } from "@/lib/browser-storage";
import CinemaRail from "./CinemaRail";
import Reveal from "./Reveal";
import VideoCard from "./VideoCard";

export default function BecauseYouWatched({ videos, accountSlugs = [] }: { videos: Video[]; accountSlugs?: string[] }) {
  const continuing = parseSavedSlugs(useLocalStorageValue("vh-continue-watching"));
  const history = parseSavedSlugs(useLocalStorageValue("vh-watch-history"));
  const watched = new Set([...accountSlugs, ...continuing, ...history]);
  const seen = new Set<string>();
  const catalog = videos.filter(video => {
    if (seen.has(video.slug)) return false;
    seen.add(video.slug);
    return true;
  });
  const categories = new Set(catalog.filter(video => watched.has(video.slug)).map(video => video.categorySlug));
  const related = categories.size ? catalog.filter(video => categories.has(video.categorySlug) && !watched.has(video.slug)).slice(0, 14) : [];
  if (!related.length) return null;
  return <Reveal as="section" className="shelf">
    <div className="shelf-head">
      <div><span className="shelf-kicker">FROM YOUR HISTORY</span><h2>Because you watched</h2></div>
      <Link href="/browse" className="shelf-link">See all <ArrowRight size={14} /></Link>
    </div>
    <CinemaRail label="Because you watched">{related.map(video => <div className="rail-item" key={video.id}><VideoCard video={video} /></div>)}</CinemaRail>
  </Reveal>;
}
