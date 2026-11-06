"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, UserRound } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useAuthTransition } from "./AuthTransition";
import AuthDoorScene, { waitForDoorScene } from "./AuthDoorScene";

export default function ProfileMenu() {
  const { data: session, isPending } = authClient.useSession();
  const { transition, begin, end } = useAuthTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const locked = useRef(false);
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || signingOut) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("keydown", close); window.removeEventListener("pointerdown", outside); };
  }, [open, signingOut]);
  if (transition === "enter" || isPending || !session?.user) return <Link href="/account" className="header-studio" aria-label="Sign in or create an account"><UserRound size={15} /><span>Sign in</span><ArrowUpRight size={14} /></Link>;
  const initial = (session.user.name || session.user.email || "U").trim().slice(0, 1).toUpperCase();
  async function signOut() {
    if (locked.current || !begin("exit")) return;
    locked.current = true; setSigningOut(true); setError("");
    try {
      await waitForDoorScene();
      const result = await authClient.signOut();
      if (result.error) throw result.error;
      setOpen(false); router.push("/"); router.refresh();
    } catch { setError("Could not sign out. Please try again."); }
    finally { end(); locked.current = false; setSigningOut(false); }
  }
  return <div ref={menuRef} className="profile-menu"><button type="button" className="profile-trigger" disabled={!!transition} onClick={() => setOpen(!open)} aria-label="Open profile menu" aria-haspopup="true" aria-expanded={open}>{initial}</button>{open && <div className={`profile-dropdown${signingOut ? " profile-dropdown--busy" : ""}`}><div className="profile-heading"><strong>{session.user.name}</strong><span>{session.user.email}</span></div><div inert={signingOut}><Link href="/settings/account" onClick={() => setOpen(false)}>Manage profile</Link><Link href="/my-list" onClick={() => setOpen(false)}>My list</Link><Link href="/settings" onClick={() => setOpen(false)}>Settings</Link></div><button type="button" onClick={signOut} disabled={!!transition} className={`auth-door-button${signingOut ? " auth-door-active" : ""}`} aria-label={signingOut ? "Signing out…" : "Sign out"}><span className="auth-door-label" aria-hidden="true">Sign out</span>{signingOut && <AuthDoorScene direction="exit" />}</button><span className="sr-only" role="status">{signingOut ? "Signing out…" : ""}</span>{error && <p role="alert">{error}</p>}</div>}</div>;
}
