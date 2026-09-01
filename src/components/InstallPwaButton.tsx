import { useEffect, useState } from "react";
import {
  getInstallCapability,
  initPwaInstallListeners,
  onInstallStateChange,
  prepareOfflineCache,
  promptInstall,
  type InstallCapability,
} from "../game/pwaInstall";

type Props = {
  className?: string;
};

/**
 * כפתור התקנה לטלפון + הכנת מטמון אופליין.
 * Android/Chrome: beforeinstallprompt · iOS: הוראות «הוסף למסך הבית».
 */
export function InstallPwaButton({ className }: Props) {
  const [capability, setCapability] = useState<InstallCapability>(() => getInstallCapability());
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => initPwaInstallListeners(), []);
  useEffect(() => onInstallStateChange(() => setCapability(getInstallCapability())), []);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    setStatus("מורידים את המשחק למכשיר…");
    try {
      const result = await prepareOfflineCache();
      setStatus(`מוכן לאופליין (${result.ok}/${result.total})`);

      const cap = getInstallCapability();
      setCapability(cap);

      if (cap === "installed") {
        setStatus("האפליקציה מותקנת · אפשר לשחק בלי אינטרנט");
        return;
      }

      if (cap === "prompt") {
        const outcome = await promptInstall();
        if (outcome === "accepted") {
          setStatus("הותקן בהצלחה · Tipsy Dragon במסך הבית");
          setCapability("installed");
        } else if (outcome === "dismissed") {
          setStatus("ההתקנה בוטלה · המטמון האופליין נשמר");
        } else {
          setStatus("מטמון מוכן · הוסיפו למסך הבית מתפריט הדפדפן");
        }
        return;
      }

      if (cap === "ios") {
        setShowIosHelp(true);
        setStatus("מטמון מוכן · עקבו אחרי ההוראות לאייפון");
        return;
      }

      setStatus("מטמון מוכן · בתפריט הדפדפן: «התקן אפליקציה» / «הוסף למסך הבית»");
    } catch {
      setStatus("לא הצלחנו להכין אופליין · בדקו חיבור ונסו שוב");
    } finally {
      setBusy(false);
      setCapability(getInstallCapability());
    }
  }

  const label =
    capability === "installed"
      ? "✓ מותקן · מוכן לאופליין"
      : busy
        ? "מכין התקנה…"
        : "📲 התקינו לטלפון · משחק בלי אינטרנט";

  return (
    <div className={`install-pwa${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className="btn btn-install"
        onClick={() => void handleClick()}
        disabled={busy || capability === "installed"}
        aria-live="polite"
      >
        {label}
      </button>
      {status && <p className="install-status">{status}</p>}
      {showIosHelp && (
        <div className="ios-install-help" role="dialog" aria-label="התקנה באייפון">
          <p>
            <strong>באייפון / אייפד:</strong>
          </p>
          <ol>
            <li>לחצו על כפתור השיתוף ⎙ באמצע התחתית</li>
            <li>גללו ובחרו «הוסף למסך הבית»</li>
            <li>אשרו — ואז פתחו את Tipsy Dragon בלי אינטרנט</li>
          </ol>
          <button type="button" className="btn btn-ghost" onClick={() => setShowIosHelp(false)}>
            סגור
          </button>
        </div>
      )}
    </div>
  );
}
