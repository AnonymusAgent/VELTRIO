import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BrandLogo } from "./Brand";

export default function Footer() {
  return <footer className="public-footer"><div className="site-container"><div className="footer-top"><div><BrandLogo /><p>Stories worth your time.</p></div><div className="footer-links"><Link href="/browse">Explore videos</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/dmca">Content removal</Link><Link href="/admin">Creator studio <ArrowUpRight size={13} /></Link></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} VELTRIO. All rights reserved.</span><span>INDEPENDENT STORIES. ONE HOME.</span></div></div></footer>;
}
