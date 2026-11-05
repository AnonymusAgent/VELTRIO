import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { userAuth } from "@/lib/user-auth";
import CreatorUpload from "@/components/CreatorUpload";
import CreatorLegacyUpload from "@/components/CreatorLegacyUpload";
import { isMuxEnabled, muxReady } from "@/lib/mux-stream";
export const dynamic = "force-dynamic";
export const metadata = { title: "Upload a video" };
export default async function CreatorUploadPage() {
  let user;
  try { user = (await userAuth().getSession()).data?.user; } catch { /* Service not configured. */ }
  if (!user) redirect("/account");
  const mux = isMuxEnabled();
  const config = muxReady();
  return <div className="studio-shell"><div className="site-container">
    <Link href="/studio" className="studio-back"><ArrowLeft size={15} /> Creator studio</Link>
    {mux ? <CreatorUpload signedPlayback={!!(config?.playbackSigningKeyId && config?.playbackPrivateKey)} /> : <CreatorLegacyUpload />}
  </div></div>;
}
