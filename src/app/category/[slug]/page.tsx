import { notFound } from "next/navigation";
import { CATEGORIES } from "@/lib/data";
import { getPublicVideoCount, getPublicVideos } from "@/lib/video-store";
import VideoBrowser from "@/components/VideoBrowser";
import CatalogUnavailable from "@/components/CatalogUnavailable";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const category = CATEGORIES.find(c => c.slug === slug); return { title: category?.name || "Category", description: category?.description }; }
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = CATEGORIES.find(c => c.slug === slug);
  if (!category) notFound();
  const options = { category: slug };
  let videos: Awaited<ReturnType<typeof getPublicVideos>> | null = null, total = 0;
  try { [videos, total] = await Promise.all([getPublicVideos({ ...options, limit: 24 }), getPublicVideoCount(options)]); } catch { /* Show a service error, not a fabricated empty category. */ }
  return <div className="site-container pb-20"><div className="browse-heading premium-page-heading"><span className="section-kicker">FIND YOUR KIND OF STORY</span><h1>{category.name}.</h1><p>{category.description}</p></div>{videos ? <VideoBrowser key={slug} videos={videos} initialCategory={slug} initialTotal={total} /> : <CatalogUnavailable />}</div>;
}
