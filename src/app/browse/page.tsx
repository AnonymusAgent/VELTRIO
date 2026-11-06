import { getPublicVideoCount, getPublicVideos } from "@/lib/video-store";
import VideoBrowser from "@/components/VideoBrowser";
import CatalogUnavailable from "@/components/CatalogUnavailable";
export const dynamic = "force-dynamic";
export const metadata = { title: "Explore" };
export default async function Browse() {
  let data: Awaited<ReturnType<typeof getPublicVideos>> | null = null, total = 0;
  try { [data, total] = await Promise.all([getPublicVideos({ limit: 24 }), getPublicVideoCount()]); } catch { /* Render a retry state without inventing an empty catalog. */ }
  return <div className="site-container pb-20"><div className="browse-heading premium-page-heading"><span className="section-kicker">EXPLORE</span><h1>Find your next story.</h1><p>Search the catalog by title, category and the stories drawing an audience.</p></div>{data ? <VideoBrowser videos={data} initialTotal={total} /> : <CatalogUnavailable />}</div>;
}
