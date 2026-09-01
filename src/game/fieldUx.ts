import type { ProductKind } from "./catalog";

export type StationFocus = ProductKind | "all";

export const STATION_LABELS: Record<StationFocus, string> = {
  all: "הכל · תחנה מלאה",
  grill: "גריל",
  breakfast: "בוקר",
  side: "תוספות",
  drink: "בר משקאות",
  seafood: "ים",
  pasta: "פסטה",
  asian: "אסיה",
  mediterranean: "ים־תיכוני",
  comfort: "נוחות",
  dessert: "קינוח",
};

const SUN_KEY = "foodtruck.sunlight";
const STATION_KEY = "foodtruck.station";
const TIPS_KEY = "foodtruck.tipsDone";

export const MICRO_TIPS = [
  "לחצו על לקוח בתור כדי לבחור הזמנה",
  "לחצו על מנה במדף להכנה קצרה — ואז גררו למגש",
  "לחצו «הגישו!» לפני שהטיימר נגמר",
  "לקוח אדום/זוהר = דחוף — תעדפו אותו",
] as const;

export function loadSunlight(): boolean {
  try {
    return localStorage.getItem(SUN_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveSunlight(on: boolean): void {
  try {
    localStorage.setItem(SUN_KEY, on ? "1" : "0");
  } catch {
    /* ignore */
  }
}

const STATION_IDS = new Set<string>(Object.keys(STATION_LABELS));

export function loadStation(): StationFocus {
  try {
    const v = localStorage.getItem(STATION_KEY);
    if (v && STATION_IDS.has(v)) {
      return v as StationFocus;
    }
  } catch {
    /* ignore */
  }
  return "all";
}

export function saveStation(station: StationFocus): void {
  try {
    localStorage.setItem(STATION_KEY, station);
  } catch {
    /* ignore */
  }
}

export function loadTipsDone(): number {
  try {
    const n = Number(localStorage.getItem(TIPS_KEY) ?? "0");
    return Number.isFinite(n) ? Math.max(0, Math.min(MICRO_TIPS.length, n)) : 0;
  } catch {
    return 0;
  }
}

export function saveTipsDone(count: number): void {
  try {
    localStorage.setItem(TIPS_KEY, String(count));
  } catch {
    /* ignore */
  }
}
