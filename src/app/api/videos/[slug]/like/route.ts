import { countEngagement } from "@/lib/video-counters";
import { apiError, assertSameOrigin } from "@/lib/http";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    assertSameOrigin(request);
    return await countEngagement(request, (await params).slug, "like");
  } catch (error) { return apiError(error); }
}
