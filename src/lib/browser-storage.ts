"use client";
import { useSyncExternalStore } from "react";

const CHANGE_EVENT = "vh-storage-change";

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function read(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

// Reactive localStorage reads that are safe during SSR/hydration and stay in
// sync across tabs and across components on the same page.
export function useLocalStorageValue(key: string) {
  return useSyncExternalStore(subscribe, () => read(key), () => null);
}

export function writeLocalStorage(key: string, value: string | null): boolean {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return true;
  } catch { return false; }
}

export function parseSavedSlugs(raw: string | null): string[] {
  try {
    const value = JSON.parse(raw || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}
