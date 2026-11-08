/**
 * صداهای طبیعیِ ساخته‌شده با Web Audio (همراه با پشتیبانی از صدای سفارشی آپلودشده):
 * پس‌زمینه یک بازارِ آرام و باد ملایم است و حرکت لشکر صدای قدم و لرزش می‌دهد.
 */
import { ensureCustomSfxBuffer, getCachedCustomSfxBuffer, hasCustomSfx, onCustomSfxChange } from "./custom-sfx";

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let ambientGain: GainNode | null = null;
let ambientSource: AudioBufferSourceNode | null = null;
let ambientTimer: number | null = null;
let ambientOn = false;
let marchOn = false;
let marchGain: GainNode | null = null;
let marchSource: AudioBufferSourceNode | null = null;
let marchTimer: number | null = null;
let noiseBuffer: AudioBuffer | null = null;
/** بلندیِ هر لایهٔ طبیعی (۰..۱) — از تنظیمات می‌آید */
const layerVolume = { ambient: 1, march: 1 };

function audio(): AudioContext | null {
  try {
    if (!ac) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.9;
      master.connect(ac.destination);
    }
    if (ac.state === "suspended") void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

/** بافت نویز سفید برای باد، شاخه‌ها و سایه‌های طبیعی */
function noise(a: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer;
  const length = a.sampleRate * 2;
  const buffer = a.createBuffer(1, length, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}

/** یک لایهٔ باد ملایم با فیلتر پایین‌گذر */
function windLayer(a: AudioContext, destination: AudioNode, gain: number, rate: number) {
  const source = a.createBufferSource();
  source.buffer = noise(a);
  source.loop = true;
  const filter = a.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 420;
  const g = a.createGain();
  g.gain.value = gain;
  source.connect(filter).connect(g).connect(destination);
  source.start(a.currentTime + rate);
  return { source, g, filter };
}

export type NatureSound = "ambient" | "march" | "capture";

/** روشن/خاموش کردن صداهای طبیعی */
export function setNatureSound(kind: NatureSound, on: boolean) {
  const a = audio();
  if (!a || !master) {
    if (!on) stopAllNature();
    return;
  }
  if (kind === "ambient") {
    ambientOn = on;
    if (on) startAmbient(a);
    else stopAmbient();
  } else if (kind === "march") {
    marchOn = on;
    if (on) startMarch(a);
    else stopMarch();
  }
}

/** بلندیِ فعلیِ لایه‌های طبیعی — فقط برای آزمون و گزارش */
export const natureLayerVolume = () => ({ ambient: layerVolume.ambient, march: layerVolume.march });

export function setNatureVolume(kind: "ambient" | "march", value: number) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));
  layerVolume[kind] = v;
  const a = ac;
  if (!a) return;
  if (kind === "ambient" && ambientGain) ambientGain.gain.setTargetAtTime(0.9 * v, a.currentTime, 0.15);
  if (kind === "march" && marchGain) marchGain.gain.setTargetAtTime(0.85 * v, a.currentTime, 0.15);
}

export function isNatureSoundOn(kind: NatureSound) {
  return kind === "ambient" ? ambientOn : kind === "march" ? marchOn : false;
}

function startCustomLoop(kind: "ambient" | "march", a: AudioContext, gainNode: GainNode) {
  const playBuf = (buf: AudioBuffer | null) => {
    if (!buf) return;
    if (kind === "ambient" && (!ambientOn || ambientGain !== gainNode)) return;
    if (kind === "march" && (!marchOn || marchGain !== gainNode)) return;
    const src = a.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(gainNode);
    src.start();
    if (kind === "ambient") ambientSource = src;
    else marchSource = src;
  };
  const cached = getCachedCustomSfxBuffer(kind);
  if (cached) playBuf(cached);
  else void ensureCustomSfxBuffer(kind, a).then(playBuf);
}

