import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";
import UploadForm from "@/components/admin/UploadForm";
import CreatorUpload from "@/components/CreatorUpload";
import { isMuxEnabled, muxReady } from "@/lib/mux-stream";

export const metadata = { title: "Upload a video" };

export default async function UploadPage() {
  if (!await getAdmin()) redirect("/admin/login");
  if (!isMuxEnabled()) return <UploadForm />;
  const config = muxReady();
  return <CreatorUpload signedPlayback={!!(config?.playbackSigningKeyId && config?.playbackPrivateKey)} apiBase="/api/admin/mux" libraryHref="/admin/videos" libraryLabel="Back to library" />;
}
