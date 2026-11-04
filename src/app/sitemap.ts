import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getPublicVideos } from "@/lib/video-store";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || `${protocol}://${host}`;
  const pages = ["", "/browse", "/trending", "/privacy", "/terms", "/dmca", "/contact"];
  const catalog = await getPublicVideos();
  return [
    ...pages.map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === "" ? "hourly" as const : "weekly" as const, priority: path === "" ? 1 : 0.6 })),
    ...catalog.map((video) => ({ url: `${base}/video/${video.slug}`, lastModified: new Date(video.publishedAt), changeFrequency: "weekly" as const, priority: 0.8 })),
  ];
}
