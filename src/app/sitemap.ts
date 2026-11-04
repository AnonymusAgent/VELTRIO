import type { MetadataRoute } from "next";
import { getPublicVideos } from "@/lib/video-store";
import { getSiteBase } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = await getSiteBase();
  const pages = ["", "/browse", "/trending", "/creator/veltrio", "/privacy", "/terms", "/dmca", "/contact"];
  const catalog = await getPublicVideos();
  return [
    ...pages.map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "hourly" as const : "weekly" as const, priority: path === "" ? 1 : 0.6 })),
    ...catalog.map((video) => ({ url: `${base}/video/${video.slug}`, lastModified: new Date(video.publishedAt), changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
