"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Apple-TV-style entry motion: content fades and rises into place the first time
 * it scrolls into view. Motion is disabled entirely for reduced-motion users and
 * JS-less renderers fall back to visible content.
 */
export default function Reveal({ children, delay = 0, className = "", id, as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; id?: string; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observer = new IntersectionObserver(entries => {
      if (reduced || entries.some(entry => entry.isIntersecting)) { setShown(true); observer.disconnect(); }
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    observer.observe(node);
    if (reduced) observer.takeRecords();
    return () => observer.disconnect();
  }, []);
  return <Tag ref={ref as never} id={id} className={`reveal${shown ? " is-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
}
