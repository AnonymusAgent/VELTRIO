import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, Clapperboard, Compass, Globe2, Music2, Play, Sparkles, BookOpen, Users, Radio } from "lucide-react";
import { CATEGORIES, type Video } from "@/lib/data";
import { getAccountWatching, getPublicVideos, getPublicVideosBySlugs, isContinuing } from "@/lib/video-store";
import { userAuth } from "@/lib/user-auth";
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
  let accountContinue: { slug: string; position: number }[] = [];
  try {
    const user = (await userAuth().getSession()).data?.user;
    if (user?.id) accountContinue = (await getAccountWatching(user.id)).filter(isContinuing);
  } catch { /* Signed-out viewing still uses this browser. */ }
  let continueVideos = recent;
  if (!unavailable && accountContinue.length) {
    const known = new Set(recent.map(video => video.slug));
    const missing = accountContinue.map(item => item.slug).filter(slug => !known.has(slug));
    if (missing.length) {
      try { continueVideos = [...await getPublicVideosBySlugs(missing), ...recent]; } catch { /* Shelf still uses the loaded catalog. */ }
    }
  }

  return <div className="home-cinema">
    {!unavailable && billboard.length ? <HeroSpotlight items={billboard.map(item => ({ ...item, description: item.description || "" }))} /> : <section className="billboard billboard--static">
      <Image src="/images/veltrio-hero.jpg" alt="" fill priority sizes="100vw" className="billboard-art" />
      <div className="billboard-vignette" aria-hidden="true" />
      <div className="billboard-content site-container">
        <span className="billboard-badge"><i /> WELCOME TO VELTRIO</span>
        <h1 className="billboard-title">Every story deserves<br />a <em>big screen.</em></h1>
        <p className="billboard-copy">A streaming home for original films, music, travel and culture. Sign in to pick up where you left off.</p>
        <div className="billboard-actions">
          <Link href="/browse" className="cta cta-play"><Play size={17} fill="currentColor" /> Start watching</Link>
          <Link href="/account" className="cta cta-info">Sign in</Link>
        </div>
        <p className="billboard-credit">Stream in HD · Titles added by VELTRIO</p>
      </div>
    </section>}

    <div className="site-container home-body">
      {unavailable && <div className="catalog-notice" role="status"><strong>We couldn’t load the library right now.</strong><span>The catalog is briefly unavailable. Your saved stories will be here when the service returns.</span><Link href="/browse">Try the library <ArrowRight size={15} /></Link></div>}

      {!unavailable && <>
        <ContinueShelf videos={continueVideos} accountContinue={accountContinue} />
        <Shelf title="Trending now" kicker="WHAT EVERYONE'S WATCHING" href="/trending" videos={trending.filter(video => video.views > 0)} />
        <Shelf title="New on VELTRIO" kicker="JUST ADDED" href="/browse" videos={recent.slice(0, 14)} />
        <Shelf title="Top 10 today" kicker="THE CHARTS" href="/trending" videos={mostWatched.slice(0, 10)} ranked />
        <Shelf title="VELTRIO spotlight" kicker="HAND-PICKED" description="Stories our editors think you'll love." href="/browse" videos={featured} />

        {!hasLibrary && <Reveal as="section" className="first-upload">
          <div className="first-upload-copy">
            <span className="shelf-kicker">THE LIBRARY</span>
            <h2>New titles are on the way.</h2>
            <p>VELTRIO is a streaming catalog. The publisher adds every title. Sign in to keep your place and build a list.</p>
            <div className="first-upload-actions"><Link href="/browse" className="cta cta-play"><Play size={16} fill="currentColor" /> Browse the catalog</Link><Link href="/account" className="cta cta-info">Sign in <ArrowUpRight size={15} /></Link></div>
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
            <div><span className="shelf-kicker">MADE FOR WATCHING</span><h2>Press play. We’ll remember your place.</h2><p>Adaptive HD on every screen. Sign in and your watch history follows you — uploading stays with the publisher.</p></div>
            <div className="platform-stats">
              <div><Radio size={18} /><strong>Adaptive HD</strong><span>Auto quality up to 1080p</span></div>
              <div><Sparkles size={18} /><strong>Instant start</strong><span>HLS streaming, no buffering</span></div>
              <div><Users size={18} /><strong>Your account</strong><span>History saved when you sign in</span></div>
            </div>
          </div>
          <Link href="/account" className="cta cta-play">Sign in to keep your place</Link>
        </Reveal>

        {mostWatched.length > 0 && <Shelf title="Because you watched" kicker="KEEP EXPLORING" videos={mostWatched.slice(0, 14)} href="/browse" />}
      </>}
    </div>
  </div>;
}
