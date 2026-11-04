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
  capture: "فن‌فارِ فتح قلعه",
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

const volumes: Partial<Record<SfxKey, number>> = {};

/** بلندیِ هر صدا را از تنظیمات می‌گیرد (۱ = صدای کامل، ۰ = خاموش) */
export function setSfxVolumes(next: Partial<Record<SfxKey, number>> | null | undefined) {
  for (const key of SFX_KEYS) {
    const raw = next?.[key];
    volumes[key] = Number.isFinite(Number(raw)) ? Math.max(0, Math.min(1, Number(raw))) : 1;
  }
  setNatureVolume("ambient", volumes.ambient ?? 1);
  setNatureVolume("march", volumes.march ?? 1);
}

/** ضریبِ بلندیِ یک صدا */
const vol = (key?: SfxKey) => (key ? (volumes[key] ?? 1) : 1);

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

/** نتِ برنجی با پوشش فیلتر و لرزش ظریف — بافتِ شیپور */
function brass(ctxA: AudioContext, freq: number, at: number, dur: number, vol: number, cut = 2600, dest?: AudioNode, vibrato = 0.006) {
  const now = ctxA.currentTime;
  const filter = ctxA.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(500, now + at);
  filter.frequency.exponentialRampToValueAtTime(cut, now + at + 0.05);
  filter.frequency.exponentialRampToValueAtTime(cut * 0.72, now + at + dur);
  filter.Q.value = 1.4;
  const g = ctxA.createGain();
  g.gain.setValueAtTime(0.0001, now + at);
  g.gain.exponentialRampToValueAtTime(vol, now + at + 0.02);
  // نگه‌داشتِ صدا تا ۷۸٪ نت و سپس رهایشِ سریع — بافتِ کشیدهٔ شیپور
  g.gain.setValueAtTime(vol, now + at + dur * 0.78);
  g.gain.exponentialRampToValueAtTime(0.0006, now + at + dur);
  filter.connect(g);
  g.connect(dest ?? ctxA.destination);
  for (const detune of [-6, 6]) {
    const o = ctxA.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    o.detune.value = detune;
    const lfo = ctxA.createOscillator();
    const lfoGain = ctxA.createGain();
    lfo.frequency.value = 5.4;
    lfoGain.gain.value = freq * vibrato;
    lfo.connect(lfoGain);
    lfoGain.connect(o.frequency);
    o.connect(filter);
    o.start(now + at);
    o.stop(now + at + dur + 0.06);
    lfo.start(now + at);
    lfo.stop(now + at + dur + 0.06);
  }
}

