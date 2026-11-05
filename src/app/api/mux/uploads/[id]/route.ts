import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { muxUploads } from "@/db/schema";
import { requireUser } from "@/lib/user-auth";
import { apiError, assertSameOrigin, HttpError } from "@/lib/http";
import { muxUploadView, ownedMuxUpload, syncMuxUpload } from "@/lib/mux-stream";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const user = await requireUser();
    const row = await ownedMuxUpload((await params).id, user.id);
    const synced = await syncMuxUpload(row);
    return NextResponse.json(muxUploadView(synced), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}

// Abandoned or unwanted uploads are marked cancelled so the provider session
// cannot create an unattached (billable) asset later.
export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const row = await ownedMuxUpload((await params).id, user.id);
    if (row.videoId) throw new HttpError(409, "This upload is already part of a video.");
    await db.update(muxUploads).set({ status: "cancelled", updatedAt: new Date() }).where(eq(muxUploads.id, row.id));
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
