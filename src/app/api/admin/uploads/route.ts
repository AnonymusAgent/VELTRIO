import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { mediaAssets } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { assertSameOrigin, jsonBody, apiError, HttpError } from "@/lib/http";
import { validateUpload, ensureStorage, assetPath, removeAssetFile, STORAGE_QUOTA } from "@/lib/storage";
import { CHUNK_SIZE } from "@/lib/admin-shared";

export const runtime = "nodejs";
export async function POST(request: Request) {
  let createdPart: string | null = null;
  try {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const body = await jsonBody(request);
    const filename = path.basename(String(body.filename || "")).slice(0, 250);
    const size = Number(body.size);
    const info = validateUpload(filename, size, String(body.kind));
    const id = randomUUID();
    await ensureStorage();
    await db.transaction(async tx => {
      // Serialize storage reservations, including uploads from different admin tabs/processes.
      await tx.execute(sql`select pg_advisory_xact_lock(6577201)`);
      const [usage] = await tx.select({ total: sql<number>`coalesce(sum(${mediaAssets.size}), 0)` }).from(mediaAssets);
      if (Number(usage.total) + size > STORAGE_QUOTA) throw new HttpError(413, "The server storage allowance is full. Delete unused uploads or increase UPLOAD_STORAGE_GB.");
      await writeFile(assetPath(`${id}.part`), new Uint8Array(), { flag: "wx", mode: 0o600 });
      createdPart = `${id}.part`;
      await tx.insert(mediaAssets).values({ id, adminId: admin.id, kind: info.kind, filename, storageKey: `${id}${info.ext}`, mimeType: info.mime, size });
    });
    return NextResponse.json({ id, chunkSize: CHUNK_SIZE, received: 0 });
  } catch (error) { if (createdPart) await removeAssetFile(createdPart).catch(() => {}); return apiError(error); }
}
