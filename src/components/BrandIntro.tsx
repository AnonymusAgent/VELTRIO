"use client";
import { useEffect, useState } from "react";
import { BrandMark } from "./Brand";

export function BrandLoading({ fullscreen = false }: { fullscreen?: boolean }) {
  return <div className={fullscreen ? "brand-loading fullscreen" : "brand-loading"} role="status" aria-label="Loading Video Hub"><div className="brand-halo" /><div className="brand-loading-inner"><BrandMark className="intro-mark" /><div className="intro-wordmark">video<span>hub</span><b>.</b></div><p>EVERY STORY STARTS WITH PLAY.</p><div className="intro-progress"><span /></div></div></div>;
}
export default function BrandIntro() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const play = () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      clearTimeout(timer);
      setVisible(true);
      timer = setTimeout(() => setVisible(false), 1700);
    };
    try { if (!sessionStorage.getItem("vh-intro-seen") && localStorage.getItem("vh-intro-enabled") !== "false") { sessionStorage.setItem("vh-intro-seen", "1"); play(); } } catch {}
    window.addEventListener("videohub:replay-intro", play);
    return () => { clearTimeout(timer); window.removeEventListener("videohub:replay-intro", play); };
  }, []);
  if (!visible) return null;
  return <div className="intro-overlay"><BrandLoading fullscreen /><button className="intro-skip" onClick={() => setVisible(false)}>Skip intro ↗</button></div>;
}
