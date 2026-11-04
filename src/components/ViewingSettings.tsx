"use client";
import Link from "next/link";
import CookieChoices from "@/components/CookieChoices";
import { useLocalStorageValue, writeLocalStorage } from "@/lib/browser-storage";

export default function ViewingSettings() {
  const storedSpeed = useLocalStorageValue("vh-playback-speed");
  const speed = storedSpeed && ["0.75", "1", "1.25", "1.5", "2"].includes(storedSpeed) ? storedSpeed : "1";
  const resume = useLocalStorageValue("vh-resume-enabled") !== "false";
  const intro = useLocalStorageValue("veltrio-intro-enabled") !== "false";
  return <div className="space-y-6"><section className="vh-panel p-6"><h2 className="text-xl text-white">Playback</h2><p className="mt-2 text-sm text-zinc-400">These preferences are saved on this browser.</p><label className="mt-5 block text-sm">Default playback speed<select className="mt-2 block w-full max-w-xs rounded border border-white/10 bg-black/30 p-3 text-white" value={speed} onChange={e => writeLocalStorage("vh-playback-speed", e.target.value)}><option value="0.75">0.75×</option><option value="1">Normal</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option></select></label><label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={resume} onChange={e => writeLocalStorage("vh-resume-enabled", String(e.target.checked))} /> Offer to resume videos</label><label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={intro} onChange={e => writeLocalStorage("veltrio-intro-enabled", String(e.target.checked))} /> Show the brand intro</label></section><section className="vh-panel p-6"><h2 className="text-xl text-white">Privacy</h2><p className="mt-2 text-sm text-zinc-400">Choose whether to allow optional first-party analytics. Read our <Link href="/privacy" className="text-[#b9b2ff] underline">privacy policy</Link> for details.</p><CookieChoices /></section><section className="vh-panel p-6"><h2 className="text-xl text-white">Account</h2><p className="mt-2 text-sm text-zinc-400">Manage your display name and password.</p><Link href="/settings/account" className="vh-button secondary small mt-4">Account settings</Link></section></div>;
}
