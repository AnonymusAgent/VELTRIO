import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";
import ModerationInbox from "@/components/admin/ModerationInbox";
export const metadata = { title: "Moderation" };
export default async function ModerationPage() { if (!await getAdmin()) redirect("/admin/login"); return <ModerationInbox />; }
