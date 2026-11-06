import { getPublicVideoCount, getPublicVideos } from "@/lib/video-store";
import VideoBrowser from "@/components/VideoBrowser";
import CatalogUnavailable from "@/components/CatalogUnavailable";
export const dynamic = "force-dynamic";
export const metadata = { title: "Most watched" };
export default async function TrendingPage() {
  const options = { sort: "popular" as const };
  let videos: Awaited<ReturnType<typeof getPublicVideos>> | null = null, total = 0;
  try { [videos, total] = await Promise.all([getPublicVideos({ ...options, limit: 24 }), getPublicVideoCount(options)]); } catch { /* Retain an actionable service error. */ }
  return <div className="site-container pb-20"><div className="browse-heading premium-page-heading"><span className="section-kicker">TRENDING</span><h1>Most watched.</h1><p>Stories drawing an audience on VELTRIO. Rankings use real view counts.</p></div>{videos ? <VideoBrowser videos={videos} initialTotal={total} popular /> : <CatalogUnavailable />}</div>;
}
