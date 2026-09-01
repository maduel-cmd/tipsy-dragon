export type EnvironmentId = "beach" | "festival" | "desert" | "forest";

export type GameEnvironment = {
  id: EnvironmentId;
  name: string;
  tagline: string;
  skyTop: string;
  skyBottom: string;
  ground: string;
  accent: string;
  windowGlow: string;
  decor: string;
};

export const ENVIRONMENTS: GameEnvironment[] = [
  {
    id: "beach",
    name: "חוף בלילה",
    tagline: "גלי ים, אורות מזח, וריח מלוח באוויר",
    skyTop: "#1a2a4a",
    skyBottom: "#3d5a80",
    ground: "#c4a574",
    accent: "#f4a261",
    windowGlow: "rgba(100, 180, 255, 0.35)",
    decor: "🌊",
  },
  {
    id: "festival",
    name: "פסטיבל עירוני",
    tagline: "מוזיקה, שלטים זוהרים, ותורים ארוכים",
    skyTop: "#2a1838",
    skyBottom: "#5a3a58",
    ground: "#4a4a52",
    accent: "#e9c46a",
    windowGlow: "rgba(255, 180, 80, 0.4)",
    decor: "🎪",
  },
  {
    id: "desert",
    name: "מחנה מדבר",
    tagline: "כוכבים, מדורות, ושקט של חול",
    skyTop: "#0f1a2e",
    skyBottom: "#3a2a40",
    ground: "#c9a06a",
    accent: "#e07a3d",
    windowGlow: "rgba(255, 140, 60, 0.35)",
    decor: "🏜️",
  },
  {
    id: "forest",
    name: "פארק יער",
    tagline: "פנסים בין עצים ומשפחות בפיקניק",
    skyTop: "#14241c",
    skyBottom: "#2a4838",
    ground: "#3d5c3a",
    accent: "#8fbc8f",
    windowGlow: "rgba(120, 200, 140, 0.3)",
    decor: "🌲",
  },
];

export function getEnvironment(id: EnvironmentId): GameEnvironment {
  return ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0]!;
}
