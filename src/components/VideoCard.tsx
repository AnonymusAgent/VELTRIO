import Link from "next/link";
import { Play } from "lucide-react";
import { formatViews, timeAgo, type Video } from "@/lib/data";
export default function VideoCard({ video, rank }: { video: Video; rank?: number }) {
  return <Link href={`/video/${video.slug}`} className="video-tile"><div className="video-tile-cover"><img src={video.thumbnail} alt={video.title} loading="lazy" /><span className="video-tile-play"><Play size={20} /></span><span className="video-duration">{video.duration}</span>{rank && <span className="absolute left-3 top-3 z-10 rounded bg-black/60 px-2 py-1 text-xs font-bold">#{rank}</span>}</div><div className="video-tile-info"><span className="eyebrow">{video.category}</span><h3 className="line-clamp-2">{video.title}</h3><div className="video-tile-meta"><span>{formatViews(video.views)} views</span><span>{timeAgo(video.publishedAt)}</span></div></div></Link>;
}
