import { apiError } from "@/lib/http";
import { rejectViewerUpload } from "@/lib/viewer-uploads";

export const dynamic = "force-dynamic";

export async function POST() {
  try { rejectViewerUpload(); } catch (error) { return apiError(error); }
}
