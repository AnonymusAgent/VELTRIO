import ViewingSettings from "@/components/ViewingSettings";
export const metadata = { title: "Settings" };
export default function SettingsPage() {
  return <div className="site-container settings-page"><div className="browse-heading premium-page-heading"><span className="section-kicker">YOUR EXPERIENCE</span><h1>Settings<span className="accent-dot">.</span></h1><p>Make VELTRIO feel like your cinema: playback, captions, privacy and appearance.</p></div><div className="settings-wrap"><ViewingSettings /></div></div>;
}
