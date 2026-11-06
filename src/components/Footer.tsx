import Link from "next/link";
import { BrandLogo } from "./Brand";
import { BRAND_SUPPORT, BRAND_TAGLINE, BRAND_TAGLINE_UPPER } from "@/lib/brand";

export default function Footer() {
  return <footer className="public-footer"><div className="site-container">
    <div className="footer-top">
      <div className="footer-brand"><BrandLogo /><p>{BRAND_TAGLINE}</p><p className="footer-support">{BRAND_SUPPORT}</p></div>
      <div className="footer-columns">
        <nav aria-label="Discover"><span>Discover</span><Link href="/browse">Explore</Link><Link href="/trending">Trending</Link><Link href="/#categories">Categories</Link><Link href="/my-list">My list</Link></nav>
        <nav aria-label="Account"><span>Account</span><Link href="/account">Sign in</Link><Link href="/settings">Settings</Link><Link href="/my-list">Watch history</Link></nav>
        <nav aria-label="VELTRIO"><span>VELTRIO</span><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/dmca">Content removal</Link></nav>
      </div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} VELTRIO. All rights reserved.</span><span>{BRAND_TAGLINE_UPPER}</span></div>
  </div></footer>;
}
