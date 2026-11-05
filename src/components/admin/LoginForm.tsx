"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ShieldCheck, LockKeyhole, KeyRound, LoaderCircle, CircleAlert, CheckCircle2 } from "lucide-react";
import { ADMIN_EMAIL } from "@/lib/admin-shared";
import { BrandLogo } from "@/components/Brand";
import ThemeToggle from "@/components/ThemeToggle";
import PasswordField from "./PasswordField";

export default function LoginForm() {
  const router = useRouter();
  const [recover, setRecover] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    try {
      const embedded = window.self !== window.top;
      const response = await fetch(`/api/admin/auth/${recover ? "recover" : "login"}`, { method: "POST", credentials: "same-origin", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, email: ADMIN_EMAIL, embedded }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to sign in.");
      if (recover) { setRecover(false); form.reset(); setSuccess(result.message); }
      else {
        const check = await fetch("/api/admin/auth/session", { credentials: "same-origin", cache: "no-store" });
        const status = await check.json();
        if (!check.ok || !status.authenticated) throw new Error(embedded
          ? "Sign-in succeeded, but this browser blocked the preview's session cookie. Open the admin page in a new tab to sign in directly."
          : "Sign-in succeeded, but your browser did not keep the session cookie. Allow cookies for this site and try again.");
        router.replace("/admin");
        router.refresh();
      }
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to connect. Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="admin-login"><section className="login-story"><BrandLogo /><div className="login-story-content"><span className="eyebrow">THE CREATOR&apos;S CUT</span><h1>Your vision.<br />Your stories.<br /><span>Your stage.</span></h1><p>From the first upload to the final frame.<br />Build something worth pressing play for.</p></div><p className="login-story-footer">VELTRIO STUDIO &nbsp; / &nbsp; MADE FOR YOUR NEXT CHAPTER</p></section><section className="login-form-side"><div className="login-tools"><ThemeToggle /></div><Link href="/" className="login-back"><ArrowLeft size={13} /> Back to VELTRIO</Link><div className="login-form-container"><div className="md:hidden"><BrandLogo /></div><div className="login-lock">{recover ? <KeyRound size={20} /> : <LockKeyhole size={20} />}</div><span className="eyebrow text-[#9b8cff]">PRIVATE CREATOR STUDIO</span><h2 className="mt-3">{recover ? "Let’s get you back in." : "Welcome back."}</h2><p className="muted">{recover ? "Use your saved recovery code to choose a new password. No email service or external account needed." : "Sign in to manage your videos, shape your library, and share your next story."}</p><form className="login-form" onSubmit={submit}><div><label htmlFor="admin-email" className="vh-label">Admin email</label><input id="admin-email" type="email" name="email" value={ADMIN_EMAIL} readOnly autoComplete="username" className="vh-field" /></div>{recover ? <><div><label htmlFor="recovery-code" className="vh-label">Recovery code</label><input id="recovery-code" name="recoveryCode" required placeholder="VH-…" autoComplete="off" className="vh-field" maxLength={128} /></div><PasswordField name="newPassword" label="New password" isNew placeholder="At least 12 characters" /><PasswordField name="confirmPassword" label="Confirm new password" isNew placeholder="Enter your new password again" /></> : <div><div className="login-field-heading"><label className="vh-label">Password</label><button type="button" onClick={() => { setRecover(true); setError(""); setSuccess(""); }}>Forgot password?</button></div><PasswordField name="password" /></div>}{error && <div className="form-message" role="alert"><CircleAlert size={16} className="mt-0.5 shrink-0" /><span>{error} <a href="/admin/login" target="_blank" rel="noopener noreferrer" className="mt-2 block font-bold underline underline-offset-2">Open admin login in a new tab ↗</a></span></div>}{success && <div className="form-message success" role="status"><CheckCircle2 size={16} className="mt-0.5 shrink-0" />{success}</div>}<button className="vh-button" disabled={busy}>{busy ? <LoaderCircle className="animate-spin" size={16} /> : null}{busy ? "Please wait…" : recover ? "Reset password" : "Sign in to your studio"}{!busy && <ArrowRight size={16} />}</button>{recover && <button type="button" className="text-center text-[11px] text-zinc-500" onClick={() => { setRecover(false); setError(""); }}>← Back to sign in</button>}</form><div className="login-security"><ShieldCheck size={13} /> Password protected. No third-party sign-in.</div><div className="login-divider" /><p className="login-bottom-note">This is a private workspace for the VELTRIO administrator.<br />{recover ? "No recovery code? The server owner can reset access using the documented recovery command." : <>Your session is encrypted in transit and expires automatically.<br /><b>Not an administrator? Head back to the good stuff.</b></>}</p></div></section></div>;
}
