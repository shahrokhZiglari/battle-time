import { setNatureSound, setNatureVolume, stopAllNature } from "./nature-audio";

/** کلیدهای صدا — هر کدام بلندیِ جداگانه دارند (۰..۱) */
export type SfxKey =
  | "ambient" | "march" | "capture"
  | "select" | "deselect" | "send" | "lose" | "repel" | "upgrade"
  | "shot" | "clash" | "win" | "defeat" | "start" | "hover";

export const SFX_KEYS: SfxKey[] = [
  "ambient", "march", "capture",
  "select", "deselect", "send", "lose", "repel", "upgrade",
  "shot", "clash", "win", "defeat", "start", "hover",
];

/**
 * برچسبِ کوتاهِ هر صدا — عمداً کوتاه تا در دو ستونِ پنلِ تنظیمات همیشه کامل
 * دیده شود (هیچ متنِ بریده/پنهانی).
 */
export const SFX_LABELS: Record<SfxKey, string> = {
  ambient: "طبیعت",
  march: "لشکر",
  capture: "فتح",
  select: "انتخاب",
  deselect: "لغو انتخاب",
  send: "اعزام",
  lose: "از دست‌دادن",
  repel: "دفع حمله",
  upgrade: "رشد",
  shot: "شلیک",
  clash: "درگیری",
  win: "پیروزی",
  defeat: "شکست",
  start: "شروع",
  hover: "نشانگر",
};

/** نامِ کاملِ هر صدا برای tooltip و آزمون‌ها */
export const SFX_FULL_NAMES: Record<SfxKey, string> = {
  ambient: "صدای طبیعتِ پس‌زمینه",
  march: "صدای حرکت لشکر",
  capture: "آوای فتح قلعه",
  select: "انتخاب قلعه",
  deselect: "لغو انتخاب",
  send: "اعزام نیرو",
  lose: "از دست دادن قلعه",
  repel: "دفع حمله",
  upgrade: "رشد ظرفیت",
  shot: "شلیک برج",
  clash: "درگیری در مسیر",
  win: "پیروزی",
  defeat: "شکست",
  start: "شروع نبرد",
  hover: "عبور نشانگر",
};

/** بلندیِ پیش‌فرضِ هر صدا (فتح = ۱۰٪، سایر صداها = ۱۰۰٪) */
export const DEFAULT_SFX_VOLUMES: Record<SfxKey, number> = Object.fromEntries(
  SFX_KEYS.map((k) => [k, k === "capture" ? 0.1 : 1]),
) as Record<SfxKey, number>;

const volumes: Partial<Record<SfxKey, number>> = { ...DEFAULT_SFX_VOLUMES };

/** بلندیِ هر صدا را از تنظیمات می‌گیرد (۱ = صدای کامل، ۰ = خاموش) */
export function setSfxVolumes(next: Partial<Record<SfxKey, number>> | null | undefined) {
  for (const key of SFX_KEYS) {
    const raw = next?.[key];
    volumes[key] = Number.isFinite(Number(raw))
      ? Math.max(0, Math.min(1, Number(raw)))
      : DEFAULT_SFX_VOLUMES[key];
  }
  setNatureVolume("ambient", volumes.ambient ?? DEFAULT_SFX_VOLUMES.ambient);
  setNatureVolume("march", volumes.march ?? DEFAULT_SFX_VOLUMES.march);
}

/** ضریبِ بلندیِ یک صدا */
const vol = (key?: SfxKey) => (key ? (volumes[key] ?? DEFAULT_SFX_VOLUMES[key]) : 1);

let ac: AudioContext | null = null;
let enabled = true;

export const setSound = (v: boolean) => {
  enabled = v;
  if (!v) stopAllNature();
};

function ctx(): AudioContext | null {
  try {
    if (!ac) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new AC();
    }
    if (ac.state === "suspended") void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

export function beep(f: number, d = 0.1, t: OscillatorType = "square", v = 0.04, key?: SfxKey) {
  if (!enabled) return;
  v *= vol(key);
  if (v <= 0.0002) return;
  const a = ctx();
  if (!a) return;
  try {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = t;
    o.frequency.value = f;
    g.gain.value = v;
    g.gain.exponentialRampToValueAtTime(0.0008, a.currentTime + d);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + d);
  } catch {
    /* ignore */
  }
}

export function sweep(f0: number, f1: number, d = 0.18, t: OscillatorType = "triangle", v = 0.05, key?: SfxKey) {
  if (!enabled) return;
  v *= vol(key);
  if (v <= 0.0002) return;
  const a = ctx();
  if (!a) return;
  try {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = t;
    o.frequency.setValueAtTime(f0, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), a.currentTime + d);
    g.gain.value = v;
    g.gain.exponentialRampToValueAtTime(0.0008, a.currentTime + d);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + d);
  } catch {
    /* ignore */
  }
}

export const jingle = (a: number[], key?: SfxKey) =>
  a.forEach((f, i) => setTimeout(() => beep(f, 0.2, "triangle", 0.06, key), i * 125));

