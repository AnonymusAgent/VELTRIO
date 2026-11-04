/** Creator uploads currently require a persistent filesystem, not Vercel's ephemeral disk. */
export function creatorStorageIssue(env: Record<string, string | undefined> = process.env): string | null {
  if (env.STORAGE_PROVIDER === "vercel_blob") return "Creator uploads are not available with Vercel Blob yet. Storage must be configured before uploading.";
  if (env.VERCEL) return "Creator uploads need durable storage. Vercel's local filesystem is temporary; configure a supported persistent storage service before uploading.";
  return null;
}
