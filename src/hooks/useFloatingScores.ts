import { useCallback, useEffect, useRef, useState } from "react";

export type FloatingScore = {
  id: number;
  text: string;
  kind: "good" | "bad";
};

declare global {
  interface WindowEventMap {
    "test:complete-order": CustomEvent<{ score?: number }>;
  }
}

/**
 * Floating score/coin rewards — GPU CSS animation, auto-cleanup ~850ms.
 * Also listens for `test:complete-order` (QA / Playwright).
 */
export function useFloatingScores() {
  const [scores, setScores] = useState<FloatingScore[]>([]);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);

  const spawnFloatingScore = useCallback((text: string, kind: "good" | "bad" = "good") => {
    const id = ++seq.current;
    setScores((prev) => [...prev, { id, text, kind }]);
    const t = window.setTimeout(() => {
      setScores((prev) => prev.filter((s) => s.id !== id));
      timers.current = timers.current.filter((x) => x !== t);
    }, 850);
    timers.current.push(t);
  }, []);

  useEffect(() => {
    const onTest = (ev: Event) => {
      const detail = (ev as CustomEvent<{ score?: number }>).detail;
      const pts = detail?.score ?? 25;
      spawnFloatingScore(`+${pts}`, "good");
    };
    window.addEventListener("test:complete-order", onTest as EventListener);
    return () => {
      window.removeEventListener("test:complete-order", onTest as EventListener);
      clearTimers();
    };
  }, [spawnFloatingScore, clearTimers]);

  return { floatingScores: scores, spawnFloatingScore };
}
