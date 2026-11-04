import type { MetadataRoute } from "next";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || `${protocol}://${host}`;
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/studio", "/telegram-setup", "/api/", "/my-list"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
