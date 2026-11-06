import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Heart, Play } from "lucide-react";
import { getCreatorProfile, getCreatorStats, getCreatorVideos } from "@/lib/creator-store";

import VideoCard from "@/components/VideoCard";
import VideoShelf from "@/components/VideoShelf";
import { formatViews } from "@/lib/data";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const profile = await getCreatorProfile((await params).slug); return { title: profile?.displayName || "Titles", description: profile?.bio || "Titles on VELTRIO." }; }
export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const profile = await getCreatorProfile((await params).slug);
  if (!profile) notFound();
  const [videos, popular, stats] = await Promise.all([getCreatorVideos(profile, 24), getCreatorVideos(profile, 8, "popular"), getCreatorStats(profile)]);
  const banner = profile.bannerUrl || "/images/veltrio-landscape.jpg", avatar = profile.avatarUrl || "/icon.svg";
  return <div className="site-container pb-20"><Link href="/browse" className="watch-back"><ArrowLeft size={15} /> Back to explore</Link><section className="creator-profile-hero"><Image src={banner} alt="" unoptimized={/^https?:\/\//i.test(banner)} fill sizes="100vw" className="creator-profile-banner" /><div className="creator-profile-shade" /><div className="creator-profile-copy"><div className="creator-profile-avatar"><Image src={avatar} alt="" unoptimized={/^https?:\/\//i.test(avatar)} fill sizes="96px" /></div><div><span className="eyebrow text-[#9b8cff]">FROM THE CATALOG</span><h1>{profile.displayName}</h1><p>{profile.bio}</p></div></div></section><div className="creator-profile-stats"><span><Play size={14} /> {stats.videos} published {stats.videos === 1 ? "story" : "stories"}</span><span><Eye size={14} /> {formatViews(stats.views)} views</span><span><Heart size={14} /> {formatViews(stats.likes)} likes</span></div><VideoShelf title="Popular titles" linkLabel="All titles" href={`/creator/${profile.slug}#titles`} videos={popular.filter(video => video.views > 0)} /><section className="public-section" id="titles"><div className="shelf-heading"><div><span className="section-kicker">IN THIS COLLECTION</span><h2>Recent titles</h2></div></div>{videos.length ? <div className="video-grid">{videos.map(video => <VideoCard key={video.id} video={video} />)}</div> : <div className="vh-panel empty-state"><div className="empty-icon"><Play size={26} /></div><h3>A first story is on its way.</h3><p>Come back soon for something worth watching.</p></div>}</section></div>;
}
