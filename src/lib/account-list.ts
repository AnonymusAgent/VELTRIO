import { parseSavedSlugs, writeLocalStorage } from "@/lib/browser-storage";

const SAVED_KEY = "saved-videos";
const OWNER_KEY = "saved-videos-owner";

export function postSavedTitle(slug: string, saved: boolean) {
  fetch("/api/me/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({ slug, saved }),
  }).catch(() => {});
}

// Pull My List onto this browser. A different account never inherits the previous list.
export async function syncAccountList() {
  let before: string | null = null;
  try { before = localStorage.getItem(SAVED_KEY); } catch { return; }
  const response = await fetch("/api/me/list");
  if (!response.ok) return;
  const data = await response.json();
  if (!data?.stored || typeof data.userId !== "string" || !Array.isArray(data.slugs)) return;
  let slugs = data.slugs.filter((slug: unknown): slug is string => typeof slug === "string");
  let owner: string | null = null;
  try { owner = localStorage.getItem(OWNER_KEY); } catch { return; }
  if (!owner || owner === data.userId) {
    const local = parseSavedSlugs(before);
    const missing = local.filter(slug => !slugs.includes(slug));
    if (missing.length) {
      const merge = await fetch("/api/me/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merge: missing }),
      });
      if (merge.ok) {
        const merged = await merge.json();
        if (Array.isArray(merged.slugs)) slugs = merged.slugs.filter((slug: unknown): slug is string => typeof slug === "string");
      }
    }
  }
  let current: string | null = null;
  try { current = localStorage.getItem(SAVED_KEY); } catch { return; }
  if (current !== before) return;
  writeLocalStorage(SAVED_KEY, JSON.stringify(slugs));
  writeLocalStorage(OWNER_KEY, data.userId);
  writeLocalStorage("vh-list-synced", "1");
}
