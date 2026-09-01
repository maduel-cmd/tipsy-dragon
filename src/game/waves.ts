import { PRODUCTS, type Product, type ProductKind } from "./catalog";
import { randomCharacterLoadout, type CharacterLoadout } from "./characterCatalog";
import type { EnvironmentConfig } from "../config/environments";
import { buildEnvOrderItems } from "../systems/orderSystem";

/** סדר פתיחת סוגי אוכל (לא כולל שתייה) */
export const FOOD_KIND_UNLOCK_ORDER: readonly ProductKind[] = [
  "grill",
  "side",
  "breakfast",
  "seafood",
  "mediterranean",
  "asian",
  "pasta",
  "comfort",
  "dessert",
];

export const KIND_HE_LABELS: Record<ProductKind, string> = {
  grill: "גריל",
  side: "תוספות",
  breakfast: "בוקר",
  drink: "בר",
  seafood: "ים",
  pasta: "פסטה",
  asian: "אסיה",
  mediterranean: "ים־תיכוני",
  comfort: "נוחות",
  dessert: "קינוח",
};

/**
 * דפוס הרכב הזמנה:
 * - food_only / drink_only / food_or_drink — מסלול יחיד (אוכל XOR שתייה)
 * - one_kind_plus_drink — אוכל מסוג אחד + שתייה
 * - multi_kind — כמה סוגי אוכל (או אותו סוג פעמיים) + שתייה אופציונלית
 */
export type OrderPattern =
  | "food_only"
  | "drink_only"
  | "food_or_drink"
  | "one_kind_plus_drink"
  | "multi_kind";

export type StageConfig = {
  stage: number;
  label: string;
  groupSize: number;
  groupCount: number;
  timePerOrderMs: number;
  itemCountMin: number;
  itemCountMax: number;
  unlockedFoodKinds: ProductKind[];
  /** מנות ספציפיות שפתוחות במדף (בתוך הסוגים הפתוחים) */
  unlockedItemIds: string[];
  drinksUnlocked: boolean;
  orderPattern: OrderPattern;
  /** סוג שנפתח בשלב הזה (להצגת chip) */
  newlyUnlockedKind: ProductKind | null;
  /** מנות שנפתחו לראשונה בשלב הזה */
  newlyUnlockedItemIds: string[];
};

const STAGE_FLAVOR = [
  "שעת פתיחה",
  "זרם ראשון",
  "מתחממים",
  "זוגות מגיעים",
  "שיא מוקדם",
  "תור ארוך",
  "קבוצות",
  "לחץ עולה",
  "שיא הלילה",
  "סערת הזמנות",
  "אין הפסקה",
  "סגירה סוערת",
];

/** כמה סוגי אוכל פתוחים בשלב (1→3, פתיחה כל 3 שלבים) */
export function foodKindCountForStage(stage: number): number {
  const s = Math.max(1, Math.floor(stage));
  return Math.min(FOOD_KIND_UNLOCK_ORDER.length, 1 + Math.floor((s - 1) / 3));
}

export function unlockedFoodKindsForStage(stage: number): ProductKind[] {
  const n = foodKindCountForStage(stage);
  return FOOD_KIND_UNLOCK_ORDER.slice(0, n) as ProductKind[];
}

/** שלב שבו סוג אוכל נפתח לראשונה (1-based) */
export function stageWhenFoodKindUnlocks(kind: ProductKind): number {
  const idx = FOOD_KIND_UNLOCK_ORDER.indexOf(kind);
  if (idx < 0) return Number.POSITIVE_INFINITY;
  return 1 + idx * 3;
}

/**
 * כמה מנות מתוך סוג פתוחות בשלב.
 * בפתיחת הסוג: 2 מנות (או כל הסוג אם קטן יותר).
 * כל שלב נוסף שהסוג פתוח: +1 מנה עד שממלאים את הקטלוג של הסוג.
 */
export function itemCountUnlockedInKind(kind: ProductKind, stage: number): number {
  const products = PRODUCTS.filter((p) => p.kind === kind);
  if (products.length === 0) return 0;
  const unlockAt = stageWhenFoodKindUnlocks(kind);
  const s = Math.max(1, Math.floor(stage));
  if (s < unlockAt) return 0;
  const stagesOpen = s - unlockAt;
  return Math.min(products.length, 2 + stagesOpen);
}

