import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { formatViews, timeAgo, type Video } from "@/lib/data";
import VideoProgress from "./VideoProgress";
import SaveVideoButton from "./SaveVideoButton";
export default function VideoCard({ video, rank }: { video: Video; rank?: number }) {
  const creator = video.creator || "VELTRIO";
  return <article className="video-tile"><div className="video-tile-cover"><Link href={`/video/${video.slug}`} aria-label={`Watch ${video.title}`}><Image src={video.thumbnail} alt="" unoptimized={/^https?:\/\//i.test(video.thumbnail)} fill sizes="(max-width: 640px) 80vw, (max-width: 1100px) 33vw, 25vw" /><span className="video-tile-play"><Play size={20} fill="currentColor" /></span></Link><SaveVideoButton slug={video.slug} title={video.title} /><span className="video-duration">{video.duration}</span><VideoProgress slug={video.slug} duration={video.duration} />{rank && <span className="video-rank">{String(rank).padStart(2, "0")}</span>}</div><div className="video-tile-info"><div className="video-card-avatar" aria-hidden="true">{creator.slice(0, 1).toUpperCase()}</div><div className="video-card-copy"><span className="video-card-category">{video.category}</span><h3 className="line-clamp-2"><Link href={`/video/${video.slug}`}>{video.title}</Link></h3><p className="video-card-creator">{creator}</p><div className="video-tile-meta"><span>{formatViews(video.views)} views</span><span aria-hidden="true">·</span><span>{timeAgo(video.publishedAt)}</span></div></div></div></article>;
}