/**
 * آوای فتح قلعه — آکوردِ گرم و زلالِ چنگ و شیپورِ مخملی (~۰٫۶۵ ثانیه):
 * بدونِ نویزِ تیز و بدونِ موجِ دندانه‌اره‌ایِ خشن؛ حتی در فتح‌های پیاپی خوش‌صدا و لطیف می‌ماند.
 */
export function captureFanfare() {
  if (!enabled) return;
  const a = ctx();
  if (!a) return;
  try {
    // بلندیِ صفر یعنی کاملاً خاموش: پیش از ساختنِ هیچ گره‌ای برمی‌گردیم
    const level = vol("capture");
    if (level <= 0.001) return;

    const now = a.currentTime;
    const bus = a.createGain();
    bus.gain.setValueAtTime(0.42 * level, now);
    const warmFilter = a.createBiquadFilter();
    warmFilter.type = "lowpass";
    warmFilter.frequency.setValueAtTime(2400, now);
    warmFilter.Q.value = 0.7;
    bus.connect(warmFilter);
    warmFilter.connect(a.destination);

    // ۱) ضربهٔ نرمِ طبلِ چوبی در پایه برای حسِ استقرارِ پرچم
    const thud = a.createOscillator();
    const thudGain = a.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(132, now);
    thud.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    thudGain.gain.setValueAtTime(0.24, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.24);
    thud.connect(thudGain);
    thudGain.connect(bus);
    thud.start(now);
    thud.stop(now + 0.26);

    // ۲) بسترِ گرمِ فاصلهٔ پنجم (C4 + G4) با موجِ مثلثیِ نرم
    for (const [freq, amp] of [[261.63, 0.11], [392.0, 0.09]] as [number, number][]) {
      const pad = a.createOscillator();
      const padGain = a.createGain();
      pad.type = "triangle";
      pad.frequency.setValueAtTime(freq, now);
      padGain.gain.setValueAtTime(0.0001, now);
      padGain.gain.linearRampToValueAtTime(amp, now + 0.03);
      padGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.52);
      pad.connect(padGain);
      padGain.connect(bus);
      pad.start(now);
      pad.stop(now + 0.55);
    }

    // ۳) آرپژِ صعودیِ شفاف و کوتاه (G4 → C5 → E5 → G5) شبیهِ چنگِ کریستالی
    const notes: [number, number, number, number][] = [
      [392.0, 0.0, 0.28, 0.15],
      [523.25, 0.065, 0.30, 0.16],
      [659.25, 0.13, 0.34, 0.17],
      [783.99, 0.195, 0.44, 0.2],
    ];
    for (const [freq, at, dur, amp] of notes) {
      const osc = a.createOscillator();
      const overtone = a.createOscillator();
      const g = a.createGain();
      const og = a.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + at);
      overtone.type = "sine";
      overtone.frequency.setValueAtTime(freq * 2, now + at);

      g.gain.setValueAtTime(0.0001, now + at);
      g.gain.linearRampToValueAtTime(amp, now + at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0006, now + at + dur);

      og.gain.setValueAtTime(0.0001, now + at);
      og.gain.linearRampToValueAtTime(amp * 0.28, now + at + 0.01);
      og.gain.exponentialRampToValueAtTime(0.0004, now + at + dur * 0.7);

      osc.connect(g);
      overtone.connect(og);
      g.connect(bus);
      og.connect(bus);
      osc.start(now + at);
      overtone.start(now + at);
      osc.stop(now + at + dur + 0.03);
      overtone.stop(now + at + dur * 0.7 + 0.03);
    }
  } catch {
    /* ignore */
  }
}

let ambientEnabled = false;
let marchEnabled = false;

/** صدای طبیعی پس‌زمینه و صدای حرکت لشکر */
export function setNatureLayers(ambient: boolean, march: boolean) {
  ambientEnabled = ambient;
  marchEnabled = march;
  setNatureSound("ambient", ambient);
  setNatureSound("march", march);
}

export const natureLayers = () => ({ ambient: ambientEnabled, march: marchEnabled });

export const sfx = {
  select: () => beep(560, 0.05, "triangle", 0.045, "select"),
  deselect: () => beep(330, 0.05, "sine", 0.04, "deselect"),
  send: () => sweep(420, 720, 0.16, "triangle", 0.05, "send"),
  capture: () => captureFanfare(),
  lose: () => beep(170, 0.32, "sawtooth", 0.05, "lose"),
  repel: () => beep(220, 0.1, "sawtooth", 0.04, "repel"),
  upgrade: () => beep(680, 0.16, "triangle", 0.05, "upgrade"),
  shot: () => beep(920, 0.045, "square", 0.018, "shot"),
  clash: () => beep(300, 0.06, "sawtooth", 0.028, "clash"),
  win: () => jingle([523, 659, 784, 1047], "win"),
  defeat: () => jingle([392, 330, 262, 196], "defeat"),
  start: () => jingle([392, 523], "start"),
  hover: () => beep(760, 0.03, "sine", 0.02, "hover"),
};
