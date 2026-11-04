import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Clapperboard, Compass, Music2, Globe2, Sparkles, BookOpen, Play, Plus, Info } from "lucide-react";
import { CATEGORIES } from "@/lib/data";
import { getPublicVideos } from "@/lib/video-store";
import VideoShelf from "@/components/VideoShelf";
import ContinueShelf from "@/components/ContinueShelf";
import { AdSenseAd } from "@/components/AdSense";
import type { Video } from "@/lib/data";
export const dynamic = "force-dynamic";
const icons = [Clapperboard, Compass, Music2, Globe2, Sparkles, BookOpen];

export default async function HomePage() {
  let recent: Video[] = [], featured: Video[] = [], trending: Video[] = [];
  let unavailable = false;
  try {
    [recent, featured, trending] = await Promise.all([
      getPublicVideos({ limit: 48 }),
      getPublicVideos({ featured: true, limit: 12 }),
      getPublicVideos({ trending: true, sort: "popular", limit: 12 }),
    ]);
  } catch { unavailable = true; }
  const spotlight = featured[0] || recent[0];
  return <>
    <section className="cinema-hero premium-hero"><Image src={spotlight?.thumbnail || "/images/veltrio-landscape.jpg"} alt="" unoptimized={!!spotlight && /^https?:\/\//i.test(spotlight.thumbnail)} fill priority sizes="100vw" className="cinema-hero-image" /><div className="cinema-shade" /><div className="site-container cinema-hero-content"><div className="hero-kicker"><span className="hero-kicker-mark" />{spotlight ? (spotlight.isFeatured ? "THE VELTRIO SPOTLIGHT" : "NEW ON VELTRIO") : "INDEPENDENT STORIES. ONE HOME."}</div><h1>{spotlight ? spotlight.title : <>Stories worth<br /><em>your time.</em></>}</h1><p className="cinema-hero-description">{spotlight ? spotlight.description.slice(0, 180) || "Discover an original story on VELTRIO." : "A home for original voices, fresh perspectives, and the stories that stay with you."}</p>{spotlight && <div className="hero-meta"><span>{spotlight.category}</span><span>•</span><span>{spotlight.duration}</span><span>•</span><span>{spotlight.creator || "VELTRIO"}</span></div>}<div className="hero-actions">{spotlight ? <><Link href={`/video/${spotlight.slug}`} className="vh-button hero-primary"><Play size={16} fill="currentColor" /> Watch now</Link><Link href={`/video/${spotlight.slug}#about`} className="vh-button hero-secondary"><Info size={16} /> More information</Link></> : <><Link href="/browse" className="vh-button hero-primary"><Play size={16} fill="currentColor" /> Explore stories</Link><Link href="/studio" className="vh-button hero-secondary"><ArrowUpRight size={16} /> Creator studio</Link></>}</div></div><div className="hero-side-note"><span>AN INDEPENDENT PERSPECTIVE</span><span>01 / DISCOVER</span></div><div className="hero-bottom-line"><span>CURATED FOR THE CURIOUS</span><ArrowDownRight size={16} /></div></section>
    <div className="site-container home-discovery" id="the-library">
      {unavailable ? <div className="catalog-notice" role="status"><strong>We couldn’t load the library right now.</strong><span>Please try again in a moment. Your saved stories will be here when the service is available.</span><Link href="/browse">Try the library <ArrowRight size={15} /></Link></div> : <>
        <ContinueShelf videos={recent} />
        <VideoShelf title="Trending now" description="Stories people are watching." href="/trending" videos={trending.filter(video => video.views > 0)} />
        <VideoShelf title="Featured stories" description="Handpicked for a closer look." href="/browse" linkLabel="Explore library" videos={featured} />
        <VideoShelf title="Recently uploaded" description="Fresh perspectives from the community." href="/browse" videos={recent.slice(0, 12)} />
        {!recent.length && <div className="empty-editorial"><div className="empty-editorial-mark"><Clapperboard size={25} /></div><div><span className="eyebrow">A SPACE FOR STORIES</span><h2>The first story could be yours.</h2><p>The library is waiting for its first upload. Explore the studio and make something worth watching.</p></div><Link href="/studio/upload" className="vh-button secondary"><Plus size={15} /> Upload a story</Link></div>}
        {CATEGORIES.map(category => <VideoShelf key={category.slug} title={category.name} href={`/category/${category.slug}`} videos={recent.filter(video => video.categorySlug === category.slug).slice(0, 12)} />)}
      </>}
      <section className="category-discovery" id="categories"><div className="shelf-heading"><div><span className="section-kicker">FIND YOUR PERSPECTIVE</span><h2>Explore by category</h2><p>Follow your curiosity, wherever it leads.</p></div><Link href="/browse">Explore all <ArrowUpRight size={15} /></Link></div><div className="category-grid">{CATEGORIES.map((category, index) => { const Icon = icons[index]; return <Link href={`/category/${category.slug}`} className="category-tile" key={category.slug}><span className="category-number">0{index + 1}</span><Icon size={21} strokeWidth={1.5} /><span className="category-name">{category.name}</span><ArrowUpRight size={15} className="category-arrow" /></Link>; })}</div></section>
      <AdSenseAd slotKey="header" minHeight={90} className="my-4" /><section className="editorial-creator"><div><span className="section-kicker">MADE FOR ORIGINAL VOICES</span><h2>Your story belongs here.</h2><p>Make it personal. Make it memorable. Make it yours.</p></div><Link href="/studio" className="vh-button secondary">Explore creator studio <ArrowUpRight size={15} /></Link></section>
    </div>
  </>;
}
