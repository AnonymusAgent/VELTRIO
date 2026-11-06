import AccountForm from "@/components/AccountForm";
import { BrandMark } from "@/components/Brand";
import { Bookmark, Play, Sparkles } from "lucide-react";
export const metadata = { title: "Your account" };
export default function AccountPage() {
  return <div className="auth-page"><div className="site-container auth-grid">
    <section className="auth-story" aria-hidden="true">
      <div className="auth-story-glow" />
      <span className="shelf-kicker">WELCOME TO VELTRIO</span>
      <h1>Your seat in the <em>cinema.</em></h1>
      <p>Sign in to save your watch history. Titles are added by VELTRIO — your account is for watching, not uploading.</p>
      <ul className="auth-points">
        <li><Play size={15} /> Watch the catalog in adaptive HD</li>
        <li><Bookmark size={15} /> My List follows your account</li>
        <li><Sparkles size={15} /> Playback position follows your account</li>
      </ul>
      <div className="auth-mark"><BrandMark className="auth-mark-svg" /><span>VELTRIO</span></div>
    </section>
    <section className="vh-panel auth-card"><AccountForm /></section>
  </div></div>;
}
