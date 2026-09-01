/**
 * מערכת הזמנות מודעת־סביבה:
 * מסננת ל־allowedItemIds ומשקללת popularItemIds פי 3.
 */
import { getProduct, PRODUCTS, type Product } from "../game/catalog";
import type { EnvironmentConfig } from "../config/environments";

export type OrderStageBounds = {
  itemCountMin: number;
  itemCountMax: number;
};

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = tmp;
  }
  return copy;
}

/** מוצרים זמינים במדף לסביבה הנוכחית */
export function shelfProductsForEnvironment(env: EnvironmentConfig): Product[] {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const id of env.allowedItemIds) {
    if (seen.has(id)) continue;
    const p = getProduct(id);
    if (!p) continue;
    seen.add(id);
    out.push(p);
  }
  return out;
}

/** מאמת שכל מזהי הסביבה קיימים בקטלוג */
export function validateEnvironmentCatalog(env: EnvironmentConfig): string[] {
  const missing: string[] = [];
  for (const id of [...env.allowedItemIds, ...env.popularItemIds]) {
    if (!PRODUCTS.some((p) => p.id === id)) missing.push(id);
  }
  return missing;
}

/**
 * בוחר מזהה אחד עם משקל ×3 לפריטים פופולריים.
 * רק מתוך allowedItemIds שקיימים בקטלוג.
 */
export function pickWeightedEnvItemId(
  env: EnvironmentConfig,
  exclude: Set<string> = new Set(),
): string | null {
  const popular = new Set(env.popularItemIds);
  const pool: string[] = [];
  for (const id of env.allowedItemIds) {
    if (exclude.has(id)) continue;
    if (!getProduct(id)) continue;
    const weight = popular.has(id) ? 3 : 1;
    for (let i = 0; i < weight; i++) pool.push(id);
  }
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)]!;
}

/**
 * בונה הזמנה לסביבה פעילה.
 * מתעלם מסוגי־שלב שלא רלוונטיים לדוכן — רק תפריט הסביבה + גודל הזמנה מהשלב.
 */
export function buildEnvOrderItems(env: EnvironmentConfig, stage: OrderStageBounds): string[] {
  const shelf = shelfProductsForEnvironment(env);
  if (shelf.length === 0) return [];

  const min = Math.max(1, Math.min(stage.itemCountMin, shelf.length));
  const max = Math.max(min, Math.min(stage.itemCountMax, shelf.length));
  const count = min + Math.floor(Math.random() * (max - min + 1));

  const picked: string[] = [];
  const used = new Set<string>();
  for (let i = 0; i < count; i++) {
    const id = pickWeightedEnvItemId(env, used);
    if (!id) break;
    picked.push(id);
    used.add(id);
  }

  // אם חסרים (נדיר) — השלמה אחידה מהמדף
  if (picked.length < count) {
    for (const p of shuffle(shelf)) {
      if (picked.length >= count) break;
      if (used.has(p.id)) continue;
      picked.push(p.id);
      used.add(p.id);
    }
  }

  return picked;
}

/** האם פריט מותר בסביבה */
export function isItemAllowedInEnvironment(env: EnvironmentConfig, itemId: string): boolean {
  return env.allowedItemIds.includes(itemId) && Boolean(getProduct(itemId));
}
