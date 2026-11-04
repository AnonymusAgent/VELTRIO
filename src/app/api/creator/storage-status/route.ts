import { NextResponse } from "next/server";
import { requireUser } from "@/lib/user-auth";
import { creatorStorageIssue } from "@/lib/creator-storage";
import { apiError } from "@/lib/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireUser();
    const issue = creatorStorageIssue();
    return NextResponse.json({ available: !issue, message: issue }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
