import { isAuthError } from "@neondatabase/auth/next";

const unavailable = "Account service is unavailable. Please try again later.";

/** Neon Auth may throw an AuthError instead of returning result.error. */
export function accountErrorMessage(error: unknown): string {
  // The SDK can either throw a normalized AuthError or return a Better Fetch error.
  const known = isAuthError(error) || (typeof error === "object" && error !== null && "status" in error && "message" in error);
  if (!known || typeof error !== "object" || error === null || !("status" in error)) return unavailable;
  const status = error.status;
  if (status === 429) return "Too many attempts. Please wait a moment and try again.";
  if (typeof status !== "number" || status >= 500 || status < 400) return unavailable;
  const message = "message" in error ? error.message : undefined;
  // Do not expose raw HTTP fallback messages or arbitrary server errors.
  if (typeof message === "string" && message.trim() && message.length <= 300 && !/^HTTP \d{3}(?:\s|$)/i.test(message)) return message;
  if (status === 403) return "Sign-in was not allowed. Please check the account service configuration.";
  return "Could not authenticate. Please check your details and try again.";
}
