import { NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { apiError, assertSameOrigin, HttpError, isEmail, jsonBody } from "@/lib/http";
import { throttle } from "@/lib/admin-auth";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); await throttle(request, "contact");
    const body = await jsonBody(request);
    const name = String(body.name || "").trim(), email = String(body.email || "").trim(), subject = String(body.subject || "").trim(), message = String(body.message || "").trim();
    if (!name || name.length > 120 || !isEmail(email) || email.length > 254 || !subject || subject.length > 200 || message.length < 10 || message.length > 5000) throw new HttpError(400, "Please check all fields and include a valid email address.");
    await db.insert(contactMessages).values({ name, email, subject, message });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
