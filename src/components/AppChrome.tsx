"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";
import { AuthTransitionProvider } from "./AuthTransition";
import { AdSenseScript } from "./AdSense";

export default function AppChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/admin")) return <>{children}</>;
  return <AuthTransitionProvider><AdSenseScript /><a className="skip-link" href="#main-content">Skip to content</a><Header /><main id="main-content" tabIndex={-1}>{children}</main><Footer /></AuthTransitionProvider>;
}
