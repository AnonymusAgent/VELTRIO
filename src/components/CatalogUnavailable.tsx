import Link from "next/link";
import { CircleAlert, ArrowRight } from "lucide-react";
export default function CatalogUnavailable() {
  return <div className="catalog-notice" role="status"><CircleAlert size={20} /><strong>We couldn’t load the library right now.</strong><span>Please try again in a moment.</span><Link href="/browse">Try again <ArrowRight size={15} /></Link></div>;
}
