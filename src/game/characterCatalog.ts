/** קטלוג דמויות מודולריות — Tipsy Dragon customers */

export type CharacterGender = "man" | "woman" | "kid" | "any";

export type CharacterCategory =
  | "base"
  | "example"
  | "hair"
  | "hat"
  | "glasses"
  | "headphones"
  | "clothes"
  | "clothes_top"
  | "clothes_bottom"
  | "clothes_feet"
  | "accessory";

export type CharacterSpriteMeta = {
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
  category: CharacterCategory;
  gender: CharacterGender;
};

export type CharacterManifest = {
  sheet: { src: string; width: number; height: number };
  layerOrder: CharacterCategory[];
  anchors: Record<string, { x: number; y: number; scale: number }>;
  sprites: Record<string, CharacterSpriteMeta>;
};

/** הרכב דמות ללקוח במשחק */
export type CharacterLoadout = {
  /** מגדר לוגי לרנדום */
  gender: Exclude<CharacterGender, "any">;
  /** גוף בסיס או דמות מורכבת מוכנה */
  baseId: string;
  hairId?: string;
  hatId?: string;
  glassesId?: string;
  headphonesId?: string;
  accessoryId?: string;
};

let manifest: CharacterManifest | null = null;
let loadPromise: Promise<CharacterManifest | null> | null = null;
const readyListeners = new Set<() => void>();

const FALLBACK: CharacterManifest = {
  sheet: { src: "/assets/characters/modular_characters_sheet.webp", width: 1024, height: 572 },
  layerOrder: ["base", "hair", "hat", "glasses", "headphones", "accessory"],
  anchors: {
    hair: { x: 0.5, y: 0.08, scale: 0.95 },
    hat: { x: 0.5, y: 0.02, scale: 0.85 },
    glasses: { x: 0.5, y: 0.14, scale: 0.7 },
    headphones: { x: 0.5, y: 0.1, scale: 0.8 },
    accessory: { x: 0.72, y: 0.55, scale: 0.45 },
  },
  sprites: {},
};

function notifyReady() {
  for (const fn of readyListeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export function onCharactersReady(cb: () => void): () => void {
  readyListeners.add(cb);
  if (manifest) queueMicrotask(cb);
  return () => {
    readyListeners.delete(cb);
  };
}

export async function loadCharacters(): Promise<CharacterManifest | null> {
  if (manifest) return manifest;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await fetch("/assets/characters/characters.json", { cache: "no-cache" });
      if (!res.ok) throw new Error(`characters.json ${res.status}`);
      const data = (await res.json()) as CharacterManifest;
      const urls = Object.values(data.sprites).map((s) => s.src);
      await Promise.all(
        urls.slice(0, 40).map(
          (src) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = src;
            }),
        ),
      );
      manifest = data;
      notifyReady();
      return data;
    } catch {
      manifest = FALLBACK;
      notifyReady();
      return FALLBACK;
    }
  })();

  return loadPromise;
}

export function getCharacterManifest(): CharacterManifest | null {
  return manifest;
}

export function characterSpriteUrl(id: string): string | undefined {
  return manifest?.sprites[id]?.src;
}

export function listSprites(
  category?: CharacterCategory,
  gender?: CharacterGender,
): Array<{ id: string; meta: CharacterSpriteMeta }> {
  if (!manifest) return [];
  return Object.entries(manifest.sprites)
    .filter(([, m]) => {
      if (category && m.category !== category) return false;
      if (gender && gender !== "any" && m.gender !== "any" && m.gender !== gender) return false;
      return true;
    })
    .map(([id, meta]) => ({ id, meta }));
}

/** PRNG פשוט לפי seed — יציב לבדיקות / גלים */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], rnd: () => number): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[Math.floor(rnd() * arr.length)];
}

const GENDERS: Array<Exclude<CharacterGender, "any">> = ["man", "woman", "kid"];

/**
 * בונה הרכב אקראי ללקוח בתור:
 * רק גוף בסיס / דוגמה מורכבת — בלי overlays.
 * (אביזרי ראש מהגיליון עדיין לא מיושרים מספיק לתצוגת תור.)
 */
export function randomCharacterLoadout(now = Date.now()): CharacterLoadout {
  const rnd = mulberry32(Math.floor(now) || 1);

  // ~28% דמויות מורכבות מהדוגמאות
  if (rnd() < 0.28) {
    const examples = listSprites("example");
    const ex = pick(examples, rnd);
    if (ex) {
      const idx = Number(ex.id.replace(/\D/g, "")) || 0;
      const gender: Exclude<CharacterGender, "any"> =
        idx === 0 ? "man" : idx === 3 ? "kid" : idx === 1 || idx === 2 ? "woman" : "man";
      return { gender, baseId: ex.id };
    }
  }

  const gender = pick(GENDERS, rnd) ?? "man";
  const bases = listSprites("base", gender);
  const fallbackBases =
    gender === "woman"
      ? ["base_woman_0", "base_woman_1", "base_woman_2", "base_woman_3"]
      : gender === "kid"
        ? ["base_kid_0", "base_kid_1"]
        : ["base_man_0", "base_man_1", "base_man_2", "base_man_3"];

  const baseId = pick(bases, rnd)?.id ?? pick(fallbackBases, rnd) ?? "base_man_0";
  return { gender, baseId };
}

/** מזהה יציב לתצוגה/דיבאג */
export function loadoutKey(l: CharacterLoadout): string {
  return [l.baseId, l.hairId, l.hatId, l.glassesId, l.headphonesId, l.accessoryId]
    .filter(Boolean)
    .join("+");
}
