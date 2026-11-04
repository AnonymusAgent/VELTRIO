import { notFound } from "next/navigation";
import { CATEGORIES } from "@/lib/data";
import { getPublicVideos } from "@/lib/video-store";
import VideoBrowser from "@/components/VideoBrowser";
export const dynamic = "force-dynamic";
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = CATEGORIES.find(c => c.slug === slug);
  if (!category) notFound();
  return <div className="site-container pb-20"><div className="browse-heading"><span className="eyebrow text-[#9b8cff]">FIND YOUR KIND OF STORY</span><h1 className="mt-3">{category.name}.</h1><p>{category.description}</p></div><VideoBrowser videos={await getPublicVideos()} initialCategory={slug} /></div>;
}
