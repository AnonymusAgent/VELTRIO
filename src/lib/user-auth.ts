import { createNeonAuth } from "@neondatabase/auth/next/server";

// Lazily initialize so public pages and builds work without Neon Auth configured.
export function userAuth() {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !secret || secret.length < 32) throw new Error("Neon Auth is not configured. Set NEON_AUTH_BASE_URL and a 32-character NEON_AUTH_COOKIE_SECRET.");
  return createNeonAuth({ baseUrl, cookies: { secret } });
}

export async function requireUser() {
  const { data } = await userAuth().getSession();
  if (!data?.user?.id) {
    const { HttpError } = await import("@/lib/http");
    throw new HttpError(401, "Please sign in to your account.");
  }
  return data.user;
}
