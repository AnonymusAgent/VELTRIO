"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { AdSenseScript } from "./AdSense";

export default function AppChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/admin") || path.startsWith("/studio")) return <>{children}</>;
  return <><AdSenseScript /><Header /><main>{children}</main><Footer /></>;
}
