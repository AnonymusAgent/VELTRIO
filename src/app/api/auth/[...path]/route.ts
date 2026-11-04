import { NextResponse } from "next/server";
import { userAuth } from "@/lib/user-auth";

type Context = { params: Promise<{ path: string[] }> };
async function handler(method: "GET" | "POST", request: Request, context: Context) {
  try {
    const response = await userAuth().handler()[method](request, context);
    // The SDK's signed session-data cookie caches the old name for five minutes.
    // Invalidate only after a successful profile update so the next session read is fresh.
    if (method === "POST" && response.ok && (await context.params).path.join("/") === "update-user") {
      response.headers.append("Set-Cookie", "__Secure-neon-auth.local.session_data=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
    }
    return response;
  } catch { return NextResponse.json({ error: "Account service is unavailable." }, { status: 503 }); }
}
export function GET(request: Request, context: Context) { return handler("GET", request, context); }
export function POST(request: Request, context: Context) { return handler("POST", request, context); }
