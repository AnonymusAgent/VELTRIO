import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/admin-auth";
import LoginForm from "@/components/admin/LoginForm";
export const metadata = { title: "Admin sign in" };
export default async function AdminLogin() {
  if (await getAdmin()) redirect("/admin");
  return <LoginForm />;
}
