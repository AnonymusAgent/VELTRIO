import { NextResponse } from "next/server";
export async function POST() { return NextResponse.json({ error: "Only the publisher can add titles." }, { status: 410 }); }
