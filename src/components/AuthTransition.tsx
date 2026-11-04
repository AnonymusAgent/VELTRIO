"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Transition = "enter" | "exit";
// Only coordinates the UI, never the underlying session. The ref also prevents
// the account-page and header buttons from starting competing operations.
const AuthTransitionContext = createContext<{ transition: Transition | null; begin: (phase: Transition) => boolean; end: () => void }>({ transition: null, begin: () => true, end: () => {} });
export function AuthTransitionProvider({ children }: { children: ReactNode }) {
  const [transition, setTransition] = useState<Transition | null>(null);
  const active = useRef(false);
  const begin = useCallback((phase: Transition) => {
    if (active.current) return false;
    active.current = true; setTransition(phase); return true;
  }, []);
  const end = useCallback(() => { active.current = false; setTransition(null); }, []);
  return <AuthTransitionContext.Provider value={{ transition, begin, end }}>{children}</AuthTransitionContext.Provider>;
}
export function useAuthTransition() { return useContext(AuthTransitionContext); }
