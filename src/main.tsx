import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import "./styles/animations.css";

const BUILD_ID = "tipsy-v32-meta-sprint";
const SW_URL = `/sw.js?v=${BUILD_ID}`;

const root = document.getElementById("root");
if (!root) throw new Error("root missing");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

function isInstalledPwa(): boolean {
  try {
    const mq = window.matchMedia?.("(display-mode: standalone)")?.matches;
    const ios =
      "standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    return Boolean(mq || ios);
  } catch {
    return false;
  }
}

async function nukeStaleCaches(): Promise<boolean> {
  let hadStale = false;
  try {
    const prev = localStorage.getItem("ftb_build");
    if (prev === BUILD_ID) return false;
    hadStale = prev != null && prev !== BUILD_ID;
    if ("caches" in window) {
      const keys = await caches.keys();
      if (keys.length) hadStale = true;
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      if (regs.length) hadStale = true;
      await Promise.all(regs.map((r) => r.unregister()));
    }
    localStorage.setItem("ftb_build", BUILD_ID);
  } catch {
    /* ignore */
  }
  return hadStale;
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void (async () => {
      const stale = await nukeStaleCaches();
      const alreadyBusted = /[?&]v=tipsy-v[\w-]+/.test(window.location.search);
      if (stale && !alreadyBusted) {
        // PWA מותקן עם מטמון ישן — מעבירים לגרסה חדשה; אחרי הטעינה יוצג «המשחק עודכן»
        try {
          sessionStorage.removeItem("ftb_update_dismiss");
          if (isInstalledPwa()) sessionStorage.setItem("ftb_just_updated", "1");
        } catch {
          /* ignore */
        }
        window.location.replace(`/?v=${BUILD_ID}`);
        return;
      }
      try {
        const reg = await navigator.serviceWorker.register(SW_URL, { updateViaCache: "none" });
        void reg.update();
      } catch {
        /* offline install optional */
      }
    })();
  });

  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type !== "FOODTRUCK_SW_UPDATED") return;

    // מותקן בטלפון/מסך בית — לא רענון שקט: דוחפים באנר «יש עדכונים»
    if (isInstalledPwa()) {
      window.dispatchEvent(
        new CustomEvent("foodtruck:update-available", {
          detail: { cache: event.data.cache, reason: "sw-updated" },
        }),
      );
      return;
    }

    const key = `foodtruck.sw.reload.${BUILD_ID}`;
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      }
    } catch {
      window.location.reload();
    }
  });
}
