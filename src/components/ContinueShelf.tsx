"use client";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import type { Video } from "@/lib/data";
import { parseSavedSlugs, useLocalStorageValue } from "@/lib/browser-storage";
import CinemaRail from "./CinemaRail";
import Reveal from "./Reveal";

function seconds(duration: string) { return duration.split(":").reduce((total, part) => total * 60 + (Number(part) || 0), 0); }

function ProgressBar({ slug, total, accountPosition = 0 }: { slug: string; total: number; accountPosition?: number }) {
  // One reactive hook per card; progress keys are written by the player.
  const stored = Number(useLocalStorageValue(`watch-progress:${slug}`) || 0);
  const value = stored > 0 ? stored : accountPosition;
  const percent = Number.isFinite(value) && value > 0 ? Math.max(4, Math.min(100, value / Math.max(total, 1) * 100)) : 0;
  return <><span className="continue-card-progress"><span style={{ width: `${percent || 5}%` }} /></span></>;
}

export default function ContinueShelf({ videos, accountContinue = [] }: { videos: Video[]; accountContinue?: { slug: string; position: number }[] }) {
  const history = parseSavedSlugs(useLocalStorageValue("vh-continue-watching"));
  const accountSlugs = accountContinue.map(item => item.slug);
  const merged = [...accountSlugs, ...history.filter(slug => !accountSlugs.includes(slug))];
  const positions = new Map(accountContinue.map(item => [item.slug, item.position]));
  const available = new Map(videos.map(video => [video.slug, video]));
  const recent = merged.map(slug => available.get(slug)).filter((video): video is Video => !!video).slice(0, 12);
  if (!recent.length) return null;
  return <Reveal as="section" className="shelf continue-shelf">
    <div className="shelf-head"><div><span className="shelf-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>Continue watching</h2></div><Link href="/my-list" className="shelf-link">Your list</Link></div>
    <CinemaRail label="Continue watching">{recent.map(video => <Link key={video.id} href={`/video/${video.slug}`} className="continue-card">
      <span className="continue-card-cover">
        <Image src={video.thumbnail} alt="" fill sizes="(max-width:760px) 74vw, 23vw" unoptimized={/^https?:|^\/api\//i.test(video.thumbnail)} />
        <span className="continue-card-play"><Play size={15} fill="currentColor" /></span>
        <ProgressBar slug={video.slug} total={video.durationSeconds || seconds(video.duration)} accountPosition={positions.get(video.slug) || 0} />
      </span>
      <span className="continue-card-meta"><strong>{video.title}</strong><span>{video.category} · {video.duration}</span></span>
    </Link>)}</CinemaRail>
  </Reveal>;
}
