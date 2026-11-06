import { parseSavedSlugs, writeLocalStorage } from "@/lib/browser-storage";

// Signed-in playback position. A missing session is a silent no-op on the server.
export function postWatchProgress(slug: string, position: number) {
  if (!Number.isFinite(position) || position < 0 || position > 604800) return;
  fetch(`/api/videos/${slug}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ position: Math.floor(position) }),
  }).catch(() => {});
}

// Fill this browser from the account when it has no local position yet.
export async function pullAccountProgress(slug: string): Promise<number | null> {
  try {
    const response = await fetch(`/api/videos/${slug}/progress`);
    if (!response.ok) return null;
    const data = await response.json();
    const position = Number(data?.position);
    if (!Number.isFinite(position) || position < 5) return null;
    const key = `watch-progress:${slug}`;
    let existing: string | null = null;
    try { existing = localStorage.getItem(key); } catch { return position; }
    if (existing !== null) return null;
    writeLocalStorage(key, String(Math.floor(position)));
    const list = parseSavedSlugs(localStorage.getItem("vh-continue-watching")).filter(value => value !== slug);
    writeLocalStorage("vh-continue-watching", JSON.stringify([slug, ...list].slice(0, 100)));
    return position;
  } catch {
    return null;
  }
}
