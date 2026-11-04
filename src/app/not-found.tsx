import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
export default function NotFound() {
  return <div className="site-container route-state"><div className="vh-panel"><Compass size={28} /><span className="section-kicker">NOT FOUND · 404</span><h1>This story took another path.</h1><p>The page you’re looking for isn’t here, but there’s more to discover.</p><div><Link className="vh-button" href="/browse">Explore the library <ArrowRight size={14} /></Link><Link className="vh-button secondary" href="/">Back to home</Link></div></div></div>;
}
