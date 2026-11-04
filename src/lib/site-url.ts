import { headers } from "next/headers";

// Canonical site origin for metadata, robots.txt and sitemap.xml. Honors the
// public site URL override, then the proxy-forwarded host, then the request host.
export async function getSiteBase() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return (process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`).replace(/\/$/, "");
}
