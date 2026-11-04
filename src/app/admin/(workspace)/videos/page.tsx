import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";
import { getAdminVideos } from "@/lib/video-store";
import VideoLibrary from "@/components/admin/VideoLibrary";
export const metadata = { title: "Video library" };
export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  if (!await getAdmin()) redirect("/admin/login");
  const { edit } = await searchParams;
  return <VideoLibrary videos={await getAdminVideos()} initialEdit={edit ? Number(edit) : undefined} />;
}
