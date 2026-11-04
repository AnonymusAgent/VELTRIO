import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { apiError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ provider: process.env.STORAGE_PROVIDER === "vercel_blob" && process.env.BLOB_READ_WRITE_TOKEN ? "vercel_blob" : "local" }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
