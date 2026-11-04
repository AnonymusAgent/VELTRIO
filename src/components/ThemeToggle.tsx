"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, setPreference } = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return <button type="button" className="theme-toggle" aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} onClick={() => setPreference(next)}>{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>;
}
