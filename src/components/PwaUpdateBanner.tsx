import { useCallback, useEffect, useState } from "react";
import { forceSystemUpdate, isStandaloneDisplay } from "../game/pwaInstall";

const DISMISS_KEY = "ftb_update_dismiss";
const JUST_UPDATED_KEY = "ftb_just_updated";

declare global {
  interface WindowEventMap {
    "foodtruck:update-available": CustomEvent<{ cache?: string; reason?: string }>;
  }
}

type BannerMode = "available" | "done";

/**
 * באנר דחוף למשתמשי PWA מותקנים (מסך בית):
 * - «יש עדכונים» כש־SW מזהה גרסה חדשה
 * - «המשחק עודכן» אחרי רענון ממטמון ישן
 */
export function PwaUpdateBanner() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<BannerMode>("available");
  const [busy, setBusy] = useState(false);
  const [installed, setInstalled] = useState(false);

  const showAvailable = useCallback(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setMode("available");
    setOpen(true);
  }, []);

  useEffect(() => {
    setInstalled(isStandaloneDisplay());

    try {
      if (sessionStorage.getItem(JUST_UPDATED_KEY) === "1") {
        sessionStorage.removeItem(JUST_UPDATED_KEY);
        setMode("done");
        setOpen(true);
      }
    } catch {
      /* ignore */
    }

    const onAvail = () => showAvailable();
    window.addEventListener("foodtruck:update-available", onAvail);

    let cancelled = false;
    async function probe() {
      if (!("serviceWorker" in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg || cancelled) return;
        if (reg.waiting) showAvailable();
        await reg.update();
        if (reg.waiting && !cancelled) showAvailable();

        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              showAvailable();
            }
          });
        });
      } catch {
        /* offline */
      }
    }

    void probe();
    const interval = window.setInterval(() => void probe(), 45_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener("foodtruck:update-available", onAvail);
    };
  }, [showAvailable]);

  async function applyUpdate() {
    if (busy) return;
    setBusy(true);
    try {
      sessionStorage.setItem(JUST_UPDATED_KEY, "1");
    } catch {
      /* ignore */
    }
    const result = await forceSystemUpdate();
    if (result === "failed") setBusy(false);
  }

  function dismiss() {
    try {
      if (mode === "available") sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!open) return null;

  const title = mode === "done" ? "המשחק עודכן!" : "יש עדכונים למשחק!";
  const desc =
    mode === "done"
      ? installed
        ? "גרסת מסך הבית רועננה. אפשר לשחק עם כל הפיצ׳רים החדשים."
        : "נטענה הגרסה החדשה. אפשר להמשיך לשחק."
      : installed
        ? "האפליקציה במסך הבית שלכם ישנה. לחצו לעדכון: שיא מקומי, יומן פתיחות, מיני־הכנה וצלילים חדשים."
        : "יצאה גרסה חדשה. לחצו לעדכון מערכת כדי לטעון את כל השינויים.";

  return (
    <div
      className={`pwa-update-banner${installed ? " is-installed" : ""}${mode === "done" ? " is-done" : ""}`}
      role="alertdialog"
      aria-labelledby="pwa-update-title"
      aria-describedby="pwa-update-desc"
      data-testid="pwa-update-banner"
    >
      <div className="pwa-update-banner-inner">
        <p id="pwa-update-title" className="pwa-update-title">
          {title}
        </p>
        <p id="pwa-update-desc" className="pwa-update-desc">
          {desc}
        </p>
        <div className="pwa-update-actions">
          {mode === "available" ? (
            <>
              <button
                type="button"
                className="btn btn-primary pwa-update-cta"
                onClick={() => void applyUpdate()}
                disabled={busy}
              >
                {busy ? "מעדכנים…" : "עדכנו עכשיו"}
              </button>
              <button type="button" className="btn btn-ghost" onClick={dismiss} disabled={busy}>
                אחר כך
              </button>
            </>
          ) : (
            <button type="button" className="btn btn-primary pwa-update-cta" onClick={dismiss}>
              מעולה, ממשיכים
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
