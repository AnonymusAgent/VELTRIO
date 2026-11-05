/**
 * Creator uploads use the Mux streaming pipeline when MUX credentials exist.
 * Without them, the legacy chunked local/Blob path is only usable when the
 * deployment actually has durable storage (never Vercel's ephemeral disk).
 */
export function creatorStorageIssue(env: Record<string, string | undefined> = process.env): string | null {
  if (env.MUX_TOKEN_ID && env.MUX_TOKEN_SECRET && env.MUX_ENABLED !== "false") return null;
  if (env.STORAGE_PROVIDER === "vercel_blob") return "Creator uploads are not available with Vercel Blob yet. Configure Mux streaming before uploading.";
  if (env.VERCEL) return "Creator uploads need durable storage. Add Mux streaming credentials before uploading from Vercel.";
  return null;
}
