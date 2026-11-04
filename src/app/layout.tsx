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
import "./theme.css";
import "./premium.css";
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
  return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `(function(){var v;try{v=localStorage.getItem('veltrio-theme')}catch(e){} var t=v==='light'||v==='dark'?v:'dark';try{if(v!=='light'&&v!=='dark'&&matchMedia('(prefers-color-scheme: light)').matches)t='light'}catch(e){} document.documentElement.dataset.theme=t})();` }} /></head><body><BrandIntro /><AppChrome>{children}</AppChrome><AnalyticsConsent /></body></html>;
}
