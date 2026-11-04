import ViewingSettings from "@/components/ViewingSettings";
export const metadata = { title: "Settings" };
export default function SettingsPage() {
  return <div className="site-container max-w-[860px] py-12"><div className="browse-heading"><span className="eyebrow text-[#9b8cff]">YOUR EXPERIENCE</span><h1 className="mt-3">Settings.</h1><p>Make VELTRIO feel like home.</p></div><ViewingSettings /></div>;
}
