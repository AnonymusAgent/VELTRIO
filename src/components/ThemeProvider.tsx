"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";

type Theme = "light" | "dark";
type ThemePreference = Theme | "system";
const THEME_KEY = "veltrio-theme";
const THEME_EVENT = "veltrio:theme-change";
let sessionPreference: ThemePreference | null = null;
let saved = true;

function preference(): ThemePreference {
  if (sessionPreference) return sessionPreference;
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch { return "system"; }
}
function resolveTheme(value: ThemePreference): Theme {
  if (value !== "system") return value;
  try { return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"; } catch { return "dark"; }
}
function snapshot() {
  const value = preference();
  return `${value}|${resolveTheme(value)}|${saved}`;
}
function applyTheme() { document.documentElement.dataset.theme = resolveTheme(preference()); }
function subscribe(onChange: () => void) {
  const update = () => { applyTheme(); onChange(); };
  const onStorage = (event: StorageEvent) => {
    if (event.key !== THEME_KEY && event.key !== null) return;
    sessionPreference = null; saved = true; update();
  };
  let media: MediaQueryList | undefined;
  try { media = window.matchMedia("(prefers-color-scheme: light)"); media.addEventListener("change", update); } catch { /* Default to dark if matchMedia is unavailable. */ }
  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_EVENT, update);
  applyTheme();
  return () => { media?.removeEventListener("change", update); window.removeEventListener("storage", onStorage); window.removeEventListener(THEME_EVENT, update); };
}
function setPreference(value: ThemePreference) {
  try {
    if (value === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, value);
    sessionPreference = null; saved = true;
  } catch { sessionPreference = value; saved = false; }
  applyTheme();
  window.dispatchEvent(new Event(THEME_EVENT));
}
const ThemeContext = createContext<{ preference: ThemePreference; theme: Theme; setPreference: (value: ThemePreference) => void; saved: boolean }>({ preference: "system", theme: "dark", setPreference: () => {}, saved: true });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [value, theme, persisted] = useSyncExternalStore(subscribe, snapshot, () => "system|dark|true").split("|");
  return <ThemeContext.Provider value={{ preference: value as ThemePreference, theme: theme as Theme, setPreference, saved: persisted === "true" }}>{children}</ThemeContext.Provider>;
}
export function useTheme() { return useContext(ThemeContext); }
