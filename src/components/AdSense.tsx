"use client";
import { useEffect, useRef } from "react";
import { adsenseConfig } from "@/lib/adsense";

declare global { interface Window { adsbygoogle?: Record<string, unknown>[]; } }
type Props = { slot?: string; slotKey?: keyof typeof adsenseConfig.slots; format?: string; style?: React.CSSProperties; className?: string; label?: string; minHeight?: number };
export function AdSenseAd({ slot, slotKey, format = "auto", style, className = "", minHeight = 90 }: Props) {
  const pushed = useRef(false);
  const resolved = slot || (slotKey ? adsenseConfig.slots[slotKey] : "");
  const live = /^ca-pub-\d{16}$/.test(adsenseConfig.client) && /^\d+$/.test(resolved);
  useEffect(() => { if (live && !pushed.current) { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); pushed.current = true; } catch {} } }, [live]);
  if (!live) return null;
  return <div className={`overflow-hidden ${className}`} style={{ minHeight }}><p className="mb-2 text-center text-[9px] uppercase tracking-[.2em] text-zinc-600">Advertisement</p><ins className="adsbygoogle" style={{ display: "block", ...style }} data-ad-client={adsenseConfig.client} data-ad-slot={resolved} data-ad-format={format} data-full-width-responsive="true" /></div>;
}
export function AdSenseScript() {
  useEffect(() => {
    if (!/^ca-pub-\d{16}$/.test(adsenseConfig.client) || document.getElementById("vh-adsense")) return;
    const script = document.createElement("script");
    script.id = "vh-adsense"; script.async = true; script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseConfig.client}`;
    document.head.appendChild(script);
  }, []);
  return null;
}