/** מזהי מנות פתוחות במדף (כולל שתייה כשפתוחה) */
export function unlockedItemIdsForStage(stage: number): string[] {
  const s = Math.max(1, Math.floor(stage));
  const ids: string[] = [];
  for (const kind of unlockedFoodKindsForStage(s)) {
    const products = PRODUCTS.filter((p) => p.kind === kind);
    const n = itemCountUnlockedInKind(kind, s);
    for (const p of products.slice(0, n)) ids.push(p.id);
  }
  if (drinksUnlockedForStage(s)) {
    for (const p of PRODUCTS.filter((p) => p.kind === "drink")) ids.push(p.id);
  }
  return ids;
}

export function newlyUnlockedItemIdsForStage(stage: number): string[] {
  const s = Math.max(1, Math.floor(stage));
  if (s <= 1) return unlockedItemIdsForStage(1);
  const prev = new Set(unlockedItemIdsForStage(s - 1));
  return unlockedItemIdsForStage(s).filter((id) => !prev.has(id));
}

export function drinksUnlockedForStage(stage: number): boolean {
  return Math.max(1, Math.floor(stage)) >= 2;
}

/**
 * מחזור קושי בתוך מספר סוגי האוכל הפתוחים:
 * 0 — רק אוכל (או food_or_drink אם יש בר)
 * 1 — אוכל או שתייה
 * 2 — אוכל+שתייה מסוג אחד / multi כשיש כמה סוגים
 */
export function orderPatternForStage(stage: number): OrderPattern {
  const s = Math.max(1, Math.floor(stage));
  const phase = (s - 1) % 3;
  const kinds = foodKindCountForStage(s);
  const drinks = drinksUnlockedForStage(s);

  if (s === 1 || !drinks) return "food_only";
  if (phase === 0) return kinds === 1 ? "food_only" : "food_or_drink";
  if (phase === 1) return "food_or_drink";
  if (kinds >= 2 && s >= 6) return "multi_kind";
  return "one_kind_plus_drink";
}

function newlyUnlockedForStage(stage: number): ProductKind | null {
  const s = Math.max(1, Math.floor(stage));
  if (s === 1) return "grill";
  const prev = unlockedFoodKindsForStage(s - 1);
  const cur = unlockedFoodKindsForStage(s);
  if (cur.length > prev.length) return cur[cur.length - 1]!;
  return null;
}

/**
 * Endless progressive stages: פתיחת סוגים + הרכב הזמנות מתקדם.
 * Stage numbers are 1-based and never end — only lives end the night.
 */
export function getStageConfig(stage: number): StageConfig {
  const s = Math.max(1, Math.floor(stage));
  const unlockedFoodKinds = unlockedFoodKindsForStage(s);
  const drinksUnlocked = drinksUnlockedForStage(s);
  const orderPattern = orderPatternForStage(s);

  const groupSize =
    s <= 2 ? 1 : s <= 4 ? 2 : s <= 7 ? 3 : s <= 11 ? 4 : Math.min(5, 4 + Math.floor((s - 12) / 4));

  const groupCount = s <= 2 ? 3 : 3 + ((s - 1) % 3);

  const timePerOrderMs = Math.max(
    5500,
    Math.round(24000 - (s - 1) * 1100 - Math.max(0, s - 8) * 200),
  );

  // מספר מנות גדל עם השלב (ובהתאם לדפוס — קומבו צריך לפחות 2)
  let itemCountMin = 1 + Math.floor((s - 1) / 4);
  let itemCountMax = itemCountMin + (s >= 3 ? 1 : 0) + (s >= 9 ? 1 : 0);
  itemCountMin = Math.min(4, itemCountMin);
  itemCountMax = Math.min(5, Math.max(itemCountMin, itemCountMax));

  if (orderPattern === "one_kind_plus_drink" || orderPattern === "multi_kind") {
    itemCountMin = Math.max(2, itemCountMin);
    itemCountMax = Math.max(itemCountMin, itemCountMax);
  }

  return {
    stage: s,
    label: STAGE_FLAVOR[(s - 1) % STAGE_FLAVOR.length]!,
    groupSize,
    groupCount,
    timePerOrderMs,
    itemCountMin,
    itemCountMax,
    unlockedFoodKinds,
    unlockedItemIds: unlockedItemIdsForStage(s),
    drinksUnlocked,
    orderPattern,
    newlyUnlockedKind: newlyUnlockedForStage(s),
    newlyUnlockedItemIds: newlyUnlockedItemIdsForStage(s),
  };
}

/** מוצרים זמינים במדף בשלב */
export function shelfProductsForStage(stage: StageConfig | number): Product[] {
  const cfg = typeof stage === "number" ? getStageConfig(stage) : stage;
  const allowed = new Set(cfg.unlockedItemIds);
  return PRODUCTS.filter((p) => allowed.has(p.id));
}

