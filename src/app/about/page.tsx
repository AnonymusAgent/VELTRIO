import Link from "next/link";
import { BRAND_SUPPORT, BRAND_TAGLINE } from "@/lib/brand";

export const metadata = { title: "About", description: "VELTRIO is a premium home for independent films, documentaries, music, travel and distinctive stories." };

export default function AboutPage() {
  return <article className="site-container about-page">
    <span className="section-kicker">{BRAND_SUPPORT.toUpperCase()}</span>
    <h1>A premium home for stories worth your time.</h1>
    <p className="about-lead">{BRAND_TAGLINE} VELTRIO is a streaming catalog for independent films, short films, documentaries, travel, music, culture and creative work.</p>
    <div className="about-grid">
      <section><h2>What you can do</h2><p>Watch the catalog, save titles to My List, and sign in so your list and playback position follow your account.</p></section>
      <section><h2>How titles arrive</h2><p>The publisher adds every story from the private studio. Viewers do not upload. That keeps the library editorial instead of a public upload feed.</p></section>
      <section><h2>How it plays</h2><p>Published stories stream in adaptive HD. Drafts stay private until the publisher chooses to release them.</p></section>
    </div>
    <div className="about-actions"><Link href="/browse" className="vh-button">Explore stories</Link><Link href="/account" className="vh-button secondary">Sign in</Link></div>
  </article>;
}
