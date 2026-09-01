/** צלילי משוב קצרים — Web Audio, בלי קבצי אודיו חיצוניים */
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    return ctx;
  } catch {
    return null;
  }
}

function beep(freq: number, durationMs: number, type: OscillatorType, gain = 0.08): void {
  const audio = ac();
  if (!audio) return;
  void audio.resume();
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(audio.destination);
  const t0 = audio.currentTime;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + durationMs / 1000);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.02);
}

function toneSlide(
  from: number,
  to: number,
  durationMs: number,
  type: OscillatorType,
  gain = 0.07,
): void {
  const audio = ac();
  if (!audio) return;
  void audio.resume();
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, audio.currentTime);
  osc.frequency.linearRampToValueAtTime(to, audio.currentTime + durationMs / 1000);
  g.gain.value = gain;
  osc.connect(g);
  g.connect(audio.destination);
  const t0 = audio.currentTime;
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + durationMs / 1000);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.02);
}

export function sfxTap(): void {
  beep(520, 45, "triangle", 0.05);
}

/** הגשה מוצלחת — אקורד קצר עולה */
export function sfxServe(): void {
  beep(523, 55, "square", 0.06);
  window.setTimeout(() => beep(659, 70, "square", 0.065), 45);
  window.setTimeout(() => beep(784, 110, "triangle", 0.055), 95);
}

export function sfxMiss(): void {
  toneSlide(220, 110, 160, "sawtooth", 0.055);
}

export function sfxWrong(): void {
  beep(240, 70, "square", 0.05);
  window.setTimeout(() => beep(180, 90, "square", 0.05), 65);
  window.setTimeout(() => beep(140, 120, "sawtooth", 0.04), 130);
}

/** רצף ×3 ומעלה */
export function sfxCombo(level = 3): void {
  const n = Math.min(6, Math.max(2, Math.floor(level)));
  for (let i = 0; i < n; i++) {
    window.setTimeout(() => beep(440 + i * 90, 50, "triangle", 0.045), i * 40);
  }
}

/** לקוח/קבוצה חדשה בתור */
export function sfxCustomer(): void {
  beep(392, 60, "sine", 0.045);
  window.setTimeout(() => beep(523, 80, "sine", 0.04), 70);
}

/** מוצר מוכן אחרי מיני־הכנה */
export function sfxReady(): void {
  beep(880, 50, "triangle", 0.04);
  window.setTimeout(() => beep(1175, 70, "sine", 0.035), 40);
}

/** שיא חדש */
export function sfxHighScore(): void {
  beep(523, 70, "square", 0.06);
  window.setTimeout(() => beep(659, 70, "square", 0.06), 70);
  window.setTimeout(() => beep(784, 70, "square", 0.06), 140);
  window.setTimeout(() => beep(1047, 140, "triangle", 0.07), 210);
}
