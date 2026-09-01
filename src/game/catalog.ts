export type ProductKind = "drink" | "icecream" | "popsicle" | "hot";

export type Product = {
  id: string;
  name: string;
  kind: ProductKind;
  emoji: string;
  color: string;
  accent: string;
};

export const PRODUCTS: Product[] = [
  // משקאות
  { id: "coffee-black", name: "קפה שחור", kind: "drink", emoji: "☕", color: "#3b2a1a", accent: "#c4a574" },
  { id: "coffee-milk", name: "קפה חלב", kind: "drink", emoji: "🥛", color: "#8b6914", accent: "#f5e6c8" },
  { id: "cola", name: "קולה", kind: "drink", emoji: "🥤", color: "#5c1a1a", accent: "#e85d4c" },
  { id: "lemonade", name: "לימונדה", kind: "drink", emoji: "🍋", color: "#d4b84a", accent: "#fff3a0" },
  { id: "mint-tea", name: "תה נענע", kind: "drink", emoji: "🍵", color: "#2f5d3a", accent: "#9fd4a8" },
  { id: "banana-shake", name: "שייק בננה", kind: "drink", emoji: "🍌", color: "#e8c547", accent: "#fff6c8" },
  { id: "water", name: "מים", kind: "drink", emoji: "💧", color: "#4a90a4", accent: "#c8eef8" },
  { id: "soda", name: "סודה", kind: "drink", emoji: "🫧", color: "#6b9eae", accent: "#e0f4fa" },
  { id: "hot-choc", name: "שוקו חם", kind: "drink", emoji: "🍫", color: "#5c3317", accent: "#d4a574" },
  { id: "orange-juice", name: "מיץ תפוזים", kind: "drink", emoji: "🍊", color: "#e8913a", accent: "#ffe0b8" },
  // גלידות
  { id: "ice-strawberry", name: "גלידה תות", kind: "icecream", emoji: "🍓", color: "#e85a7a", accent: "#ffd0dc" },
  { id: "ice-vanilla", name: "גלידה וניל", kind: "icecream", emoji: "🍦", color: "#f0e6c8", accent: "#fffaf0" },
  { id: "ice-chocolate", name: "גלידה שוקולד", kind: "icecream", emoji: "🍨", color: "#6b3e26", accent: "#d4a574" },
  { id: "ice-pistachio", name: "גלידה פיסטוק", kind: "icecream", emoji: "🟢", color: "#7a9e5a", accent: "#d8ecc0" },
  { id: "ice-mango", name: "גלידה מנגו", kind: "icecream", emoji: "🥭", color: "#f0a030", accent: "#ffe0a8" },
  // ארטיקים
  { id: "pop-lemon", name: "ארטיק לימון", kind: "popsicle", emoji: "🍋", color: "#f0d44a", accent: "#fff8c0" },
  { id: "pop-strawberry", name: "ארטיק תות", kind: "popsicle", emoji: "🍡", color: "#e04868", accent: "#ffc0d0" },
  { id: "pop-cola", name: "ארטיק קולה", kind: "popsicle", emoji: "🧊", color: "#4a2018", accent: "#c08070" },
  { id: "ice-sandwich", name: "סנדוויץ׳ גלידה", kind: "popsicle", emoji: "🍪", color: "#a87848", accent: "#f0d8b0" },
  { id: "pop-berry", name: "ארטיק פירות יער", kind: "popsicle", emoji: "🫐", color: "#5a3a7a", accent: "#d0b8e8" },
  // אוכל חם
  { id: "hot-burger", name: "המבורגר", kind: "hot", emoji: "🍔", color: "#8b4513", accent: "#f0d0a0" },
  { id: "hot-dog", name: "נקניקייה", kind: "hot", emoji: "🌭", color: "#c45c2a", accent: "#f5c8a0" },
  { id: "hot-pizza", name: "פיצה פרוסה", kind: "hot", emoji: "🍕", color: "#c43c2a", accent: "#f5d0a8" },
  { id: "hot-fries", name: "צ׳יפס", kind: "hot", emoji: "🍟", color: "#e8b84a", accent: "#ffe8b0" },
  { id: "hot-wrap", name: "טורטייה", kind: "hot", emoji: "🌯", color: "#c4a060", accent: "#f5e6c8" },
  { id: "hot-soup", name: "מרק חם", kind: "hot", emoji: "🥣", color: "#c4783a", accent: "#f0d0a8" },
  { id: "hot-waffle", name: "וופל", kind: "hot", emoji: "🧇", color: "#d4a04a", accent: "#ffe8c0" },
  { id: "hot-pretzel", name: "בייגלה", kind: "hot", emoji: "🥨", color: "#b87840", accent: "#f0d8b0" },
];

export function getProduct(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function productsByKind(kind: ProductKind): Product[] {
  return PRODUCTS.filter((p) => p.kind === kind);
}
