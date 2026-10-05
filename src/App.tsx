import { useEffect, useRef, useState, useCallback, type CSSProperties } from "react";
import { CharacterAvatar } from "./components/CharacterAvatar";
import { EnvironmentSelector } from "./components/EnvironmentSelector";
import { InstallPwaButton } from "./components/InstallPwaButton";
import { UpdateSystemButton } from "./components/UpdateSystemButton";
import { PwaUpdateBanner } from "./components/PwaUpdateBanner";
import { ProductArt } from "./components/ProductArt";
import { isStandaloneDisplay } from "./game/pwaInstall";
import { loadAssets } from "./game/assetLoader";
import { loadCharacters } from "./game/characterCatalog";
import { prepareOfflineCache } from "./game/pwaInstall";
import { getProduct, type ProductKind } from "./game/catalog";
import {
  getEnvironment,
  counterTextureClass,
  isEnvironmentId,
  type EnvironmentId,
  type GameEnvironment,
} from "./game/environments";
import { shelfProductsForEnvironment } from "./systems/orderSystem";
import {
  MICRO_TIPS,
  STATION_LABELS,
  loadStation,
  loadSunlight,
  loadTipsDone,
  saveStation,
  saveSunlight,
  saveTipsDone,
  type StationFocus,
} from "./game/fieldUx";
import { scoreMiss, scoreServe, scoreWrong, type GamePhase } from "./game/scoring";
import {
  appendUnlocks,
  loadProgress,
  recordNightScore,
  type NightRecordResult,
  type UnlockJournalEntry,
} from "./game/progress";
import {
  sfxCombo,
  sfxCustomer,
  sfxHighScore,
  sfxMiss,
  sfxReady,
  sfxServe,
  sfxTap,
  sfxWrong,
} from "./game/sfx";
import { useFloatingScores } from "./hooks/useFloatingScores";
import { useGameJuice } from "./hooks/useGameJuice";
import { useTrayShelfPointerDrag } from "./hooks/useTrayShelfPointerDrag";
import {
  getStageConfig,
  createGroup,
  distributeTrayToGroup,
  KIND_HE_LABELS,
  type ActiveGroup,
  type CustomerOrder,
} from "./game/waves";
import {
  moodFromPatienceRatio,
  pickMoodLine,
  type CustomerMood,
} from "./game/moodLines";

const PREP_MS_MIN = 1000;
const PREP_MS_MAX = 2000;

type ShelfPrep = { readyAt: number; ready: boolean };

function prepDurationMs(productId: string): number {
  let h = 0;
  for (let i = 0; i < productId.length; i++) h = (h + productId.charCodeAt(i) * (i + 1)) % 1000;
  return PREP_MS_MIN + (h % (PREP_MS_MAX - PREP_MS_MIN + 1));
}

function initialEnvId(): EnvironmentId {
  if (typeof window === "undefined") return "circus";
  const q = new URLSearchParams(window.location.search).get("env");
  if (q && isEnvironmentId(q)) return q;
  return "circus";
}

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
  grill: "גריל",
  breakfast: "בוקר",
  side: "תוספות",
  drink: "בר",
  seafood: "ים",
  pasta: "פסטה",
  asian: "אסיה",
  mediterranean: "ים־תיכוני",
  comfort: "נוחות",
  dessert: "קינוח",
};

function TimerBar({ order, now }: { order: CustomerOrder; now: number }) {
  const left = Math.max(0, order.deadlineAt - now);
  const ratio = Math.max(0, Math.min(1, left / Math.max(1, order.timeLimitMs)));
  const low = ratio < 0.35;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - ratio);
  return (
    <div className="timer-stack" aria-label={`נותרו ${Math.ceil(left / 1000)} שניות`}>
      <div className="timer-bar">
        <div
          className={`timer-fill timer-fill-gpu${low ? " low" : ""}`}
          style={{ transform: `scaleX(${ratio})` }}
        />
      </div>
      <svg
        className={`patience-ring${low ? " low" : ""}`}
        viewBox="0 0 44 44"
        aria-hidden
        width="28"
        height="28"
      >
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={low ? "#ff8a65" : "#81c784"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
        />
      </svg>
    </div>
  );
}

