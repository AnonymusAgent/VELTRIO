import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import type { Video } from "@/lib/data";
import { formatViews, timeAgo } from "@/lib/data";
import VideoCard from "./VideoCard";

/**
 * YouTube-style "Up next" stack: compact thumbnails with rich metadata and a
 * mobile-friendly list that keeps viewers inside the platform.
 */
export default function WatchNext({ related, currentCategory }: { related: Video[]; currentCategory?: string }) {
  return <aside className="watch-next">
    <div className="shelf-header watch-next-head">
      <div><span className="shelf-kicker">UP NEXT</span><h2>Keep watching</h2></div>
      {currentCategory && <span className="watch-next-chip"><Flame size={12} /> {currentCategory}</span>}
    </div>
    {related.length ? <div className="watch-next-stack">{related.map((video, index) => index < 2
      ? <VideoCard key={video.id} video={video} />
      : <Link key={video.id} href={`/video/${video.slug}`} className="watch-next-card">
        <span className="watch-next-thumb"><img src={video.thumbnail} alt="" loading="lazy" /><span className="watch-next-time">{video.duration}</span></span>
        <span className="watch-next-copy"><strong>{video.title}</strong><span>{video.creator || "VELTRIO"}</span><span>{formatViews(video.views)} views · {timeAgo(video.publishedAt)}</span></span>
      </Link>)}</div>
      : <p className="watch-next-empty">More stories are on their way. Check back soon.</p>}
    <Link href="/browse" className="watch-next-more">Explore the full library <ArrowRight size={14} /></Link>
  </aside>;
}
