import { apiError } from "@/lib/http";
import { rejectViewerUpload } from "@/lib/viewer-uploads";

export async function PATCH() {
  try { rejectViewerUpload(); } catch (error) { return apiError(error); }
}

export async function DELETE() {
  try { rejectViewerUpload(); } catch (error) { return apiError(error); }
}
