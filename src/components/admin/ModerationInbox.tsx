"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CircleAlert, Flag, LoaderCircle, Mail, MessageSquare, ShieldAlert } from "lucide-react";

type Item = Record<string, unknown> & { id: number; status: string; createdAt: string };
type Inbox = { comments: Item[]; dmca: Item[]; contact: Item[]; reports: Item[] };
const tabs = [{ key: "reports", label: "Reports", icon: Flag }, { key: "comments", label: "Comments", icon: MessageSquare }, { key: "dmca", label: "Removal requests", icon: ShieldAlert }, { key: "contact", label: "Contact", icon: Mail }] as const;

function date(value: unknown) { return value ? new Date(String(value)).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }) : "Unknown date"; }

export default function ModerationInbox() {
  const [data, setData] = useState<Inbox>({ comments: [], dmca: [], contact: [], reports: [] });
  const [tab, setTab] = useState<keyof Inbox>("reports");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/admin/moderation", { cache: "no-store" }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Moderation inbox could not be loaded.");
      setData(body);
    }).catch(reason => setError(reason instanceof Error ? reason.message : "Moderation inbox could not be loaded.")).finally(() => setLoading(false));
  }, []);
  const items = useMemo(() => data[tab], [data, tab]);
  async function update(entity: keyof Inbox, id: number, status: string) {
    setBusy(`${entity}:${id}`); setError("");
    try {
      const response = await fetch("/api/admin/moderation", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entity, id, status }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not update this item.");
      setData(current => ({ ...current, [entity]: current[entity].map(item => item.id === id ? { ...item, status } : item) }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update this item."); }
    finally { setBusy(""); }
  }
  return <><div className="admin-page-heading"><div><h1>Keep the space thoughtful<span className="text-[#a99bff]">.</span></h1><p>Review reports, comments, removal requests and messages from one private inbox.</p></div><span className="status-badge published"><ShieldAlert size={11} /> Administrator only</span></div>{error && <div className="form-message mb-5" role="alert"><CircleAlert size={16} />{error}</div>}<div className="moderation-tabs" role="tablist" aria-label="Moderation inbox sections">{tabs.map(({ key, label, icon: Icon }) => <button type="button" role="tab" aria-selected={tab === key} key={key} onClick={() => setTab(key)} className={tab === key ? "active" : ""}><Icon size={14} />{label}<span>{data[key].filter(item => item.status === "open" || item.status === "new" || item.status === "pending" || item.status === "visible").length}</span></button>)}</div>{loading ? <div className="vh-panel moderation-loading"><LoaderCircle size={20} className="animate-spin" /> Loading moderation items…</div> : items.length ? <div className="moderation-list">{items.map(item => <article className="vh-panel moderation-card" key={item.id}><div className="moderation-card-top"><div><span className="eyebrow text-zinc-600">{tab === "dmca" ? "CONTENT REMOVAL" : tab === "contact" ? "CONTACT MESSAGE" : tab === "comments" ? "PUBLIC COMMENT" : "REPORT"}</span><p className="moderation-date">{date(item.createdAt)}</p></div><span className={`status-badge ${item.status === "resolved" || item.status === "closed" || item.status === "visible" ? "published" : item.status === "rejected" || item.status === "hidden" ? "draft" : ""}`}>{String(item.status)}</span></div>{tab === "reports" && <><h2>{String(item.reason)}</h2><p>{String(item.details)}</p><small>{item.videoTitle ? `Video: ${String(item.videoTitle)}` : item.commentId ? `Comment #${String(item.commentId)}` : "General report"}{item.reporterEmail ? ` · ${String(item.reporterEmail)}` : ""}</small></>}{tab === "comments" && <><h2>{String(item.name)} <small>{item.email ? `· ${String(item.email)}` : ""}</small></h2><p>{String(item.body)}</p><small>{item.videoSlug ? <Link href={`/video/${String(item.videoSlug)}`} target="_blank">Open video ↗</Link> : "Video unavailable"}</small></>}{tab === "dmca" && <><h2>{String(item.claimant)}</h2><p>{String(item.details || "No additional details provided.")}</p><small>{String(item.email)} · <a href={String(item.contentUrl)} target="_blank" rel="noreferrer">Open submitted URL ↗</a></small></>}{tab === "contact" && <><h2>{String(item.subject)}</h2><p>{String(item.message)}</p><small>{String(item.name)} · {String(item.email)}</small></>}{<div className="moderation-actions">{tab === "comments" && <>{item.status === "visible" ? <button type="button" className="vh-button danger small" disabled={busy === `${tab}:${item.id}`} onClick={() => update(tab, item.id, "hidden")}>{busy === `${tab}:${item.id}` ? <LoaderCircle size={13} className="animate-spin" /> : <ShieldAlert size={13} />} Hide comment</button> : <button type="button" className="vh-button secondary small" onClick={() => update(tab, item.id, "visible")}><Check size={13} /> Restore comment</button>}</>}{tab === "reports" && <><button type="button" className="vh-button secondary small" onClick={() => update(tab, item.id, "reviewing")}>Mark reviewing</button><button type="button" className="vh-button small" onClick={() => update(tab, item.id, "resolved")}><Check size={13} /> Resolve</button></>}{tab === "dmca" && <><button type="button" className="vh-button secondary small" onClick={() => update(tab, item.id, "reviewing")}>Mark reviewing</button><button type="button" className="vh-button small" onClick={() => update(tab, item.id, "resolved")}><Check size={13} /> Resolve</button><button type="button" className="vh-button ghost small" onClick={() => update(tab, item.id, "rejected")}>Reject</button></>}{tab === "contact" && <>{item.status === "new" && <button type="button" className="vh-button secondary small" onClick={() => update(tab, item.id, "read")}>Mark read</button>}<button type="button" className="vh-button small" onClick={() => update(tab, item.id, "closed")}><Check size={13} /> Close</button></>}</div>}</article>)}</div> : <div className="vh-panel empty-state"><div className="empty-icon"><Check size={25} /></div><h3>Nothing needs your attention.</h3><p>This section is clear. New reports, comments and messages will appear here.</p></div>}</>;
}
