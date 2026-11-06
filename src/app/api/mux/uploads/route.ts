import { apiError } from "@/lib/http";
import { rejectViewerUpload } from "@/lib/viewer-uploads";

export const dynamic = "force-dynamic";

// Viewer uploads are closed. Titles are added from the admin studio.
export async function POST() {
  try { rejectViewerUpload(); } catch (error) { return apiError(error); }
}
