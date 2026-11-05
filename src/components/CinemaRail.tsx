"use client";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Horizontal content rail with arrow affordances, snap scrolling and keyboard
 * support — the familiar streaming-catalog interaction, with restrained motion.
 */
export default function CinemaRail({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const measure = useCallback(() => {
    const node = trackRef.current;
    if (!node) return;
    setEdges({ start: node.scrollLeft <= 4, end: node.scrollLeft + node.clientWidth >= node.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;
    measure();
    node.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => { node.removeEventListener("scroll", measure); observer.disconnect(); };
  }, [measure]);

  function scroll(direction: 1 | -1) {
    const node = trackRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * Math.max(node.clientWidth * 0.82, 260), behavior: "smooth" });
  }

  return <div className={`rail ${className}`}>
    <div ref={trackRef} className="rail-track no-scrollbar" tabIndex={0} role="group" aria-label={label}
      onKeyDown={event => {
        if (event.key === "ArrowRight") { event.preventDefault(); scroll(1); }
        if (event.key === "ArrowLeft") { event.preventDefault(); scroll(-1); }
      }}>{children}</div>
    <div className="rail-controls" aria-hidden={edges.start && edges.end}>
      <button type="button" className="rail-arrow rail-arrow-left" onClick={() => scroll(-1)} disabled={edges.start} aria-label="Scroll left"><ArrowLeft size={17} /></button>
      <button type="button" className="rail-arrow rail-arrow-right" onClick={() => scroll(1)} disabled={edges.end} aria-label="Scroll right"><ArrowRight size={17} /></button>
    </div>
  </div>;
}
