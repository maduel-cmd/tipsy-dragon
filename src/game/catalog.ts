import { EXTENDED_MENU_ITEMS, type ExtendedCategory } from "./extendedMenu";

export type ProductKind =
  | "grill"
  | "breakfast"
  | "side"
  | "drink"
  | ExtendedCategory;

export type Product = {
  id: string;
  name: string;
  kind: ProductKind;
  emoji: string;
  color: string;
  accent: string;
  /** מפתח ב־assets.json → sprites */
  sprite?: string;
};

const EXTENDED_EMOJI: Record<string, string> = {
  salmon_fillet: "🐟",
  seafood_paella: "🥘",
  fish_and_chips: "🍟",
  spaghetti_bolognese: "🍝",
  lasagna_slice: "lasagna",
  pad_thai: "🍜",
  ramen_bowl: "🍲",
  shakshuka_pan: "🍳",
  hummus_plate: "🥣",
  shawarma_wrap: "🥙",
  fried_chicken_basket: "🍗",
  mac_and_cheese: "🧀",
  tiramisu_slice: "🍰",
  churros_plate: "🥨",
  chocolate_lava: "🍫",
  ice_cream_cone: "🍦",
};

const EXTENDED_COLORS: Record<ExtendedCategory, { color: string; accent: string }> = {
  seafood: { color: "#2a6f8f", accent: "#c8e8f5" },
  pasta: { color: "#b83828", accent: "#ffd0c0" },
  asian: { color: "#c45c20", accent: "#ffe0c0" },
  mediterranean: { color: "#6a8f3a", accent: "#e8f5c8" },
  comfort: { color: "#c48420", accent: "#ffe8b0" },
  dessert: { color: "#8b4a6b", accent: "#f5d0e0" },
};

function extendedAsProducts(): Product[] {
  return EXTENDED_MENU_ITEMS.map((m) => {
    const tone = EXTENDED_COLORS[m.category];
    const emoji = EXTENDED_EMOJI[m.id] === "lasagna" ? "🍝" : EXTENDED_EMOJI[m.id] ?? "🍽️";
    return {
      id: m.id,
      name: m.nameHe,
      kind: m.category,
      emoji,
      color: tone.color,
      accent: tone.accent,
      sprite: m.id,
    };
  });
}

/** תפריט Food Truck ריאליסטי — מנות בסיס + מורחב */
export const PRODUCTS: Product[] = [
  // גריל
  {
    id: "burger_double",
    name: "המבורגר גורמה",
    kind: "grill",
    emoji: "🍔",
    color: "#6b3a1e",
    accent: "#f5d8b0",
    sprite: "burger_double",
  },
  {
    id: "cheeseburger",
    name: "צ׳יזבורגר",
    kind: "grill",
    emoji: "🍔",
    color: "#8b4518",
    accent: "#ffe0b8",
    sprite: "cheeseburger",
  },
  {
    id: "steak_ribeye",
    name: "סטייק עסיסי",
    kind: "grill",
    emoji: "🥩",
    color: "#5c1a1a",
    accent: "#f0c0b0",
    sprite: "steak_ribeye",
  },
  {
    id: "hotdog",
    name: "הוט־דוג גורמה",
    kind: "grill",
    emoji: "🌭",
    color: "#c43c2a",
    accent: "#ffd0c0",
    sprite: "hotdog",
  },
  {
    id: "bbq_wings",
    name: "כנפיים ברביקיו",
    kind: "grill",
    emoji: "🍗",
    color: "#8b1a1a",
    accent: "#ffc8a8",
    sprite: "bbq_wings",
  },
  {
    id: "buffalo_wings",
    name: "כנפיים באפלו",
    kind: "grill",
    emoji: "🔥",
    color: "#d35400",
    accent: "#ffe0c0",
    sprite: "buffalo_wings",
  },
  {
    id: "tacos",
    name: "טאקו מקסיקני",
    kind: "grill",
    emoji: "🌮",
    color: "#c48420",
    accent: "#ffe8b0",
    sprite: "tacos",
  },
  // בוקר
  {
    id: "breakfast_eggs",
    name: "ארוחת בוקר · ביצים",
    kind: "breakfast",
    emoji: "🍳",
    color: "#e8a838",
    accent: "#fff0c8",
    sprite: "breakfast_eggs",
  },
  {
    id: "breakfast_meats",
    name: "ארוחת בוקר · בשרים",
    kind: "breakfast",
    emoji: "🥓",
    color: "#a84828",
    accent: "#ffd8c0",
    sprite: "breakfast_meats",
  },
  {
    id: "pancakes",
    name: "פנקייקים לבוקר",
    kind: "breakfast",
    emoji: "🥞",
    color: "#d4a017",
    accent: "#fff3c8",
    sprite: "pancakes",
  },
  {
    id: "waffle_fruit",
    name: "וופל פירות לבוקר",
    kind: "breakfast",
    emoji: "🧇",
    color: "#c47820",
    accent: "#ffe8c0",
    sprite: "waffle_fruit",
  },
  {
    id: "chicken_waffles",
    name: "עוף ווופלים לבוקר",
    kind: "breakfast",
    emoji: "🍗",
    color: "#b8860b",
    accent: "#ffe8b8",
    sprite: "chicken_waffles",
  },
  {
    id: "croissant",
    name: "קרואסון בוקר",
    kind: "breakfast",
    emoji: "🥐",
    color: "#d4a574",
    accent: "#ffe8d0",
    sprite: "croissant",
  },
  // תוספות
  {
    id: "fries",
    name: "צ׳יפס זהוב",
    kind: "side",
    emoji: "🍟",
    color: "#e8b84a",
    accent: "#fff3c8",
    sprite: "fries",
  },
  {
    id: "onion_rings",
    name: "טבעות בצל",
    kind: "side",
    emoji: "🧅",
    color: "#c9a227",
    accent: "#fff0c0",
    sprite: "onion_rings",
  },
  {
    id: "nachos",
    name: "נאצ׳וס טעונים",
    kind: "side",
    emoji: "🧀",
    color: "#e8a020",
    accent: "#ffe8b0",
    sprite: "nachos",
  },
  {
    id: "calamari",
    name: "קלמרי מטוגן",
    kind: "side",
    emoji: "🦑",
    color: "#d4a060",
    accent: "#ffe8d0",
    sprite: "calamari",
  },
  {
    id: "dipping_sauces",
    name: "מגוון רטבים",
    kind: "side",
    emoji: "🫙",
    color: "#c45c3a",
    accent: "#ffd8c8",
    sprite: "dipping_sauces",
  },
  {
    id: "rice_bowl",
    name: "קערת אורז",
    kind: "side",
    emoji: "🍚",
    color: "#f5f0e6",
    accent: "#ffffff",
    sprite: "rice_bowl",
  },
  {
    id: "cheese_platter",
    name: "מבחר גבינות",
    kind: "side",
    emoji: "🧀",
    color: "#e8c547",
    accent: "#fff6c8",
    sprite: "cheese_platter",
  },
  // בר
  {
    id: "draft_beer",
    name: "בירה מהחבית",
    kind: "drink",
    emoji: "🍺",
    color: "#c4a060",
    accent: "#f5e6c8",
    sprite: "draft_beer",
  },
  // מנות מורחבות
  ...extendedAsProducts(),
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function productsByKind(kind: ProductKind): Product[] {
  return PRODUCTS.filter((p) => p.kind === kind);
}
