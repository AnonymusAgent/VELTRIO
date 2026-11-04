import { NextResponse } from "next/server";
import { apiError, assertSameOrigin, HttpError, jsonBody } from "@/lib/http";
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { choice } = await jsonBody(request);
    if (choice !== "yes" && choice !== "no") throw new HttpError(400, "Invalid choice.");
    const response = NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set("vh_analytics_consent", choice, { path: "/", sameSite: "lax", secure, maxAge: 31536000 });
    if (choice === "no") {
      response.cookies.set("vh_page_visitor", "", { path: "/", sameSite: "lax", secure, httpOnly: true, maxAge: 0 });
      response.cookies.set("vh_analytics_session", "", { path: "/", sameSite: "lax", secure, httpOnly: true, maxAge: 0 });
    }
    return response;
  } catch (error) { return apiError(error); }
}
