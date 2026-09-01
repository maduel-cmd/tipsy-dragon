import { useCallback, useEffect, useRef, useState } from "react";

export type JuiceParticle = {
  id: number;
  kind: "spark" | "coin" | "heart" | "steam";
  x: number;
  y: number;
  dx: number;
  dy: number;
  delay: number;
  scale: number;
};

export type JuicePulse =
  | "serve"
  | "perfect"
  | "combo"
  | "wrong"
  | "miss"
  | null;

type JuiceOptions = {
  /** הגשה מושלמת / מהירה */
  perfect?: boolean;
  /** רצף נוכחי אחרי ההגשה */
  combo?: number;
  /** כמה חלקיקים */
  intensity?: "light" | "medium" | "heavy";
};

const CLEANUP_MS = 900;

/**
 * Juice / game-feel overlays — לא משנה לוגיקת משחק.
 * דפוסים ממשחקי בישול + ספרות juice: חלקיקים מדורגים, נענוע, קומבו.
 */
export function useGameJuice() {
  const [particles, setParticles] = useState<JuiceParticle[]>([]);
  const [pulse, setPulse] = useState<JuicePulse>(null);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);

  const scheduleClear = useCallback(
    (fn: () => void, ms: number) => {
      const t = window.setTimeout(() => {
        fn();
        timers.current = timers.current.filter((x) => x !== t);
      }, ms);
      timers.current.push(t);
    },
    [],
  );

  const bumpPulse = useCallback(
    (next: Exclude<JuicePulse, null>, ms = 520) => {
      setPulse(next);
      scheduleClear(() => setPulse((p) => (p === next ? null : p)), ms);
    },
    [scheduleClear],
  );

  const spawnBurst = useCallback(
    (opts: JuiceOptions = {}) => {
      const intensity = opts.intensity ?? (opts.perfect ? "heavy" : "medium");
      const count =
        intensity === "heavy" ? 14 : intensity === "medium" ? 9 : 5;
      const cx = 50;
      const cy = 48;
      const batch: JuiceParticle[] = [];
      const base = ++seq.current;

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (i % 3) * 0.2;
        const dist = 28 + (i % 4) * 10;
        batch.push({
          id: base * 100 + i,
          kind: i % 5 === 0 ? "coin" : "spark",
          x: cx,
          y: cy,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist - 12,
          delay: (i % 4) * 0.04,
          scale: 0.75 + (i % 3) * 0.2,
        });
      }

      // מטבעות לעבר ה־HUD (פינה ימנית בעברית RTL ≈ שמאל ויזואלי — נשתמש ב־top)
      const coinN = intensity === "light" ? 2 : intensity === "heavy" ? 6 : 4;
      for (let i = 0; i < coinN; i++) {
        batch.push({
          id: base * 1000 + i,
          kind: "coin",
          x: 48 + (i - coinN / 2) * 4,
          y: 55,
          dx: -18 - i * 6,
          dy: -42 - i * 4,
          delay: 0.05 * i,
          scale: 1,
        });
      }

      if (opts.perfect || (opts.combo ?? 0) >= 3) {
        for (let i = 0; i < 3; i++) {
          batch.push({
            id: base * 2000 + i,
            kind: "heart",
            x: 40 + i * 10,
            y: 36,
            dx: (i - 1) * 8,
            dy: -28 - i * 6,
            delay: 0.08 * i,
            scale: 1.1,
          });
        }
      }

      setParticles((prev) => [...prev, ...batch]);
      scheduleClear(() => {
        setParticles((prev) => prev.filter((p) => !batch.some((b) => b.id === p.id)));
      }, CLEANUP_MS);
    },
    [scheduleClear],
  );

  const triggerServe = useCallback(
    (opts: JuiceOptions = {}) => {
      const combo = opts.combo ?? 0;
      if (opts.perfect) bumpPulse("perfect", 640);
      else if (combo >= 3) bumpPulse("combo", 560);
      else bumpPulse("serve", 480);
      spawnBurst({
        ...opts,
        intensity:
          opts.intensity ??
          (opts.perfect || combo >= 6 ? "heavy" : combo >= 3 ? "medium" : "light"),
      });
    },
    [bumpPulse, spawnBurst],
  );

  const triggerWrong = useCallback(() => {
    bumpPulse("wrong", 480);
  }, [bumpPulse]);

  const triggerMiss = useCallback(() => {
    bumpPulse("miss", 520);
    const base = ++seq.current;
    const steam: JuiceParticle[] = [0, 1, 2].map((i) => ({
      id: base * 50 + i,
      kind: "steam" as const,
      x: 45 + i * 5,
      y: 40,
      dx: (i - 1) * 6,
      dy: -30,
      delay: i * 0.1,
      scale: 1,
    }));
    setParticles((prev) => [...prev, ...steam]);
    scheduleClear(() => {
      setParticles((prev) => prev.filter((p) => !steam.some((s) => s.id === p.id)));
    }, CLEANUP_MS);
  }, [bumpPulse, scheduleClear]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    particles,
    pulse,
    triggerServe,
    triggerWrong,
    triggerMiss,
  };
}
