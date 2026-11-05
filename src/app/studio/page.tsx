import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { BarChart3, Eye, Film, Radio, Sparkles, Upload } from "lucide-react";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { userAuth } from "@/lib/user-auth";
import { isMuxEnabled } from "@/lib/mux-stream";
import { formatViews } from "@/lib/data";
import CreatorVideoActions from "@/components/CreatorVideoActions";
import Reveal from "@/components/Reveal";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creator studio" };

export default async function CreatorStudio() {
  let user;
  try { user = (await userAuth().getSession()).data?.user; } catch { /* Service not configured. */ }
  if (!user) redirect("/account");
  const owned = await db.select().from(videos).where(and(eq(videos.ownerUserId, user.id), ne(videos.status, "deleted"))).orderBy(desc(videos.createdAt));
  const published = owned.filter(video => video.status === "published");
  const totalViews = owned.reduce((sum, video) => sum + (video.views || 0), 0);
  const totalLikes = owned.reduce((sum, video) => sum + (video.likes || 0), 0);
  const streaming = isMuxEnabled();
  return <div className="studio-shell"><div className="site-container">
    <Reveal className="studio-hero">
      <div>
        <span className="shelf-kicker">CREATOR STUDIO</span>
        <h1>Welcome back, {(user.name || "creator").split(" ")[0]}<span className="accent-dot">.</span></h1>
        <p>{streaming ? "Your channel streams in adaptive HD. Upload a story, publish it, and share it with the world." : "Upload a story, publish it, and share it with the world."}</p>
        <div className="studio-hero-actions">
          <Link href="/studio/upload" className="cta cta-play"><Upload size={16} /> Upload a video</Link>
          <Link href="/browse" className="cta cta-info">Browse the library</Link>
        </div>
      </div>
      <div className="studio-hero-orbs" aria-hidden="true"><span /><span /><span /><Sparkles size={22} /></div>
    </Reveal>

    <div className="studio-metrics">
      <div><Film size={17} /><span>Videos</span><strong>{owned.length}</strong><small>{published.length} published</small></div>
      <div><Eye size={17} /><span>Total views</span><strong>{formatViews(totalViews)}</strong><small>Across your channel</small></div>
      <div><BarChart3 size={17} /><span>Likes</span><strong>{formatViews(totalLikes)}</strong><small>From your audience</small></div>
      <div><Radio size={17} /><span>Streaming</span><strong>{streaming ? "Adaptive HD" : "Standard"}</strong><small>{streaming ? "Powered by Mux" : "Configure streaming in settings"}</small></div>
    </div>

    <Reveal as="section" className="studio-library">
      <div className="shelf-head"><div><span className="shelf-kicker">YOUR CHANNEL</span><h2>Your videos</h2></div><Link href="/studio/upload" className="shelf-link"><Upload size={13} /> New upload</Link></div>
      {owned.length ? <div className="studio-video-list">{owned.map(video => <article key={video.id} className="studio-video-row">
        <div className="studio-video-thumb"><span>{video.title.slice(0, 1).toUpperCase()}</span></div>
        <div className="studio-video-copy">
          <div className="studio-video-title-row"><h3>{video.status === "published" ? <Link href={`/video/${video.slug}`}>{video.title}</Link> : video.title}</h3><span className={`status-badge ${video.status}`}>{video.status}</span></div>
          <p>{video.categoryName || "Uncategorized"} · {video.duration || "0:00"} · {formatViews(video.views || 0)} views</p>
          {video.status !== "published" && video.muxPlaybackId && <Link href={`/video/${video.slug}`} className="studio-video-link">Preview draft</Link>}
          {video.status !== "published" && !video.muxPlaybackId && video.mediaAssetId && <a href={`/api/media/${video.mediaAssetId}`} target="_blank" rel="noreferrer" className="studio-video-link">Preview draft</a>}
        </div>
        <div className="studio-video-actions"><CreatorVideoActions id={video.id} status={video.status} rightsConfirmed={video.rightsConfirmed} title={video.title} description={video.description || ""} categorySlug={video.categorySlug || "short-films"} /></div>
      </article>)}</div> : <div className="studio-empty"><Film size={26} /><div><h3>Your channel is ready for its first story.</h3><p>Upload an MP4 or MOV and VELTRIO will process it into an adaptive stream your audience can watch anywhere.</p></div><Link href="/studio/upload" className="cta cta-play"><Upload size={15} /> Upload your first video</Link></div>}
    </Reveal>
    <p className="studio-note-line">Creator monetization and payouts are not configured. Views and likes shown here are public engagement counts.</p>
  </div></div>;
}
