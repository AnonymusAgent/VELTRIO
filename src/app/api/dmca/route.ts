import { NextResponse } from "next/server";
import { db } from "@/db";
import { dmcaRequests } from "@/db/schema";
import { apiError, assertSameOrigin, HttpError, isEmail, jsonBody } from "@/lib/http";
import { throttle } from "@/lib/admin-auth";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request); await throttle(request, "removal");
    const body = await jsonBody(request);
    const claimant = String(body.claimant || "").trim(), email = String(body.email || "").trim(), contentUrl = String(body.contentUrl || "").trim(), details = String(body.details || "").trim();
    if (!claimant || claimant.length > 120 || !isEmail(email) || email.length > 200 || !/^https?:\/\//.test(contentUrl) || contentUrl.length > 2000 || details.length < 10 || details.length > 5000 || body.confirmed !== "on") throw new HttpError(400, "Check the request details and confirm your authority to submit.");
    await db.insert(dmcaRequests).values({ claimant, email, contentUrl, details });
    return NextResponse.json({ ok: true });
  } catch (error) { return apiError(error); }
}
