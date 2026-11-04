"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Film, ArrowRight, LoaderCircle } from "lucide-react";
import { CATEGORIES, type Video } from "@/lib/data";
import { parseSavedSlugs, useLocalStorageValue } from "@/lib/browser-storage";
import VideoCard from "./VideoCard";

type Props = {
  videos: Video[];
  initialCategory?: string;
  initialQuery?: string;
  initialTotal?: number;
  savedOnly?: boolean;
  popular?: boolean;
};

export default function VideoBrowser({ videos, initialCategory = "all", initialQuery = "", initialTotal, savedOnly = false, popular = false }: Props) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState(popular ? "popular" : "newest");
  const [items, setItems] = useState(videos);
  const [total, setTotal] = useState(initialTotal ?? videos.length);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const saved = parseSavedSlugs(useLocalStorageValue("saved-videos"));

  useEffect(() => {
    if (savedOnly) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ category, q: query, sort, limit: "24", offset: "0" });
        const response = await fetch(`/api/videos?${params.toString()}`, { signal: controller.signal, cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "The library could not be loaded.");
        setItems(data.videos || []);
        setTotal(Number(data.total || 0));
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return;
        setError(requestError instanceof Error ? requestError.message : "The library could not be loaded.");
      } finally { setLoading(false); }
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [category, query, sort, savedOnly]);

  async function loadMore() {
    if (savedOnly || loadingMore || items.length >= total) return;
    setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams({ category, q: query, sort, limit: "24", offset: String(items.length) });
      const response = await fetch(`/api/videos?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "More stories could not be loaded.");
      setItems(current => [...current, ...(data.videos || [])]);
      setTotal(Number(data.total || total));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "More stories could not be loaded.");
    } finally { setLoadingMore(false); }
  }

  const list = useMemo(() => savedOnly ? items.filter(video => saved.includes(video.slug)) : items, [items, saved, savedOnly]);
  const emptyTitle = savedOnly ? "Keep your next watch close." : query ? "No matching stories. Yet." : "Good stories take a little time.";
  const emptyDescription = savedOnly ? "Tap Save on a video to add it to this list. Your list stays in this browser." : query ? "Try a different search or explore another category." : "This part of the library is waiting for its first upload. Come back for something worth watching.";

  return <>
    <div className="catalog-toolbar">
      <form className="admin-search !max-w-none sm:!max-w-[300px]" onSubmit={event => event.preventDefault()}>
        <Search size={15} /><input placeholder="Search the library…" value={query} onChange={event => setQuery(event.target.value)} aria-label="Search library" />
      </form>
      <select aria-label="Sort videos" value={sort} onChange={event => setSort(event.target.value)} className="vh-field !w-auto ml-auto">
        <option value="newest">Newest first</option><option value="popular">Most viewed</option>
      </select>
    </div>
    <div className="catalog-toolbar">
      <button type="button" onClick={() => setCategory("all")} className={`filter-chip ${category === "all" ? "active" : ""}`}>All stories</button>
      {CATEGORIES.map(c => <button type="button" key={c.slug} className={`filter-chip ${category === c.slug ? "active" : ""}`} onClick={() => setCategory(c.slug)}>{c.name}</button>)}
    </div>
    {error && <div className="form-message mb-5" role="alert">{error}</div>}
    <div className="mb-6 flex items-center gap-2 text-[10px] text-zinc-600" aria-live="polite">
      {loading && <LoaderCircle size={13} className="animate-spin" />}
      <span>{list.length} {list.length === 1 ? "video" : "videos"}{savedOnly ? " in your list" : ` of ${total} to discover`}</span>
    </div>
    {list.length ? <>
      <div className="video-grid">{list.map(video => <VideoCard video={video} key={video.id} />)}</div>
      {!savedOnly && items.length < total && <div className="mt-10 flex justify-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="vh-button secondary small">{loadingMore && <LoaderCircle size={13} className="animate-spin" />}{loadingMore ? "Loading stories…" : "Load more stories"}<ArrowRight size={13} /></button></div>}
    </> : <div className="vh-panel empty-state !py-20"><div className="empty-icon"><Film size={26} /></div><h3>{emptyTitle}</h3><p>{emptyDescription}</p><Link className="vh-button secondary small" href={savedOnly ? "/browse" : "/studio"}>{savedOnly ? "Explore videos" : "Open creator studio"}<ArrowRight size={13} /></Link></div>}
  </>;
}
