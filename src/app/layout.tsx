import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "@fontsource/outfit/800.css";
import "./globals.css";
import AppChrome from "@/components/AppChrome";
import BrandIntro from "@/components/BrandIntro";
import AnalyticsConsent from "@/components/AnalyticsConsent";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0c0d14",
};

export const metadata: Metadata = {
  title: { default: `${BRAND_NAME} — ${BRAND_TAGLINE}`, template: `%s | ${BRAND_NAME}` },
  description: `A home for original stories worth watching. Explore films, travel, music and more, uploaded and published directly on ${BRAND_NAME}.`,
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><BrandIntro /><AppChrome>{children}</AppChrome><AnalyticsConsent /></body></html>;
}
