// Vercel preview builds frequently share configuration with production. Do not
// run DDL from a preview unless the operator explicitly opts in after assigning
// a separate direct preview database. This does not isolate runtime queries.
export function shouldRunMigrations(env: Record<string, string | undefined>): boolean {
  return env.VERCEL_ENV !== "preview" || env.ALLOW_PREVIEW_DB_MIGRATIONS === "true";
}
