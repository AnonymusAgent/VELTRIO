import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { admins, adminSessions, creatorProfiles, videos } from "@/db/schema";
import { EMBEDDED_ADMIN_COOKIE, requireAdmin, verifyPassword, hashPassword, validatePassword, attachSession, throttle } from "@/lib/admin-auth";
import { assertSameOrigin, jsonBody, HttpError, apiError } from "@/lib/http";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const body = await jsonBody(request);
    if (body.action === "profile") {
      const name = String(body.name || "").trim();
      const creatorDisplayName = String(body.creatorDisplayName || "").trim();
      const creatorBio = String(body.creatorBio || "").trim();
      if (name.length < 2 || name.length > 100) throw new HttpError(400, "Display name must have 2–100 characters.");
      if (creatorDisplayName.length < 2 || creatorDisplayName.length > 160) throw new HttpError(400, "Creator name must have 2–160 characters.");
      if (creatorBio.length < 10 || creatorBio.length > 1000) throw new HttpError(400, "Creator biography must have 10–1,000 characters.");
      await db.transaction(async tx => {
        const [creator] = await tx.select({ displayName: creatorProfiles.displayName }).from(creatorProfiles).where(eq(creatorProfiles.adminId, admin.id)).limit(1);
        await tx.update(admins).set({ name, introEnabled: body.introEnabled === true }).where(eq(admins.id, admin.id));
        await tx.update(creatorProfiles).set({ displayName: creatorDisplayName, bio: creatorBio, updatedAt: new Date() }).where(eq(creatorProfiles.adminId, admin.id));
        if (creator && creator.displayName !== creatorDisplayName) await tx.update(videos).set({ creator: creatorDisplayName, updatedAt: new Date() }).where(eq(videos.creator, creator.displayName));
      });
      return NextResponse.json({ ok: true });
    }
    await throttle(request, "settings");
    if (!await verifyPassword(String(body.currentPassword || "").slice(0, 129), admin.passwordHash)) throw new HttpError(400, "Your current password is incorrect.");
    if (body.action === "password") {
      const password = validatePassword(body.newPassword);
      if (password !== body.confirmPassword) throw new HttpError(400, "Your new passwords do not match.");
      if (await verifyPassword(password, admin.passwordHash)) throw new HttpError(400, "Choose a different password.");
      const hash = await hashPassword(password);
      await db.transaction(async (tx) => {
        await tx.update(admins).set({ passwordHash: hash, mustChangePassword: false, passwordChangedAt: new Date() }).where(eq(admins.id, admin.id));
        await tx.delete(adminSessions).where(eq(adminSessions.adminId, admin.id));
      });
      const embedded = Boolean((await cookies()).get(EMBEDDED_ADMIN_COOKIE)?.value);
      return attachSession(NextResponse.json({ ok: true, message: "Password changed. All previous sessions have been signed out." }), admin.id, embedded);
    }
    if (body.action === "recovery") {
      const code = `VH-${randomBytes(24).toString("base64url")}`;
      await db.update(admins).set({ recoveryHash: await hashPassword(code) }).where(eq(admins.id, admin.id));
      return NextResponse.json({ ok: true, recoveryCode: code }, { headers: { "Cache-Control": "no-store" } });
    }
    if (body.action === "sessions") {
      await db.delete(adminSessions).where(and(eq(adminSessions.adminId, admin.id), ne(adminSessions.id, admin.sessionId)));
      return NextResponse.json({ ok: true, message: "Other sessions have been signed out." });
    }
    throw new HttpError(400, "Unknown settings action.");
  } catch (error) { return apiError(error); }
}
