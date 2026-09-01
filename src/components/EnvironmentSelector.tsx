import { useMemo, useState } from "react";
import {
  ENVIRONMENT_LIST,
  type EnvironmentConfig,
  type EnvironmentId,
} from "../config/environments";

type Props = {
  value: EnvironmentId;
  onChange: (id: EnvironmentId) => void;
  /** מצב קומפקטי ל־HUD במשחק */
  compact?: boolean;
  className?: string;
};

/**
 * בורר סביבות — רשת כרטיסים או מגירה קומפקטית בזמן משחק.
 */
export function EnvironmentSelector({ value, onChange, compact = false, className }: Props) {
  const [open, setOpen] = useState(false);
  const current = useMemo(
    () => ENVIRONMENT_LIST.find((e) => e.id === value) ?? ENVIRONMENT_LIST[0]!,
    [value],
  );

  function select(env: EnvironmentConfig) {
    onChange(env.id);
    setOpen(false);
  }

  if (compact) {
    return (
      <div className={`env-selector-compact${className ? ` ${className}` : ""}`}>
        <button
          type="button"
          className="btn-chip env-switch-chip"
          aria-expanded={open}
          aria-haspopup="dialog"
          onClick={() => setOpen((v) => !v)}
        >
          {current.decor} {current.nameHebrew}
        </button>
        {open && (
          <div className="env-drawer" role="dialog" aria-label="בחירת סביבה">
            <p className="env-drawer-title">החלפת סביבה</p>
            <div className="env-drawer-grid">
              {ENVIRONMENT_LIST.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={`env-card env-card-sm${value === e.id ? " selected" : ""}`}
                  style={{ ["--truck" as string]: e.accent }}
                  onClick={() => select(e)}
                >
                  <span className="env-emoji">{e.decor}</span>
                  <h3>{e.nameHebrew}</h3>
                  <p>{e.name}</p>
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              סגור
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`env-grid${className ? ` ${className}` : ""}`} role="listbox" aria-label="סביבות">
      {ENVIRONMENT_LIST.map((e) => (
        <button
          key={e.id}
          type="button"
          role="option"
          aria-selected={value === e.id}
          className={`env-card${value === e.id ? " selected" : ""}`}
          style={{ ["--truck" as string]: e.accent }}
          onClick={() => select(e)}
        >
          <span
            className="env-card-thumb"
            style={{ backgroundImage: `url(${e.backgroundAsset})` }}
            aria-hidden
          />
          <span className="env-emoji">{e.decor}</span>
          <h3>{e.nameHebrew}</h3>
          <p>{e.tagline}</p>
        </button>
      ))}
    </div>
  );
}
