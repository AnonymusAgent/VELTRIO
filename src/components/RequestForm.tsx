"use client";
import { useState } from "react";
import { ArrowRight, CheckCircle2, CircleAlert, LoaderCircle } from "lucide-react";
export default function RequestForm({ removal = false }: { removal?: boolean }) {
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError("");
    const data = Object.fromEntries(new FormData(e.currentTarget));
    try { const response = await fetch(removal ? "/api/dmca" : "/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Could not send your request."); setDone(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Request failed. Please try again."); }
    finally { setBusy(false); }
  }
  if (done) return <div className="vh-panel empty-state"><CheckCircle2 className="mx-auto mb-5 text-emerald-400" size={35} /><h3>Message received.</h3><p>Your request has been saved for the administrator to review. Keep a copy of your submission for your records.</p><button className="vh-button secondary small" onClick={() => setDone(false)}>Send another request</button></div>;
  return <form onSubmit={submit} className="vh-panel space-y-6 p-7"><div className="field-grid"><div><label htmlFor="request-name" className="vh-label">{removal ? "Rights holder / full name" : "Your name"}</label><input id="request-name" name={removal ? "claimant" : "name"} required maxLength={120} className="vh-field" /></div><div><label htmlFor="request-email" className="vh-label">Email address</label><input id="request-email" name="email" type="email" required maxLength={254} className="vh-field" /></div></div><div><label htmlFor="request-subject" className="vh-label">{removal ? "Video page URL" : "Subject"}</label><input id="request-subject" name={removal ? "contentUrl" : "subject"} type={removal ? "url" : "text"} required maxLength={removal ? 2000 : 200} className="vh-field" placeholder={removal ? "https://your-site.com/video/…" : "How can we help?"} /></div><div><label htmlFor="request-message" className="vh-label">{removal ? "Describe the issue and your authority to request removal" : "Your message"}</label><textarea id="request-message" name={removal ? "details" : "message"} required minLength={10} maxLength={5000} className="vh-field" rows={5} /></div>{removal && <label className="check-row"><input type="checkbox" name="confirmed" required /> I confirm the information is accurate and I am authorized to submit this request.</label>}{error && <div role="alert" className="form-message"><CircleAlert size={16} />{error}</div>}<button className="vh-button" disabled={busy}>{busy ? <LoaderCircle size={14} className="animate-spin" /> : <ArrowRight size={14} />}{busy ? "Sending…" : "Send request"}</button></form>;
}
