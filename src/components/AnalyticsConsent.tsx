"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

const subscribe = () => () => {};
function getChoice() { return document.cookie.match(/(?:^|;\s*)vh_analytics_consent=(yes|no)(?:;|$)/)?.[1] || ""; }
export default function AnalyticsConsent() {
  const path = usePathname();
  const savedChoice = useSyncExternalStore(subscribe, getChoice, () => null);
  const [override, setChoice] = useState<string | null>(null);
  const choice = override ?? savedChoice;
  useEffect(() => {
    if (choice !== "yes" || !path || path.startsWith("/admin") || path.startsWith("/studio") || path.startsWith("/account")) return;
    fetch("/api/analytics/page", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }), keepalive: true }).catch(() => {});
  }, [choice, path]);
  async function choose(value: "yes" | "no") {
    const response = await fetch("/api/analytics/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice: value }) });
    if (response.ok) setChoice(value);
  }
  if (choice === null || path.startsWith("/admin") || path.startsWith("/studio")) return null;
  if (choice) return <button className="fixed bottom-2 left-2 z-40 rounded bg-zinc-900 px-3 py-2 text-xs text-zinc-300" onClick={() => setChoice("")}>Cookie choices</button>;
  return <aside className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-white/10 bg-[#171721] p-4 shadow-xl" aria-label="Analytics cookie choices"><p className="text-sm text-zinc-200">May we use first-party cookies to measure visits and playback? This is optional. <Link className="underline" href="/privacy">Privacy details</Link></p><div className="mt-3 flex gap-3"><button className="vh-button small" onClick={() => choose("yes")}>Allow analytics</button><button className="vh-button secondary small" onClick={() => choose("no")}>Decline</button></div></aside>;
}
