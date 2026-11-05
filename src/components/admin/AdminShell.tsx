"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Film, CloudUpload, Settings2, ArrowUpRight, LogOut, Menu, X, ChevronRight, ShieldCheck, ShieldAlert } from "lucide-react";
import { BrandLogo } from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";

const items = [{ label: "Overview", href: "/admin", icon: LayoutDashboard }, { label: "Video library", href: "/admin/videos", icon: Film }, { label: "Upload video", href: "/admin/upload", icon: CloudUpload }, { label: "Moderation", href: "/admin/moderation", icon: ShieldAlert }, { label: "Settings", href: "/admin/settings", icon: Settings2 }];

function initials(name: string) {
  const letters = name.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase();
  return letters || "V";
}

export default function AdminShell({ children, name, streaming = false }: { children: ReactNode; name: string; streaming?: boolean }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const active = items.find((item) => item.href === path) || items[0];
  const mark = initials(name);
  async function logout() {
    setBusy(true);
    try { const response = await fetch("/api/admin/auth/logout", { method: "POST" }); if (response.ok) { router.replace("/admin/login"); router.refresh(); } } finally { setBusy(false); }
  }
  return <div className="admin-shell"><a className="skip-link" href="#admin-content">Skip to content</a>{open && <button type="button" className="sidebar-overlay" aria-label="Close sidebar" onClick={() => setOpen(false)} />}<aside id="admin-navigation" className={`admin-sidebar ${open ? "open" : ""}`}><BrandLogo href="/admin" /><span className="workspace-tag">CREATOR STUDIO</span><p className="nav-label">YOUR WORKSPACE</p><nav className="admin-nav" aria-label="Admin navigation">{items.map((item) => <Link key={item.href} href={item.href} className={path === item.href ? "active" : ""} onClick={() => setOpen(false)}><item.icon size={17} />{item.label}</Link>)}</nav><div className="sidebar-bottom"><div className="sidebar-help"><ShieldCheck size={20} /><p>Your content. Your control.</p><small>{streaming ? "Uploads stream through VELTRIO. Publish when the story is ready." : "Uploads stay with your configured storage. Publish when a story is ready."}</small></div><Link href="/" className="sidebar-link"><ArrowUpRight size={15} /> View website</Link><div className="sidebar-user mt-5"><span className="user-avatar">{mark}</span><div><p>{name}</p><small>Workspace owner</small></div><button type="button" className="icon-quiet" aria-label="Sign out" title="Sign out" disabled={busy} onClick={logout}><LogOut size={15} /></button></div></div></aside><div className="admin-main"><header className="admin-topbar"><button type="button" className="mobile-menu icon-button" aria-label={open ? "Close sidebar" : "Open sidebar"} aria-expanded={open} aria-controls="admin-navigation" onClick={() => setOpen(current => !current)}>{open ? <X size={18} /> : <Menu size={18} />}</button><span className="admin-breadcrumb">Studio <ChevronRight size={12} /><b>{active.label}</b></span><div className="admin-topbar-right"><ThemeToggle /><span className="site-status">{streaming ? "Streaming on" : "Studio online"}</span><Link href="/" target="_blank" className="vh-button ghost small">View website <ArrowUpRight size={13} /></Link><span className="user-avatar">{mark}</span></div></header><main id="admin-content" className="admin-content" tabIndex={-1}>{children}</main><footer className="admin-footer"><span>© {new Date().getFullYear()} VELTRIO Studio</span><span>Stories worth pressing play for.</span></footer></div></div>;
}
