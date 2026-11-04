import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { admins, adminSessions, authAttempts } from "@/db/schema";
import { ADMIN_EMAIL } from "@/lib/admin-shared";
import { ADMIN_COOKIE, EMBEDDED_ADMIN_COOKIE, getAdmin, ensureAdmin, attachSession, clearSession, hashPassword, hashToken, throttle, validatePassword, verifyPassword } from "@/lib/admin-auth";
import { assertSameOrigin, jsonBody, apiError, HttpError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ action: string }> }) {
  if ((await params).action !== "session") return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const admin = await getAdmin();
    return NextResponse.json({ authenticated: Boolean(admin) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    assertSameOrigin(request);
    const { action } = await params;
    if (action === "logout") {
      const store = await cookies();
      for (const name of [ADMIN_COOKIE, EMBEDDED_ADMIN_COOKIE]) {
        const token = store.get(name)?.value;
        if (token && /^[a-f0-9]{64}$/.test(token)) await db.delete(adminSessions).where(eq(adminSessions.id, hashToken(token)));
      }
      return clearSession(NextResponse.json({ ok: true }));
    }
    if (action !== "login" && action !== "recover") throw new HttpError(404, "Unknown action.");
    const attempt = await throttle(request, action);
    const body = await jsonBody(request);
    const admin = await ensureAdmin();
    const email = String(body.email || "").trim().toLowerCase();
    if (action === "login") {
      const password = typeof body.password === "string" ? body.password.slice(0, 129) : "";
      const valid = await verifyPassword(password, admin.passwordHash);
      if (!valid || email !== ADMIN_EMAIL) throw new HttpError(401, "The email or password is incorrect.");
      await db.delete(authAttempts).where(eq(authAttempts.id, attempt));
      await db.update(admins).set({ lastLoginAt: new Date() }).where(eq(admins.id, admin.id));
      const embedded = body.embedded === true;
      // The preview's HTTPS reverse proxy may forward internally over HTTP. The
      // Origin was already checked against Host above, so it reflects the real browser origin.
      const browserOrigin = request.headers.get("origin");
      if (embedded && (!browserOrigin || new URL(browserOrigin).protocol !== "https:")) throw new HttpError(400, "Embedded login requires a secure HTTPS connection. Open the admin page directly instead.");
      return attachSession(NextResponse.json({ ok: true, mustChangePassword: admin.mustChangePassword }), admin.id, embedded);
    }
    const code = String(body.recoveryCode || "").trim().slice(0, 128);
    const valid = admin.recoveryHash ? await verifyPassword(code, admin.recoveryHash) : false;
    if (!valid || email !== ADMIN_EMAIL) throw new HttpError(401, "The email or recovery code is incorrect.");
    const password = validatePassword(body.newPassword);
    if (password !== body.confirmPassword) throw new HttpError(400, "Passwords do not match.");
    const hash = await hashPassword(password);
    await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(admins).where(eq(admins.id, admin.id)).for("update");
      if (!locked.recoveryHash || locked.recoveryHash !== admin.recoveryHash) throw new HttpError(409, "This recovery code has already been used.");
      await tx.update(admins).set({ passwordHash: hash, recoveryHash: null, mustChangePassword: false, passwordChangedAt: new Date() }).where(eq(admins.id, admin.id));
      await tx.delete(adminSessions).where(eq(adminSessions.adminId, admin.id));
    });
    await db.delete(authAttempts).where(eq(authAttempts.id, attempt));
    return clearSession(NextResponse.json({ ok: true, message: "Password reset. Sign in with your new password. Generate a new recovery code in Settings." }));
  } catch (error) { return apiError(error); }
}
