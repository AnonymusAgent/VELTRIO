"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Search, ArrowUpRight, Menu, X, ShieldCheck } from "lucide-react";
import { BrandLogo } from "./Brand";

export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return <header className="public-header"><div className="public-header-inner"><BrandLogo /><nav className={open ? "public-nav is-open" : "public-nav"} aria-label="Main navigation">{[{ label: "Discover", href: "/" }, { label: "Browse", href: "/browse" }, { label: "My list", href: "/my-list" }].map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={path === item.href ? "active" : ""}>{item.label}</Link>)}</nav><form action="/search" className="header-search"><Search size={16} /><input name="q" aria-label="Search videos" placeholder="Find your next story" /></form><Link href="/admin" className="header-studio"><ShieldCheck size={15} /><span>Admin studio</span><ArrowUpRight size={14} /></Link><button className="mobile-menu icon-button" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X /> : <Menu />}</button></div></header>;
}
