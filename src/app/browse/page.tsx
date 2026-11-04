import { getPublicVideoCount, getPublicVideos } from "@/lib/video-store";
import VideoBrowser from "@/components/VideoBrowser";
import CatalogUnavailable from "@/components/CatalogUnavailable";
export const dynamic = "force-dynamic";
export const metadata = { title: "Explore the library" };
export default async function Browse() {
  let data: Awaited<ReturnType<typeof getPublicVideos>> | null = null, total = 0;
  try { [data, total] = await Promise.all([getPublicVideos({ limit: 24 }), getPublicVideoCount()]); } catch { /* Render a retry state without inventing an empty catalog. */ }
  return <div className="site-container pb-20"><div className="browse-heading premium-page-heading"><span className="section-kicker">THE VELTRIO LIBRARY</span><h1>Find your next story.</h1><p>Discover original perspectives, made to stay with you.</p></div>{data ? <VideoBrowser videos={data} initialTotal={total} /> : <CatalogUnavailable />}</div>;
}
