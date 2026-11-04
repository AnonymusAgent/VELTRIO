"use client";
import { useState } from "react";
import { Check, Flag, LoaderCircle } from "lucide-react";

export default function ReportForm({ videoSlug }: { videoSlug: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const body = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, videoSlug }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Report could not be sent.");
      setDone(true); event.currentTarget.reset();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Report could not be sent."); }
    finally { setBusy(false); }
  }
  if (done) return <div className="report-confirmation" role="status"><Check size={14} /> Thanks. The administrator will review this report privately.</div>;
  return <div className="report-form-wrap"><button type="button" className="report-trigger" onClick={() => setOpen(value => !value)} aria-expanded={open}><Flag size={12} /> Report a concern</button>{open && <form className="report-form" onSubmit={submit}><label><span>Reason</span><select name="reason" required defaultValue=""><option value="" disabled>Choose one</option><option>Copyright or ownership</option><option>Privacy or consent</option><option>Harassment or abuse</option><option>Something else</option></select></label><label><span>Details</span><textarea name="details" required minLength={10} maxLength={2000} rows={4} placeholder="Tell us what needs review." /></label><label><span>Email (optional)</span><input name="reporterEmail" type="email" maxLength={254} placeholder="For follow-up only" /></label>{error && <p className="report-error" role="alert">{error}</p>}<button type="submit" className="vh-button secondary small" disabled={busy}>{busy && <LoaderCircle size={13} className="animate-spin" />}{busy ? "Sending…" : "Send private report"}</button></form>}</div>;
}
