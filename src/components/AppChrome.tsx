"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import Header from "./Header";
import { ThemeProvider } from "./ThemeProvider";
import Footer from "./Footer";
import { AuthTransitionProvider } from "./AuthTransition";

export default function AppChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  if (path.startsWith("/admin")) return <>{children}</>;
  return <ThemeProvider><AuthTransitionProvider><div className="public-app"><a className="skip-link" href="#main-content">Skip to content</a><Header /><main id="main-content" tabIndex={-1}>{children}</main><Footer /></div></AuthTransitionProvider></ThemeProvider>;
}
