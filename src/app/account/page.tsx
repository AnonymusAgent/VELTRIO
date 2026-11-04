import AccountForm from "@/components/AccountForm";
export const metadata = { title: "Your account" };
export default function AccountPage() {
  return <div className="site-container py-14"><div className="vh-panel mx-auto max-w-lg p-8"><AccountForm /></div></div>;
}
