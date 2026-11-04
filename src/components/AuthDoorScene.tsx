"use client";

import "./auth-door-scene.css";

export type DoorDirection = "enter" | "exit";

// The scene and this timeout share a duration. A timer, rather than an
// animationend event, also completes the flow if CSS animations cannot run.
const DOOR_DURATION_MS = 3200;
export function waitForDoorScene(): Promise<void> {
  let reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { /* Use the normal duration. */ }
  return new Promise((resolve) => window.setTimeout(resolve, reduced ? 150 : DOOR_DURATION_MS));
}

/** Decorative, asset-free 3D scene. The exit uses the same choreography in reverse. */
export default function AuthDoorScene({ direction }: { direction: DoorDirection }) {
  return <span className={`auth-door-scene auth-door-scene--${direction}`} aria-hidden="true">
    <span className="auth-door-floor" />
    <span className="auth-door-frame"><span className="auth-door-room" /><span className="auth-door-panel"><span className="auth-door-inset" /><span className="auth-door-handle" /></span></span>
    <span className="auth-door-person"><span className="auth-door-person-shadow" /><span className="auth-door-leg auth-door-leg--back" /><span className="auth-door-leg auth-door-leg--front" /><span className="auth-door-arm auth-door-arm--back" /><span className="auth-door-body" /><span className="auth-door-head"><span className="auth-door-hair" /><span className="auth-door-nose" /></span><span className="auth-door-arm auth-door-arm--front" /></span>
  </span>;
}
