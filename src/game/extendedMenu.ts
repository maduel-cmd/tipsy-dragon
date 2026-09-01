/**
 * תפריט מורחב — מנות מהגיליון 10×6.
 * מסונכרן ל־PRODUCTS ב־catalog.ts לצורך משחק (עברית + ProductKind).
 */
export type ExtendedCategory =
  | "seafood"
  | "pasta"
  | "asian"
  | "mediterranean"
  | "comfort"
  | "dessert";

export type MenuItem = {
  id: string;
  name: string;
  /** שם עברי ל־UI */
  nameHe: string;
  category: ExtendedCategory;
  price: number;
  prepTimeSeconds: number;
  assetPath: string;
};

export const EXTENDED_MENU_ITEMS: MenuItem[] = [
  {
    id: "salmon_fillet",
    name: "Grilled Salmon",
    nameHe: "סלמון על הגריל",
    category: "seafood",
    price: 24,
    prepTimeSeconds: 12,
    assetPath: "/assets/items/prepared/salmon_fillet.webp",
  },
  {
    id: "seafood_paella",
    name: "Seafood Paella",
    nameHe: "פאז׳ה פירות ים",
    category: "seafood",
    price: 22,
    prepTimeSeconds: 11,
    assetPath: "/assets/items/prepared/seafood_paella.webp",
  },
  {
    id: "fish_and_chips",
    name: "Fish & Chips",
    nameHe: "פיש אנד צ׳יפס",
    category: "seafood",
    price: 16,
    prepTimeSeconds: 9,
    assetPath: "/assets/items/prepared/fish_and_chips.webp",
  },
  {
    id: "spaghetti_bolognese",
    name: "Spaghetti Bolognese",
    nameHe: "ספגטי בולונז",
    category: "pasta",
    price: 14,
    prepTimeSeconds: 8,
    assetPath: "/assets/items/prepared/spaghetti_bolognese.webp",
  },
  {
    id: "lasagna_slice",
    name: "Lasagna Slice",
    nameHe: "לזניה",
    category: "pasta",
    price: 15,
    prepTimeSeconds: 9,
    assetPath: "/assets/items/prepared/lasagna_slice.webp",
  },
  {
    id: "pad_thai",
    name: "Pad Thai",
    nameHe: "פאד תאי",
    category: "asian",
    price: 15,
    prepTimeSeconds: 8,
    assetPath: "/assets/items/prepared/pad_thai.webp",
  },
  {
    id: "ramen_bowl",
    name: "Tonkotsu Ramen",
    nameHe: "ראמן טונקוטסו",
    category: "asian",
    price: 17,
    prepTimeSeconds: 10,
    assetPath: "/assets/items/prepared/ramen_bowl.webp",
  },
  {
    id: "shakshuka_pan",
    name: "Rustic Shakshuka",
    nameHe: "שקשוקה כפרית",
    category: "mediterranean",
    price: 13,
    prepTimeSeconds: 7,
    assetPath: "/assets/items/prepared/shakshuka_pan.webp",
  },
  {
    id: "hummus_plate",
    name: "Hummus & Pita",
    nameHe: "חומוס ופיתה",
    category: "mediterranean",
    price: 11,
    prepTimeSeconds: 5,
    assetPath: "/assets/items/prepared/hummus_plate.webp",
  },
  {
    id: "shawarma_wrap",
    name: "Shawarma Gyro",
    nameHe: "שווארמה בפיתה",
    category: "mediterranean",
    price: 14,
    prepTimeSeconds: 6,
    assetPath: "/assets/items/prepared/shawarma_wrap.webp",
  },
  {
    id: "fried_chicken_basket",
    name: "Crispy Fried Chicken",
    nameHe: "עוף מטוגן פריך",
    category: "comfort",
    price: 15,
    prepTimeSeconds: 8,
    assetPath: "/assets/items/prepared/fried_chicken_basket.webp",
  },
  {
    id: "mac_and_cheese",
    name: "Creamy Mac & Cheese",
    nameHe: "מק אנד צ׳יז",
    category: "comfort",
    price: 12,
    prepTimeSeconds: 6,
    assetPath: "/assets/items/prepared/mac_and_cheese.webp",
  },
  {
    id: "tiramisu_slice",
    name: "Classic Tiramisu",
    nameHe: "טירמיסו",
    category: "dessert",
    price: 9,
    prepTimeSeconds: 4,
    assetPath: "/assets/items/prepared/tiramisu_slice.webp",
  },
  {
    id: "churros_plate",
    name: "Cinnamon Churros",
    nameHe: "צ׳ורוס קינמון",
    category: "dessert",
    price: 8,
    prepTimeSeconds: 5,
    assetPath: "/assets/items/prepared/churros_plate.webp",
  },
  {
    id: "chocolate_lava",
    name: "Chocolate Lava Cake",
    nameHe: "עוגת לבה שוקולד",
    category: "dessert",
    price: 10,
    prepTimeSeconds: 5,
    assetPath: "/assets/items/prepared/chocolate_lava.webp",
  },
  {
    id: "ice_cream_cone",
    name: "Triple Scoop Cone",
    nameHe: "גלידה בגביע",
    category: "dessert",
    price: 7,
    prepTimeSeconds: 3,
    assetPath: "/assets/items/prepared/ice_cream_cone.webp",
  },
];

export const EXTENDED_IDS = EXTENDED_MENU_ITEMS.map((m) => m.id);
