export type GamePhase = "menu" | "env" | "playing" | "result";

export type ScoreEvent = {
  kind: "serve" | "miss" | "wrong" | "combo";
  points: number;
  label: string;
};

export function scoreServe(remainingRatio: number, combo: number): ScoreEvent {
  const base = 100;
  const speedBonus = Math.round(remainingRatio * 80);
  const comboBonus = Math.min(combo, 8) * 15;
  const points = base + speedBonus + comboBonus;
  return {
    kind: combo >= 2 ? "combo" : "serve",
    points,
    label: combo >= 2 ? `הגשה ×${combo}` : "הגשה מושלמת",
  };
}

export function scoreMiss(): ScoreEvent {
  return { kind: "miss", points: -40, label: "פספסת הזמנה" };
}

export function scoreWrong(): ScoreEvent {
  return { kind: "wrong", points: -20, label: "מגש לא נכון" };
}
