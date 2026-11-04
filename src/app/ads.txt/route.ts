import { NextResponse } from "next/server";
export async function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";
  const body = /^ca-pub-\d{16}$/.test(client) ? `google.com, ${client.replace("ca-", "")}, DIRECT, f08c47fec0942fa0\n` : "# Video Hub — no authorized advertising seller configured.\n";
  return new NextResponse(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
