import { apiError } from "@/lib/http";
import { rejectViewerUpload } from "@/lib/viewer-uploads";

export const runtime = "nodejs";

export async function GET() {
  try { rejectViewerUpload(); } catch (error) { return apiError(error); }
}

export async function PUT() {
  try { rejectViewerUpload(); } catch (error) { return apiError(error); }
}

export async function POST() {
  try { rejectViewerUpload(); } catch (error) { return apiError(error); }
}

export async function DELETE() {
  try { rejectViewerUpload(); } catch (error) { return apiError(error); }
}
