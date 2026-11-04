import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Video } from "@/lib/data";
import VideoCard from "./VideoCard";
export default function VideoShelf({ title, description, href, videos, linkLabel = "View all" }: { title: string; description?: string; href: string; videos: Video[]; linkLabel?: string }) {
  if (!videos.length) return null;
  return <section className="discovery-shelf"><div className="shelf-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div><Link href={href}>{linkLabel} <ArrowUpRight size={15} /></Link></div><div className="shelf-track">{videos.map(video => <VideoCard key={video.id} video={video} />)}</div></section>;
}
