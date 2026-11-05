import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Clapperboard, Compass, Globe2, Music2, Play, Plus, Sparkles, BookOpen, Users, Radio, Upload } from "lucide-react";
import { CATEGORIES, formatViews, type Video } from "@/lib/data";
import { getPublicVideos } from "@/lib/video-store";
import VideoCard from "@/components/VideoCard";
import ContinueShelf from "@/components/ContinueShelf";
import CinemaRail from "@/components/CinemaRail";
import Reveal from "@/components/Reveal";
import HeroSpotlight from "@/components/HeroSpotlight";

export const dynamic = "force-dynamic";
const icons = [Clapperboard, Compass, Music2, Globe2, Sparkles, BookOpen];

function Shelf({ title, kicker, description, href, videos, ranked = false }: { title: string; kicker?: string; description?: string; href?: string; videos: Video[]; ranked?: boolean }) {
  if (!videos.length) return null;
  return <Reveal as="section" className="shelf">
    <div className="shelf-head">
      <div>
        {kicker && <span className="shelf-kicker">{kicker}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && <Link href={href} className="shelf-link">See all <ArrowRight size={14} /></Link>}
    </div>
    <CinemaRail label={title}>{videos.map((video, position) => <div className="rail-item" key={video.id}><VideoCard video={video} rank={ranked ? position + 1 : undefined} /></div>)}</CinemaRail>
  </Reveal>;
}

export default async function HomePage() {
  let recent: Video[] = [], featured: Video[] = [], trending: Video[] = [];
  let categoryVideos: Video[][] = [];
  let unavailable = false;
  try {
    [recent, featured, trending, categoryVideos] = await Promise.all([
      getPublicVideos({ limit: 48 }),
      getPublicVideos({ featured: true, limit: 8 }),
      getPublicVideos({ trending: true, sort: "popular", limit: 14 }),
      Promise.all(CATEGORIES.map(category => getPublicVideos({ category: category.slug, limit: 14 }))),
    ]);
  } catch { unavailable = true; }
  const billboard = (featured.length ? featured : trending.length ? trending : recent).slice(0, 5);
  const mostWatched = [...recent].sort((a, b) => b.views - a.views);
  const hasLibrary = recent.length > 0;

  return <div className="home-cinema">
    {!unavailable && billboard.length ? <HeroSpotlight items={billboard.map(item => ({ ...item, description: item.description || "" }))} /> : <section className="billboard billboard--static">
      <Image src="/images/veltrio-hero.jpg" alt="" fill priority sizes="100vw" className="billboard-art" />
      <div className="billboard-vignette" aria-hidden="true" />
      <div className="billboard-content site-container">
        <span className="billboard-badge"><i /> WELCOME TO VELTRIO</span>
        <h1 className="billboard-title">Every story deserves<br />a <em>big screen.</em></h1>
        <p className="billboard-copy">A creator-first streaming home for original films, music, travel and culture — built for the people who make them.</p>
        <div className="billboard-actions">
          <Link href="/browse" className="cta cta-play"><Play size={17} fill="currentColor" /> Start watching</Link>
          <Link href="/studio/upload" className="cta cta-info"><Upload size={16} /> Upload your video</Link>
        </div>
        <p className="billboard-credit">Stream in HD · Published by creators, curated by VELTRIO</p>
      </div>
    </section>}

    <div className="site-container home-body">
      {unavailable && <div className="catalog-notice" role="status"><strong>We couldn’t load the library right now.</strong><span>The catalog is briefly unavailable. Your saved stories will be here when the service returns.</span><Link href="/browse">Try the library <ArrowRight size={15} /></Link></div>}

      {!unavailable && <>
        <ContinueShelf videos={recent} />
        <Shelf title="Trending now" kicker="WHAT EVERYONE'S WATCHING" href="/trending" videos={trending.filter(video => video.views > 0)} />
        <Shelf title="New on VELTRIO" kicker="FRESHLY UPLOADED" href="/browse" videos={recent.slice(0, 14)} />
        <Shelf title="Top 10 today" kicker="THE CHARTS" href="/trending" videos={mostWatched.slice(0, 10)} ranked />
        <Shelf title="VELTRIO spotlight" kicker="HAND-PICKED" description="Stories our editors think you'll love." href="/browse" videos={featured} />

        {!hasLibrary && <Reveal as="section" className="first-upload">
          <div className="first-upload-copy">
            <span className="shelf-kicker">A SPACE FOR YOUR STORY</span>
            <h2>The first upload could be yours.</h2>
            <p>VELTRIO gives every creator a cinematic home: adaptive HD streaming, a real studio dashboard, and an audience that shows up for original work.</p>
            <div className="first-upload-actions"><Link href="/studio/upload" className="cta cta-play"><Upload size={16} /> Upload a video</Link><Link href="/studio" className="cta cta-info">Open creator studio <ArrowUpRight size={15} /></Link></div>
          </div>
          <div className="first-upload-art" aria-hidden="true"><span /><span /><span /><Play size={26} fill="currentColor" /></div>
        </Reveal>}

        <Reveal as="section" className="format-picks">
          <div className="shelf-head"><div><span className="shelf-kicker">EVERY KIND OF STORY</span><h2>Browse by genre</h2></div><Link href="/browse" className="shelf-link">Explore all <ArrowRight size={14} /></Link></div>
          <div className="genre-tiles">{CATEGORIES.map((category, index) => { const Icon = icons[index]; return <Link key={category.slug} href={`/category/${category.slug}`} className={`genre-tile genre-${index}`}>
            <span className="genre-glow" aria-hidden="true" />
            <Icon size={22} strokeWidth={1.4} />
            <span className="genre-tile-name">{category.name}</span>
            <span className="genre-tile-note">{category.description}</span>
            <span className="genre-tile-go"><ArrowUpRight size={14} /></span>
          </Link>; })}</div>
        </Reveal>

        {CATEGORIES.map((category, index) => <Shelf key={category.slug} title={category.name} href={`/category/${category.slug}`} videos={categoryVideos[index] || []} />)}

        <Reveal as="section" className="platform-band">
          <div className="platform-band-inner">
            <div><span className="shelf-kicker">BUILT FOR CREATORS</span><h2>Upload once. Stream everywhere.</h2><p>Direct resumable uploads, automatic transcoding, and adaptive playback that looks sharp on a phone and a cinema screen.</p></div>
            <div className="platform-stats">
              <div><Radio size={18} /><strong>Adaptive HD</strong><span>Auto quality up to 1080p</span></div>
              <div><Sparkles size={18} /><strong>Instant start</strong><span>HLS streaming, no buffering</span></div>
              <div><Users size={18} /><strong>Creator-first</strong><span>Your studio, your audience</span></div>
            </div>
          </div>
          <Link href="/studio/upload" className="cta cta-play"><Plus size={16} /> Start uploading</Link>
        </Reveal>

        {mostWatched.length > 0 && <Shelf title="Because you watched" kicker="KEEP EXPLORING" videos={mostWatched.slice(0, 14)} href="/browse" />}
      </>}
    </div>
  </div>;
}
