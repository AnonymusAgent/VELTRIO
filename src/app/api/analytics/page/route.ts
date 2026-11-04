import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { pageViews } from "@/db/schema";
import { apiError, assertSameOrigin, HttpError, jsonBody } from "@/lib/http";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const cookie = request.headers.get("cookie") || "";
    if (!/(?:^|;\s*)vh_analytics_consent=yes(?:;|$)/.test(cookie)) throw new HttpError(403, "Analytics consent required.");
    const body = await jsonBody(request);
    const path = body.path;
    // Store only known public route patterns, never search terms, account pages or arbitrary input.
    if (typeof path !== "string" || path.length > 320 || !/^\/(?:|browse|trending|search|my-list|category\/[a-z0-9-]+|creator\/[a-z0-9-]+|video\/[a-z0-9-]+)$/.test(path)) throw new HttpError(400, "Invalid page.");
    const match = /(?:^|;\s*)vh_page_visitor=([a-f0-9]{64})(?:;|$)/.exec(cookie);
    const token = match?.[1] || randomBytes(32).toString("hex");
    await db.insert(pageViews).values({ path, visitorHash: createHash("sha256").update(token).digest("hex") });
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    if (!match) response.cookies.set("vh_page_visitor", token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
    return response;
  } catch (error) { return apiError(error); }
}
