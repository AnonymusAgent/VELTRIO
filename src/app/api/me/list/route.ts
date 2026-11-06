import { NextResponse } from "next/server";
import { apiError, assertSameOrigin, jsonBody } from "@/lib/http";
import { userAuth } from "@/lib/user-auth";
import { addSavedSlugs, listSavedSlugs, removeSavedSlug } from "@/lib/saved-titles";

export const dynamic = "force-dynamic";

async function viewerId() {
  try { return (await userAuth().getSession()).data?.user?.id || undefined; } catch { return undefined; }
}

function privateJson(body: { stored: boolean; userId?: string; slugs: string[] }) {
  return NextResponse.json(body, { headers: { "Cache-Control": "private, no-store" } });
}

export async function GET() {
  try {
    const userId = await viewerId();
    if (!userId) return privateJson({ stored: false, slugs: [] });
    return privateJson({ stored: true, userId, slugs: await listSavedSlugs(userId) });
  } catch (error) { return apiError(error); }
}

// Merge this browser's list, or save and remove one title. Signed-out calls no-op.
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const userId = await viewerId();
    if (!userId) return privateJson({ stored: false, slugs: [] });
    const body = await jsonBody(request);
    if (Array.isArray(body.merge)) {
      await addSavedSlugs(userId, body.merge.filter((slug): slug is string => typeof slug === "string"));
    } else if (typeof body.slug === "string") {
      if (body.saved === false) await removeSavedSlug(userId, body.slug);
      else await addSavedSlugs(userId, [body.slug]);
    }
    return privateJson({ stored: true, userId, slugs: await listSavedSlugs(userId) });
  } catch (error) { return apiError(error); }
}
