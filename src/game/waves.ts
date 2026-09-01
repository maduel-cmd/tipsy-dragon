import { PRODUCTS } from "./catalog";

export type StageConfig = {
  stage: number;
  label: string;
  groupSize: number;
  groupCount: number;
  timePerOrderMs: number;
  itemCountMin: number;
  itemCountMax: number;
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

/**
 * Endless progressive stages: easy start, then steadily harder.
 * Stage numbers are 1-based and never end — only lives end the night.
 */
export function getStageConfig(stage: number): StageConfig {
  const s = Math.max(1, Math.floor(stage));

  // Beginner-friendly early curve, then ramps up
  const groupSize =
    s <= 2 ? 1 : s <= 4 ? 2 : s <= 7 ? 3 : s <= 11 ? 4 : Math.min(5, 4 + Math.floor((s - 12) / 4));

  const groupCount = s <= 2 ? 3 : 3 + ((s - 1) % 3);

  const timePerOrderMs = Math.max(
    5500,
    Math.round(24000 - (s - 1) * 1100 - Math.max(0, s - 8) * 200),
  );

  const itemCountMin = s <= 2 ? 1 : s <= 5 ? 1 : s <= 9 ? 2 : Math.min(3, 2 + Math.floor((s - 10) / 5));
  const itemCountMax =
    s <= 1 ? 1 : s <= 3 ? 2 : s <= 6 ? 2 : s <= 10 ? 3 : Math.min(4, itemCountMin + 1 + Math.floor((s - 11) / 4));

  return {
    stage: s,
    label: STAGE_FLAVOR[(s - 1) % STAGE_FLAVOR.length]!,
    groupSize,
    groupCount,
    timePerOrderMs,
    itemCountMin,
    itemCountMax: Math.max(itemCountMin, itemCountMax),
  };
}

const CUSTOMER_FACES = ["😎", "😊", "🤠", "🧑‍🎤", "🧔", "👩‍🦱", "👨‍🦰", "🧑‍🦳", "🧒", "👩‍✈️"];

export type CustomerOrder = {
  id: string;
  face: string;
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

let orderSeq = 0;

export function buildOrderItems(min: number, max: number): string[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const pool = shuffle(PRODUCTS.map((p) => p.id));
  return pool.slice(0, Math.min(count, pool.length));
}

export function createCustomerOrder(stage: StageConfig, now: number): CustomerOrder {
  orderSeq += 1;
  return {
    id: `ord-${orderSeq}-${now}`,
    face: pickRandom(CUSTOMER_FACES),
    items: buildOrderItems(stage.itemCountMin, stage.itemCountMax),
    createdAt: now,
    deadlineAt: now + stage.timePerOrderMs,
    timeLimitMs: stage.timePerOrderMs,
  };
}

export function createGroup(stage: StageConfig, now: number): ActiveGroup {
  orderSeq += 1;
  const customers: CustomerOrder[] = [];
  for (let i = 0; i < stage.groupSize; i++) {
    customers.push(createCustomerOrder(stage, now));
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

/** @deprecated kept for older imports — use getStageConfig */
export const WAVES = [1, 2, 3, 4, 5, 6, 7].map(getStageConfig);
