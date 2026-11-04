import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";
import UploadForm from "@/components/admin/UploadForm";
export const metadata = { title: "Upload a video" };
export default async function UploadPage() { if (!await getAdmin()) redirect("/admin/login"); return <UploadForm />; }
