import { useState } from "react";
import { forceSystemUpdate } from "../game/pwaInstall";

type Props = {
  className?: string;
};

/**
 * כפתור «עדכון מערכת» — מנקה מטמון PWA וטוען מחדש את כל הפיצ׳רים החדשים.
 * שימושי כשהאפליקציה מותקנת במחשב / טלפון / טאבלט.
 */
export function UpdateSystemButton({ className }: Props) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    setStatus("מעדכנים מערכת · מנקים מטמון…");
    const result = await forceSystemUpdate();
    if (result === "failed") {
      setStatus("העדכון נכשל · בדקו חיבור ונסו שוב");
      setBusy(false);
    }
    // reloading → הדף נטען מחדש; אין צורך לאפס busy
  }

  return (
    <div className={`update-system${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className="btn btn-update-system"
        onClick={() => void handleClick()}
        disabled={busy}
        aria-live="polite"
      >
        {busy ? "מעדכנים…" : "עדכון מערכת · יש עדכונים? לחצו כאן"}
      </button>
      {status && <p className="install-status">{status}</p>}
    </div>
  );
}
