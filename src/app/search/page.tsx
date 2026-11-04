import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPublicVideoCount, getPublicVideos } from "@/lib/video-store";
import { searchCreatorProfiles } from "@/lib/creator-store";
import VideoBrowser from "@/components/VideoBrowser";
import CatalogUnavailable from "@/components/CatalogUnavailable";
export const dynamic = "force-dynamic";
export const metadata = { title: "Search videos" };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const options = { query: q.slice(0, 160) };
  let videos: Awaited<ReturnType<typeof getPublicVideos>> | null = null, total = 0;
  let creators: Awaited<ReturnType<typeof searchCreatorProfiles>> = [];
  try { [videos, total, creators] = await Promise.all([getPublicVideos({ ...options, limit: 24 }), getPublicVideoCount(options), searchCreatorProfiles(options.query)]); } catch { /* Retain an actionable service error. */ }
  return <div className="site-container pb-20"><div className="browse-heading premium-page-heading"><span className="section-kicker">SEARCH THE LIBRARY</span><h1>Find something good.</h1><p>{q ? `Results for “${q}”` : "Search by title, description, creator or category."}</p></div>{creators.length > 0 && <section className="creator-results"><div className="shelf-heading"><div><h2>Creators</h2><p>Profiles matching “{q}”</p></div></div><div className="creator-result-list">{creators.map(creator => <Link key={creator.id} href={`/creator/${creator.slug}`} className="creator-result"><span className="creator-result-avatar">{creator.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{creator.displayName}</strong><small>View creator profile</small></span><ArrowUpRight size={16} /></Link>)}</div></section>}{videos ? <VideoBrowser key={q} videos={videos} initialQuery={q} initialTotal={total} searchPage /> : <><form action="/search" className="search-fallback"><input name="q" aria-label="Search library" defaultValue={q} placeholder="Search stories and creators" /><button className="vh-button" type="submit">Search</button></form><CatalogUnavailable /></>}</div>;
}
