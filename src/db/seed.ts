import "dotenv/config";
import { db, pool } from "./index";
import { categories } from "./schema";
import { CATEGORIES } from "../lib/data";
async function main() {
  for (const category of CATEGORIES) {
    await db.insert(categories).values({ name: category.name, slug: category.slug, description: category.description, thumbnail: category.thumbnail, videoCount: 0 }).onConflictDoNothing();
  }
  console.log("VELTRIO categories are ready. No sample or external videos are seeded.");
  await pool.end();
}
main().catch(() => { console.error("Category setup failed."); process.exit(1); });
