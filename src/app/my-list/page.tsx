import { getPublicVideos } from "@/lib/video-store";
import VideoBrowser from "@/components/VideoBrowser";
export const dynamic = "force-dynamic";
export const metadata = { title: "My list" };
export default async function MyList() { return <div className="site-container pb-20"><div className="browse-heading"><span className="eyebrow text-[#b88375]">SAVED FOR A GOOD MOMENT</span><h1 className="mt-3">Your next watch.</h1><p>The stories you saved, right where you left them. Stored in this browser.</p></div><VideoBrowser videos={await getPublicVideos()} savedOnly /></div>; }
