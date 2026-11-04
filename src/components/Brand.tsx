import Link from "next/link";

export function BrandMark({ className = "" }: { className?: string }) {
  return <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden="true"><path className="brand-ribbon-one" d="M6 9H22L40 48L27 57Z" fill="#FF684E" /><path className="brand-ribbon-two" d="M43 9H59L36 57H27L19 40L27 23L33 36Z" fill="#F23E46" /><path className="brand-play" d="M25 13L42 23L25 33V13Z" fill="#FFF1E6" /></svg>;
}
export function BrandLogo({ compact = false, className = "", href = "/" }: { compact?: boolean; className?: string; href?: string }) {
  return <Link href={href} aria-label="Video Hub home" className={`brand-logo ${className}`}><BrandMark className="h-10 w-10 shrink-0" />{!compact && <span>video<span className="font-light text-white/65">hub</span><span className="brand-period">.</span></span>}</Link>;
}
