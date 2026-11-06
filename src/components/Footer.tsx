import Link from "next/link";
import { BrandLogo } from "./Brand";
import { BRAND_TAGLINE, BRAND_TAGLINE_UPPER } from "@/lib/brand";

export default function Footer() {
  return <footer className="public-footer"><div className="site-container">
    <div className="footer-top">
      <div><BrandLogo /><p>{BRAND_TAGLINE}</p></div>
      <div className="footer-links"><Link href="/browse">Explore</Link><Link href="/trending">Trending</Link><Link href="/my-list">My list</Link><Link href="/account">Sign in</Link><Link href="/settings">Settings</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/dmca">Content removal</Link><Link href="/contact">Contact</Link></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} VELTRIO. All rights reserved.</span><span>{BRAND_TAGLINE_UPPER}</span></div>
  </div></footer>;
}
