"use client";
import { useEffect, useId, useState } from "react";
import { Search, X } from "lucide-react";
import { useLocalStorageValue, writeLocalStorage } from "@/lib/browser-storage";

export default function SearchBox() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<string[]>([]);
  const id = useId();
  const rawHistory = useLocalStorageValue("vh-search-history");
  let history: string[] = [];
  try { const parsed = JSON.parse(rawHistory || "[]"); if (Array.isArray(parsed)) history = parsed.filter((value): value is string => typeof value === "string").slice(0, 5); } catch { /* Ignore invalid local data. */ }
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/videos?q=${encodeURIComponent(query.trim())}&limit=5`, { signal: controller.signal });
        if (!response.ok) return;
        const data = await response.json();
        setResults(Array.isArray(data.videos) ? data.videos.map((v: { title?: unknown }) => v.title).filter((v: unknown): v is string => typeof v === "string") : []);
      } catch { /* Suggestions are optional. */ }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);
  const suggestions = [...new Set([...history, ...(query.trim().length >= 2 ? results : [])])].filter(v => v.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  function remember() {
    const term = query.trim();
    if (term) writeLocalStorage("vh-search-history", JSON.stringify([term, ...history.filter(v => v.toLowerCase() !== term.toLowerCase())].slice(0, 5)));
  }
  return <form action="/search" className="header-search" role="search" onSubmit={remember}><Search size={16} /><input name="q" aria-label="Search videos" placeholder="Search stories..." autoComplete="off" list={id} value={query} onChange={e => setQuery(e.target.value)} maxLength={160} /><datalist id={id}>{suggestions.map(value => <option key={value} value={value} />)}</datalist>{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={14} /></button>}</form>;
}