export default function App() {
  const [phase, setPhase] = useState<GamePhase>("menu");
  const [envId, setEnvId] = useState<EnvironmentId>(() => initialEnvId());
  const env: GameEnvironment = getEnvironment(envId);
  const [envBgReady, setEnvBgReady] = useState(true);
  const [narrowViewport, setNarrowViewport] = useState(false);

  const [stageNumber, setStageNumber] = useState(1);
  const [groupsDoneInStage, setGroupsDoneInStage] = useState(0);
  const [activeGroup, setActiveGroup] = useState<ActiveGroup | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [tray, setTray] = useState<string[]>([]);
  const [kindFilter, setKindFilter] = useState<ProductKind | "all">("all");
  const [station, setStation] = useState<StationFocus>(() => loadStation());
  const [sunlight, setSunlight] = useState(() => loadSunlight());
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [tipIndex, setTipIndex] = useState(() => loadTipsDone());
  const [celebrate, setCelebrate] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);

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
  const [paused, setPaused] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastSeq = useRef(0);
  const spawning = useRef(false);
  const missedIds = useRef<Set<string>>(new Set());
  const ending = useRef(false);
  const pauseStartedAt = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const statsRef = useRef<NightStats>({
    served: 0,
    missed: 0,
    wrong: 0,
    maxCombo: 0,
    bestStage: 1,
  });
  scoreRef.current = score;
  statsRef.current = stats;
  const [traySnapKey, setTraySnapKey] = useState(0);
  const [trayCatchKey, setTrayCatchKey] = useState(0);
  const [scoreBumpKey, setScoreBumpKey] = useState(0);
  const [livesThrob, setLivesThrob] = useState(false);
  const [highScore, setHighScore] = useState(() => loadProgress().highScore);
  const [savedBestStage, setSavedBestStage] = useState(() => loadProgress().bestStage);
  const [unlockJournal, setUnlockJournal] = useState<UnlockJournalEntry[]>(
    () => loadProgress().journal,
  );
  const [nightRecord, setNightRecord] = useState<NightRecordResult | null>(null);
  const [prepById, setPrepById] = useState<Record<string, ShelfPrep>>({});
  const installedPwa = typeof window !== "undefined" && isStandaloneDisplay();
  const { floatingScores, spawnFloatingScore } = useFloatingScores();
  const { particles, pulse, triggerServe, triggerWrong, triggerMiss } = useGameJuice();

  const stage = getStageConfig(stageNumber);
  const tipText = tipIndex < MICRO_TIPS.length ? MICRO_TIPS[tipIndex] : null;

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const apply = () => setNarrowViewport(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const envVisualBg = narrowViewport ? env.mobileBackgroundAsset : env.backgroundAsset;

  useEffect(() => {
    let cancelled = false;
    void loadAssets().then(() => {
      if (!cancelled) setAssetsReady(true);
    });
    void loadCharacters();
    // חימום מטמון ברקע אחרי טעינה ראשונה (לא חוסם UI)
    const t = window.setTimeout(() => {
      void prepareOfflineCache();
    }, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, []);

  function pushToast(text: string, kind: "good" | "bad") {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, text, kind }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 900);
  }

  function advanceTip() {
    setTipIndex((i) => {
      const next = Math.min(MICRO_TIPS.length, i + 1);
      saveTipsDone(next);
      return next;
    });
  }

  function toggleSunlight() {
    setSunlight((v) => {
      const next = !v;
      saveSunlight(next);
      return next;
    });
  }

  function pickStation(next: StationFocus) {
    setStation(next);
    saveStation(next);
    setKindFilter(next);
  }

  function startNight() {
    setPhase("playing");
    setStageNumber(1);
    setGroupsDoneInStage(0);
    setActiveGroup(null);
    setSelectedOrderId(null);
    setTray([]);
    setKindFilter(station);
    setScore(0);
    setLives(MAX_LIVES);
    setCombo(0);
    setStats({ served: 0, missed: 0, wrong: 0, maxCombo: 0, bestStage: 1 });
    setPaused(false);
    pauseStartedAt.current = null;
    spawning.current = false;
    ending.current = false;
    missedIds.current = new Set();
    setPrepById({});
    setNightRecord(null);
    const snap = loadProgress();
    setHighScore(snap.highScore);
    setSavedBestStage(snap.bestStage);
    setUnlockJournal(snap.journal);
    // seed journal with stage-1 unlocks
    const cfg = getStageConfig(1);
    setUnlockJournal(
      appendUnlocks({
        stage: 1,
        kind: cfg.newlyUnlockedKind,
        itemIds: cfg.newlyUnlockedItemIds,
      }),
    );
  }

  function togglePause() {
    if (phase !== "playing" || ending.current) return;
    sfxTap();
    if (!paused) {
      pauseStartedAt.current = Date.now();
      setPaused(true);
      return;
    }
    const started = pauseStartedAt.current;
    const delta = started != null ? Math.max(0, Date.now() - started) : 0;
    pauseStartedAt.current = null;
    if (delta > 0 && activeGroup) {
      setActiveGroup({
        ...activeGroup,
        customers: activeGroup.customers.map((c) => ({
          ...c,
          deadlineAt: c.deadlineAt + delta,
        })),
      });
    }
    setPaused(false);
    setNow(Date.now());
  }

  function endNight() {
    if (ending.current) return;
    ending.current = true;
    setPaused(false);
    pauseStartedAt.current = null;
    setPrepById({});
    const rec = recordNightScore(scoreRef.current, statsRef.current.bestStage);
    setNightRecord(rec);
    setHighScore(rec.highScore);
    setSavedBestStage(rec.bestStage);
    setUnlockJournal(loadProgress().journal);
    setPhase("result");
    setActiveGroup(null);
    if (rec.beatHighScore) {
      window.setTimeout(() => sfxHighScore(), 120);
    }
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
      const journal = appendUnlocks({
        stage: stageNum,
        kind: cfg.newlyUnlockedKind,
        itemIds: cfg.newlyUnlockedItemIds,
      });
      setUnlockJournal(journal);
      const unlockBits: string[] = [];
      if (cfg.newlyUnlockedKind) {
        unlockBits.push(`סוג ${KIND_HE_LABELS[cfg.newlyUnlockedKind]}`);
      }
      if (cfg.newlyUnlockedItemIds.length > 0) {
        unlockBits.push(`${cfg.newlyUnlockedItemIds.length} מנות`);
      }
      const unlockNote = unlockBits.length ? ` · נפתח: ${unlockBits.join(" + ")}` : "";
      pushToast(`שלב ${stageNum} · ${cfg.label} · ${env.nameHebrew}${unlockNote}`, "good");
      setKindFilter("all");
      setPrepById({});
    }

    const group = createGroup(cfg, Date.now(), env);
    setActiveGroup(group);
    setSelectedOrderId(group.customers[0]?.id ?? null);
    setTray([]);
    sfxCustomer();
  }

  /** החלפת סביבה בזמן אמת — רקע + דלפק + הזמנות חדשות */
  function switchEnvironment(nextId: EnvironmentId) {
    if (nextId === envId) return;
    sfxTap();
    setEnvBgReady(false);
    setEnvId(nextId);
    const nextEnv = getEnvironment(nextId);
    setTray([]);
    setKindFilter("all");
    setPrepById({});
    missedIds.current = new Set();
    if (phase === "playing" && !ending.current) {
      const cfg = getStageConfig(stageNumber);
      const group = createGroup(cfg, Date.now(), nextEnv);
      setActiveGroup(group);
      setSelectedOrderId(group.customers[0]?.id ?? null);
      pushToast(`עברתם ל${nextEnv.nameHebrew}`, "good");
    }
    window.setTimeout(() => setEnvBgReady(true), 40);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("env", nextId);
      window.history.replaceState({}, "", url.pathname + url.search);
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    if (phase !== "playing" || paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [phase, paused]);

  // מיני־הכנה על המדף — סימון מוכן אחרי 1–2ש׳
  useEffect(() => {
    if (phase !== "playing" || paused) return;
    const pending = Object.entries(prepById).filter(([, p]) => !p.ready);
    if (pending.length === 0) return;
    const due = pending.filter(([, p]) => now >= p.readyAt);
    if (due.length === 0) return;
    setPrepById((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const [pid, p] of Object.entries(next)) {
        if (!p.ready && now >= p.readyAt) {
          next[pid] = { ...p, ready: true };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    sfxReady();
  }, [now, prepById, phase, paused]);

  useEffect(() => {
    if (phase !== "playing" || paused) return;
    if (activeGroup) return;
    if (spawning.current || ending.current) return;
    spawning.current = true;
    const delay =
      groupsDoneInStage === 0 && stageNumber === 1
        ? Math.min(800, env.customerSpawnRateMs)
        : env.customerSpawnRateMs;
    const t = window.setTimeout(() => {
      spawnNextGroup(stageNumber, groupsDoneInStage);
      spawning.current = false;
    }, delay);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused, activeGroup, stageNumber, groupsDoneInStage, envId]);

  useEffect(() => {
    if (phase !== "playing" || paused || !activeGroup || ending.current) return;
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
    sfxMiss();
    triggerMiss();
    setLivesThrob(true);
    window.setTimeout(() => setLivesThrob(false), 480);
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
  }, [now, activeGroup, phase, paused]);

  function addToTray(productId: string) {
    if (!activeGroup || paused) return;
    sfxTap();
    setTray((t) => [...t, productId]);
    setTraySnapKey((k) => k + 1);
    setTrayCatchKey((k) => k + 1);
    if (tipIndex === 1) advanceTip();
  }

  function startShelfPrep(productId: string) {
    setPrepById((prev) => {
      if (prev[productId]) return prev;
      return {
        ...prev,
        [productId]: { readyAt: Date.now() + prepDurationMs(productId), ready: false },
      };
    });
    sfxTap();
  }

  function clearShelfPrep(productId: string) {
    setPrepById((prev) => {
      if (!prev[productId]) return prev;
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }

  function takeFromShelf(productId: string) {
    if (!activeGroup || paused) return;
    const prep = prepById[productId];
    if (!prep) {
      startShelfPrep(productId);
      return;
    }
    if (!prep.ready) {
      // אל תציג טוסט על הלחיצה שזה עתה התחילה הכנה
      const total = prepDurationMs(productId);
      const elapsed = total - Math.max(0, prep.readyAt - Date.now());
      if (elapsed > 450) pushToast("עוד רגע… המנה מתבשלת על המדף", "bad");
      return;
    }
    clearShelfPrep(productId);
    addToTray(productId);
  }

  /** לחיצה על מנה במגש → זריקה לפח (הסרה מהמגש) */
  function discardFromTray(index: number) {
    if (paused) return;
    sfxTap();
    setTray((t) => t.filter((_, i) => i !== index));
  }

  const onShelfToTray = useCallback(
    (productId: string) => {
      takeFromShelf(productId);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeGroup, paused, tipIndex, prepById],
  );

  const onTrayToShelf = useCallback(
    (index: number) => {
      discardFromTray(index);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [paused],
  );

  const { drag, beginDrag, shouldSuppressClick } = useTrayShelfPointerDrag({
    onShelfToTray,
    onTrayToShelf,
    disabled: paused || !activeGroup || phase !== "playing",
  });

  function clearTray() {
    if (paused) return;
    sfxTap();
    setTray([]);
  }

  function serveTray() {
    if (!activeGroup || tray.length === 0 || paused) return;

    if (tipIndex === 2) advanceTip();

    const result = distributeTrayToGroup(tray, activeGroup.customers, selectedOrderId);

    if (result.matchedCount === 0) {
      const wrong = scoreWrong();
      sfxWrong();
      setScore((s) => Math.max(0, s + wrong.points));
      setCombo(0);
      setStats((st) => ({ ...st, wrong: st.wrong + 1 }));
      pushToast(wrong.label, "bad");
      triggerWrong();
      setTray([]);
      return;
    }

    const fulfilled = result.fulfilledCustomers;
    const nowTs = Date.now();
    let nextCombo = combo;
    let totalPoints = 0;
    let bestRatio = 0;

    for (const order of fulfilled) {
      nextCombo += 1;
      const remainingRatio = Math.max(0, (order.deadlineAt - nowTs) / order.timeLimitMs);
      bestRatio = Math.max(bestRatio, remainingRatio);
      const stageBonus = Math.min(stageNumber, 20) * 5;
      const ev = scoreServe(remainingRatio, nextCombo);
      totalPoints += ev.points + stageBonus;
    }

    // הגשה חלקית — בונוס קטן לפי פריטים שהותאמו בלי סגירת הזמנה
    const partialOnly = fulfilled.length === 0;
    if (partialOnly) {
      nextCombo += 1;
      const partialPts = 25 + Math.min(stageNumber, 15) * 2 + result.matchedCount * 10;
      totalPoints += partialPts;
    }

    const perfect = fulfilled.length > 0 && bestRatio >= 0.7;
    sfxServe();
    if (nextCombo >= 3) sfxCombo(nextCombo);
    setCelebrate(true);
    window.setTimeout(() => setCelebrate(false), 520);
    triggerServe({ perfect, combo: nextCombo });
    setScore((s) => s + totalPoints);
    setScoreBumpKey((k) => k + 1);
    setCombo(nextCombo);
    if (totalPoints > 0) {
      spawnFloatingScore(`+${totalPoints}`, "good");
    }
    setStats((st) => ({
      ...st,
      served: st.served + Math.max(1, fulfilled.length),
      maxCombo: Math.max(st.maxCombo, nextCombo),
      bestStage: Math.max(st.bestStage, stageNumber),
    }));

    if (fulfilled.length > 0 && result.remainingCustomers.length > 0) {
      const bonus =
        result.partialTimeBonusCount > 0 ? " · +3ש׳ להגשה חלקית" : "";
      pushToast(
        `+${totalPoints} · הוגשו ${fulfilled.length} · נשארו ${result.remainingCustomers.length}${bonus}`,
        "good",
      );
    } else if (fulfilled.length > 0) {
      pushToast(`+${totalPoints} · הגשה לקבוצה!`, "good");
    } else {
      const bonus =
        result.partialTimeBonusCount > 0 ? " · +3 שניות לטיימר" : "";
      pushToast(`+${totalPoints} · חלקי · עוד מנות בתור${bonus}`, "good");
    }

    if (result.unusedItems.length > 0) {
      pushToast(`${result.unusedItems.length} פריטים לא התאימו להזמנות`, "bad");
    }

    setTray([]);

    const remaining = result.remainingCustomers;
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
  }

  const shelf = shelfProductsForEnvironment(env);
  const shelfKinds = [...new Set(shelf.map((p) => p.kind))];
  const filteredProducts =
    kindFilter === "all" ? shelf : shelf.filter((p) => p.kind === kindFilter);

  const groupsLeft = Math.max(0, stage.groupCount - groupsDoneInStage);
  const useHero = phase === "menu" || phase === "result";
  const showEnvBg = phase === "playing" || phase === "env";
  const counterClass = `serving-counter tray-area counter-top ${counterTextureClass(env.counterStyle.texture)}`;

  const juiceShell =
    pulse === "wrong" || pulse === "miss"
      ? ` juice-shake juice-${pulse}`
      : pulse === "perfect" || pulse === "combo" || pulse === "serve"
        ? " juice-shake"
        : "";

  return (
    <div
      className={`app-shell cyber-cursor${sunlight ? " sunlight" : ""}${celebrate ? " celebrate" : ""}${assetsReady ? " assets-ready" : ""}${useHero ? " has-hero" : ""}${phase === "playing" ? " has-kitchen" : ""}${juiceShell}`}
      data-env={env.id}
    >
      {useHero && (
        <>
          <div
            className="hero-photo"
            aria-hidden
            style={{
              backgroundImage:
                'linear-gradient(180deg, rgba(8, 12, 24, 0.55), rgba(8, 12, 24, 0.88)), url("/assets/foodtruck_hero.webp")',
            }}
          />
          <div className="fairy-overlay" aria-hidden />
        </>
      )}
      {showEnvBg && (
        <>
          <div
            className={`environment-background${envBgReady ? " is-ready" : ""}`}
            aria-hidden
            style={{
              backgroundImage: `linear-gradient(180deg, rgba(8, 12, 24, 0.35), rgba(8, 12, 24, 0.72)), url("${envVisualBg}")`,
            }}
          />
          <img
            className="environment-background-probe"
            src={env.backgroundAsset}
            alt=""
            data-testid="environment-bg-img"
            data-mobile-src={env.mobileBackgroundAsset}
            hidden
          />
          <div className="fairy-overlay soft" aria-hidden />
        </>
      )}
      <div className="content-layer">
        <PwaUpdateBanner />
        {toasts.map((t) => (
          <div key={t.id} className={`float-toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
        {floatingScores.map((s) => (
          <div key={s.id} className={`floating-score ${s.kind}`} data-testid="floating-score">
            {s.text}
          </div>
        ))}
        {drag?.moved && (
          <div
            className="drag-ghost"
            data-testid="drag-ghost"
            style={{ left: drag.x, top: drag.y }}
            aria-hidden
          >
            {drag.label}
          </div>
        )}
        {pulse && <div className={`juice-veil ${pulse}`} aria-hidden data-testid="juice-veil" />}
        {particles.length > 0 && (
          <div className="juice-layer" aria-hidden data-testid="juice-layer">
            {particles.map((p) => (
              <span
                key={p.id}
                className={`juice-particle ${p.kind}`}
                style={
                  {
                    left: `${p.x}%`,
                    top: `${p.y}%`,
                    ["--jx" as string]: `${p.dx}vmin`,
                    ["--jy" as string]: `${p.dy}vmin`,
                    animationDelay: `${p.delay}s`,
                    transform: `scale(${p.scale})`,
                  } as CSSProperties
                }
              >
                {p.kind === "coin" ? "🪙" : p.kind === "heart" ? "💛" : p.kind === "steam" ? "" : ""}
              </span>
            ))}
          </div>
        )}
        {celebrate && <div className="serve-burst" aria-hidden />}

        <div className="field-toolbar" aria-label="הגדרות שטח">
          <span className={`net-chip${online ? " on" : " off"}`} title="סטטוס רשת">
            {online ? "מקוון" : "אופליין · המשחק זמין"}
          </span>
          <button
            type="button"
            className={`btn-chip${sunlight ? " active" : ""}`}
            onClick={toggleSunlight}
            aria-pressed={sunlight}
          >
            מצב שמש
          </button>
        </div>

        {phase === "menu" && (
          <section className="menu-screen hero-menu">
            <p className="neon-eyebrow">FOOD TRUCK · BAR · BRAȘOV</p>
            <h1 className="brand neon-brand">
              The Tipsy Dragon
              <span className="neon-sub">פוד־טרק · לילה פתוח</span>
            </h1>
            <p className="tagline">
              בחרו סביבה — קרקס, מזנון, קניון, יער, פסטיבל או מגרש — והגישו את התפריט שלה.
            </p>
            <div className="highscore-banner" data-testid="highscore-banner">
              {highScore > 0 ? (
                <>
                  <span className="highscore-label">שיא מקומי</span>
                  <strong className="highscore-value">{highScore}</strong>
                  <span className="highscore-stage">· שלב {savedBestStage}</span>
                  <span className="highscore-cta">שברו את השיא הלילה!</span>
                </>
              ) : (
                <span className="highscore-cta">לילה ראשון — קבעו שיא!</span>
              )}
            </div>
            <div className="cta-row thumb-cta">
              <button type="button" className="btn btn-primary btn-hero neon-play" onClick={startNight}>
                PLAY NOW · שחקו עכשיו
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPhase("env")}>
                סביבה ותחנה
              </button>
            </div>
            <InstallPwaButton />
            <UpdateSystemButton />
            <p className="how-to">
              {installedPwa ? (
                <>
                  האפליקציה מותקנת במסך הבית. כשיש גרסה חדשה תופיע הודעה «יש עדכונים» —
                  לחצו «עדכנו עכשיו» (או «עדכון מערכת» למטה). באופליין המשחק ממשיך מהמטמון.
                </>
              ) : (
                <>
                  התקינו למסך הבית פעם אחת — אחר כך המשחק נפתח כמו אפליקציה וגם בלי אינטרנט.
                  אחרי עדכון בשרת: לחצו «עדכון מערכת» כדי לטעון את כל הפיצ׳רים החדשים.
                </>
              )}
            </p>
            {unlockJournal.length > 0 && (
              <details className="unlock-journal" data-testid="unlock-journal-menu">
                <summary>יומן פתיחות ({unlockJournal.length})</summary>
                <ul>
                  {unlockJournal.slice(-12).reverse().map((e, i) => (
                    <li key={`${e.label}-${e.at}-${i}`}>
                      שלב {e.stage}: {e.label}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}

        {phase === "env" && (
          <section className="env-screen">
            <h2 className="env-title">איפה עומד הפוד־טרק הלילה?</h2>
            <p className="tagline">כל סביבה משנה רקע, דלפק ותפריט הזמנות.</p>
            <EnvironmentSelector value={envId} onChange={switchEnvironment} />
            <h3 className="station-title">תחנת עבודה שלכם</h3>
            <p className="tagline station-hint">
              תפקיד קל כמו בצוות — מסנן את המדף להתחלה (אפשר להחליף במשחק).
            </p>
            <div className="station-row">
              {(Object.keys(STATION_LABELS) as StationFocus[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`station-chip${station === id ? " active" : ""}`}
                  onClick={() => pickStation(id)}
                >
                  {STATION_LABELS[id]}
                </button>
              ))}
            </div>
            <div className="cta-row">
              <button type="button" className="btn btn-ghost" onClick={() => setPhase("menu")}>
                חזרה
              </button>
              <button type="button" className="btn btn-primary" onClick={startNight}>
                פותחים את הלילה · {env.nameHebrew}
              </button>
            </div>
          </section>
        )}

        {phase === "playing" && (
          <section className="game-screen thumb-layout">
            <header className="hud">
              <div className="hud-stat">
                <span className="label">ניקוד</span>
                <span key={scoreBumpKey} className={`value${scoreBumpKey > 0 ? " score-bump" : ""}`}>
                  {score}
                </span>
              </div>
              <div
                className={`hud-stat${combo >= 6 ? " combo-blaze" : combo >= 3 ? " combo-hot" : ""}`}
              >
                <span className="label">רצף</span>
                <span className="value">×{combo}</span>
              </div>
              <div className={`hud-stat${livesThrob ? " lives-throb" : ""}`}>
                <span className="label">חיים</span>
                <span className="value">{"❤️".repeat(Math.max(0, lives))}</span>
              </div>
              <div className="hud-stat">
                <span className="label">סביבה</span>
                <span className="value env-hud-value" style={{ fontSize: "0.95rem" }}>
                  <img
                    className="env-icon env-icon--hud"
                    src={env.iconAsset}
                    alt=""
                    width={22}
                    height={22}
                    draggable={false}
                    aria-hidden
                  />
                  {env.nameHebrew}
                </span>
              </div>
              <EnvironmentSelector compact value={envId} onChange={switchEnvironment} />
              <button
                type="button"
                className={`btn-chip hud-pause${paused ? " active" : ""}`}
                onClick={togglePause}
                aria-pressed={paused}
                aria-label={paused ? "המשך משחק" : "השהיית משחק"}
              >
                {paused ? "המשך" : "השהיה"}
              </button>
            </header>

            {paused && (
              <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="המשחק מושהה">
                <p className="pause-title">השהיה</p>
                <p className="pause-sub">הטיימרים קפאו · לחצו להמשך</p>
                <button type="button" className="btn btn-primary" onClick={togglePause}>
                  המשך משחק
                </button>
              </div>
            )}

            {tipText && (
              <div className="micro-tip" role="status">
                <span className="micro-tip-text">טיפ: {tipText}</span>
                <button type="button" className="btn-chip" onClick={advanceTip}>
                  הבנתי
                </button>
              </div>
            )}

            <div className="stage-hud" key={stage.stage} aria-live="polite">
              <div className="stage-hud-main">
                <span className="stage-hud-kicker">שלב</span>
                <span className="stage-hud-num">{stage.stage}</span>
              </div>
              <div className="stage-hud-side">
                <span className="stage-hud-flavor">{stage.label}</span>
                <span className="stage-unlock-chip">{env.nameHebrew}</span>
                <div
                  className="stage-progress"
                  role="progressbar"
                  aria-valuenow={groupsDoneInStage}
                  aria-valuemin={0}
                  aria-valuemax={stage.groupCount}
                  aria-label={`התקדמות בשלב: ${groupsDoneInStage} מתוך ${stage.groupCount} קבוצות`}
                >
                  <div
                    className="stage-progress-fill"
                    style={{
                      width: `${Math.min(100, (groupsDoneInStage / stage.groupCount) * 100)}%`,
                    }}
                  />
                </div>
                <span className="stage-progress-meta">
                  {groupsDoneInStage}/{stage.groupCount} קבוצות
                  {groupsLeft > 0 ? ` · עוד ${groupsLeft}` : ""}
                </span>
              </div>
            </div>

            <div className="play-area play-scroll">
              <div className="customers-panel customers-panel--compact">
                <h3 className="panel-title" data-testid="customer-queue">
                  תור הלקוחות
                </h3>
                {!activeGroup && <p className="empty-hint">מחכים לקבוצה הבאה…</p>}
                {activeGroup && (
                  <div className="customer-row">
                    {activeGroup.customers.map((c) => {
                      const ratio = Math.max(0, (c.deadlineAt - now) / c.timeLimitMs);
                      const urgent = ratio < 0.3;
                      const mood: CustomerMood = moodFromPatienceRatio(ratio);
                      const line = pickMoodLine(c.id, mood);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`customer-card customer-card--compact customer-enter mood-${mood}${selectedOrderId === c.id ? " active" : ""}${urgent ? " urgent" : ""}`}
                          onClick={() => {
                            sfxTap();
                            setSelectedOrderId(c.id);
                            setTray([]);
                            if (tipIndex === 0) advanceTip();
                            if (tipIndex === 3 && urgent) advanceTip();
                          }}
                        >
                          <div className="customer-face patience-ring-wrap">
                            <CharacterAvatar loadout={c.character} alt="לקוח" />
                            <span
                              key={`${c.id}-${mood}`}
                              className={`speech-bubble speech-${mood}`}
                              data-testid="customer-speech"
                              aria-live="polite"
                            >
                              {line}
                            </span>
                          </div>
                          <div className="order-items">
                            {c.items.map((id, i) => {
                              const p = getProduct(id);
                              return (
                                <div
                                  key={`${id}-${i}`}
                                  className="order-item customer-order-item"
                                  data-item-id={id}
                                >
                                  <ProductArt
                                    spriteId={p?.sprite}
                                    emoji={p?.emoji ?? "🍱"}
                                    accent={p?.accent ?? "#eee"}
                                    alt={p?.name ?? id}
                                    className="order-thumb"
                                  />
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

              <div className="tray-mid" aria-label="המגש">
                <div
                  className={`tray tray-dock drop-zone ${counterClass}${
                    drag?.kind === "shelf" && drag.over === "tray" ? " is-drag-over" : ""
                  }${
                    trayCatchKey === 0
                      ? ""
                      : trayCatchKey % 2 === 0
                        ? " tray-catch-a"
                        : " tray-catch-b"
                  }`}
                  style={{ filter: `drop-shadow(${env.counterStyle.dropShadow})` }}
                  data-drop="tray"
                  data-testid="tray-drop-zone"
                >
                  <div className="tray-label">המגש שלכם</div>
                  <div className="tray-discard-hint" aria-hidden={tray.length === 0}>
                    {tray.length > 0
                      ? "לחיצה = זריקה לפח · גרירה למדף = החזרה"
                      : "גררו מנות לכאן או לחצו על המדף"}
                  </div>
                  <div className="tray-items" key={traySnapKey}>
                    {tray.length === 0 && (
                      <span className="tray-empty-hint">ריק — בחרו מוצרים</span>
                    )}
                    {tray.map((id, i) => {
                      const p = getProduct(id);
                      const isNewest = i === tray.length - 1;
                      const isSource =
                        drag?.kind === "tray" && drag.index === i && drag.moved;
                      return (
                        <button
                          key={`${id}-${i}-${traySnapKey}`}
                          type="button"
                          className={`tray-chip tray-chip-discard draggable-item${isNewest ? " item-snap" : ""}${isSource ? " is-dragging" : ""}`}
                          style={{ touchAction: "none" }}
                          title={`זרוק ${p?.name ?? id} לפח · או גררו למדף`}
                          aria-label={`זרוק ${p?.name ?? id} לפח · או גררו למדף`}
                          onPointerDown={(e) => {
                            if (e.button !== 0 || paused) return;
                            beginDrag(
                              {
                                kind: "tray",
                                index: i,
                                productId: id,
                                label: p?.emoji ?? "🍱",
                              },
                              e.clientX,
                              e.clientY,
                              e.pointerId,
                              e.currentTarget,
                            );
                          }}
                          onClick={() => {
                            if (shouldSuppressClick()) return;
                            discardFromTray(i);
                          }}
                        >
                          <ProductArt
                            spriteId={p?.sprite}
                            emoji={p?.emoji ?? "🍱"}
                            accent={p?.accent ?? "#eee"}
                            alt={p?.name ?? id}
                            className="tray-thumb"
                          />{" "}
                          {p?.name}
                        </button>
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
                      disabled={tray.length === 0}
                    >
                      הגישו!
                    </button>
                  </div>
                </div>
              </div>

              <div className="counter-panel">
                <h3 className="panel-title" data-testid="prep-station">
                  מטבח · Tipsy Dragon
                </h3>
                <div className="kind-tabs">
                  {(
                    ["all", ...shelfKinds] as Array<ProductKind | "all">
                  ).map((k) => (
                    <button
                      key={k}
                      type="button"
                      className={`kind-tab${kindFilter === k ? " active" : ""}`}
                      onClick={() => {
                        sfxTap();
                        setKindFilter(k);
                      }}
                    >
                      {KIND_LABELS[k]}
                    </button>
                  ))}
                </div>
                <div
                  className={`shelf serving-counter cooking-station drop-zone ${counterTextureClass(env.counterStyle.texture)}${activeGroup && !paused ? " is-active" : ""}${
                    drag?.kind === "tray" && drag.over === "shelf" ? " is-drag-over" : ""
                  }`}
                  data-drop="shelf"
                  data-testid="ingredient-slot"
                  style={{ filter: `drop-shadow(${env.counterStyle.dropShadow})` }}
                >
                  {activeGroup && !paused && (
                    <div className="cooking-particles" aria-hidden>
                      <span className="smoke" />
                      <span className="smoke" />
                      <span className="smoke" />
                      <span className="smoke" />
                    </div>
                  )}
                  {filteredProducts.map((p) => {
                    const canInteract = Boolean(activeGroup) && !paused;
                    const prep = prepById[p.id];
                    const isReady = Boolean(prep?.ready);
                    const isPrepping = Boolean(prep && !prep.ready);
                    const prepRatio =
                      prep && !prep.ready
                        ? Math.min(
                            1,
                            Math.max(
                              0,
                              1 -
                                (prep.readyAt - now) /
                                  Math.max(1, prepDurationMs(p.id)),
                            ),
                          )
                        : isReady
                          ? 1
                          : 0;
                    const canDrag = canInteract && isReady;
                    const isSource =
                      drag?.kind === "shelf" && drag.productId === p.id && drag.moved;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`product-btn draggable-item${isSource ? " is-dragging" : ""}${isPrepping ? " is-prepping" : ""}${isReady ? " is-ready" : ""}`}
                        data-testid={`product-${p.id}`}
                        data-prep={isReady ? "ready" : isPrepping ? "cooking" : "idle"}
                        style={canDrag ? { touchAction: "none" } : undefined}
                        onPointerDown={(e) => {
                          if (!canInteract || e.button !== 0) return;
                          // גרירה רק אחרי שהמנה מוכנה; הכנה מתחילה בלחיצה
                          if (!isReady) return;
                          beginDrag(
                            {
                              kind: "shelf",
                              productId: p.id,
                              label: p.emoji,
                            },
                            e.clientX,
                            e.clientY,
                            e.pointerId,
                            e.currentTarget,
                          );
                        }}
                        onClick={() => {
                          if (shouldSuppressClick()) return;
                          takeFromShelf(p.id);
                        }}
                        disabled={!activeGroup || paused}
                      >
                        {(isPrepping || isReady) && (
                          <span
                            className="prep-ring"
                            aria-hidden
                            style={
                              {
                                ["--prep" as string]: String(prepRatio),
                              } as CSSProperties
                            }
                          />
                        )}
                        <ProductArt
                          spriteId={p.sprite}
                          emoji={p.emoji}
                          accent={p.accent}
                          alt={p.name}
                          className="shelf-thumb"
                        />
                        <span className="name">{p.name}</span>
                        {isPrepping && (
                          <span className="prep-label">מכינים…</span>
                        )}
                        {isReady && <span className="prep-label ready">מוכן!</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        )}

        {phase === "result" && (
          <section className="result-screen">
            <h2 className="env-title neon-brand">סוף הלילה · Tipsy Dragon</h2>
            <div className="result-score">{score}</div>
            {nightRecord?.beatHighScore ? (
              <p className="highscore-new" data-testid="highscore-new">
                שיא חדש! שברתם את {nightRecord.previousHighScore || "השיא הקודם"}
              </p>
            ) : (
              <p className="tagline" data-testid="highscore-challenge">
                שיא מקומי: {highScore}. שברו את השיא בלילה הבא!
              </p>
            )}
            <p className="tagline">
              הגעתם לשלב {stats.bestStage}
              {nightRecord?.beatBestStage ? " · שיא שלב חדש!" : ""}.
            </p>
            <div className="result-stats">
              <span>
                שלב מקסימלי: <strong>{stats.bestStage}</strong>
              </span>
              <span>
                שיא מקומי: <strong>{highScore}</strong>
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
                סביבה: <strong>{env.nameHebrew}</strong>
              </span>
            </div>
            {unlockJournal.length > 0 && (
              <div className="unlock-journal result-journal" data-testid="unlock-journal">
                <h3 className="journal-title">יומן פתיחות</h3>
                <ul>
                  {unlockJournal.slice(-16).reverse().map((e, i) => (
                    <li key={`${e.label}-${e.at}-${i}`}>
                      <span className="journal-stage">שלב {e.stage}</span> {e.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="cta-row">
              <button type="button" className="btn btn-ghost" onClick={() => setPhase("env")}>
                החליפו סביבה
              </button>
              <button type="button" className="btn btn-primary" onClick={startNight}>
                לילה חדש · שברו את השיא
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
