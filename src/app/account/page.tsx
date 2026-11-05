import AccountForm from "@/components/AccountForm";
import { BrandMark } from "@/components/Brand";
import { Play, Sparkles, Upload } from "lucide-react";
export const metadata = { title: "Your account" };
export default function AccountPage() {
  return <div className="auth-page"><div className="site-container auth-grid">
    <section className="auth-story" aria-hidden="true">
      <div className="auth-story-glow" />
      <span className="shelf-kicker">WELCOME TO VELTRIO</span>
      <h1>Your seat in the <em>cinema.</em></h1>
      <p>One account for watching, saving and uploading. Stories stream in adaptive HD, and your creator studio is one click away.</p>
      <ul className="auth-points">
        <li><Play size={15} /> Watch original films and creator uploads</li>
        <li><Upload size={15} /> Publish your own videos with resumable uploads</li>
        <li><Sparkles size={15} /> Keep your list and progress across devices</li>
      </ul>
      <div className="auth-mark"><BrandMark className="auth-mark-svg" /><span>VELTRIO</span></div>
    </section>
    <section className="vh-panel auth-card"><AccountForm /></section>
  </div></div>;
}
