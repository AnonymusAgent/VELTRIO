"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient as auth } from "@/lib/auth-client";
import { accountErrorMessage } from "@/lib/account-errors";

export default function AccountForm() {
  const { data: session, isPending } = auth.useSession();
  const router = useRouter();
  const [signup, setSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "");
    const password = String(form.get("password") || "");
    setBusy(true); setMessage("");
    try {
      const result = signup
        ? await auth.signUp.email({ email, password, name: String(form.get("name") || "") })
        : await auth.signIn.email({ email, password });
      if (result.error) setMessage(accountErrorMessage(result.error));
      else if (!signup || result.data?.token) { router.push("/browse"); router.refresh(); }
      else setMessage("Account created. If verification is required, check your email before signing in.");
    } catch (error) { setMessage(accountErrorMessage(error)); }
    finally { setBusy(false); }
  }
  if (isPending) return <p>Loading account…</p>;
  if (session?.user) return <div className="space-y-4"><h2 className="text-xl text-white">Hello, {session.user.name}</h2><p>{session.user.email}</p><div className="flex flex-wrap gap-3"><Link href="/browse" className="vh-button">Browse videos</Link><Link href="/settings/account" className="vh-button secondary">Manage profile</Link></div><button className="vh-button secondary" onClick={async () => { await auth.signOut(); }}>Sign out</button></div>;
  return <><h2 className="text-xl text-white">{signup ? "Create your account" : "Welcome back"}</h2><p className="mt-2 text-sm text-zinc-400">Sign in to your VELTRIO account.</p><form onSubmit={submit} className="mt-6 space-y-4">{signup && <label className="block text-sm">Name<input className="mt-2 block w-full rounded border border-white/10 bg-black/30 p-3 text-white" name="name" required maxLength={120} autoComplete="name" /></label>}<label className="block text-sm">Email<input className="mt-2 block w-full rounded border border-white/10 bg-black/30 p-3 text-white" name="email" type="email" required autoComplete="email" /></label><label className="block text-sm">Password<input className="mt-2 block w-full rounded border border-white/10 bg-black/30 p-3 text-white" name="password" type="password" required minLength={8} autoComplete={signup ? "new-password" : "current-password"} /></label>{message && <p role="status" className="text-sm text-[#b9b2ff]">{message}</p>}<button className="vh-button" disabled={busy}>{busy ? "Please wait…" : signup ? "Sign up" : "Sign in"}</button></form><button className="mt-5 text-sm text-[#b9b2ff]" onClick={() => { setSignup(!signup); setMessage(""); }}>{signup ? "Already have an account? Sign in" : "New here? Create an account"}</button></>;
}
