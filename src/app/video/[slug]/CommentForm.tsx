"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({ slug }: { slug: string }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const response = await fetch("/api/comments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ videoSlug: slug, name: fd.get("name"), email: fd.get("email"), body: fd.get("body") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Comment failed");
      setDone(true);
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment could not be posted");
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required placeholder="Your name" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none" />
        <input name="email" type="email" placeholder="Email (optional)" className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none" />
      </div>
      <textarea name="body" required rows={3} placeholder="Share your thoughts..." className="mt-3 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-rose-500 focus:outline-none" />
      <div className="mt-3 flex items-center gap-3">
        <button disabled={loading} className="rounded-full bg-rose-600 px-5 py-2 text-sm font-bold text-white hover:bg-rose-500 disabled:opacity-50">{loading ? "Posting..." : "Post Comment"}</button>
        {done && <span className="text-sm font-semibold text-emerald-400">Comment posted.</span>}
        {error && <span className="text-sm font-semibold text-red-300">{error}</span>}
      </div>
    </form>
  );
}