export type CustomerOrder = {
  id: string;
  /** emoji fallback אם האסטים לא נטענו */
  face: string;
  character: CharacterLoadout;
  items: string[];
  deadlineAt: number;
  createdAt: number;
  timeLimitMs: number;
};

export type ActiveGroup = {
  id: string;
  customers: CustomerOrder[];
  arrivedAt: number;
};

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function pickUniqueIds(pool: Product[], count: number): string[] {
  if (pool.length === 0 || count <= 0) return [];
  return shuffle(pool.map((p) => p.id)).slice(0, Math.min(count, pool.length));
}

function foodPool(cfg: StageConfig, kind?: ProductKind): Product[] {
  const allowed = new Set(cfg.unlockedItemIds);
  return PRODUCTS.filter((p) => {
    if (p.kind === "drink") return false;
    if (!allowed.has(p.id)) return false;
    if (kind && p.kind !== kind) return false;
    return true;
  });
}

function drinkPool(cfg: StageConfig): Product[] {
  if (!cfg.drinksUnlocked) return [];
  const allowed = new Set(cfg.unlockedItemIds);
  return PRODUCTS.filter((p) => p.kind === "drink" && allowed.has(p.id));
}

/**
 * בונה הזמנה לפי דפוס השלב.
 * אותו סוג אוכל פעמיים / סוגים שונים — רנדומלי ב־multi_kind.
 */
export function buildOrderItems(cfg: StageConfig): string[] {
  const min = cfg.itemCountMin;
  const max = cfg.itemCountMax;
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const foods = foodPool(cfg);
  const drinks = drinkPool(cfg);

  const asFoodOnly = () => pickUniqueIds(foods, count);
  const asDrinkOnly = () => {
    if (drinks.length === 0) return asFoodOnly();
    // עם משקה אחד בקטלוג — חוזרים עליו או משלימים באוכל אם צריך יותר מנות
    if (count <= drinks.length) return pickUniqueIds(drinks, count);
    const drinkIds = pickUniqueIds(drinks, drinks.length);
    const need = count - drinkIds.length;
    return [...drinkIds, ...pickUniqueIds(foods, need)];
  };

  let pattern = cfg.orderPattern;
  if (pattern === "food_or_drink") {
    pattern = Math.random() < 0.58 ? "food_only" : "drink_only";
  }

  if (pattern === "food_only") return asFoodOnly();
  if (pattern === "drink_only") return asDrinkOnly();

  if (pattern === "one_kind_plus_drink") {
    const kind = pickRandom(cfg.unlockedFoodKinds);
    const kindFoods = foodPool(cfg, kind);
    const foodSlots = Math.max(1, count - (drinks.length > 0 ? 1 : 0));
    const items = pickUniqueIds(kindFoods.length ? kindFoods : foods, foodSlots);
    if (drinks.length > 0) {
      items.push(pickRandom(drinks).id);
    }
    // אם עדיין חסרים — השלמה מאותו סוג
    while (items.length < count) {
      const extra = pickUniqueIds(
        kindFoods.filter((p) => !items.includes(p.id)),
        1,
      );
      if (extra.length === 0) break;
      items.push(extra[0]!);
    }
    return items;
  }

  // multi_kind — לפעמים אותו סוג, לפעמים ערבוב; שתייה אופציונלית
  const sameKind = Math.random() < 0.42;
  const wantDrink = drinks.length > 0 && count >= 2 && Math.random() < 0.55;
  const foodSlots = wantDrink ? count - 1 : count;

  let foodIds: string[];
  if (sameKind) {
    const kind = pickRandom(cfg.unlockedFoodKinds);
    const kindFoods = foodPool(cfg, kind);
    foodIds = pickUniqueIds(kindFoods.length >= foodSlots ? kindFoods : foods, foodSlots);
  } else {
    foodIds = pickUniqueIds(foods, foodSlots);
  }

  if (wantDrink) foodIds.push(pickRandom(drinks).id);
  return foodIds;
}

/** @deprecated — prefer buildOrderItems(getStageConfig(n)) */
export function buildOrderItemsRange(min: number, max: number): string[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const pool = shuffle(PRODUCTS.map((p) => p.id));
  return pool.slice(0, Math.min(count, pool.length));
}

let orderSeq = 0;

const FACE_BY_GENDER = {
  man: ["😎", "🧔", "👨‍🦰", "🧑‍🎤"],
  woman: ["😊", "👩‍🦱", "👩‍✈️", "🧑‍🦳"],
  kid: ["🧒", "😊"],
} as const;

