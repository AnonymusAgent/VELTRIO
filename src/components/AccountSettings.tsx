"use client";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { accountErrorMessage } from "@/lib/account-errors";

const field = "mt-2 block w-full rounded border border-white/10 bg-black/30 p-3 text-white";
export default function AccountSettings() {
  const { data: session, isPending } = authClient.useSession();
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [changing, setChanging] = useState(false);
  if (isPending) return <p className="text-sm text-zinc-400">Loading your account…</p>;
  if (!session?.user) return <div className="vh-panel p-6"><h2 className="text-xl text-white">Sign in to manage your account</h2><Link href="/account" className="vh-button mt-5">Sign in or sign up</Link></div>;
  async function updateProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") || "").trim();
    if (!name || name.length > 120) { setProfileMessage("Enter a name between 1 and 120 characters."); return; }
    setSaving(true); setProfileMessage("");
    try {
      const result = await authClient.updateUser({ name });
      if (result.error) throw result.error;
      setProfileMessage("Profile updated.");
    } catch (error) { setProfileMessage(accountErrorMessage(error)); }
    finally { setSaving(false); }
  }
  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(form.get("currentPassword") || "");
    const newPassword = String(form.get("newPassword") || "");
    if (newPassword !== form.get("confirmPassword")) { setPasswordMessage("New passwords do not match."); return; }
    setChanging(true); setPasswordMessage("");
    try {
      const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: false });
      if (result.error) throw result.error;
      formElement.reset(); setPasswordMessage("Password changed.");
    } catch (error) { setPasswordMessage(accountErrorMessage(error)); }
    finally { setChanging(false); }
  }
  return <div className="space-y-6"><section className="vh-panel p-6"><h2 className="text-xl text-white">Your profile</h2><p className="mt-2 text-sm text-zinc-400">Your display name appears in your account and on new uploads.</p><form onSubmit={updateProfile} className="mt-5 space-y-4"><label className="block text-sm">Display name<input className={field} name="name" defaultValue={session.user.name || ""} required maxLength={120} autoComplete="name" /></label><div className="text-sm">Email<p className="mt-2 text-zinc-400">{session.user.email}</p></div>{profileMessage && <p role="status" className="text-sm text-[#b9b2ff]">{profileMessage}</p>}<button className="vh-button" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button></form></section><section className="vh-panel p-6"><h2 className="text-xl text-white">Password</h2><p className="mt-2 text-sm text-zinc-400">Change the password for your VELTRIO account.</p><form onSubmit={changePassword} className="mt-5 space-y-4"><label className="block text-sm">Current password<input className={field} name="currentPassword" type="password" autoComplete="current-password" required /></label><label className="block text-sm">New password<input className={field} name="newPassword" type="password" autoComplete="new-password" minLength={8} required /></label><label className="block text-sm">Confirm new password<input className={field} name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></label>{passwordMessage && <p role="status" className="text-sm text-[#b9b2ff]">{passwordMessage}</p>}<button className="vh-button secondary" disabled={changing}>{changing ? "Updating…" : "Change password"}</button></form></section></div>;
}
