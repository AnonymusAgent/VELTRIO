import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { watchProgress } from "@/db/schema";
import { apiError, assertSameOrigin } from "@/lib/http";
import { userAuth } from "@/lib/user-auth";

export const dynamic = "force-dynamic";

// Clears signed-in watch history. Signed-out viewers only have the browser copy.
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    let userId: string | undefined;
    try { userId = (await userAuth().getSession()).data?.user?.id || undefined; } catch { userId = undefined; }
    if (userId) await db.delete(watchProgress).where(eq(watchProgress.userId, userId));
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
