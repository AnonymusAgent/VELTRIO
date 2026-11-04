import { NextResponse } from "next/server";
import { userAuth } from "@/lib/user-auth";

type Context = { params: Promise<{ path: string[] }> };
function handler(method: "GET" | "POST", request: Request, context: Context) {
  try { return userAuth().handler()[method](request, context); }
  catch { return Promise.resolve(NextResponse.json({ error: "Account sign-in is not configured." }, { status: 503 })); }
}
export function GET(request: Request, context: Context) { return handler("GET", request, context); }
export function POST(request: Request, context: Context) { return handler("POST", request, context); }
