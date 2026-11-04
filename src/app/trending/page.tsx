import { getPublicVideos } from "@/lib/video-store";
import VideoBrowser from "@/components/VideoBrowser";
export const dynamic = "force-dynamic";
export const metadata = { title: "Most watched" };
export default async function TrendingPage() { return <div className="site-container pb-20"><div className="browse-heading"><span className="eyebrow text-[#9b8cff]">WORTH A SECOND LOOK</span><h1 className="mt-3">Most watched.</h1><p>Discover the stories drawing an audience on VELTRIO.</p></div><VideoBrowser videos={await getPublicVideos()} popular /></div>; }
