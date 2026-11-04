"use client";
import { useEffect, useState } from "react";
import { BRAND_NAME, BRAND_TAGLINE_UPPER } from "@/lib/brand";
import { BrandMark } from "./Brand";

export function BrandLoading({ fullscreen = false }: { fullscreen?: boolean }) {
  return <div className={fullscreen ? "brand-loading fullscreen" : "brand-loading"} role="status" aria-label={`Loading ${BRAND_NAME}`}>
    <div className="brand-halo" />
    <div className="brand-loading-inner">
      <div className="brand-orbit-stage"><BrandMark className="intro-mark" /></div>
      <div className="intro-wordmark">{BRAND_NAME}</div>
      <p>{BRAND_TAGLINE_UPPER}</p>
      <div className="intro-progress"><span /></div>
    </div>
  </div>;
}

export default function BrandIntro() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const play = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      clearTimeout(timer);
      setVisible(true);
      timer = setTimeout(() => setVisible(false), 2000);
    };
    try {
      if (!sessionStorage.getItem("veltrio-intro-seen") && localStorage.getItem("veltrio-intro-enabled") !== "false") {
        sessionStorage.setItem("veltrio-intro-seen", "1");
        play();
      }
    } catch {}
    window.addEventListener("veltrio:replay-intro", play);
    return () => { clearTimeout(timer); window.removeEventListener("veltrio:replay-intro", play); };
  }, []);
  if (!visible) return null;
  return <div className="intro-overlay"><BrandLoading fullscreen /><button className="intro-skip" onClick={() => setVisible(false)}>Skip intro ↗</button></div>;
}
