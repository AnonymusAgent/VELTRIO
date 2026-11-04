"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Menu, X } from "lucide-react";
import { BrandLogo } from "./Brand";
import ProfileMenu from "./ProfileMenu";
import ThemeToggle from "./ThemeToggle";
import SearchBox from "./SearchBox";

const links = [{ label: "Home", href: "/" }, { label: "Explore", href: "/browse" }, { label: "Categories", href: "/#categories" }, { label: "My List", href: "/my-list" }];
export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  return <header className="public-header"><div className="public-header-inner"><BrandLogo /><nav id="public-navigation" className={open ? "public-nav is-open" : "public-nav"} aria-label="Main navigation">{links.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={path === item.href ? "active" : ""} aria-current={path === item.href ? "page" : undefined}>{item.label}</Link>)}<Link href="/studio" className="mobile-studio-link" onClick={() => setOpen(false)}>Creator studio</Link></nav><SearchBox /><Link href="/search" className="mobile-search" aria-label="Search videos"><Search size={19} /></Link><ProfileMenu /><ThemeToggle /><button type="button" className="mobile-menu icon-button" onClick={() => setOpen(current => !current)} aria-expanded={open} aria-controls="public-navigation" aria-label={open ? "Close menu" : "Open menu"}>{open ? <X /> : <Menu />}</button></div></header>;
}
