import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Flag, Eye, CalendarDays } from "lucide-react";
import { formatViews } from "@/lib/data";
import { getSiteBase } from "@/lib/site-url";
import { getCommentsForVideo, getPublicVideo, getPublicVideos } from "@/lib/video-store";
import VideoCard from "@/components/VideoCard";
import VideoPlayer from "@/components/VideoPlayer";
import VideoActions from "@/components/VideoActions";
import { AdSenseAd } from "@/components/AdSense";
import { BrandMark } from "@/components/Brand";
import CommentForm from "./CommentForm";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const video = await getPublicVideo((await params).slug);
  if (!video) return { title: "Video not found" };
  return { metadataBase: new URL(await getSiteBase()), title: video.title, description: video.description.slice(0, 180), openGraph: { type: "video.other", title: video.title, description: video.description.slice(0, 180), images: [video.thumbnail] } };
}
export default async function VideoPage({ params }: { params: Promise<{ slug: string }> }) {
  const video = await getPublicVideo((await params).slug);
  if (!video) notFound();
  const [catalog, comments] = await Promise.all([getPublicVideos(), getCommentsForVideo(video.slug)]);
  const related = catalog.filter(v => v.id !== video.id).sort((a,b) => Number(b.categorySlug === video.categorySlug) - Number(a.categorySlug === video.categorySlug)).slice(0, 4);
  return <div className="site-container pb-14"><Link href="/browse" className="my-7 inline-flex items-center gap-2 text-[11px] text-zinc-500 hover:text-white"><ArrowLeft size={14} /> Back to the library</Link><VideoPlayer video={video} /><div className="mt-7 flex flex-wrap items-center justify-between gap-5"><div><Link href={`/category/${video.categorySlug}`} className="eyebrow text-[#e08a77]">{video.category}</Link><h1 className="mt-3 text-3xl font-medium tracking-tight sm:text-4xl">{video.title}</h1><div className="mt-4 flex flex-wrap gap-5 text-[11px] text-zinc-500"><span className="inline-flex items-center gap-1.5"><Eye size={13} /> {formatViews(video.views)} views</span><span className="inline-flex items-center gap-1.5"><CalendarDays size={12} /> {new Date(video.publishedAt).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}</span><span>{video.duration}</span></div></div><div className="flex flex-wrap gap-2"><VideoActions video={video} /></div></div><div className="mt-7 grid gap-8 lg:grid-cols-[1fr_300px]"><section><div className="vh-panel p-6"><div className="mb-4 flex items-center gap-3"><BrandMark className="h-8 w-8" /><div><strong className="text-xs font-semibold">Video Hub</strong><p className="mt-1 text-[10px] text-zinc-600">Published directly on Video Hub</p></div></div><p className="whitespace-pre-wrap text-xs leading-7 text-zinc-400">{video.description || "Enjoy this original upload on Video Hub."}</p><Link href="/dmca" className="mt-5 inline-flex items-center gap-1.5 text-[10px] text-zinc-600 hover:text-zinc-300"><Flag size={12} /> Report this video</Link></div><h2 className="mb-4 mt-9 text-xl">The conversation <span className="ml-2 text-sm text-zinc-600">{comments.length}</span></h2><CommentForm slug={video.slug} /><div className="mt-5 space-y-3">{!comments.length && <p className="py-5 text-center text-xs text-zinc-600">A fresh story. A fresh conversation. Be the first to comment.</p>}{comments.map(c => <div key={c.id} className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"><span className="user-avatar">{c.name.slice(0, 2).toUpperCase()}</span><div><strong className="text-xs">{c.name}</strong><p className="mt-1 whitespace-pre-wrap text-xs leading-6 text-zinc-400">{c.body}</p></div></div>)}</div></section><aside><AdSenseAd slotKey="sidebar" minHeight={250} /><div className="mt-5 border-t border-zinc-800 pt-5"><p className="eyebrow mb-4 text-zinc-500">YOUR NEXT WATCH</p><div className="space-y-6">{related.slice(0, 2).map(v => <VideoCard key={v.id} video={v} />)}{!related.length && <p className="text-xs leading-6 text-zinc-600">More stories are on their way. Check back soon.</p>}</div></div></aside></div></div>;
}
