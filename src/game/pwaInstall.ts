/** התקנת PWA + הכנת מטמון אופליין */

export type InstallCapability =
  | "prompt" // Android/Chrome beforeinstallprompt
  | "ios" // Safari — הוספה ידנית למסך הבית
  | "installed" // כבר standalone
  | "unsupported";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

export function onInstallStateChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone = "standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return Boolean(mq || iosStandalone);
}

export function isIosSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const webkit = /WebKit/.test(ua);
  const notChrome = !/CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && webkit && notChrome;
}

export function getInstallCapability(): InstallCapability {
  if (isStandaloneDisplay()) return "installed";
  if (deferredPrompt) return "prompt";
  if (isIosSafari()) return "ios";
  return "unsupported";
}

export function initPwaInstallListeners(): () => void {
  const onBip = (e: Event) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notify();
  };
  const onInstalled = () => {
    deferredPrompt = null;
    notify();
  };
  window.addEventListener("beforeinstallprompt", onBip);
  window.addEventListener("appinstalled", onInstalled);
  return () => {
    window.removeEventListener("beforeinstallprompt", onBip);
    window.removeEventListener("appinstalled", onInstalled);
  };
}

/** אוסף כתובות אסטים ידועים + קבצי הדף הנוכחי */
export async function collectOfflineUrls(): Promise<string[]> {
  const urls = new Set<string>([
    "/",
    "/index.html",
    "/manifest.webmanifest",
    "/icon-192.png",
    "/icon-512.png",
    "/icon-192-maskable.png",
    "/icon-512-maskable.png",
    "/assets/foodtruck_hero.webp",
    "/assets/game_asset_library.webp",
    "/assets/assets.json",
    "/assets/characters/characters.json",
    "/assets/characters/modular_characters_sheet.webp",
  ]);

  // Vite build assets currently loaded
  for (const el of document.querySelectorAll<HTMLLinkElement | HTMLScriptElement>("link[href], script[src]")) {
    const href = "href" in el ? el.href : el.src;
    if (!href) continue;
    try {
      const u = new URL(href, window.location.origin);
      if (u.origin === window.location.origin) urls.add(u.pathname + u.search);
    } catch {
      /* ignore */
    }
  }

  try {
    const assets = await fetch("/assets/assets.json", { cache: "force-cache" }).then((r) => r.json());
    if (assets?.hero?.src) urls.add(assets.hero.src);
    if (assets?.sheet?.src) urls.add(assets.sheet.src);
    for (const s of Object.values(assets?.sprites ?? {}) as Array<{ src?: string }>) {
      if (s?.src) urls.add(s.src);
    }
  } catch {
    /* ignore */
  }

  try {
    const chars = await fetch("/assets/characters/characters.json", { cache: "force-cache" }).then((r) =>
      r.json(),
    );
    if (chars?.sheet?.src) urls.add(chars.sheet.src);
    for (const s of Object.values(chars?.sprites ?? {}) as Array<{ src?: string }>) {
      if (s?.src) urls.add(s.src);
    }
  } catch {
    /* ignore */
  }

  try {
    const precache = await fetch("/precache.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null));
    if (Array.isArray(precache?.urls)) {
      for (const u of precache.urls as string[]) urls.add(u);
    }
  } catch {
    /* ignore */
  }

  return [...urls];
}

export async function prepareOfflineCache(): Promise<{ ok: number; total: number }> {
  const urls = await collectOfflineUrls();
  // Warm browser HTTP cache + SW cache
  await Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          // only images via Image(); others via fetch
          if (/\.(webp|png|jpe?g|gif|svg)(\?|$)/i.test(url)) {
            img.src = url;
          } else {
            void fetch(url, { cache: "reload" }).finally(() => resolve());
          }
        }),
    ),
  );

  if (!("serviceWorker" in navigator)) return { ok: 0, total: urls.length };
  const reg = await navigator.serviceWorker.ready;
  const sw = reg.active;
  if (!sw) return { ok: 0, total: urls.length };

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => resolve({ ok: 0, total: urls.length }), 45000);
    channel.port1.onmessage = (ev) => {
      window.clearTimeout(timer);
      const d = ev.data as { ok?: number; total?: number };
      resolve({ ok: d.ok ?? 0, total: d.total ?? urls.length });
    };
    sw.postMessage({ type: "CACHE_URLS", urls }, [channel.port2]);
  });
}

export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  if (!deferredPrompt) return "unavailable";
  const promptEvent = deferredPrompt;
  deferredPrompt = null;
  notify();
  await promptEvent.prompt();
  const choice = await promptEvent.userChoice;
  return choice.outcome;
}

/**
 * עדכון מערכת ל־PWA מותקן / דפדפן:
 * מנקה מטמונים, מבטל SW ישן, טוען מחדש עם bust — כדי לקבל פיצ׳רים חדשים.
 */
export async function forceSystemUpdate(): Promise<"reloading" | "failed"> {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        try {
          await reg.update();
        } catch {
          /* ignore */
        }
        if (reg.waiting) {
          reg.waiting.postMessage({ type: "SKIP_WAITING" });
        }
        await reg.unregister();
      }
    }

    try {
      localStorage.removeItem("ftb_build");
      sessionStorage.clear();
    } catch {
      /* ignore */
    }

    const url = new URL(window.location.href);
    url.searchParams.set("v", `upd-${Date.now()}`);
    window.location.replace(url.pathname + url.search);
    return "reloading";
  } catch {
    return "failed";
  }
}
