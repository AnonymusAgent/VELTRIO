import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, Heart, Play } from "lucide-react";
import { getCreatorProfile, getCreatorStats, getCreatorVideos } from "@/lib/creator-store";
import CreatorFollowButton from "@/components/CreatorFollowButton";
import VideoCard from "@/components/VideoCard";
import { formatViews } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function CreatorPage({ params }: { params: Promise<{ slug: string }> }) {
  const profile = await getCreatorProfile((await params).slug);
  if (!profile) notFound();
  const [videos, stats] = await Promise.all([getCreatorVideos(profile, 24), getCreatorStats(profile)]);
  return <div className="site-container pb-20"><Link href="/browse" className="my-7 inline-flex items-center gap-2 text-[11px] text-zinc-500 hover:text-white"><ArrowLeft size={14} /> Back to the library</Link><section className="creator-profile-hero"><Image src={profile.bannerUrl || "/images/veltrio-landscape.jpg"} alt="" fill sizes="100vw" className="creator-profile-banner" /><div className="creator-profile-shade" /><div className="creator-profile-copy"><div className="creator-profile-avatar"><Image src={profile.avatarUrl || "/icon.svg"} alt="" fill sizes="96px" /></div><div><span className="eyebrow text-[#9b8cff]">CREATOR PROFILE</span><h1>{profile.displayName}</h1><p>{profile.bio}</p><CreatorFollowButton slug={profile.slug} /></div></div></section><div className="creator-profile-stats"><span><Play size={14} /> {stats.videos} published {stats.videos === 1 ? "story" : "stories"}</span><span><Eye size={14} /> {formatViews(stats.views)} views</span><span><Heart size={14} /> {formatViews(stats.likes)} likes</span></div><section className="public-section"><div className="section-heading"><div><span className="eyebrow text-zinc-600">PUBLISHED DIRECTLY</span><h2>Stories from {profile.displayName}.</h2></div></div>{videos.length ? <div className="video-grid">{videos.map(video => <VideoCard key={video.id} video={video} />)}</div> : <div className="vh-panel empty-state"><div className="empty-icon"><Play size={26} /></div><h3>A first story is on its way.</h3><p>Come back soon for something worth watching.</p></div>}</section></div>;
}
