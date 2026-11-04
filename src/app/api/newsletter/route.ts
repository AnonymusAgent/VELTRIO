import { NextResponse } from "next/server";
import { db } from "@/db";
import { newsletter } from "@/db/schema";

export async function POST(req: Request) {
  try {
    const form = await req.formData().catch(() => null);
    const email = form?.get("email") as string | null;
    if (email) {
      try { await db.insert(newsletter).values({ email }).onConflictDoNothing(); } catch {}
      return NextResponse.redirect(new URL("/?subscribed=1", req.url));
    }
    const body = await req.json().catch(() => ({}));
    if (body.email) { try { await db.insert(newsletter).values({ email: body.email }).onConflictDoNothing(); } catch {} }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
