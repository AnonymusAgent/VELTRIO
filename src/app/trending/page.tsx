import { getPublicVideoCount, getPublicVideos } from "@/lib/video-store";
import VideoBrowser from "@/components/VideoBrowser";
export const dynamic = "force-dynamic";
export const metadata = { title: "Most watched" };
export default async function TrendingPage() {
  const options = { sort: "popular" as const };
  const [videos, total] = await Promise.all([getPublicVideos({ ...options, limit: 24 }), getPublicVideoCount(options)]);
  return <div className="site-container pb-20"><div className="browse-heading"><span className="eyebrow text-[#9b8cff]">WORTH A SECOND LOOK</span><h1 className="mt-3">Most watched.</h1><p>Discover the stories drawing an audience on VELTRIO.</p></div><VideoBrowser videos={videos} initialTotal={total} popular /></div>;
}
