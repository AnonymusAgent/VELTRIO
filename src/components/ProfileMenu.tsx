"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export default function ProfileMenu() {
  const { data: session, isPending } = authClient.useSession();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("keydown", close); window.removeEventListener("pointerdown", outside); };
  }, [open]);
  if (isPending || !session?.user) return <Link href="/account" className="header-studio" aria-label="Sign in or create an account"><UserRound size={15} /><span>Sign in</span><ArrowUpRight size={14} /></Link>;
  const initial = (session.user.name || session.user.email || "U").trim().slice(0, 1).toUpperCase();
  async function signOut() {
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw result.error;
      setOpen(false); router.push("/"); router.refresh();
    } catch { setError("Could not sign out. Please try again."); }
  }
  return <div ref={menuRef} className="profile-menu"><button type="button" className="profile-trigger" onClick={() => setOpen(!open)} aria-label="Open profile menu" aria-haspopup="true" aria-expanded={open}>{initial}</button>{open && <div className="profile-dropdown"><div className="profile-heading"><strong>{session.user.name}</strong><span>{session.user.email}</span></div><Link href="/settings/account" onClick={() => setOpen(false)}>Manage profile</Link><Link href="/studio" onClick={() => setOpen(false)}>Creator studio</Link><Link href="/studio/upload" onClick={() => setOpen(false)}>Upload video</Link><Link href="/my-list" onClick={() => setOpen(false)}>My list</Link><Link href="/settings" onClick={() => setOpen(false)}>Settings</Link><button type="button" onClick={signOut}>Sign out</button>{error && <p role="alert">{error}</p>}</div>}</div>;
}
