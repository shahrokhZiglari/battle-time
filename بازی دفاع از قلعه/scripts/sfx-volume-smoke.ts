/**
 * بلندیِ هر صدا/افکت — آزمونِ واحد روی موتورِ صدا با یک AudioContext تقلبی.
 * ثابت می‌کند هر ۱۵ کلید اسلایدرِ خودش را دارد، مقدارِ اسلایدر واقعاً در
 * گینِ صدا ضرب می‌شود و صفر یعنی آن صدا کاملاً خاموش است (بی‌ساختِ گره).
 */
import assert from "node:assert/strict";

/* ---------- AudioContext تقلبی که همهٔ گین‌ها را ثبت می‌کند ---------- */
type Param = {
  value: number;
  setValueAtTime: (v: number) => Param;
  exponentialRampToValueAtTime: (v: number) => Param;
  linearRampToValueAtTime: (v: number) => Param;
  setTargetAtTime: (v: number) => Param;
  cancelScheduledValues: () => Param;
};
const mark = { log: [] as { tag: string; value: number }[], reset() { this.log = []; } };
const note = (tag: string, v: number) => { mark.log.push({ tag, value: v }); return v; };

function param(initial: number, tag = "other"): Param {
  let value = initial;
  const p: Param = {
    get value() { return value; },
    set value(v: number) { value = v; note(tag, v); },
    setValueAtTime(v: number) { note(tag, v); return p; },
    exponentialRampToValueAtTime(v: number) { note(tag, v); return p; },
    linearRampToValueAtTime(v: number) { note(tag, v); return p; },
    setTargetAtTime(v: number) { note(tag, v); return p; },
    cancelScheduledValues() { return p; },
  };
  return p;
}

const count = { osc: 0, gain: 0, buf: 0, filter: 0, shaper: 0 };
const node = () => ({ connect() { return this; }, disconnect() {} });

class FakeAC {
  currentTime = 0;
  sampleRate = 44100;
  state = "running";
  destination = {};
  resume() { return Promise.resolve(); }
  createOscillator() {
    count.osc++;
    return { ...node(), type: "sine", frequency: param(440, "freq"), detune: param(0, "detune"), start() {}, stop() {} };
  }
  createGain() {
    count.gain++;
    return { ...node(), gain: param(1, "gain") };
  }
  createBiquadFilter() {
    count.filter++;
    return { ...node(), type: "lowpass", frequency: param(1000, "freq"), Q: param(1, "q") };
  }
  createBuffer(_ch: number, len: number) {
    count.buf++;
    return { getChannelData: () => new Float32Array(Math.max(1, len)) };
  }
  createBufferSource() {
    return { ...node(), buffer: null, start() {}, stop() {} };
  }
  createWaveShaper() {
    count.shaper++;
    return { ...node(), curve: null, oversample: "none" };
  }
}
(globalThis as unknown as { window: unknown }).window = { AudioContext: FakeAC };

const { SFX_KEYS, SFX_LABELS, setSfxVolumes, setSound, sfx } = await import("../src/game/sound");
const { natureLayerVolume } = await import("../src/game/nature-audio");

setSound(true);

const reset = () => {
  mark.reset();
  count.osc = count.gain = count.buf = count.filter = count.shaper = 0;
};

const VOICED = ["select", "deselect", "send", "capture", "lose", "repel", "upgrade", "shot", "clash", "win", "defeat", "start", "hover"] as const;
const JINGLE = new Set(["win", "defeat", "start"]);
const play = async (key: (typeof VOICED)[number]) => {
  reset();
  sfx[key]();
  // جینگل‌ها با setTimeout پخش می‌شوند؛ صبر می‌کنیم تا همهٔ نت‌ها تمام شوند
  await new Promise((r) => setTimeout(r, JINGLE.has(key) ? 620 : 60));
};
/** نخستین گینِ هر افکت همان بلندیِ اصلیِ آن است (باس یا گینِ نُت) */
const maxGain = () => {
  const first = mark.log.find((e) => e.tag === "gain" && Number.isFinite(e.value));
  return first ? first.value : 0;
};

