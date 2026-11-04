"use client";
import Link from "next/link";
import { CircleAlert, RotateCcw } from "lucide-react";
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="site-container route-state"><div className="vh-panel"><CircleAlert size={28} /><span className="section-kicker">SOMETHING WENT WRONG</span><h1>We couldn’t load this page.</h1><p>Please try again. If the problem continues, come back in a little while.</p><div><button className="vh-button" onClick={reset}><RotateCcw size={14} /> Try again</button><Link className="vh-button secondary" href="/">Back to home</Link></div></div></div>;
}
