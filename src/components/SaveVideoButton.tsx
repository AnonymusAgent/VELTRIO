"use client";
import { useState } from "react";
import { Bookmark, Check } from "lucide-react";
import { parseSavedSlugs, useLocalStorageValue, writeLocalStorage } from "@/lib/browser-storage";
import { postSavedTitle } from "@/lib/account-list";
export default function SaveVideoButton({ slug, title }: { slug: string; title: string }) {
  const saved = parseSavedSlugs(useLocalStorageValue("saved-videos"));
  const isSaved = saved.includes(slug);
  const [error, setError] = useState(false);
  function toggle() {
    const next = isSaved ? saved.filter(s => s !== slug) : [slug, ...saved];
    setError(!writeLocalStorage("saved-videos", JSON.stringify(next.slice(0, 100))));
    postSavedTitle(slug, !isSaved);
  }
  return <><button type="button" className="card-save" onClick={toggle} aria-label={`${isSaved ? "Remove" : "Save"} ${title} ${isSaved ? "from" : "to"} My List`} aria-pressed={isSaved} title={isSaved ? "Remove from My List" : "Save to My List"}>{isSaved ? <Check size={16} /> : <Bookmark size={16} />}</button>{error && <span className="card-save-error" role="status">Could not save. Check browser storage.</span>}</>;
}
