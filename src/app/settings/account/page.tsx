import Link from "next/link";
import AccountSettings from "@/components/AccountSettings";
export const metadata = { title: "Account settings" };
export default function AccountSettingsPage() {
  return <div className="site-container max-w-[860px] py-12"><Link href="/settings" className="text-sm text-[#b9b2ff]">← Settings</Link><div className="browse-heading"><span className="eyebrow text-[#9b8cff]">YOUR ACCOUNT</span><h1 className="mt-3">Make it yours.</h1><p>Manage your profile and security.</p></div><AccountSettings /></div>;
}
