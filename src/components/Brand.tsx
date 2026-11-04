import Link from "next/link";
import { BRAND_NAME } from "@/lib/brand";

export function BrandMark({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true">
    <path className="brand-orbit" d="M8 31C8 17.7 18.7 7 32 7s24 10.7 24 24-10.7 24-24 24" stroke="#2AD9D0" strokeWidth="1.35" strokeLinecap="round" strokeDasharray="2 5" />
    <path className="brand-v" d="M7 13h13l12 30 12-30h13L38 55H26L7 13Z" fill="#8068FF" />
    <path className="brand-v-accent" d="M44 13h13L38 55h-9l5-12 10-30Z" fill="#2AD9D0" opacity=".92" />
    <path className="brand-spark" d="m32 19 4.5 6.5L32 32l-4.5-6.5L32 19Z" fill="#FFF3DF" />
    <circle className="brand-node brand-node-one" cx="32" cy="9" r="2.25" fill="#FFB86B" />
    <circle className="brand-node brand-node-two" cx="23" cy="14" r="1.5" fill="#FFF3DF" />
    <circle className="brand-node brand-node-three" cx="41" cy="14" r="1.5" fill="#FFF3DF" />
  </svg>;
}

export function BrandLogo({ compact = false, className = "", href = "/" }: { compact?: boolean; className?: string; href?: string }) {
  return <Link href={href} aria-label={`${BRAND_NAME} home`} className={`brand-logo ${className}`}><BrandMark className="h-10 w-10 shrink-0" />{!compact && <span className="brand-wordmark">{BRAND_NAME}</span>}</Link>;
}
