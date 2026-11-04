import { HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/admin-shared";

// Shared storage-quota panel used by the studio overview and account settings.
export default function StoragePanel({ title, used, quota, note }: { title: string; used: number; quota: number; note: string }) {
  return <section className="vh-panel storage-panel"><h3 className="flex items-center gap-2"><HardDrive size={14} className="text-zinc-500" /> {title}</h3><div className="row"><span>{formatBytes(used)} used</span><span>{formatBytes(quota)}</span></div><div className="progress-track"><div className="progress-fill" style={{ width: `${Math.min(100, used / quota * 100)}%` }} /></div><p>{note}</p></section>;
}
