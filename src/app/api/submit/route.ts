import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ error: "External link submissions have been retired. Sign in at /admin to upload a video directly." }, { status: 410 }); }
