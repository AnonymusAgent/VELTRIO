import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Flag, Eye, CalendarDays } from "lucide-react";
import { formatViews } from "@/lib/data";
import { getSiteBase } from "@/lib/site-url";
import { getCommentsForVideo, getPublicVideo, getPublicVideos } from "@/lib/video-store";
import { getCreatorProfileForVideo } from "@/lib/creator-store";
import VideoCard from "@/components/VideoCard";
import VideoPlayer from "@/components/VideoPlayer";
import VideoActions from "@/components/VideoActions";
import CreatorFollowButton from "@/components/CreatorFollowButton";
import { getPrerollPath } from "@/lib/video-ad";
import { BrandMark } from "@/components/Brand";
import CommentForm from "./CommentForm";
import ReportForm from "@/components/ReportForm";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const video = await getPublicVideo((await params).slug);
  if (!video) return { title: "Video not found" };
  return { metadataBase: new URL(await getSiteBase()), title: video.title, description: video.description.slice(0, 180), openGraph: { type: "video.other", title: video.title, description: video.description.slice(0, 180), images: [video.thumbnail] } };
}
export default async function VideoPage({ params }: { params: Promise<{ slug: string }> }) {
  const video = await getPublicVideo((await params).slug);
  if (!video) notFound();
  const [catalog, comments, profile] = await Promise.all([getPublicVideos({ limit: 48 }), getCommentsForVideo(video.slug), getCreatorProfileForVideo(video.id)]);
  const related = catalog.filter(v => v.id !== video.id).sort((a,b) => Number(b.categorySlug === video.categorySlug) - Number(a.categorySlug === video.categorySlug)).slice(0, 6);
  return <div className="site-container watch-page pb-14"><Link href="/browse" className="watch-back"><ArrowLeft size={15} /> Back to explore</Link><div className="watch-layout"><div className="watch-main"><VideoPlayer key={video.slug} video={video} prerollPath={getPrerollPath()} /><div className="watch-heading"><div><Link href={`/category/${video.categorySlug}`} className="section-kicker">{video.category}</Link><h1>{video.title}</h1><div className="watch-meta"><span><Eye size={14} /> {formatViews(video.views)} views</span><span><CalendarDays size={14} /> {new Date(video.publishedAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span><span>{video.duration}</span></div></div><div className="watch-actions"><VideoActions video={video} /></div></div><section className="watch-about vh-panel" id="about"><div className="watch-creator"><BrandMark className="h-10 w-10" /><div>{profile ? <Link href={`/creator/${profile.slug}`} className="watch-creator-name">{profile.displayName}</Link> : <span className="watch-creator-name">{video.creator || "VELTRIO"}</span>}<p>Published on VELTRIO</p></div>{profile && <CreatorFollowButton slug={profile.slug} />}</div><details className="watch-description"><summary>About this story</summary><p className="whitespace-pre-wrap">{video.description || "Enjoy this original upload on VELTRIO."}</p></details><div className="watch-report"><Link href="/dmca"><Flag size={12} /> Copyright removal</Link><ReportForm videoSlug={video.slug} /></div></section><section className="watch-comments"><div className="shelf-heading"><div><span className="section-kicker">THE CONVERSATION</span><h2>Comments <span>{comments.length}</span></h2></div></div><CommentForm slug={video.slug} /><div className="mt-5 space-y-3">{!comments.length && <p className="py-5 text-sm text-zinc-500">Be the first to share a thoughtful comment.</p>}{comments.map(c => <div key={c.id} className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"><span className="user-avatar">{c.name.slice(0, 2).toUpperCase()}</span><div><strong className="text-xs">{c.name}</strong><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-zinc-400">{c.body}</p></div></div>)}</div></section></div><aside className="watch-next"><div className="shelf-heading"><div><span className="section-kicker">KEEP WATCHING</span><h2>Up next</h2></div>{related[0] && <Link href={`/video/${related[0].slug}`}>Next <ArrowRight size={15} /></Link>}</div><div className="watch-next-list">{related.map(v => <VideoCard key={v.id} video={v} />)}{!related.length && <p>More stories are on their way. Check back soon.</p>}</div></aside></div></div>;
}