function noiseHit(ctxA: AudioContext, at: number, dur: number, freq: number, vol: number, q = 1.2, dest?: AudioNode) {
  const length = Math.max(1, Math.floor(ctxA.sampleRate * dur));
  const buffer = ctxA.createBuffer(1, length, ctxA.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ctxA.createBufferSource();
  src.buffer = buffer;
  const filter = ctxA.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq;
  filter.Q.value = q;
  const g = ctxA.createGain();
  g.gain.value = vol;
  src.connect(filter);
  filter.connect(g);
  g.connect(dest ?? ctxA.destination);
  src.start(ctxA.currentTime + at);
}

/** ناقوسِ درخشان با هارمونیکِ غیرهماهنگ (صدای زنگ) */
function bell(ctxA: AudioContext, freq: number, at: number, dur: number, vol: number, dest?: AudioNode) {
  const now = ctxA.currentTime;
  for (const [mult, amp, decay] of [[1, 1, 1], [2.01, 0.42, 0.62], [3.02, 0.2, 0.4], [4.17, 0.1, 0.28]] as [number, number, number][]) {
    const o = ctxA.createOscillator();
    const g = ctxA.createGain();
    o.type = "sine";
    o.frequency.value = freq * mult;
    g.gain.setValueAtTime(0.0001, now + at);
    g.gain.exponentialRampToValueAtTime(vol * amp, now + at + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0004, now + at + dur * decay);
    o.connect(g);
    g.connect(dest ?? ctxA.destination);
    o.start(now + at);
    o.stop(now + at + dur * decay + 0.05);
  }
}

/**
 * صدای فتح قلعه — فن‌فارِ شاهانهٔ ~۱٬۶ ثانیه‌ای:
 * تیمپانی و سنج، آکوردِ کوبشیِ C ماژور، سه‌نتِ صعودیِ شیپور (G-C-E) و نتِ کشیدهٔ اوج (G5)
 * با آکوردِ پایانی و ناقوسِ درخشان؛ همه از یک باسِ فشرده‌ساز عبور می‌کنند تا پرقدرت ولی بدون اعوجاج باشد.
 */
export function captureFanfare() {
  if (!enabled) return;
  const a = ctx();
  if (!a) return;
  try {
    // بلندیِ صفر یعنی کاملاً خاموش: پیش از ساختنِ هیچ گره‌ای برمی‌گردیم
    const level = vol("capture");
    if (level <= 0.001) return;
    // باسِ مشترک: گین + محدودکنندهٔ نرم (بدون پمپاژِ فشرده‌ساز)
    const bus = a.createGain();
    bus.gain.value = 0.72 * level;
    const shaper = a.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6); // اشباعِ ملایم، سقفِ نرم
    }
    shaper.curve = curve;
    shaper.oversample = "2x";
    bus.connect(shaper);
    shaper.connect(a.destination);

    const now = a.currentTime;

    // ۱) تیمپانی + سنج
    const drum = a.createOscillator();
    const drumGain = a.createGain();
    drum.type = "sine";
    drum.frequency.setValueAtTime(168, now);
    drum.frequency.exponentialRampToValueAtTime(46, now + 0.28);
    drumGain.gain.setValueAtTime(0.34, now);
    drumGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    drum.connect(drumGain);
    drumGain.connect(bus);
    drum.start();
    drum.stop(now + 0.45);
    noiseHit(a, 0, 0.2, 220, 0.13, 0.8, bus);      // چرمِ طبل
    noiseHit(a, 0.01, 0.9, 5600, 0.045, 0.9, bus); // درخششِ سنج

    // ۲) آکوردِ کوبشیِ آغازین (C ماژور)
    for (const [f, v] of [[130.81, 0.062], [196, 0.058], [261.63, 0.055], [329.63, 0.045], [392, 0.03]] as [number, number][]) {
      brass(a, f, 0.0, 0.5, v, 2300, bus);
    }

    // ۳) سه‌نتِ صعودیِ شیپور: G4 → C5 → E5
    for (const [f, at] of [[392, 0.18], [523.25, 0.33], [659.25, 0.48]] as [number, number][]) {
      brass(a, f, at, 0.24, 0.09, 3300, bus, 0.004);
      brass(a, f / 2, at, 0.24, 0.03, 1650, bus, 0.004); // هارمونیِ اکتاوِ پایین
    }

    // ۴) نتِ اوجِ کشیده (G5) با آکوردِ پایانی و ناقوس
    brass(a, 783.99, 0.64, 0.62, 0.1, 4000, bus, 0.009);
    brass(a, 391.99, 0.64, 0.62, 0.045, 2200, bus, 0.009);
    for (const [f, v] of [[130.81, 0.05], [196, 0.045], [261.63, 0.042], [329.63, 0.036], [523.25, 0.03], [659.25, 0.024]] as [number, number][]) {
      brass(a, f, 0.64, 0.62, v, 2400, bus);
    }
    bell(a, 1046.5, 0.64, 1.15, 0.05, bus);
    bell(a, 1567.98, 0.66, 0.95, 0.028, bus);
    noiseHit(a, 0.64, 0.85, 7600, 0.022, 1, bus); // جرقهٔ پایانی
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
