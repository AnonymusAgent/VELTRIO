"use client";
import { useEffect } from "react";
import { syncAccountList } from "@/lib/account-list";

export default function AccountLibrarySync() {
  useEffect(() => {
    void syncAccountList().catch(() => {});
  }, []);
  return null;
}
