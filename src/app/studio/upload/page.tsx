import Link from "next/link";
import { redirect } from "next/navigation";
import { userAuth } from "@/lib/user-auth";
import CreatorUpload from "@/components/CreatorUpload";
export const dynamic = "force-dynamic";
export default async function CreatorUploadPage() {
  let user;
  try { user = (await userAuth().getSession()).data?.user; } catch { /* Service not configured. */ }
  if (!user) redirect("/account");
  return <main className="site-container py-12"><Link href="/studio" className="mb-5 inline-block text-sm text-[#b9b2ff]">← Creator studio</Link><CreatorUpload /></main>;
}
