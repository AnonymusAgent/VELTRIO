import { getPublicVideos } from "@/lib/video-store";
import VideoBrowser from "@/components/VideoBrowser";
import CatalogUnavailable from "@/components/CatalogUnavailable";
export const dynamic = "force-dynamic";
export const metadata = { title: "My list" };
export default async function MyList() {
  let videos: Awaited<ReturnType<typeof getPublicVideos>> | null = null;
  try { videos = await getPublicVideos(); } catch { /* A service failure is not an empty list. */ }
  return <div className="site-container pb-20"><div className="browse-heading premium-page-heading"><span className="section-kicker">YOUR PERSONAL LIBRARY</span><h1>Made for later.</h1><p>Saved stories and viewing progress, kept on this browser.</p></div>{videos ? <VideoBrowser videos={videos} savedOnly /> : <CatalogUnavailable />}</div>;
}
