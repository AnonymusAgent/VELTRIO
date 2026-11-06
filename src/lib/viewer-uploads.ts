import { HttpError } from "@/lib/http";

// VELTRIO is a streaming catalog. Viewers may sign in to save history.
// Only the admin studio can add, publish, or manage media.
export function rejectViewerUpload(): never {
  throw new HttpError(403, "Only the publisher can add titles. Sign in to save your watch history.");
}
