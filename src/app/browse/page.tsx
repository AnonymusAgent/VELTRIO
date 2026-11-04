import { getPublicVideos } from "@/lib/video-store";
import VideoBrowser from "@/components/VideoBrowser";
export const dynamic = "force-dynamic";
export const metadata = { title: "Explore the library" };
export default async function Browse() {
  return <div className="site-container pb-20"><div className="browse-heading"><span className="eyebrow text-[#b88375]">FIND SOMETHING THAT STAYS WITH YOU</span><h1 className="mt-3">A world of stories.</h1><p>Original uploads. Fresh perspectives. All in one place.</p></div><VideoBrowser videos={await getPublicVideos()} /></div>;
}
