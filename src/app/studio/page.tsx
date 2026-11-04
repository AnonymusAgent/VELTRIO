import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { userAuth } from "@/lib/user-auth";
import CreatorVideoActions from "@/components/CreatorVideoActions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Creator studio" };
export default async function CreatorStudio() {
  let user;
  try { user = (await userAuth().getSession()).data?.user; } catch { /* Service not configured. */ }
  if (!user) redirect("/account");
  const owned = await db.select().from(videos).where(and(eq(videos.ownerUserId, user.id), ne(videos.status, "deleted"))).orderBy(desc(videos.createdAt));
  return <div className="site-container py-12"><div className="admin-page-heading"><div><h1>Creator studio<span className="text-[#a99bff]">.</span></h1><p>Welcome, {user.name}. Manage your stories here.</p></div><div className="flex gap-3"><Link href="/browse" className="vh-button secondary">Browse videos</Link><Link href="/studio/upload" className="vh-button">Upload video</Link></div></div><div className="admin-stats"><div className="stat-card"><span>Videos</span><h3>{owned.length}</h3></div><div className="stat-card"><span>Views</span><h3>{owned.reduce((n, v) => n + (v.views || 0), 0).toLocaleString()}</h3></div><div className="stat-card"><span>Earnings</span><h3>Not available</h3><p>Creator monetization and payouts are not configured.</p></div></div><section className="vh-panel mt-6"><div className="panel-heading"><h2>Your videos</h2></div><div className="table-scroll"><table className="admin-table"><thead><tr><th>Title</th><th>Visibility</th><th>Views</th><th>Actions</th></tr></thead><tbody>{owned.map(v => <tr key={v.id}><td>{v.status === "published" ? <Link href={`/video/${v.slug}`}>{v.title}</Link> : <>{v.title}{v.mediaAssetId && <p><a href={`/api/media/${v.mediaAssetId}`} target="_blank" rel="noreferrer" className="text-[#b9b2ff]">Preview draft</a></p>}</>}</td><td>{v.status}</td><td>{v.views || 0}</td><td><CreatorVideoActions id={v.id} status={v.status} rightsConfirmed={v.rightsConfirmed} title={v.title} description={v.description || ""} categorySlug={v.categorySlug || "short-films"} /></td></tr>)}</tbody></table>{!owned.length && <p className="p-6 text-sm text-zinc-400">Your uploads will appear here.</p>}</div></section></div>;
}
