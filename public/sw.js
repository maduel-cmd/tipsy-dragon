/* Tipsy Dragon PWA — offline-first shell + assets */
const CACHE = "foodtruck-bar-v32-meta-sprint";
const CORE = [
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
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(CORE);
      try {
        const res = await fetch("/precache.json", { cache: "no-cache" });
        if (res.ok) {
          const data = await res.json();
          const urls = Array.isArray(data?.urls) ? data.urls : [];
          // chunk to avoid browser abort on huge addAll
          const chunk = 40;
          for (let i = 0; i < urls.length; i += chunk) {
            const slice = urls.slice(i, i + chunk);
            await Promise.all(
              slice.map(async (url) => {
                try {
                  await cache.add(url);
                } catch {
                  /* skip missing */
                }
              }),
            );
          }
        }
      } catch {
        /* precache.json optional until first build */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.postMessage({ type: "FOODTRUCK_SW_UPDATED", cache: CACHE });
      }
    })(),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data !== "object") return;

  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE);
        let ok = 0;
        for (const url of data.urls) {
          try {
            await cache.add(url);
            ok += 1;
          } catch {
            /* skip */
          }
        }
        if (event.ports && event.ports[0]) {
          event.ports[0].postMessage({ type: "CACHE_DONE", ok, total: data.urls.length });
        }
      })(),
    );
  }

  if (data.type === "SKIP_WAITING") {
    void self.skipWaiting();
  }
});

function isShellAsset(url) {
  const p = url.pathname;
  return (
    p.endsWith(".js") ||
    p.endsWith(".css") ||
    p.endsWith(".html") ||
    p === "/" ||
    p.endsWith("assets.json") ||
    p.endsWith("characters.json") ||
    p.endsWith("precache.json") ||
    p.endsWith("sw.js") ||
    p.endsWith("manifest.webmanifest")
  );
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isNav = req.mode === "navigate" || req.destination === "document";

  // Navigation: network first, offline → cached shell
  if (isNav) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(CACHE).then((cache) => {
              void cache.put(req, copy);
              void cache.put("/", copy.clone());
              void cache.put("/index.html", copy.clone());
            });
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((c) => c || caches.match("/index.html") || caches.match("/")),
        ),
    );
    return;
  }

  // Shell JS/CSS/JSON: network-first so catalog/assets updates are not stuck on old PWA cache
  if (isShellAsset(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req)),
    );
    return;
  }

  // Images / sprites / fonts: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        void fetch(req)
          .then((res) => {
            if (res.ok) {
              void caches.open(CACHE).then((cache) => cache.put(req, res.clone()));
            }
          })
          .catch(() => undefined);
        return cached;
      }
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            void caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
    }),
  );
});