/** شروع یک بازارِ آرام: باد ملایم و چند آواز پرندهٔ دور (یا صدای سفارشی آپلودشده) */
function startAmbient(a: AudioContext) {
  if (ambientGain !== null) return;
  ambientGain = a.createGain();
  ambientGain.gain.value = 0.9 * layerVolume.ambient;
  ambientGain.connect(master!);

  if (hasCustomSfx("ambient")) {
    startCustomLoop("ambient", a, ambientGain);
    return;
  }

  ambientGain.gain.value = 0;
  const wind = windLayer(a, ambientGain, 0.05 * layerVolume.ambient, 0);
  ambientSource = wind.source;
  const chirp = () => {
    if (!ambientOn || !ambientGain) return;
    const now = a.currentTime;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = "sine";
    const base = 1400 + Math.random() * 900;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * .5), now + .07);
    osc.frequency.exponentialRampToValueAtTime(base * .85, now + .16);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(.035 * layerVolume.ambient, now + .02);
    g.gain.exponentialRampToValueAtTime(.0008, now + .3);
    osc.connect(g).connect(ambientGain);
    osc.start(now);
    osc.stop(now + .34);
    ambientGain.gain.linearRampToValueAtTime(.9 * layerVolume.ambient, now + 2.5);
    ambientTimer = window.setTimeout(chirp, 1400 + Math.random() * 3200);
  };
  ambientTimer = window.setTimeout(chirp, 700);
}

function stopAmbient() {
  if (ambientTimer !== null) {
    clearTimeout(ambientTimer);
    ambientTimer = null;
  }
  if (ambientSource) {
    try { ambientSource.stop(); } catch { /* ignore */ }
    ambientSource = null;
  }
  if (ambientGain && ac) {
    const g = ambientGain;
    g.gain.cancelScheduledValues(ac.currentTime);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + .35);
    window.setTimeout(() => { try { g.disconnect(); } catch { /* ignore */ } }, 450);
  }
  ambientGain = null;
  ambientOn = false;
}

/** صدای حرکت لشکر: قدم‌های منظم روی زمین (یا صدای سفارشی آپلودشده) */
function startMarch(a: AudioContext) {
  if (marchGain !== null) return;
  marchGain = a.createGain();
  marchGain.gain.value = 0.85 * layerVolume.march;
  marchGain.connect(master!);

  if (hasCustomSfx("march")) {
    startCustomLoop("march", a, marchGain);
    return;
  }

  marchGain.gain.value = 0;
  const step = () => {
    if (!marchOn || !marchGain) return;
    const now = a.currentTime;
    const thud = a.createOscillator();
    const tg = a.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(120, now);
    thud.frequency.exponentialRampToValueAtTime(48, now + .1);
    tg.gain.setValueAtTime(0, now);
    tg.gain.linearRampToValueAtTime(.12 * layerVolume.march, now + .008);
    tg.gain.exponentialRampToValueAtTime(.0008, now + .13);
    thud.connect(tg).connect(marchGain);
    thud.start(now);
    thud.stop(now + .15);

    const source = a.createBufferSource();
    source.buffer = noise(a);
    const filter = a.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1500;
    const ng = a.createGain();
    ng.gain.setValueAtTime(0, now);
    ng.gain.linearRampToValueAtTime(.05 * layerVolume.march, now + .01);
    ng.gain.exponentialRampToValueAtTime(.0008, now + .12);
    source.connect(filter).connect(ng).connect(marchGain);
    source.start(now);
    source.stop(now + .14);
    marchGain.gain.linearRampToValueAtTime(.85 * layerVolume.march, now + .3);
    marchTimer = window.setTimeout(step, 340);
  };
  marchTimer = window.setTimeout(step, 60);
}

