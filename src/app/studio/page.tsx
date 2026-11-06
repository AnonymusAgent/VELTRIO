import { redirect } from "next/navigation";

// Viewer uploads are closed. Old studio links land on the personal library.
export default function RetiredStudio() {
  redirect("/my-list");
}