export function createCustomerOrder(
  stage: StageConfig,
  now: number,
  env?: EnvironmentConfig | null,
): CustomerOrder {
  orderSeq += 1;
  const character = randomCharacterLoadout(now + orderSeq);
  const faces = FACE_BY_GENDER[character.gender];
  return {
    id: `ord-${orderSeq}-${now}`,
    face: pickRandom(faces),
    character,
    items: env ? buildEnvOrderItems(env, stage) : buildOrderItems(stage),
    createdAt: now,
    deadlineAt: now + stage.timePerOrderMs,
    timeLimitMs: stage.timePerOrderMs,
  };
}

export function createGroup(
  stage: StageConfig,
  now: number,
  env?: EnvironmentConfig | null,
): ActiveGroup {
  orderSeq += 1;
  const customers: CustomerOrder[] = [];
  for (let i = 0; i < stage.groupSize; i++) {
    customers.push(createCustomerOrder(stage, now + i, env));
  }
  return {
    id: `grp-${orderSeq}-${now}`,
    customers,
    arrivedAt: now,
  };
}

export function ordersMatch(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((id, i) => id === sortedB[i]);
}

export type TrayDistributeResult = {
  /** לקוחות שעדיין ממתינים (עם יתרת פריטים) */
  remainingCustomers: CustomerOrder[];
  /** לקוחות שקיבלו את כל ההזמנה בהגשה הזו */
  fulfilledCustomers: CustomerOrder[];
  /** כמה פריטים מהמגש הוקצו */
  matchedCount: number;
  /** פריטים שלא התאימו לאף אחד */
  unusedItems: string[];
  /** לכל לקוח — כמה פריטים קיבל בהגשה */
  matchedByCustomer: Record<string, number>;
  /** כמה לקוחות קיבלו הארכת זמן בגלל הגשה חלקית */
  partialTimeBonusCount: number;
};

/** הארכת טיימר (מ״ש) כשמגישים חלק מההזמנה בלבד */
export const PARTIAL_SERVE_TIME_BONUS_MS = 3000;

/**
 * מחלק פריטי מגש בין לקוחות הקבוצה.
 * מעדיף את הלקוח הנבחר אם הוא צריך את הפריט, אחרת את הדחוף ביותר (deadline).
 * פריט מוריד יחידה אחת מההזמנה של מי שקיבל אותו.
 * הגשה חלקית (קיבל משהו אבל נשארו פריטים) → +3 שניות לטיימר.
 */
export function distributeTrayToGroup(
  tray: string[],
  customers: CustomerOrder[],
  preferredCustomerId?: string | null,
): TrayDistributeResult {
  const bags = customers.map((c) => ({
    customer: c,
    remaining: [...c.items],
    matched: 0,
  }));
  const unusedItems: string[] = [];

  for (const itemId of tray) {
    const candidates = bags.filter((b) => b.remaining.includes(itemId));
    if (candidates.length === 0) {
      unusedItems.push(itemId);
      continue;
    }
    candidates.sort((a, b) => {
      if (preferredCustomerId) {
        if (a.customer.id === preferredCustomerId) return -1;
        if (b.customer.id === preferredCustomerId) return 1;
      }
      return a.customer.deadlineAt - b.customer.deadlineAt;
    });
    const pick = candidates[0]!;
    const idx = pick.remaining.indexOf(itemId);
    pick.remaining.splice(idx, 1);
    pick.matched += 1;
  }

  const matchedByCustomer: Record<string, number> = {};
  const remainingCustomers: CustomerOrder[] = [];
  const fulfilledCustomers: CustomerOrder[] = [];
  let partialTimeBonusCount = 0;

  for (const bag of bags) {
    matchedByCustomer[bag.customer.id] = bag.matched;
    if (bag.remaining.length === 0) {
      fulfilledCustomers.push(bag.customer);
    } else {
      const partialBonus = bag.matched > 0;
      if (partialBonus) partialTimeBonusCount += 1;
      remainingCustomers.push({
        ...bag.customer,
        items: bag.remaining,
        deadlineAt: partialBonus
          ? bag.customer.deadlineAt + PARTIAL_SERVE_TIME_BONUS_MS
          : bag.customer.deadlineAt,
        timeLimitMs: partialBonus
          ? bag.customer.timeLimitMs + PARTIAL_SERVE_TIME_BONUS_MS
          : bag.customer.timeLimitMs,
      });
    }
  }

  const matchedCount = tray.length - unusedItems.length;
  return {
    remainingCustomers,
    fulfilledCustomers,
    matchedCount,
    unusedItems,
    matchedByCustomer,
    partialTimeBonusCount,
  };
}

/** @deprecated kept for older imports — use getStageConfig */
export const WAVES = [1, 2, 3, 4, 5, 6, 7].map(getStageConfig);
