"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Film, ArrowRight } from "lucide-react";
import { CATEGORIES, type Video } from "@/lib/data";
import VideoCard from "./VideoCard";
export default function VideoBrowser({ videos, initialCategory = "all", initialQuery = "", savedOnly = false, popular = false }: { videos: Video[]; initialCategory?: string; initialQuery?: string; savedOnly?: boolean; popular?: boolean }) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState(popular ? "popular" : "newest");
  const [saved, setSaved] = useState<string[]>([]);
  useEffect(() => { try { setSaved(JSON.parse(localStorage.getItem("saved-videos") || "[]")); } catch {} }, []);
  const list = videos.filter(v => (!savedOnly || saved.includes(v.slug)) && (category === "all" || category === v.categorySlug) && `${v.title} ${v.description} ${v.category}`.toLowerCase().includes(query.toLowerCase())).sort((a,b) => sort === "popular" ? b.views - a.views : new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  return <><div className="catalog-toolbar"><form className="admin-search !max-w-none sm:!max-w-[300px]" onSubmit={e => e.preventDefault()}><Search size={15} /><input placeholder="Search the library…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Search library" /></form><select aria-label="Sort videos" value={sort} onChange={e => setSort(e.target.value)} className="vh-field !w-auto ml-auto"><option value="newest">Newest first</option><option value="popular">Most viewed</option></select></div><div className="catalog-toolbar"><button onClick={() => setCategory("all")} className={`filter-chip ${category === "all" ? "active" : ""}`}>All stories</button>{CATEGORIES.map(c => <button key={c.slug} className={`filter-chip ${category === c.slug ? "active" : ""}`} onClick={() => setCategory(c.slug)}>{c.name}</button>)}</div><p className="mb-6 text-[10px] text-zinc-600">{list.length} {list.length === 1 ? "video" : "videos"}{savedOnly ? " in your list" : " to discover"}</p>{list.length ? <div className="video-grid">{list.map(v => <VideoCard video={v} key={v.id} />)}</div> : <div className="vh-panel empty-state !py-20"><div className="empty-icon"><Film size={26} /></div><h3>{savedOnly ? "Keep your next watch close." : query ? "No matching stories. Yet." : "Good stories take a little time."}</h3><p>{savedOnly ? "Tap Save on a video to add it to this list. Your list stays in this browser." : query ? "Try a different search or explore another category." : "This part of the library is waiting for its first upload. Come back for something worth watching."}</p><Link className="vh-button secondary small" href={savedOnly ? "/browse" : "/admin/upload"}>{savedOnly ? "Explore videos" : "Open creator studio"}<ArrowRight size={13} /></Link></div>}</>;
}
