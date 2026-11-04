import { redirect } from "next/navigation";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { adminSessions } from "@/db/schema";
import { getAdmin } from "@/lib/admin-auth";
import { getStorageUsage } from "@/lib/video-store";
import { STORAGE_QUOTA } from "@/lib/storage";
import { adsenseConfig } from "@/lib/adsense";
import { ensureCreatorProfile } from "@/lib/creator-store";
import AdminSettings from "@/components/admin/AdminSettings";
export const metadata = { title: "Account & settings" };
export default async function SettingsPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  const [sessions, storage, creator] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(adminSessions).where(and(eq(adminSessions.adminId, admin.id), gt(adminSessions.expiresAt, new Date()))),
    getStorageUsage(),
    ensureCreatorProfile(admin.id),
  ]);
  return <AdminSettings profile={{ email: admin.email, name: admin.name, mustChangePassword: admin.mustChangePassword, introEnabled: admin.introEnabled, passwordChangedAt: admin.passwordChangedAt.toISOString(), creatorSlug: creator.slug, creatorDisplayName: creator.displayName, creatorBio: creator.bio }} sessionCount={Number(sessions[0].count)} storage={storage.size} quota={STORAGE_QUOTA} adsConfigured={adsenseConfig.isConfigured} />;
}
