"use client";

export default function CookieChoices() {
  return <button type="button" className="vh-button secondary small mt-4" onClick={() => window.dispatchEvent(new Event("veltrio:cookie-choices"))}>Change analytics cookie choice</button>;
}