function stopMarch() {
  if (marchTimer !== null) {
    clearTimeout(marchTimer);
    marchTimer = null;
  }
  if (marchSource) {
    try { marchSource.stop(); } catch { /* ignore */ }
    marchSource = null;
  }
  if (marchGain && ac) {
    const g = marchGain;
    g.gain.cancelScheduledValues(ac.currentTime);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + .3);
    window.setTimeout(() => { try { g.disconnect(); } catch { /* ignore */ } }, 400);
  }
  marchGain = null;
  marchOn = false;
}

/** پخشِ آزمایشیِ کوتاه برای صدای پیش‌فرضِ طبیعت یا حرکت لشکر در پنجرهٔ تنظیمات */
export function previewNatureSample(
  kind: "ambient" | "march",
  level: number,
  onDone?: () => void,
): () => void {
  const a = audio();
  if (!a || !master) {
    onDone?.();
    return () => {};
  }
  const bus = a.createGain();
  bus.gain.value = Math.max(0.05, Math.min(1, level));
  bus.connect(a.destination);
  const timers: ReturnType<typeof setTimeout>[] = [];
  const sources: { stop: () => void }[] = [];
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    for (const t of timers) clearTimeout(t);
    for (const s of sources) {
      try { s.stop(); } catch { /* ignore */ }
    }
    try { bus.disconnect(); } catch { /* ignore */ }
    onDone?.();
  };

  if (kind === "ambient") {
    const w = windLayer(a, bus, 0.08, 0);
    sources.push(w.source);
    for (const delay of [120, 920]) {
      timers.push(setTimeout(() => {
        if (closed) return;
        const now = a.currentTime;
        const osc = a.createOscillator();
        const g = a.createGain();
        osc.type = "sine";
        const base = delay < 500 ? 1680 : 1960;
        osc.frequency.setValueAtTime(base, now);
        osc.frequency.exponentialRampToValueAtTime(base * 1.45, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(base * 0.88, now + 0.18);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.06, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0008, now + 0.32);
        osc.connect(g).connect(bus);
        osc.start(now);
        osc.stop(now + 0.35);
      }, delay));
    }
    timers.push(setTimeout(cleanup, 2100));
  } else {
    for (let i = 0; i < 4; i++) {
      timers.push(setTimeout(() => {
        if (closed) return;
        const now = a.currentTime;
        const thud = a.createOscillator();
        const tg = a.createGain();
        thud.type = "sine";
        thud.frequency.setValueAtTime(125, now);
        thud.frequency.exponentialRampToValueAtTime(48, now + 0.1);
        tg.gain.setValueAtTime(0.0001, now);
        tg.gain.linearRampToValueAtTime(0.16, now + 0.008);
        tg.gain.exponentialRampToValueAtTime(0.0008, now + 0.13);
        thud.connect(tg).connect(bus);
        thud.start(now);
        thud.stop(now + 0.15);

        const src = a.createBufferSource();
        src.buffer = noise(a);
        const filter = a.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1500;
        const ng = a.createGain();
        ng.gain.setValueAtTime(0.0001, now);
        ng.gain.linearRampToValueAtTime(0.06, now + 0.01);
        ng.gain.exponentialRampToValueAtTime(0.0008, now + 0.12);
        src.connect(filter).connect(ng).connect(bus);
        src.start(now);
        src.stop(now + 0.14);
      }, i * 310));
    }
    timers.push(setTimeout(cleanup, 1450));
  }
  return cleanup;
}

// اگر صدای سفارشیِ طبیعت یا حرکت لشکر تغییر کرد، لایهٔ در حال پخش بلافاصله با صدای جدید نوسازی شود
onCustomSfxChange((changedKey) => {
  if ((!changedKey || changedKey === "ambient") && ambientOn) {
    const a = audio();
    stopAmbient();
    ambientOn = true;
    if (a) startAmbient(a);
  }
  if ((!changedKey || changedKey === "march") && marchOn) {
    const a = audio();
    stopMarch();
    marchOn = true;
    if (a) startMarch(a);
  }
});

export function stopAllNature() {
  stopAmbient();
  stopMarch();
}
