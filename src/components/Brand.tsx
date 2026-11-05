import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";

/**
 * The VELTRIO mark: a cinematic aperture that doubles as a play control inside
 * a soft-edged "V". Rendered as inline SVG so it can animate on hover.
 */
export function BrandMark({ className = "", animated = true }: { className?: string; animated?: boolean }) {
  return <svg className={`brand-mark${animated ? " brand-mark--live" : ""} ${className}`} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="veltrio-a" x1="6" y1="10" x2="58" y2="54" gradientUnits="userSpaceOnUse">
        <stop stopColor="#8B6BFF" />
        <stop offset=".55" stopColor="#C46BFF" />
        <stop offset="1" stopColor="#FF6B7E" />
      </linearGradient>
      <linearGradient id="veltrio-b" x1="20" y1="46" x2="46" y2="14" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FFC978" />
        <stop offset="1" stopColor="#FF7A93" />
      </linearGradient>
    </defs>
    <path className="brand-aperture" d="M32 4.5c15.19 0 27.5 12.31 27.5 27.5S47.19 59.5 32 59.5 4.5 47.19 4.5 32 16.81 4.5 32 4.5Z" stroke="url(#veltrio-a)" strokeWidth="1.4" strokeDasharray="3 6" strokeLinecap="round" opacity=".7" />
    <path className="brand-vshape" d="M12 14h12.4l7.6 20.1L39.6 14H52L37.4 51H26.6L12 14Z" fill="url(#veltrio-a)" />
    <path className="brand-beam" d="M39.6 14H52L37.4 51h-7.9l3.6-9.6L39.6 14Z" fill="url(#veltrio-b)" opacity=".92" />
    <path className="brand-play" d="M29.4 26.4l7.6 4.6c.9.6.9 1.9 0 2.4l-7.6 4.6c-1 .6-2.3-.1-2.3-1.2V27.6c0-1.1 1.3-1.8 2.3-1.2Z" fill="#0A0B12" opacity=".55" />
    <circle className="brand-spark" cx="49" cy="15.5" r="2.1" fill="#FFDCA8" />
  </svg>;
}

export function BrandLogo({ compact = false, className = "", href = "/" }: { compact?: boolean; className?: string; href?: string }) {
  return <Link href={href} aria-label={`${BRAND_NAME} home`} className={`brand-logo ${className}`}>
    <BrandMark className="brand-logo-mark" />
    {!compact && <span className="brand-wordmark">{BRAND_NAME}</span>}
  </Link>;
}
