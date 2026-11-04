"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Film, CloudUpload, Settings2, ArrowUpRight, LogOut, Menu, X, ChevronRight, ShieldCheck, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/Brand";

const items = [{ label: "Overview", href: "/admin", icon: LayoutDashboard }, { label: "Video library", href: "/admin/videos", icon: Film }, { label: "Upload video", href: "/admin/upload", icon: CloudUpload }, { label: "Moderation", href: "/admin/moderation", icon: ShieldAlert }, { label: "Settings", href: "/admin/settings", icon: Settings2 }];
export default function AdminShell({ children, name }: { children: ReactNode; name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const active = items.find((i) => i.href === path) || items[0];
  async function logout() {
    setBusy(true);
    try { const response = await fetch("/api/admin/auth/logout", { method: "POST" }); if (response.ok) { router.replace("/admin/login"); router.refresh(); } } finally { setBusy(false); }
  }
  return <div className="admin-shell"><a className="skip-link" href="#admin-content">Skip to content</a>{open && <button type="button" className="sidebar-overlay" aria-label="Close sidebar" onClick={() => setOpen(false)} />}<aside id="admin-navigation" className={`admin-sidebar ${open ? "open" : ""}`}><BrandLogo href="/admin" /><span className="workspace-tag">CREATOR STUDIO</span><p className="nav-label">YOUR WORKSPACE</p><nav className="admin-nav" aria-label="Admin navigation">{items.map((item) => <Link key={item.href} href={item.href} className={path === item.href ? "active" : ""} onClick={() => setOpen(false)}><item.icon size={17} />{item.label}</Link>)}</nav><div className="sidebar-bottom"><div className="sidebar-help"><ShieldCheck size={20} /><p>Your content. Your control.</p><small>Uploaded directly. Hosted here.<br />No third-party video imports.</small></div><Link href="/" className="flex items-center gap-2 px-3 text-[11px] text-zinc-500 hover:text-white"><ArrowUpRight size={15} /> View website</Link><div className="sidebar-user mt-5"><span className="user-avatar">AM</span><div><p>{name}</p><small>Workspace owner</small></div><button type="button" className="ml-auto text-zinc-500 hover:text-white" aria-label="Sign out" title="Sign out" disabled={busy} onClick={logout}><LogOut size={15} /></button></div></div></aside><div className="admin-main"><header className="admin-topbar"><button type="button" className="mobile-menu icon-button" aria-label={open ? "Close sidebar" : "Open sidebar"} aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen(current => !current)}>{open ? <X size={18} /> : <Menu size={18} />}</button><span className="admin-breadcrumb">Workspace <ChevronRight size={12} /><b>{active.label}</b></span><div className="admin-topbar-right"><span className="site-status">Studio online</span><Link href="/" target="_blank" className="vh-button ghost small">View website <ArrowUpRight size={13} /></Link><span className="user-avatar">AM</span></div></header><main id="admin-content" className="admin-content" tabIndex={-1}>{children}</main><footer className="admin-footer"><span>© {new Date().getFullYear()} VELTRIO Studio</span><span>Your stories, in your hands.</span></footer></div></div>;
}
