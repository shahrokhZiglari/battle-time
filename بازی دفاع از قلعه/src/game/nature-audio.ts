/**
 * صداهای طبیعیِ ساخته‌شده با Web Audio: بدون هیچ فایل صوتی خارجی.
 * پس‌زمینه یک بازارِ آرام و باد ملایم است، حرکت لشکر صدای قدم و لرزش می‌دهد
 * و فتح قلعه با یک آواز کوتاه و پرقدرت همراه است.
 */

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let ambientGain: GainNode | null = null;
let ambientTimer: number | null = null;
let ambientOn = false;
let marchOn = false;
let marchGain: GainNode | null = null;
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

/** بلندیِ لایهٔ پس‌زمینه/قدم‌ها را عوض می‌کند (بدونِ نیاز به خاموش‌وروشن کردن) */
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

/** شروع یک بازارِ آرام: باد ملایم و چند آواز پرندهٔ دور */
function startAmbient(a: AudioContext) {
  if (ambientTimer !== null) return;
  ambientGain = a.createGain();
  ambientGain.gain.value = 0;
  ambientGain.connect(master!);
  windLayer(a, ambientGain, 0.05 * layerVolume.ambient, 0);
  // آوازهای پرنده با فاصلهٔ نامنظم تا حس طبیعی بدهد
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
  if (ambientGain && ac) {
    const g = ambientGain;
    g.gain.cancelScheduledValues(ac.currentTime);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + .6);
    window.setTimeout(() => { try { g.disconnect(); } catch { /* ignore */ } }, 800);
  }
  ambientGain = null;
  ambientOn = false;
}

/** صدای حرکت لشکر: قدم‌های منظم روی زمین */
function startMarch(a: AudioContext) {
  if (marchTimer !== null) return;
  marchGain = a.createGain();
  marchGain.gain.value = 0;
  marchGain.connect(master!);
  const step = () => {
    if (!marchOn || !marchGain) return;
    const now = a.currentTime;
    // ضربهٔ پا
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
    // خش‌خش زمین
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
  if (marchGain && ac) {
    const g = marchGain;
    g.gain.cancelScheduledValues(ac.currentTime);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + .4);
    window.setTimeout(() => { try { g.disconnect(); } catch { /* ignore */ } }, 600);
  }
  marchGain = null;
  marchOn = false;
}

/** صدای فتح قلعه: آواز صعودی پرقدرت همراه با یک ضربهٔ کوبنده */
export function playCaptureSound() {
  const a = audio();
  if (!a || !master) return;
  const now = a.currentTime;
  const notes = [392, 523, 659, 784];
  notes.forEach((freq, i) => {
    const osc = a.createOscillator();
    const g = a.createGain();
    const t = now + i * .085;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(.16, t + .02);
    g.gain.exponentialRampToValueAtTime(.0008, t + .5);
    osc.connect(g).connect(master!);
    osc.start(t);
    osc.stop(t + .55);
  });
  // ضربهٔ نهایی
  const boom = a.createOscillator();
  const bg = a.createGain();
  boom.type = "sine";
  boom.frequency.setValueAtTime(160, now);
  boom.frequency.exponentialRampToValueAtTime(42, now + .32);
  bg.gain.setValueAtTime(.18, now);
  bg.gain.exponentialRampToValueAtTime(.0008, now + .42);
  boom.connect(bg).connect(master!);
  boom.start(now);
  boom.stop(now + .45);
}

export function stopAllNature() {
  stopAmbient();
  stopMarch();
}
