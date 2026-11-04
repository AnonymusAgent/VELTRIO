import type { Metadata } from "next";
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
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: { default: "Video Hub — Every story starts with play", template: "%s | Video Hub" },
  description: "A home for original stories worth watching. Explore films, travel, music and more, uploaded and published directly on Video Hub.",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><BrandIntro /><AppChrome>{children}</AppChrome><SpeedInsights /></body></html>;
}
