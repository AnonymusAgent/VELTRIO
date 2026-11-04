"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient as auth } from "@/lib/auth-client";
import { accountErrorMessage } from "@/lib/account-errors";
import { useAuthTransition } from "./AuthTransition";
import AuthDoorScene, { waitForDoorScene, type DoorDirection } from "./AuthDoorScene";

export default function AccountForm() {
  const { data: session, isPending } = auth.useSession();
  const router = useRouter();
  const { transition, begin, end } = useAuthTransition();
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [scene, setScene] = useState<DoorDirection | null>(null);
  const locked = useRef(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current || !begin("enter")) return;
    locked.current = true;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    setBusy(true); setMessage("");
    try {
      const result = signup
        ? await auth.signUp.email({ email, password, name: String(form.get("name") || "") })
        : await auth.signIn.email({ email, password });
      if (result.error) setMessage(accountErrorMessage(result.error));
      else if (!signup || result.data?.token) {
        setScene("enter");
        await waitForDoorScene();
        router.push("/browse"); router.refresh();
      } else setMessage("Account created. If verification is required, check your email before signing in.");
    } catch (error) { setMessage(accountErrorMessage(error)); }
    finally { end(); setScene(null); setBusy(false); locked.current = false; }
  }

  async function signOut() {
    if (locked.current || !begin("exit")) return;
    locked.current = true; setBusy(true); setMessage(""); setScene("exit");
    try {
      await waitForDoorScene();
      const result = await auth.signOut();
      if (result.error) throw result.error;
    } catch { setMessage("Could not sign out. Please try again."); }
    finally { end(); setScene(null); setBusy(false); locked.current = false; }
  }

  if (isPending && !busy) return <p>Loading account…</p>;
  // Keep the submitting button mounted while the shared session updates.
  if (session?.user && !(busy && scene !== "exit")) return <div className="space-y-4"><h2 className="text-xl text-white">Hello, {session.user.name}</h2><p>{session.user.email}</p><div className="flex flex-wrap gap-3"><Link href="/browse" className="vh-button">Browse videos</Link><Link href="/settings/account" className="vh-button secondary">Manage profile</Link></div><button type="button" className={`vh-button secondary${scene ? " auth-door-active" : ""}`} disabled={busy || !!transition} onClick={signOut}>{scene && <AuthDoorScene direction={scene} />}<span aria-live="polite">{scene ? "Signing out…" : "Sign out"}</span></button>{message && <p role="alert" className="text-sm text-[#b9b2ff]">{message}</p>}</div>;
  return <><h2 className="text-xl text-white">{signup ? "Create your account" : "Welcome back"}</h2><p className="mt-2 text-sm text-zinc-400">Sign in to your VELTRIO account.</p><form onSubmit={submit} className="mt-6 space-y-4">{signup && <label className="block text-sm">Name<input className="mt-2 block w-full rounded border border-white/10 bg-black/30 p-3 text-white" name="name" required maxLength={120} autoComplete="name" /></label>}<label className="block text-sm">Email<input className="mt-2 block w-full rounded border border-white/10 bg-black/30 p-3 text-white" name="email" type="email" required autoComplete="email" /></label><label className="block text-sm">Password<input className="mt-2 block w-full rounded border border-white/10 bg-black/30 p-3 text-white" name="password" type="password" required minLength={8} autoComplete={signup ? "new-password" : "current-password"} /></label>{message && <p role="status" className="text-sm text-[#b9b2ff]">{message}</p>}<button className={`vh-button${scene ? " auth-door-active" : ""}`} disabled={busy}>{scene && <AuthDoorScene direction={scene} />}<span aria-live="polite">{scene ? "Signing in…" : busy ? "Please wait…" : signup ? "Sign up" : "Sign in"}</span></button></form><button className="mt-5 text-sm text-[#b9b2ff]" disabled={busy} onClick={() => { setSignup(!signup); setMessage(""); }}>{signup ? "Already have an account? Sign in" : "New here? Create an account"}</button></>;
}
