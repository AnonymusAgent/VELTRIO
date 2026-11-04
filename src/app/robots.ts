import type { MetadataRoute } from "next";
import { getSiteBase } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const base = await getSiteBase();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/studio", "/telegram-setup", "/api/", "/my-list"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
