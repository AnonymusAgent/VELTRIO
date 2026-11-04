import "dotenv/config";
import { eq } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db, pool } from "../src/db";
import { admins, adminSessions, authAttempts } from "../src/db/schema";
import { ADMIN_EMAIL } from "../src/lib/admin-shared";
import { ensureAdmin, hashPassword, validatePassword } from "../src/lib/admin-auth";

async function recover() {
  const password = validatePassword(process.env.ADMIN_INITIAL_PASSWORD);
  const admin = await ensureAdmin();
  const recoveryCode = `VH-${randomBytes(24).toString("base64url")}`;
  await db.transaction(async tx => {
    await tx.update(admins).set({ passwordHash: await hashPassword(password), recoveryHash: await hashPassword(recoveryCode), mustChangePassword: true, passwordChangedAt: new Date() }).where(eq(admins.email, ADMIN_EMAIL));
    await tx.delete(adminSessions).where(eq(adminSessions.adminId, admin.id));
    await tx.delete(authAttempts);
  });
  console.log(`Admin recovered: ${ADMIN_EMAIL}. Password comes from ADMIN_INITIAL_PASSWORD. All sessions revoked.`);
  console.log(`New one-time recovery code (store privately): ${recoveryCode}`);
  await pool.end();
}
recover().catch(error => { console.error(error instanceof Error ? error.message : "Recovery failed."); process.exit(1); });
