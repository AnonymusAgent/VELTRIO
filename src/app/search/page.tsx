import { getPublicVideos } from "@/lib/video-store";
import VideoBrowser from "@/components/VideoBrowser";
export const dynamic = "force-dynamic";
export const metadata = { title: "Search videos" };
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  return <div className="site-container pb-20"><div className="browse-heading"><span className="eyebrow text-[#b88375]">FOLLOW YOUR CURIOSITY</span><h1 className="mt-3">Find your next story.</h1><p>{q ? `Searching the library for “${q}”.` : "Search by title, description or category."}</p></div><VideoBrowser videos={await getPublicVideos()} initialQuery={q} /></div>;
}
