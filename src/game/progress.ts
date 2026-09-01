import { getProduct, type ProductKind } from "./catalog";

const HIGH_SCORE_KEY = "foodtruck.highScore";
const BEST_STAGE_KEY = "foodtruck.bestStage";
const UNLOCK_JOURNAL_KEY = "foodtruck.unlockJournal";

const KIND_LABEL: Record<ProductKind, string> = {
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

export type UnlockJournalEntry = {
  /** stage when first seen */
  stage: number;
  kind?: ProductKind;
  itemId?: string;
  label: string;
  at: number;
};

export type ProgressSnapshot = {
  highScore: number;
  bestStage: number;
  journal: UnlockJournalEntry[];
};

export type NightRecordResult = {
  highScore: number;
  bestStage: number;
  previousHighScore: number;
  beatHighScore: boolean;
  beatBestStage: boolean;
};

function safeParseJournal(raw: string | null): UnlockJournalEntry[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (e): e is UnlockJournalEntry =>
          Boolean(e) &&
          typeof e === "object" &&
          typeof (e as UnlockJournalEntry).label === "string" &&
          typeof (e as UnlockJournalEntry).stage === "number",
      )
      .slice(0, 80);
  } catch {
    return [];
  }
}

export function loadProgress(): ProgressSnapshot {
  try {
    const highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) ?? "0");
    const bestStage = Number(localStorage.getItem(BEST_STAGE_KEY) ?? "1");
    const journal = safeParseJournal(localStorage.getItem(UNLOCK_JOURNAL_KEY));
    return {
      highScore: Number.isFinite(highScore) ? Math.max(0, Math.floor(highScore)) : 0,
      bestStage: Number.isFinite(bestStage) ? Math.max(1, Math.floor(bestStage)) : 1,
      journal,
    };
  } catch {
    return { highScore: 0, bestStage: 1, journal: [] };
  }
}

export function recordNightScore(score: number, stageReached: number): NightRecordResult {
  const prev = loadProgress();
  const s = Math.max(0, Math.floor(score));
  const st = Math.max(1, Math.floor(stageReached));
  const beatHighScore = s > prev.highScore;
  const beatBestStage = st > prev.bestStage;
  const highScore = Math.max(prev.highScore, s);
  const bestStage = Math.max(prev.bestStage, st);
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
    localStorage.setItem(BEST_STAGE_KEY, String(bestStage));
  } catch {
    /* ignore */
  }
  return {
    highScore,
    bestStage,
    previousHighScore: prev.highScore,
    beatHighScore,
    beatBestStage,
  };
}

function saveJournal(entries: UnlockJournalEntry[]): void {
  try {
    localStorage.setItem(UNLOCK_JOURNAL_KEY, JSON.stringify(entries.slice(0, 80)));
  } catch {
    /* ignore */
  }
}

/** מוסיף ליומן רק פתיחות שעוד לא נרשמו (לפי kind / itemId). */
export function appendUnlocks(input: {
  stage: number;
  kind?: ProductKind | null;
  itemIds?: string[];
}): UnlockJournalEntry[] {
  const snap = loadProgress();
  const next = [...snap.journal];
  const seenKinds = new Set(next.map((e) => e.kind).filter(Boolean));
  const seenItems = new Set(next.map((e) => e.itemId).filter(Boolean));
  const now = Date.now();

  if (input.kind && !seenKinds.has(input.kind)) {
    next.push({
      stage: input.stage,
      kind: input.kind,
      label: `סוג: ${KIND_LABEL[input.kind]}`,
      at: now,
    });
    seenKinds.add(input.kind);
  }

  for (const id of input.itemIds ?? []) {
    if (seenItems.has(id)) continue;
    const p = getProduct(id);
    next.push({
      stage: input.stage,
      itemId: id,
      kind: p?.kind,
      label: p?.name ?? id,
      at: now,
    });
    seenItems.add(id);
  }

  if (next.length !== snap.journal.length) saveJournal(next);
  return next;
}

export function clearProgressForTests(): void {
  try {
    localStorage.removeItem(HIGH_SCORE_KEY);
    localStorage.removeItem(BEST_STAGE_KEY);
    localStorage.removeItem(UNLOCK_JOURNAL_KEY);
  } catch {
    /* ignore */
  }
}
