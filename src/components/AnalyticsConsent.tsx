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
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const choice = override ?? savedChoice;
  useEffect(() => {
    const openChoices = () => { setError(""); setChoice(""); };
    window.addEventListener("veltrio:cookie-choices", openChoices);
    return () => window.removeEventListener("veltrio:cookie-choices", openChoices);
  }, []);
  useEffect(() => {
    if (choice !== "yes" || !path || path.startsWith("/admin") || path.startsWith("/studio") || path.startsWith("/account")) return;
    fetch("/api/analytics/page", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }), keepalive: true }).catch(() => {});
  }, [choice, path]);
  async function choose(value: "yes" | "no") {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/analytics/consent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ choice: value }) });
      if (!response.ok) throw new Error("Could not save choice.");
      setChoice(value);
    } catch { setError("Could not save your choice. Please try again."); }
    finally { setBusy(false); }
  }
  if (choice === null || path.startsWith("/admin") || path.startsWith("/studio")) return null;
  if (choice) return null;
  return <aside className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-xl border border-white/10 bg-[#171721] p-4 shadow-xl" aria-label="Analytics cookie choices"><p className="text-sm text-zinc-200">May we use first-party cookies to measure visits and playback? This is optional. <Link className="underline" href="/privacy">Privacy details</Link></p><div className="mt-3 flex gap-3"><button className="vh-button small" disabled={busy} onClick={() => choose("yes")}>Allow analytics</button><button className="vh-button secondary small" disabled={busy} onClick={() => choose("no")}>Decline</button></div>{error && <p role="alert" className="mt-2 text-sm text-red-300">{error}</p>}</aside>;
}
