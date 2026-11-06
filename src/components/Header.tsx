"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { BrandLogo } from "./Brand";
import ProfileMenu from "./ProfileMenu";
import ThemeToggle from "./ThemeToggle";
import SearchBox from "./SearchBox";

const links = [{ label: "Home", href: "/" }, { label: "Explore", href: "/browse" }, { label: "Trending", href: "/trending" }, { label: "Categories", href: "/#categories" }, { label: "My List", href: "/my-list" }];

export default function Header() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);
  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);
  return <header className={`public-header${solid ? " is-solid" : ""}`} id="site-header">
    <div className="public-header-inner">
      <BrandLogo />
      <nav id="public-navigation" className={open ? "public-nav is-open" : "public-nav"} aria-label="Main navigation">
        {links.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={path === item.href ? "active" : ""} aria-current={path === item.href ? "page" : undefined}>{item.label}</Link>)}
      </nav>
      <div className="header-actions">
        <SearchBox />
        <Link href="/search" className="mobile-search" aria-label="Search videos"><Search size={18} /></Link>
        <ProfileMenu />
        <ThemeToggle />
        <button type="button" className="mobile-menu icon-button" onClick={() => setOpen(current => !current)} aria-expanded={open} aria-controls="public-navigation" aria-label={open ? "Close menu" : "Open menu"}>{open ? <X size={18} /> : <Menu size={18} />}</button>
      </div>
    </div>
  </header>;
}
