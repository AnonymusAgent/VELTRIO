import { randomBytes, scrypt, timingSafeEqual, createHash } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { admins, adminSessions, authAttempts } from "@/db/schema";
import { ADMIN_EMAIL } from "./admin-shared";
import { HttpError } from "./http";

export const ADMIN_COOKIE = "vh_admin_session";
const SESSION_SECONDS = 60 * 60 * 12;
export const EMBEDDED_ADMIN_COOKIE = "vh_admin_embedded_session";
function cookieOptions(embedded: boolean) {
  return {
    httpOnly: true,
    sameSite: embedded ? "none" as const : "lax" as const,
    secure: embedded || process.env.NODE_ENV === "production",
    partitioned: embedded,
    path: "/",
  };
}
export function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export function isSessionToken(value: string | undefined): value is string { return Boolean(value && /^[a-f0-9]{64}$/.test(value)); }

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => error ? reject(error) : resolve(key)));
}
export async function hashPassword(password: string) {
  const salt = randomBytes(24).toString("hex");
  return `scrypt$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, hash: string) {
  try {
    const [algorithm, salt, key] = hash.split("$");
    if (algorithm !== "scrypt" || !salt || !key) return false;
    const expected = Buffer.from(key, "hex");
    const actual = await derive(password, salt);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch { return false; }
}
export function validatePassword(value: unknown) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128) throw new HttpError(400, "Use a password between 12 and 128 characters.");
  return value;
}

export async function ensureAdmin() {
  const [existing] = await db.select().from(admins).where(eq(admins.email, ADMIN_EMAIL)).limit(1);
  if (existing) return existing;
  const initial = process.env.ADMIN_INITIAL_PASSWORD;
  if (!initial || initial.length < 12) throw new HttpError(503, "Admin provisioning is incomplete. Set ADMIN_INITIAL_PASSWORD on the server.");
  const recovery = process.env.ADMIN_RECOVERY_CODE;
  await db.insert(admins).values({ email: ADMIN_EMAIL, passwordHash: await hashPassword(initial), recoveryHash: recovery ? await hashPassword(recovery) : null }).onConflictDoNothing();
  const [admin] = await db.select().from(admins).where(eq(admins.email, ADMIN_EMAIL)).limit(1);
  return admin;
}

// Cached per request: the workspace layout and each page both resolve the
// session, but only one database lookup is performed per render.
export const getAdmin = cache(async () => {
  const store = await cookies();
  for (const name of [EMBEDDED_ADMIN_COOKIE, ADMIN_COOKIE]) {
    const token = store.get(name)?.value;
    if (!isSessionToken(token)) continue;
    const [row] = await db.select({ admin: admins, sessionId: adminSessions.id }).from(adminSessions).innerJoin(admins, eq(adminSessions.adminId, admins.id)).where(and(eq(adminSessions.id, hashToken(token)), gt(adminSessions.expiresAt, new Date()))).limit(1);
    if (row) return { ...row.admin, sessionId: row.sessionId };
  }
  return null;
});
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) throw new HttpError(401, "Your session has expired. Please sign in again.");
  return admin;
}

export async function attachSession(response: NextResponse, adminId: number, embedded = false) {
  const token = randomBytes(32).toString("hex");
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
  await db.insert(adminSessions).values({ id: hashToken(token), adminId, expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000) });
  response.cookies.set(embedded ? EMBEDDED_ADMIN_COOKIE : ADMIN_COOKIE, token, { ...cookieOptions(embedded), maxAge: SESSION_SECONDS });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export function clearSession(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE, "", { ...cookieOptions(false), maxAge: 0 });
  response.cookies.set(EMBEDDED_ADMIN_COOKIE, "", { ...cookieOptions(true), maxAge: 0 });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function throttle(request: Request, scope: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const id = hashToken(`${scope}:${ip}`);
  const now = new Date();
  await db.delete(authAttempts).where(lt(authAttempts.expiresAt, now));
  const [attempt] = await db.insert(authAttempts).values({ id, count: 1, expiresAt: new Date(Date.now() + 15 * 60 * 1000) }).onConflictDoUpdate({ target: authAttempts.id, set: { count: sql`${authAttempts.count} + 1` } }).returning();
  if (attempt.count > 8) throw new HttpError(429, "Too many attempts. Please try again in 15 minutes.");
  return id;
}
