import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { formatViews, isRecentlyAdded, releaseYear, type Video } from "@/lib/data";
import VideoProgress from "./VideoProgress";
import SaveVideoButton from "./SaveVideoButton";
export default function VideoCard({ video, rank }: { video: Video; rank?: number }) {
  const creator = video.creator || "VELTRIO";
  const year = releaseYear(video.publishedAt);
  return <article className="video-tile"><div className="video-tile-cover"><Link href={`/video/${video.slug}`} aria-label={`Watch ${video.title}`}><Image src={video.thumbnail} alt="" unoptimized={/^https?:\/\//i.test(video.thumbnail)} fill sizes="(max-width: 640px) 80vw, (max-width: 1100px) 33vw, 25vw" /><span className="video-tile-play"><Play size={20} fill="currentColor" /></span></Link><SaveVideoButton slug={video.slug} title={video.title} />{!rank && (video.isFeatured ? <span className="video-badge video-badge-featured">FEATURED</span> : isRecentlyAdded(video.publishedAt) ? <span className="video-badge">NEW</span> : null)}<span className="video-duration">{video.duration}</span><VideoProgress slug={video.slug} duration={video.duration} />{rank && <span className="video-rank">{String(rank).padStart(2, "0")}</span>}</div><div className="video-tile-info"><div className="video-card-copy"><span className="video-card-category">{video.category}</span><h3 className="line-clamp-2"><Link href={`/video/${video.slug}`}>{video.title}</Link></h3><p className="video-card-creator">{creator}</p><div className="video-tile-meta">{year && <span>{year}</span>}{video.views > 0 && <><span aria-hidden="true">·</span><span>{formatViews(video.views)} views</span></>}</div></div></div></article>;
}
