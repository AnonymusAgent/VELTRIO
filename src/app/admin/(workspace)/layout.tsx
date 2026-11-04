import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAdmin } from "@/lib/admin-auth";
import AdminShell from "@/components/admin/AdminShell";
export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return <AdminShell name={admin.name}>{children}</AdminShell>;
}