let bad = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "✔" : "✘"} ${label}${extra ? " — " + extra : ""}`);
  if (!cond) bad++;
};

/* ۱) مدلِ داده */
check("۱۵ کلید صدا تعریف شده", SFX_KEYS.length === 15, String(SFX_KEYS.length));
check("۱۵ برچسبِ فارسی و بی‌هم‌پوشانی", new Set(SFX_KEYS.map((k) => SFX_LABELS[k])).size === 15);
check("همهٔ افکت‌های صوتی کلید دارند", VOICED.length === 13 && SFX_KEYS.includes("ambient") && SFX_KEYS.includes("march"));

/* ۲) هر کلید در گینِ صدای خودش ضرب می‌شود */
const base: Record<string, number> = {};
for (const key of VOICED) {
  setSfxVolumes(Object.fromEntries(SFX_KEYS.map((k) => [k, 1])));
  await play(key);
  base[key] = maxGain();
  check(`صدای «${SFX_LABELS[key]}» با بلندیِ ۱۰۰٪ پخش می‌شود`, base[key] > 0, String(base[key].toFixed(4)));
}
for (const key of VOICED) {
  setSfxVolumes(Object.fromEntries(SFX_KEYS.map((k) => [k, 0.5])));
  await play(key);
  const half = maxGain();
  const want = base[key] * 0.5;
  check(`نیم‌کردنِ «${SFX_LABELS[key]}» گین را نصف می‌کند`, Math.abs(half - want) < Math.max(1e-4, want * 0.02), `${half.toFixed(4)} ≈ ${want.toFixed(4)}`);
}

/* ۳) صفر یعنی خاموشِ کامل و مستقل: فقط همان صدا */
for (const muted of VOICED) {
  const volumes: Record<string, number> = Object.fromEntries(SFX_KEYS.map((k) => [k, 1]));
  volumes[muted] = 0;
  setSfxVolumes(volumes);
  await play(muted);
  const silent = count.osc === 0 && count.buf === 0 && count.shaper === 0 && count.gain === 0;
  check(`«${SFX_LABELS[muted]}» با ۰٪ هیچ گره‌ای نمی‌سازد`, silent, `osc=${count.osc} gain=${count.gain} buf=${count.buf}`);
  // بقیهٔ صداها هنوز صدا دارند
  const other = VOICED.find((k) => k !== muted)!;
  await play(other);
  check(`خاموشیِ «${SFX_LABELS[muted]}» بقیهٔ صداها را قطع نمی‌کند`, maxGain() > 0);
}

/* ۴) لایه‌های طبیعی (طبیعت و حرکت لشکر) هم بلندیِ جدا دارند */
setSfxVolumes({ ...Object.fromEntries(SFX_KEYS.map((k) => [k, 1])), ambient: 0.25, march: 0.6 });
const layers = natureLayerVolume();
check("بلندیِ «صدای طبیعت» به لایهٔ طبیعی می‌رسد", Math.abs(layers.ambient - 0.25) < 1e-6, String(layers.ambient));
check("بلندیِ «حرکت لشکر» به لایهٔ طبیعی می‌رسد", Math.abs(layers.march - 0.6) < 1e-6, String(layers.march));

/* ۵) مقدارهای بیرون از بازه و کلیدهای ناشناس */
setSfxVolumes({ select: 5, send: -3, bogus: 0.2 } as never);
reset();
sfx.select();
check("مقدارِ بیش از ۱ روی ۱ بسته می‌شود", Math.abs(maxGain() - 0.045) < 1e-6, String(maxGain()));
reset();
sfx.send();
check("مقدارِ منفی روی ۰ بسته می‌شود", count.osc === 0 && count.gain === 0);
setSfxVolumes(undefined);
reset();
sfx.select();
check("نبودِ تنظیمات برای سایر صداها یعنی ۱۰۰٪ (پیش‌فرض)", Math.abs(maxGain() - 0.045) < 1e-6, String(maxGain()));
reset();
sfx.capture();
check("پیش‌فرضِ بلندیِ صدای «فتح» ۱۰٪ است", Math.abs(maxGain() - 0.042) < 1e-6, String(maxGain()));

/* ۶) خاموشیِ کلیِ صدا */
setSfxVolumes(Object.fromEntries(SFX_KEYS.map((k) => [k, 1])));
setSound(false);
reset();
sfx.select();
sfx.capture();
check("خاموشیِ کلی (snd=false) هیچ صدایی پخش نمی‌کند", count.osc === 0 && count.gain === 0 && count.shaper === 0);
setSound(true);

console.log(bad ? `FAIL: ${bad} مورد` : "PASS: هر ۱۵ صدا/افکت بلندیِ مستقل، واقعی و ماندگار دارد.");
process.exit(bad ? 1 : 0);
