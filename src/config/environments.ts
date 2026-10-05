/** תצורת סביבות משחק — רקע, דלפק, ותפריט מותאם */

export type CounterTexture = "wood" | "metal" | "marble" | "rustic_log";

export type EnvironmentId =
  | "circus"
  | "school_cafeteria"
  | "mall_food_court"
  | "forest_cart"
  | "urban_festival"
  | "playground";

export interface EnvironmentConfig {
  id: EnvironmentId;
  name: string;
  nameHebrew: string;
  tagline: string;
  /** @deprecated emoji — kept for a11y/tests; UI uses iconAsset */
  decor: string;
  /** Photoreal / cropped env thumb for selector & HUD (no emoji) */
  iconAsset: string;
  accent: string;
  backgroundAsset: string;
  /** Narrower WebP for mobile / save-data */
  mobileBackgroundAsset: string;
  counterStyle: {
    texture: CounterTexture;
    dropShadow: string;
  };
  /** מזהי קטלוג אמיתיים בלבד */
  allowedItemIds: string[];
  /** סיכוי גבוה יותר בהזמנות (×3) */
  popularItemIds: string[];
  customerSpawnRateMs: number;
}

function envPaths(id: EnvironmentId) {
  return {
    backgroundAsset: `/assets/environments/${id}.webp`,
    mobileBackgroundAsset: `/assets/environments/mobile/${id}.webp`,
    iconAsset: `/assets/environments/icons/${id}.webp`,
  };
}

/**
 * מיפוי תמטי לפי 6 רקעים.
 * מזהים מיושרים לקטלוג Tipsy Dragon (לא aliases חיצוניים).
 */
export const ENVIRONMENTS: Record<EnvironmentId, EnvironmentConfig> = {
  circus: {
    id: "circus",
    name: "Circus Carnival",
    nameHebrew: "קרקס",
    tagline: "פופקורן, צמר גפן ודוכן יריד זוהר",
    decor: "circus",
    ...envPaths("circus"),
    accent: "#e63946",
    counterStyle: { texture: "wood", dropShadow: "0 6px 14px rgba(230, 57, 70, 0.4)" },
    allowedItemIds: [
      "churros_plate",
      "hotdog",
      "ice_cream_cone",
      "fries",
      "onion_rings",
      "pancakes",
    ],
    popularItemIds: ["churros_plate", "hotdog", "ice_cream_cone"],
    customerSpawnRateMs: 3500,
  },
  school_cafeteria: {
    id: "school_cafeteria",
    name: "School Cafeteria",
    nameHebrew: "מזנון בית ספר",
    tagline: "מגשים, נירוסטה וארוחת צהריים של בית ספר",
    decor: "school",
    ...envPaths("school_cafeteria"),
    accent: "#5c6bc0",
    counterStyle: { texture: "metal", dropShadow: "0 4px 10px rgba(0, 0, 0, 0.25)" },
    allowedItemIds: [
      "mac_and_cheese",
      "cheeseburger",
      "fries",
      "breakfast_eggs",
      "spaghetti_bolognese",
      "lasagna_slice",
    ],
    popularItemIds: ["mac_and_cheese", "cheeseburger"],
    customerSpawnRateMs: 4000,
  },
  mall_food_court: {
    id: "mall_food_court",
    name: "Mall Food Court",
    nameHebrew: "דוכן בקניון",
    tagline: "גלובל פאלט · קערות, ראמן וטאקוס",
    decor: "mall",
    ...envPaths("mall_food_court"),
    accent: "#26a69a",
    counterStyle: { texture: "marble", dropShadow: "0 6px 12px rgba(0, 0, 0, 0.3)" },
    allowedItemIds: [
      "pad_thai",
      "ramen_bowl",
      "cheeseburger",
      "fried_chicken_basket",
      "tacos",
      "draft_beer",
    ],
    popularItemIds: ["pad_thai", "ramen_bowl", "tacos"],
    customerSpawnRateMs: 3000,
  },
  forest_cart: {
    id: "forest_cart",
    name: "Forest Cart",
    nameHebrew: "עגלה ביער",
    tagline: "עגלת עץ בין אורנים · מטבח כפרי",
    decor: "forest",
    ...envPaths("forest_cart"),
    accent: "#8fbc8f",
    counterStyle: { texture: "rustic_log", dropShadow: "0 8px 16px rgba(40, 30, 20, 0.5)" },
    allowedItemIds: [
      "steak_ribeye",
      "salmon_fillet",
      "shakshuka_pan",
      "cheese_platter",
      "rice_bowl",
    ],
    popularItemIds: ["steak_ribeye", "shakshuka_pan"],
    customerSpawnRateMs: 5000,
  },
  urban_festival: {
    id: "urban_festival",
    name: "Urban Street Festival",
    nameHebrew: "פסטיבל עירוני",
    tagline: "רחוב מואר · אוכל רחוב גלובלי",
    decor: "urban",
    ...envPaths("urban_festival"),
    accent: "#e9c46a",
    counterStyle: { texture: "wood", dropShadow: "0 8px 16px rgba(0, 0, 0, 0.45)" },
    allowedItemIds: [
      "shawarma_wrap",
      "tacos",
      "bbq_wings",
      "fried_chicken_basket",
      "fish_and_chips",
      "draft_beer",
      "nachos",
    ],
    popularItemIds: ["shawarma_wrap", "bbq_wings", "fish_and_chips"],
    customerSpawnRateMs: 2500,
  },
  playground: {
    id: "playground",
    name: "Playground Snack Booth",
    nameHebrew: "מגרש משחקים",
    tagline: "דוכן חטיפים ליד המגלשות",
    decor: "playground",
    ...envPaths("playground"),
    accent: "#42a5f5",
    counterStyle: { texture: "wood", dropShadow: "0 4px 8px rgba(0, 0, 0, 0.2)" },
    allowedItemIds: ["ice_cream_cone", "hotdog", "fries", "pancakes", "croissant"],
    popularItemIds: ["ice_cream_cone", "fries", "hotdog"],
    customerSpawnRateMs: 3800,
  },
};

/** רשימה מסודרת ל־UI */
export const ENVIRONMENT_LIST: EnvironmentConfig[] = Object.values(ENVIRONMENTS);

export function getEnvironment(id: string): EnvironmentConfig {
  if (id in ENVIRONMENTS) return ENVIRONMENTS[id as EnvironmentId];
  return ENVIRONMENTS.circus;
}

export function isEnvironmentId(id: string): id is EnvironmentId {
  return id in ENVIRONMENTS;
}

/** CSS class לדלפק לפי מרקם */
export function counterTextureClass(texture: CounterTexture): string {
  return `counter-texture-${texture}`;
}

/** Emoji codepoints — banned in environment decor / HUD labels when icons exist */
export function decorContainsEmoji(decor: string): boolean {
  return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(decor);
}
