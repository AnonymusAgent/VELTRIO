"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Film, ArrowRight, LoaderCircle, X } from "lucide-react";
import { CATEGORIES, type Video } from "@/lib/data";
import { parseSavedSlugs, useLocalStorageValue, writeLocalStorage } from "@/lib/browser-storage";
import VideoCard from "./VideoCard";

type Props = { videos: Video[]; initialCategory?: string; initialQuery?: string; initialTotal?: number; savedOnly?: boolean; popular?: boolean; searchPage?: boolean };
type Tab = "saved" | "continue" | "history";
function durationSeconds(duration: string) { return duration.split(":").reduce((total, part) => total * 60 + (Number(part) || 0), 0); }
export default function VideoBrowser({ videos, initialCategory = "all", initialQuery = "", initialTotal, savedOnly = false, popular = false, searchPage = false }: Props) {
  const searchListId = useId();
  const searchHistory = parseSavedSlugs(useLocalStorageValue("vh-search-history"));
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState(popular ? "popular" : "newest");
  const [tab, setTab] = useState<Tab>("saved");
  const [items, setItems] = useState(videos);
  const [total, setTotal] = useState(initialTotal ?? videos.length);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const initialRender = useRef(true);
  const saved = parseSavedSlugs(useLocalStorageValue("saved-videos"));
  const history = parseSavedSlugs(useLocalStorageValue("vh-watch-history"));
  const continuing = parseSavedSlugs(useLocalStorageValue("vh-continue-watching"));
  const moreRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    if (savedOnly) return;
    if (initialRender.current) { initialRender.current = false; return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const params = new URLSearchParams({ category, q: query, sort, limit: "24", offset: "0" });
        const response = await fetch(`/api/videos?${params}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "The library could not be loaded.");
        setItems(data.videos || []); setTotal(Number(data.total || 0));
      } catch (requestError) {
        if (!controller.signal.aborted) { setItems([]); setTotal(0); setError(requestError instanceof Error ? requestError.message : "The library could not be loaded."); }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); moreRequest.current?.abort(); };
  }, [category, query, sort, savedOnly, retry]);

  async function loadMore() {
    if (savedOnly || loading || loadingMore || items.length >= total) return;
    const controller = new AbortController(); moreRequest.current = controller;
    setLoadingMore(true); setError("");
    try {
      const params = new URLSearchParams({ category, q: query, sort, limit: "24", offset: String(items.length) });
      const response = await fetch(`/api/videos?${params}`, { cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "More stories could not be loaded.");
      setItems(current => [...current, ...(data.videos || [])]); setTotal(Number(data.total ?? total));
    } catch (requestError) { if (!controller.signal.aborted) setError(requestError instanceof Error ? requestError.message : "More stories could not be loaded."); }
    finally { setLoadingMore(false); }
  }
  const list = useMemo(() => {
    if (!savedOnly) return items;
    const chosen = tab === "saved" ? saved : tab === "continue" ? continuing : history;
    const q = query.trim().toLowerCase();
    return items.filter(video => chosen.includes(video.slug) && (category === "all" || video.categorySlug === category) && (!q || [video.title, video.description, video.creator || "", video.category].some(value => value.toLowerCase().includes(q)))).sort((a, b) => sort === "popular" ? b.views - a.views : sort === "duration" ? durationSeconds(b.duration) - durationSeconds(a.duration) : tab === "saved" ? new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime() : chosen.indexOf(a.slug) - chosen.indexOf(b.slug));
  }, [items, saved, continuing, history, savedOnly, tab, category, query, sort]);
  const labels: Record<Tab, string> = { saved: "Saved videos", continue: "Continue watching", history: "Watch history" };
  const emptyTitle = query || category !== "all" ? "No stories match your filters." : savedOnly ? tab === "saved" ? "Your list is ready when you are." : tab === "continue" ? "Nothing to continue just yet." : "Your watch history starts here." : "Good stories take a little time.";
  const emptyDescription = query || category !== "all" ? "Try a different search or choose another category." : savedOnly ? "Explore the library and find something worth watching. Your activity stays on this browser." : "This part of the library is waiting for its first upload. Come back for something worth watching.";
  return <>
    {savedOnly && <div className="library-tabs" role="group" aria-label="Your library">{(Object.keys(labels) as Tab[]).map(value => <button key={value} type="button" className={tab === value ? "active" : ""} aria-pressed={tab === value} onClick={() => setTab(value)}>{labels[value]}</button>)}</div>}
    <div className="catalog-toolbar"><form className="admin-search library-search" action="/search" onSubmit={event => { const term = query.trim(); if (term) writeLocalStorage("vh-search-history", JSON.stringify([term, ...searchHistory.filter(value => value.toLowerCase() !== term.toLowerCase())].slice(0, 5))); if (!searchPage) event.preventDefault(); }}><Search size={16} /><input placeholder={savedOnly ? "Search your library" : "Search titles, creators, categories..."} name="q" list={searchListId} value={query} onChange={event => setQuery(event.target.value)} aria-label="Search library" /><datalist id={searchListId}>{[...new Set([...searchHistory, ...items.map(v => v.title)])].filter(value => value.toLowerCase().includes(query.toLowerCase())).slice(0, 8).map(value => <option key={value} value={value} />)}</datalist>{query && <button type="button" onClick={() => setQuery("")} aria-label="Clear library search"><X size={15} /></button>}</form><select aria-label="Sort videos" value={sort} onChange={event => setSort(event.target.value)} className="vh-field library-sort"><option value="newest">Newest first</option><option value="popular">Most viewed</option><option value="duration">Longest first</option></select></div>
    <div className="catalog-toolbar category-filters" aria-label="Filter by category"><button type="button" onClick={() => setCategory("all")} aria-pressed={category === "all"} className={`filter-chip ${category === "all" ? "active" : ""}`}>All stories</button>{CATEGORIES.map(c => <button type="button" key={c.slug} onClick={() => setCategory(c.slug)} aria-pressed={category === c.slug} className={`filter-chip ${category === c.slug ? "active" : ""}`}>{c.name}</button>)}</div>
    {error && <div className="form-message mb-5" role="alert">{error} <button type="button" onClick={() => setRetry(value => value + 1)} className="underline">Try again</button></div>}
    <div className="library-count" aria-live="polite">{loading && <LoaderCircle size={13} className="animate-spin" />}<span>{list.length} {list.length === 1 ? "story" : "stories"}{savedOnly ? "" : ` of ${total}`}</span>{savedOnly && tab === "history" && history.length > 0 && <button type="button" onClick={() => writeLocalStorage("vh-watch-history", "[]")}>Clear history</button>}</div>
    {list.length ? <><div className="video-grid">{list.map(video => <VideoCard video={video} key={video.id} />)}</div>{!savedOnly && items.length < total && <div className="mt-10 flex justify-center"><button type="button" onClick={loadMore} disabled={loadingMore || loading} className="vh-button secondary small">{loadingMore && <LoaderCircle size={13} className="animate-spin" />}{loadingMore ? "Loading stories…" : "Load more stories"}<ArrowRight size={13} /></button></div>}</> : !error && <div className="vh-panel empty-state library-empty"><div className="empty-icon"><Film size={26} /></div><h3>{emptyTitle}</h3><p>{emptyDescription}</p><Link className="vh-button secondary small" href={savedOnly ? "/browse" : "/studio"}>{savedOnly ? "Explore videos" : "Open creator studio"}<ArrowRight size={13} /></Link></div>}
  </>;
}
