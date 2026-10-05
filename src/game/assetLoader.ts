export type SpriteMeta = {
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
};

export type AssetManifest = {
  sheet: { src: string; width: number; height: number };
  hero: { src: string; width: number; height: number };
  sprites: Record<string, SpriteMeta>;
};

/** תואם ל־BUILD_ID ב־main / sw — מונע מטמון ישן על WebP */
const ASSET_CACHE_BUST = "tipsy-v33-marketable-parity";

let manifest: AssetManifest | null = null;
let loadPromise: Promise<AssetManifest> | null = null;
const readyListeners = new Set<() => void>();

const FALLBACK: AssetManifest = {
  sheet: { src: "/assets/game_asset_library.webp", width: 1024, height: 559 },
  hero: { src: "/assets/foodtruck_hero.webp", width: 1024, height: 559 },
  sprites: {},
};

function withBust(src: string): string {
  if (!src) return src;
  const join = src.includes("?") ? "&" : "?";
  return `${src}${join}v=${ASSET_CACHE_BUST}`;
}

function notifyReady() {
  for (const fn of readyListeners) {
    try {
      fn();
    } catch {
      /* ignore listener errors */
    }
  }
}

/** נרשמים לשינוי מוכנות אסטים (כדי ש־ProductArt יעבור מתמונה חסרה לתמונה) */
export function onAssetsReady(cb: () => void): () => void {
  readyListeners.add(cb);
  if (manifest) {
    queueMicrotask(cb);
  }
  return () => {
    readyListeners.delete(cb);
  };
}

export async function loadAssets(): Promise<AssetManifest> {
  if (manifest) return manifest;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    try {
      const res = await fetch(withBust("/assets/assets.json"), { cache: "no-cache" });
      if (!res.ok) throw new Error(`assets.json ${res.status}`);
      const data = (await res.json()) as AssetManifest;
      // bust query על כל src כדי לא לקבל WebP ישן ממטמון PWA
      data.hero = { ...data.hero, src: withBust(data.hero.src) };
      data.sheet = { ...data.sheet, src: withBust(data.sheet.src) };
      for (const [id, s] of Object.entries(data.sprites)) {
        data.sprites[id] = { ...s, src: withBust(s.src) };
      }
      const urls = [
        data.hero.src,
        data.sheet.src,
        ...Object.values(data.sprites).map((s) => s.src),
      ];
      await Promise.all(
        urls.map(
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

export function getManifest(): AssetManifest | null {
  return manifest;
}

export function spriteUrl(id: string): string | undefined {
  return manifest?.sprites[id]?.src;
}
