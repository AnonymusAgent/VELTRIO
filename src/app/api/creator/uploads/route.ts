import { apiError } from "@/lib/http";
import { rejectViewerUpload } from "@/lib/viewer-uploads";

export const runtime = "nodejs";

export async function POST() {
  try { rejectViewerUpload(); } catch (error) { return apiError(error); }
}
