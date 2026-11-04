"use client";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { useLocalStorageValue, writeLocalStorage } from "@/lib/browser-storage";

export default function CreatorFollowButton({ slug }: { slug: string }) {
  const key = `followed-creator:${slug}`;
  const followed = useLocalStorageValue(key) === "1";
  const [error, setError] = useState("");
  function toggle() {
    setError("");
    if (!writeLocalStorage(key, followed ? null : "1")) setError("Browser storage is disabled.");
  }
  return <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={toggle} className="vh-button secondary small" aria-pressed={followed}>{followed ? <Check size={13} /> : <Plus size={13} />}{followed ? "Following" : "Follow creator"}</button>{error && <span className="text-[10px] text-amber-300" role="status">{error}</span>}</div>;
}
