import { useEffect, useRef, useState } from "react";
import { PRODUCTS, getProduct, type ProductKind } from "./game/catalog";
import {
  ENVIRONMENTS,
  getEnvironment,
  type EnvironmentId,
  type GameEnvironment,
} from "./game/environments";
import { scoreMiss, scoreServe, scoreWrong, type GamePhase } from "./game/scoring";
import {
  getStageConfig,
  createGroup,
  ordersMatch,
  type ActiveGroup,
  type CustomerOrder,
} from "./game/waves";

type Toast = { id: number; text: string; kind: "good" | "bad" };

type NightStats = {
  served: number;
  missed: number;
  wrong: number;
  maxCombo: number;
  bestStage: number;
};

const MAX_LIVES = 4;
const KIND_LABELS: Record<ProductKind | "all", string> = {
  all: "הכל",
  drink: "משקאות",
  icecream: "גלידות",
  popsicle: "ארטיקים",
  hot: "אוכל חם",
};

function TruckHero() {
  return (
    <div className="truck-hero" aria-hidden>
      <div className="truck-body" />
      <div className="truck-sign">בר · גלידה · חם</div>
      <div className="truck-window" />
      <div className="truck-wheel left" />
      <div className="truck-wheel right" />
    </div>
  );
}

function TimerBar({ order, now }: { order: CustomerOrder; now: number }) {
  const left = Math.max(0, order.deadlineAt - now);
  const ratio = left / order.timeLimitMs;
  const low = ratio < 0.35;
  return (
    <div className="timer-bar" aria-label={`נותרו ${Math.ceil(left / 1000)} שניות`}>
      <div
        className={`timer-fill${low ? " low" : ""}`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [envId, setEnvId] = useState<EnvironmentId>("beach");
  const env: GameEnvironment = getEnvironment(envId);

  const [stageNumber, setStageNumber] = useState(1);
  const [groupsDoneInStage, setGroupsDoneInStage] = useState(0);
  const [activeGroup, setActiveGroup] = useState<ActiveGroup | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [tray, setTray] = useState<string[]>([]);
  const [kindFilter, setKindFilter] = useState<ProductKind | "all">("all");

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [combo, setCombo] = useState(0);
  const [stats, setStats] = useState<NightStats>({
    served: 0,
    missed: 0,
    wrong: 0,
    maxCombo: 0,
    bestStage: 1,
  });
  const [now, setNow] = useState(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const spawning = useRef(false);
  const missedIds = useRef<Set<string>>(new Set());
  const ending = useRef(false);

  const stage = getStageConfig(stageNumber);

  function pushToast(text: string, kind: "good" | "bad") {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, text, kind }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 900);
  }

  function startNight() {
    setPhase("playing");
    setStageNumber(1);
    setGroupsDoneInStage(0);
    setActiveGroup(null);
    setSelectedOrderId(null);
    setTray([]);
    setScore(0);
    setLives(MAX_LIVES);
    setCombo(0);
    setStats({ served: 0, missed: 0, wrong: 0, maxCombo: 0, bestStage: 1 });
    spawning.current = false;
    ending.current = false;
    missedIds.current = new Set();
  }

  function endNight() {
    if (ending.current) return;
    ending.current = true;
    setPhase("result");
    setActiveGroup(null);
  }

  function spawnNextGroup(currentStage: number, groupsDone: number) {
    let stageNum = currentStage;
    let done = groupsDone;
    let cfg = getStageConfig(stageNum);

    if (done >= cfg.groupCount) {
      stageNum += 1;
      done = 0;
      cfg = getStageConfig(stageNum);
      setStageNumber(stageNum);
      setGroupsDoneInStage(0);
      setStats((st) => ({ ...st, bestStage: Math.max(st.bestStage, stageNum) }));
      pushToast(`שלב ${stageNum} · ${cfg.label}`, "good");
    }

    const group = createGroup(cfg, Date.now());
    setActiveGroup(group);
    setSelectedOrderId(group.customers[0]?.id ?? null);
    setTray([]);
  }

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (activeGroup) return;
    if (spawning.current || ending.current) return;
    spawning.current = true;
    const delay = groupsDoneInStage === 0 && stageNumber === 1 ? 500 : 750;
    const t = window.setTimeout(() => {
      spawnNextGroup(stageNumber, groupsDoneInStage);
      spawning.current = false;
    }, delay);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, activeGroup, stageNumber, groupsDoneInStage]);

  useEffect(() => {
    if (phase !== "playing" || !activeGroup || ending.current) return;
    const expired = activeGroup.customers.filter(
      (c) => now >= c.deadlineAt && !missedIds.current.has(c.id),
    );
    if (expired.length === 0) return;

    for (const c of expired) missedIds.current.add(c.id);

    const remaining = activeGroup.customers.filter((c) => now < c.deadlineAt);
    const miss = scoreMiss();
    // Beginner-friendly: at most one life lost per expire tick
    const lifeLoss = 1;
    setScore((s) => Math.max(0, s + miss.points * expired.length));
    setCombo(0);
    setStats((st) => ({
      ...st,
      missed: st.missed + expired.length,
    }));
    setLives((l) => {
      const next = l - lifeLoss;
      if (next <= 0) {
        pushToast("נגמרו החיים — הלילה נגמר", "bad");
        window.setTimeout(() => endNight(), 500);
        return 0;
      }
      return next;
    });
    pushToast(expired.length > 1 ? `פספסת ${expired.length} הזמנות!` : miss.label, "bad");
    setTray([]);

    if (remaining.length === 0) {
      setActiveGroup(null);
      setGroupsDoneInStage((g) => g + 1);
      setSelectedOrderId(null);
    } else {
      setActiveGroup({ ...activeGroup, customers: remaining });
      setSelectedOrderId((id) =>
        remaining.some((c) => c.id === id) ? id : remaining[0]?.id ?? null,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, activeGroup, phase]);

  function addToTray(productId: string) {
    if (!selectedOrderId) return;
    setTray((t) => [...t, productId]);
  }

  function clearTray() {
    setTray([]);
  }

  function serveTray() {
    if (!activeGroup || !selectedOrderId || tray.length === 0) return;
    const order = activeGroup.customers.find((c) => c.id === selectedOrderId);
    if (!order) return;

    if (!ordersMatch(tray, order.items)) {
      const wrong = scoreWrong();
      setScore((s) => Math.max(0, s + wrong.points));
      setCombo(0);
      setStats((st) => ({ ...st, wrong: st.wrong + 1 }));
      pushToast(wrong.label, "bad");
      setTray([]);
      return;
    }

    const remainingRatio = Math.max(0, (order.deadlineAt - Date.now()) / order.timeLimitMs);
    const nextCombo = combo + 1;
    const stageBonus = Math.min(stageNumber, 20) * 5;
    const ev = scoreServe(remainingRatio, nextCombo);
    const points = ev.points + stageBonus;
    setScore((s) => s + points);
    setCombo(nextCombo);
    setStats((st) => ({
      ...st,
      served: st.served + 1,
      maxCombo: Math.max(st.maxCombo, nextCombo),
      bestStage: Math.max(st.bestStage, stageNumber),
    }));
    pushToast(`+${points} · ${ev.label}`, "good");
    setTray([]);

    const remaining = activeGroup.customers.filter((c) => c.id !== selectedOrderId);
    if (remaining.length === 0) {
      setActiveGroup(null);
      setGroupsDoneInStage((g) => g + 1);
      setSelectedOrderId(null);
    } else {
      setActiveGroup({ ...activeGroup, customers: remaining });
      setSelectedOrderId(remaining[0]?.id ?? null);
    }
  }

  const filteredProducts =
    kindFilter === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.kind === kindFilter);

  const skyStyle = {
    background: `linear-gradient(180deg, ${env.skyTop}, ${env.skyBottom} 55%, ${env.ground})`,
  };

  const groupsLeft = Math.max(0, stage.groupCount - groupsDoneInStage);

  return (
    <div className="app-shell">
      <div className="sky-layer" style={skyStyle} />
      <div className="content-layer">
        {toasts.map((t) => (
          <div key={t.id} className={`float-toast ${t.kind}`}>
            {t.text}
          </div>
        ))}

        {phase === "menu" && (
          <section className="menu-screen">
            <h1 className="brand">
              בר הפוד־טרק
              <span>לילה פתוח</span>
            </h1>
            <TruckHero />
            <p className="tagline">
              משקאות, גלידות, ארטיקים ואוכל חם. מצב אינסופי — שלבים שהולכים
              ונהיים קשים יותר עד שנגמרים החיים.
            </p>
            <div className="cta-row">
              <button type="button" className="btn btn-primary" onClick={() => setPhase("env")}>
                בחרו סביבה והתחילו
              </button>
            </div>
            <p className="how-to">
              בהתחלה יש זמן נוח והזמנות קצרות. אחר כך מגיעים זוגות וקבוצות,
              עם פחות זמן ויותר פריטים בכל הזמנה. בחרו לקוח, מלאו מגש, והגישו.
            </p>
          </section>
        )}

        {phase === "env" && (
          <section className="env-screen">
            <h2 className="env-title">איפה עומד הפוד־טרק הלילה?</h2>
            <p className="tagline">הסביבה משנה את האווירה — המשחק זהה בכל מקום.</p>
            <div className="env-grid">
              {ENVIRONMENTS.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className={`env-card${envId === e.id ? " selected" : ""}`}
                  onClick={() => setEnvId(e.id)}
                  style={{ ["--truck" as string]: e.accent }}
                >
                  <span className="env-emoji">{e.decor}</span>
                  <h3>{e.name}</h3>
                  <p>{e.tagline}</p>
                </button>
              ))}
            </div>
            <div className="cta-row">
              <button type="button" className="btn btn-ghost" onClick={() => setPhase("menu")}>
                חזרה
              </button>
              <button type="button" className="btn btn-primary" onClick={startNight}>
                פותחים את הלילה · {env.name}
              </button>
            </div>
          </section>
        )}

        {phase === "playing" && (
          <section className="game-screen">
            <header className="hud">
              <div className="hud-stat">
                <span className="label">ניקוד</span>
                <span className="value">{score}</span>
              </div>
              <div className="hud-stat">
                <span className="label">רצף</span>
                <span className="value">×{combo}</span>
              </div>
              <div className="hud-stat">
                <span className="label">חיים</span>
                <span className="value">{"❤️".repeat(Math.max(0, lives))}</span>
              </div>
              <div className="hud-stat">
                <span className="label">סביבה</span>
                <span className="value" style={{ fontSize: "0.95rem" }}>
                  {env.decor} {env.name}
                </span>
              </div>
            </header>

            <div className="wave-banner">
              שלב {stage.stage} ∞ · {stage.label} · קבוצות של {stage.groupSize} · עוד{" "}
              {groupsLeft} קבוצות בשלב
            </div>

            <div className="play-area">
              <div className="customers-panel">
                <h3 className="panel-title">תור הלקוחות</h3>
                {!activeGroup && <p className="empty-hint">מחכים לקבוצה הבאה…</p>}
                {activeGroup && (
                  <div className="customer-row">
                    {activeGroup.customers.map((c) => {
                      const ratio = Math.max(0, (c.deadlineAt - now) / c.timeLimitMs);
                      const urgent = ratio < 0.3;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`customer-card${selectedOrderId === c.id ? " active" : ""}${urgent ? " urgent" : ""}`}
                          onClick={() => {
                            setSelectedOrderId(c.id);
                            setTray([]);
                          }}
                        >
                          <div className="customer-face">{c.face}</div>
                          <div className="order-items">
                            {c.items.map((id, i) => {
                              const p = getProduct(id);
                              return (
                                <div key={`${id}-${i}`} className="order-item">
                                  <span>{p?.emoji}</span>
                                  <span>{p?.name ?? id}</span>
                                </div>
                              );
                            })}
                          </div>
                          <TimerBar order={c} now={now} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="counter-panel">
                <h3 className="panel-title">מדף הפוד־טרק</h3>
                <div className="kind-tabs">
                  {(Object.keys(KIND_LABELS) as Array<ProductKind | "all">).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`kind-tab${kindFilter === k ? " active" : ""}`}
                      onClick={() => setKindFilter(k)}
                    >
                      {KIND_LABELS[k]}
                    </button>
                  ))}
                </div>
                <div className="shelf">
                  {filteredProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="product-btn"
                      onClick={() => addToTray(p.id)}
                      disabled={!selectedOrderId}
                    >
                      <span className="emoji" style={{ background: p.accent }}>
                        {p.emoji}
                      </span>
                      <span className="name">{p.name}</span>
                    </button>
                  ))}
                </div>

                <div className="tray">
                  <div className="tray-label">המגש שלכם</div>
                  <div className="tray-items">
                    {tray.length === 0 && (
                      <span style={{ opacity: 0.55, fontSize: "0.8rem" }}>ריק — בחרו מוצרים</span>
                    )}
                    {tray.map((id, i) => {
                      const p = getProduct(id);
                      return (
                        <span key={`${id}-${i}`} className="tray-chip">
                          {p?.emoji} {p?.name}
                        </span>
                      );
                    })}
                  </div>
                  <div className="tray-actions">
                    <button type="button" className="btn btn-clear" onClick={clearTray}>
                      נקו מגש
                    </button>
                    <button
                      type="button"
                      className="btn btn-serve"
                      onClick={serveTray}
                      disabled={!selectedOrderId || tray.length === 0}
                    >
                      הגישו!
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {phase === "result" && (
          <section className="result-screen">
            <h2 className="env-title">סוף הלילה</h2>
            <div className="result-score">{score}</div>
            <p className="tagline">
              הגעתם לשלב {stats.bestStage}. בלילה הבא נסו לשבור את השיא.
            </p>
            <div className="result-stats">
              <span>
                שלב מקסימלי: <strong>{stats.bestStage}</strong>
              </span>
              <span>
                הוגשו: <strong>{stats.served}</strong>
              </span>
              <span>
                פספוסים: <strong>{stats.missed}</strong>
              </span>
              <span>
                טעויות: <strong>{stats.wrong}</strong>
              </span>
              <span>
                רצף מקסימלי: <strong>×{stats.maxCombo}</strong>
              </span>
              <span>
                סביבה: <strong>{env.name}</strong>
              </span>
            </div>
            <div className="cta-row">
              <button type="button" className="btn btn-ghost" onClick={() => setPhase("env")}>
                החליפו סביבה
              </button>
              <button type="button" className="btn btn-primary" onClick={startNight}>
                לילה חדש
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
