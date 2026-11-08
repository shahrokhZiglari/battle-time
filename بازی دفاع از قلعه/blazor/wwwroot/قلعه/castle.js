// Castle game for Blazor Server .NET 9. No CDN or React runtime.
// Low-poly 2.5D islands, stone bridges, faceted keeps and individual soldiers.
// Shared gameplay engine with 30 campaign stages and customizable random maps.
var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/game/config.ts
var THEME_COUNT = 5;
var ZOOM_STEP = 0.15;
var MIN_ZOOM = 0.55;
var MAX_ZOOM = 3;
var CFG = {
  W: 1e3,
  H: 600,
  spawn: { barracks: 2, tower: 0, speed: 3, heavy: 3 },
  cap: 50,
  neutralCap: 10,
  capStart: 20,
  capStep: 10,
  capHold: 5,
  speed: 110,
  range: 150,
  shot: 1,
  /** آسیبِ هر شلیکِ برجِ خنثی به لشکرِ رهگذر */
  neutralShotDamage: 0.5,
  def: { barracks: 1, tower: 1.5, speed: 1, heavy: 1 }
};
var TROOP_TYPES = ["normal", "fast", "heavy"];
var UNITS = {
  normal: { label: "عادی", power: 1, speed: 0.9 },
  fast: { label: "سریع", power: 1, speed: 1.3 },
  heavy: { label: "سنگین", power: 1.5, speed: 0.7 }
};
var UNIT_LIMITS = { power: [0.5, 4], speed: [0.4, 2.5] };
var DEFAULT_UNIT_TUNING = {
  normal: { power: 1, speed: 0.9 },
  fast: { power: 1, speed: 1.3 },
  heavy: { power: 1.5, speed: 0.7 }
};
var clampNumber = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
function normalizeUnitTuning(raw) {
  const out = {};
  for (const type of TROOP_TYPES) {
    const src = raw?.[type];
    const fallback = DEFAULT_UNIT_TUNING[type];
    const power = Number(src?.power);
    const speed = Number(src?.speed);
    out[type] = {
      power: Number.isFinite(power) ? Math.round(clampNumber(power, ...UNIT_LIMITS.power) * 100) / 100 : fallback.power,
      speed: Number.isFinite(speed) ? Math.round(clampNumber(speed, ...UNIT_LIMITS.speed) * 100) / 100 : fallback.speed
    };
  }
  return out;
}
function applyUnitTuning(raw) {
  const tuning = normalizeUnitTuning(raw);
  for (const type of TROOP_TYPES) {
    UNITS[type].power = tuning[type].power;
    UNITS[type].speed = tuning[type].speed;
  }
  return tuning;
}
var DEFAULT_HALO_SPIN = 0.1;
var HALO_SPIN_LIMITS = [0, 3];
var normalizeHaloSpin = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(clampNumber(n, ...HALO_SPIN_LIMITS) * 100) / 100 : DEFAULT_HALO_SPIN;
};
var DEFAULT_ATTACK_DASH = 0.3;
var ATTACK_DASH_LIMITS = [0, 1];
var normalizeAttackDash = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(clampNumber(n, ...ATTACK_DASH_LIMITS) * 100) / 100 : DEFAULT_ATTACK_DASH;
};
var BUILDING_LABELS = {
  barracks: "قلعهٔ عادی",
  speed: "قلعهٔ سریع",
  heavy: "قلعهٔ سنگین",
  tower: "برج دفاعی"
};
var COL = { 0: "#cfd8dc", 1: "#3ddc84", 2: "#ff5f57", 3: "#55b7ff", 4: "#c084fc" };
var DK = { 0: "#78909c", 1: "#12855a", 2: "#a52a24", 3: "#2169a5", 4: "#7442a0" };
var INTRO_LEVELS = [
  {
    name: "آموزش",
    ai: 0.25,
    hint: "کلیک چپ را روی یک قلعهٔ سبز نگه دار و نشانگر را حرکت بده؛ هر قلعهٔ سبزی که از رویش رد شوی انتخاب می‌شود. سپس روی قلعهٔ هدف رها کن.",
    b: [
      [150, 300, 1, "barracks", 25],
      [500, 300, 0, "barracks", 8],
      [850, 300, 2, "barracks", 10]
    ]
  },
  {
    name: "تصرف",
    ai: 0.45,
    hint: "ساختمان‌های خنثی را زودتر از دشمن بگیر تا تولید نیرویت بیشتر شود.",
    b: [
      [110, 300, 1, "barracks", 25],
      [380, 140, 0, "speed", 8],
      [380, 460, 0, "barracks", 8],
      [620, 140, 0, "barracks", 10],
      [620, 460, 0, "heavy", 10],
      [890, 300, 2, "barracks", 22]
    ]
  },
  {
    name: "دشمن قوی",
    ai: 0.7,
    hint: "دشمن ساختمان بیشتری دارد؛ ابتدا اقتصادت را بساز و بعد با انتخاب گروهی حمله کن.",
    b: [
      [100, 300, 1, "barracks", 30],
      [300, 120, 0, "barracks", 10],
      [300, 480, 0, "heavy", 10],
      [500, 300, 0, "tower", 15],
      [700, 140, 2, "barracks", 18],
      [700, 460, 2, "heavy", 18],
      [900, 300, 2, "barracks", 25]
    ]
  },
  {
    name: "تاکتیک",
    ai: 0.85,
    hint: "سرباز سریع چابک‌تر است (سرعت ۱٫۳)؛ سرباز سنگین قدرت ۱٫۵ برابر دارد اما آرام‌تر حرکت می‌کند (سرعت ۰٫۷).",
    b: [
      [100, 300, 1, "barracks", 30],
      [300, 120, 0, "speed", 8],
      [300, 480, 0, "tower", 12],
      [500, 190, 0, "barracks", 10],
      [500, 410, 0, "heavy", 10],
      [720, 300, 2, "tower", 20],
      [760, 110, 2, "speed", 10],
      [760, 490, 2, "heavy", 15],
      [910, 300, 2, "barracks", 28]
    ]
  },
  {
    name: "نبرد نهایی",
    ai: 1,
    hint: "ظرفیت قلعه‌های خودی و دشمن پس از ۵ ثانیه پُر بودن، خودکار ۱۰ نفر بیشتر می‌شود. نیروها را گروهی و هوشمندانه اعزام کن!",
    b: [
      [90, 300, 1, "barracks", 40],
      [270, 490, 1, "heavy", 15],
      [300, 130, 0, "barracks", 12],
      [300, 300, 0, "tower", 15],
      [460, 450, 0, "speed", 10],
      [460, 150, 0, "heavy", 12],
      [610, 300, 2, "speed", 20],
      [760, 140, 2, "tower", 30],
      [760, 460, 2, "tower", 30],
      [920, 300, 2, "heavy", 50]
    ]
  }
];
var fa = (n) => Number(n).toLocaleString("fa-IR");
function makeCampaignLevel(stage) {
  const playerStarts = [[100, 300], [150, 150]];
  const enemyStarts = [[900, 300], [850, 140], [850, 460], [790, 300]];
  const neutralSpots = [
    [300, 300],
    [300, 150],
    [300, 450],
    [440, 150],
    [440, 450],
    [560, 150],
    [560, 450],
    [700, 300],
    [700, 150],
    [700, 450],
    [500, 220],
    [500, 380],
    [650, 220]
  ];
  const castleTypes = ["barracks", "speed", "heavy"];
  const neutralTypes = ["barracks", "speed", "heavy", "tower"];
  const playerCount = stage >= 19 ? 2 : 1;
  const enemyCount = Math.min(4, 1 + Math.floor((stage - 6) / 8));
  const neutralCount = Math.min(neutralSpots.length, 2 + Math.floor((stage - 6) / 3));
  const buildings = [];
  for (let i = 0; i < playerCount; i++) {
    const type = castleTypes[(stage + i * 2) % castleTypes.length];
    const [x, y] = playerStarts[i];
    buildings.push([x, y, 1, type, Math.min(50, 27 + Math.floor(stage * 0.45))]);
  }
  for (let i = 0; i < neutralCount; i++) {
    const type = neutralTypes[(stage + i * 3) % neutralTypes.length];
    const [x, y] = neutralSpots[i];
    buildings.push([x, y, 0, type, 5 + (stage * 2 + i * 3) % 6]);
  }
  for (let i = 0; i < enemyCount; i++) {
    const type = castleTypes[(stage * 2 + i) % castleTypes.length];
    const [x, y] = enemyStarts[i];
    buildings.push([x, y, 2, type, Math.min(50, 18 + Math.floor(stage * 0.85) + i * 2)]);
  }
  return {
    name: "نبرد " + stage.toLocaleString("fa-IR"),
    ai: Math.min(1, 0.3 + (stage - 6) * 0.027),
    hint: "قلعه‌های خنثی را بگیر، ترکیب سربازها را بسنج و ظرفیت قلعه‌ها را با پُر نگه‌داشتن خودکار افزایش بده.",
    b: buildings
  };
}
var LEVELS = [
  ...INTRO_LEVELS,
  ...Array.from({ length: 25 }, (_, i) => makeCampaignLevel(i + INTRO_LEVELS.length + 1))
];
var defOf = (b) => CFG.def[b.type];

// src/game/custom-sfx.ts
var DB_NAME = "bt_custom_sfx_v1";
var STORE_NAME = "clips";
var MAX_AUDIO_BYTES = 12 * 1024 * 1024;
var records = /* @__PURE__ */ new Map();
var listeners = /* @__PURE__ */ new Set();
var initialized = false;
function notify(key) {
  for (const fn of listeners) {
    try {
      fn(key);
    } catch {
    }
  }
}
function onCustomSfxChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function openDb() {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}
async function dbPut(entry) {
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(entry);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}
async function dbDelete(key) {
  const db = await openDb();
  if (!db) return;
  await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      if (key) store.delete(key);
      else store.clear();
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}
async function decodeWithContext(ctx2, bytes) {
  if (!ctx2 || typeof ctx2.decodeAudioData !== "function") return null;
  try {
    return await ctx2.decodeAudioData(bytes.slice(0));
  } catch {
    return null;
  }
}
async function initCustomSfx(getCtx) {
  if (initialized) return;
  initialized = true;
  const db = await openDb();
  if (!db) return;
  const rows = await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        db.close();
        resolve(Array.isArray(req.result) ? req.result : []);
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      db.close();
      resolve([]);
    }
  });
  for (const row of rows) {
    if (!row?.key || !(row.bytes instanceof ArrayBuffer)) continue;
    records.set(row.key, {
      key: row.key,
      name: String(row.name || row.key),
      mime: String(row.mime || "audio/*"),
      bytes: row.bytes,
      buffer: null
    });
  }
  if (rows.length > 0) {
    notify();
    const ctx2 = getCtx();
    if (ctx2) {
      for (const rec of records.values()) {
        if (!rec.buffer) rec.buffer = await decodeWithContext(ctx2, rec.bytes);
      }
      notify();
    }
  }
}
function hasCustomSfx(key) {
  return records.has(key);
}
function getCustomSfxMeta() {
  const out = {};
  for (const [k, v] of records.entries()) out[k] = v.name;
  return out;
}
async function ensureCustomSfxBuffer(key, ctx2) {
  const rec = records.get(key);
  if (!rec) return null;
  if (rec.buffer) return rec.buffer;
  rec.buffer = await decodeWithContext(ctx2, rec.bytes);
  return rec.buffer;
}
function getCachedCustomSfxBuffer(key) {
  return records.get(key)?.buffer ?? null;
}
async function setCustomSfxBytes(key, name, mime, bytes, ctx2) {
  if (!bytes || bytes.byteLength === 0) {
    return { ok: false, error: "فایل صوتی انتخاب‌شده خالی است." };
  }
  if (bytes.byteLength > MAX_AUDIO_BYTES) {
    return { ok: false, error: "حجم فایل صوتی نباید بیشتر از ۱۲ مگابایت باشد." };
  }
  const buffer = await decodeWithContext(ctx2, bytes);
  if (ctx2 && typeof ctx2.decodeAudioData === "function" && !buffer) {
    return { ok: false, error: "فرمت این فایل صوتی توسط مرورگر پشتیبانی نمی‌شود." };
  }
  const cleanName = (name || key).trim().slice(0, 80);
  records.set(key, { key, name: cleanName, mime: mime || "audio/*", bytes: bytes.slice(0), buffer });
  await dbPut({ key, name: cleanName, mime: mime || "audio/*", bytes: bytes.slice(0) });
  notify(key);
  return { ok: true, name: cleanName };
}
async function clearCustomSfx(key) {
  if (!records.has(key)) return;
  records.delete(key);
  await dbDelete(key);
  notify(key);
}
async function clearAllCustomSfx() {
  if (records.size === 0) return;
  records.clear();
  await dbDelete();
  notify();
}
function pickCustomSfxFile(key, getCtx) {
  if (typeof document === "undefined") {
    return Promise.resolve({ ok: false, error: "محیط مرورگر در دسترس نیست." });
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "audio/*,.mp3,.wav,.ogg,.m4a,.aac,.webm,.flac";
    input.style.display = "none";
    let settled = false;
    const finish = (res) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(res);
    };
    input.addEventListener("cancel", () => finish({ ok: false, cancelled: true }));
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) {
        finish({ ok: false, cancelled: true });
        return;
      }
      try {
        const bytes = await file.arrayBuffer();
        const res = await setCustomSfxBytes(key, file.name, file.type || "audio/*", bytes, getCtx());
        finish(res);
      } catch {
        finish({ ok: false, error: "خواندن فایل صوتی با خطا روبه‌رو شد." });
      }
    });
    document.body.appendChild(input);
    input.click();
  });
}

// src/game/nature-audio.ts
var ac = null;
var master = null;
var ambientGain = null;
var ambientSource = null;
var ambientTimer = null;
var ambientOn = false;
var marchOn = false;
var marchGain = null;
var marchSource = null;
var marchTimer = null;
var noiseBuffer = null;
var layerVolume = { ambient: 1, march: 1 };
function audio() {
  try {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
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
function noise(a) {
  if (noiseBuffer) return noiseBuffer;
  const length = a.sampleRate * 2;
  const buffer = a.createBuffer(1, length, a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buffer;
  return buffer;
}
function windLayer(a, destination, gain, rate) {
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
function setNatureSound(kind, on) {
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
function setNatureVolume(kind, value) {
  const v = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 1));
  layerVolume[kind] = v;
  const a = ac;
  if (!a) return;
  if (kind === "ambient" && ambientGain) ambientGain.gain.setTargetAtTime(0.9 * v, a.currentTime, 0.15);
  if (kind === "march" && marchGain) marchGain.gain.setTargetAtTime(0.85 * v, a.currentTime, 0.15);
}
function startCustomLoop(kind, a, gainNode) {
  const playBuf = (buf) => {
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
function startAmbient(a) {
  if (ambientGain !== null) return;
  ambientGain = a.createGain();
  ambientGain.gain.value = 0.9 * layerVolume.ambient;
  ambientGain.connect(master);
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
    osc.frequency.exponentialRampToValueAtTime(base * (1.3 + Math.random() * 0.5), now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(base * 0.85, now + 0.16);
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.035 * layerVolume.ambient, now + 0.02);
    g.gain.exponentialRampToValueAtTime(8e-4, now + 0.3);
    osc.connect(g).connect(ambientGain);
    osc.start(now);
    osc.stop(now + 0.34);
    ambientGain.gain.linearRampToValueAtTime(0.9 * layerVolume.ambient, now + 2.5);
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
    try {
      ambientSource.stop();
    } catch {
    }
    ambientSource = null;
  }
  if (ambientGain && ac) {
    const g = ambientGain;
    g.gain.cancelScheduledValues(ac.currentTime);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.35);
    window.setTimeout(() => {
      try {
        g.disconnect();
      } catch {
      }
    }, 450);
  }
  ambientGain = null;
  ambientOn = false;
}
function startMarch(a) {
  if (marchGain !== null) return;
  marchGain = a.createGain();
  marchGain.gain.value = 0.85 * layerVolume.march;
  marchGain.connect(master);
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
    thud.frequency.exponentialRampToValueAtTime(48, now + 0.1);
    tg.gain.setValueAtTime(0, now);
    tg.gain.linearRampToValueAtTime(0.12 * layerVolume.march, now + 8e-3);
    tg.gain.exponentialRampToValueAtTime(8e-4, now + 0.13);
    thud.connect(tg).connect(marchGain);
    thud.start(now);
    thud.stop(now + 0.15);
    const source = a.createBufferSource();
    source.buffer = noise(a);
    const filter = a.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1500;
    const ng = a.createGain();
    ng.gain.setValueAtTime(0, now);
    ng.gain.linearRampToValueAtTime(0.05 * layerVolume.march, now + 0.01);
    ng.gain.exponentialRampToValueAtTime(8e-4, now + 0.12);
    source.connect(filter).connect(ng).connect(marchGain);
    source.start(now);
    source.stop(now + 0.14);
    marchGain.gain.linearRampToValueAtTime(0.85 * layerVolume.march, now + 0.3);
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
    try {
      marchSource.stop();
    } catch {
    }
    marchSource = null;
  }
  if (marchGain && ac) {
    const g = marchGain;
    g.gain.cancelScheduledValues(ac.currentTime);
    g.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3);
    window.setTimeout(() => {
      try {
        g.disconnect();
      } catch {
      }
    }, 400);
  }
  marchGain = null;
  marchOn = false;
}
function previewNatureSample(kind, level, onDone) {
  const a = audio();
  if (!a || !master) {
    onDone?.();
    return () => {
    };
  }
  const bus = a.createGain();
  bus.gain.value = Math.max(0.05, Math.min(1, level));
  bus.connect(a.destination);
  const timers = [];
  const sources = [];
  let closed = false;
  const cleanup = () => {
    if (closed) return;
    closed = true;
    for (const t of timers) clearTimeout(t);
    for (const s of sources) {
      try {
        s.stop();
      } catch {
      }
    }
    try {
      bus.disconnect();
    } catch {
    }
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
        g.gain.setValueAtTime(1e-4, now);
        g.gain.linearRampToValueAtTime(0.06, now + 0.02);
        g.gain.exponentialRampToValueAtTime(8e-4, now + 0.32);
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
        tg.gain.setValueAtTime(1e-4, now);
        tg.gain.linearRampToValueAtTime(0.16, now + 8e-3);
        tg.gain.exponentialRampToValueAtTime(8e-4, now + 0.13);
        thud.connect(tg).connect(bus);
        thud.start(now);
        thud.stop(now + 0.15);
        const src = a.createBufferSource();
        src.buffer = noise(a);
        const filter = a.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.value = 1500;
        const ng = a.createGain();
        ng.gain.setValueAtTime(1e-4, now);
        ng.gain.linearRampToValueAtTime(0.06, now + 0.01);
        ng.gain.exponentialRampToValueAtTime(8e-4, now + 0.12);
        src.connect(filter).connect(ng).connect(bus);
        src.start(now);
        src.stop(now + 0.14);
      }, i * 310));
    }
    timers.push(setTimeout(cleanup, 1450));
  }
  return cleanup;
}
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
function stopAllNature() {
  stopAmbient();
  stopMarch();
}

// src/game/sound.ts
var SFX_KEYS = [
  "ambient",
  "march",
  "capture",
  "select",
  "deselect",
  "send",
  "lose",
  "repel",
  "upgrade",
  "shot",
  "clash",
  "win",
  "defeat",
  "start",
  "hover"
];
var DEFAULT_SFX_VOLUMES = Object.fromEntries(
  SFX_KEYS.map((k) => [k, k === "capture" ? 0.1 : 1])
);
var volumes = { ...DEFAULT_SFX_VOLUMES };
function setSfxVolumes(next) {
  for (const key of SFX_KEYS) {
    const raw = next?.[key];
    volumes[key] = Number.isFinite(Number(raw)) ? Math.max(0, Math.min(1, Number(raw))) : DEFAULT_SFX_VOLUMES[key];
  }
  setNatureVolume("ambient", volumes.ambient ?? DEFAULT_SFX_VOLUMES.ambient);
  setNatureVolume("march", volumes.march ?? DEFAULT_SFX_VOLUMES.march);
}
var vol = (key) => key ? volumes[key] ?? DEFAULT_SFX_VOLUMES[key] : 1;
var ac2 = null;
var enabled = true;
var setSound = (v) => {
  enabled = v;
  if (!v) {
    stopAllNature();
    stopSfxPreview();
  }
};
function ctx() {
  try {
    if (!ac2) {
      const AC = window.AudioContext || window.webkitAudioContext;
      ac2 = new AC();
    }
    if (ac2.state === "suspended") void ac2.resume();
    return ac2;
  } catch {
    return null;
  }
}
if (typeof window !== "undefined" && typeof indexedDB !== "undefined") {
  void initCustomSfx(ctx);
}
function playCustomClip(key, level, onEnded) {
  if (level <= 5e-4) return null;
  const a = ctx();
  if (!a) return null;
  let stopped = false;
  let activeSrc = null;
  let timer = null;
  const gainNode = a.createGain();
  gainNode.gain.value = 0.65 * level;
  gainNode.connect(a.destination);
  const cleanup = () => {
    if (stopped) return;
    stopped = true;
    if (timer) clearTimeout(timer);
    if (activeSrc) {
      try {
        activeSrc.stop();
      } catch {
      }
      activeSrc = null;
    }
    try {
      gainNode.disconnect();
    } catch {
    }
    onEnded?.();
  };
  const startBuffer = (buf) => {
    if (stopped || !buf) {
      if (!buf) cleanup();
      return;
    }
    try {
      const src = a.createBufferSource();
      src.buffer = buf;
      src.connect(gainNode);
      activeSrc = src;
      src.onended = cleanup;
      src.start();
      const durMs = Math.max(120, Math.min(15e3, (buf.duration ?? 2) * 1e3 + 80));
      timer = setTimeout(cleanup, durMs);
    } catch {
      cleanup();
    }
  };
  const cached = getCachedCustomSfxBuffer(key);
  if (cached) startBuffer(cached);
  else void ensureCustomSfxBuffer(key, a).then(startBuffer);
  return cleanup;
}
function beep(f, d = 0.1, t = "square", v = 0.04, key) {
  if (!enabled) return;
  v *= vol(key);
  if (v <= 2e-4) return;
  const a = ctx();
  if (!a) return;
  try {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = t;
    o.frequency.value = f;
    g.gain.value = v;
    g.gain.exponentialRampToValueAtTime(8e-4, a.currentTime + d);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + d);
  } catch {
  }
}
function sweep(f0, f1, d = 0.18, t = "triangle", v = 0.05, key) {
  if (!enabled) return;
  v *= vol(key);
  if (v <= 2e-4) return;
  const a = ctx();
  if (!a) return;
  try {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = t;
    o.frequency.setValueAtTime(f0, a.currentTime);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), a.currentTime + d);
    g.gain.value = v;
    g.gain.exponentialRampToValueAtTime(8e-4, a.currentTime + d);
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + d);
  } catch {
  }
}
var jingle = (a, key) => a.forEach((f, i) => setTimeout(() => beep(f, 0.2, "triangle", 0.06, key), i * 125));
function captureFanfare() {
  if (!enabled) return;
  const level = vol("capture");
  if (level <= 1e-3) return;
  if (hasCustomSfx("capture")) {
    playCustomClip("capture", level);
    return;
  }
  const a = ctx();
  if (!a) return;
  try {
    const now = a.currentTime;
    const bus = a.createGain();
    bus.gain.setValueAtTime(0.42 * level, now);
    const warmFilter = a.createBiquadFilter();
    warmFilter.type = "lowpass";
    warmFilter.frequency.setValueAtTime(2400, now);
    warmFilter.Q.value = 0.7;
    bus.connect(warmFilter);
    warmFilter.connect(a.destination);
    const thud = a.createOscillator();
    const thudGain = a.createGain();
    thud.type = "sine";
    thud.frequency.setValueAtTime(132, now);
    thud.frequency.exponentialRampToValueAtTime(55, now + 0.18);
    thudGain.gain.setValueAtTime(0.24, now);
    thudGain.gain.exponentialRampToValueAtTime(8e-4, now + 0.24);
    thud.connect(thudGain);
    thudGain.connect(bus);
    thud.start(now);
    thud.stop(now + 0.26);
    for (const [freq, amp] of [[261.63, 0.11], [392, 0.09]]) {
      const pad = a.createOscillator();
      const padGain = a.createGain();
      pad.type = "triangle";
      pad.frequency.setValueAtTime(freq, now);
      padGain.gain.setValueAtTime(1e-4, now);
      padGain.gain.linearRampToValueAtTime(amp, now + 0.03);
      padGain.gain.exponentialRampToValueAtTime(8e-4, now + 0.52);
      pad.connect(padGain);
      padGain.connect(bus);
      pad.start(now);
      pad.stop(now + 0.55);
    }
    const notes = [
      [392, 0, 0.28, 0.15],
      [523.25, 0.065, 0.3, 0.16],
      [659.25, 0.13, 0.34, 0.17],
      [783.99, 0.195, 0.44, 0.2]
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
      g.gain.setValueAtTime(1e-4, now + at);
      g.gain.linearRampToValueAtTime(amp, now + at + 0.012);
      g.gain.exponentialRampToValueAtTime(6e-4, now + at + dur);
      og.gain.setValueAtTime(1e-4, now + at);
      og.gain.linearRampToValueAtTime(amp * 0.28, now + at + 0.01);
      og.gain.exponentialRampToValueAtTime(4e-4, now + at + dur * 0.7);
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
  }
}
var ambientEnabled = false;
var marchEnabled = false;
function setNatureLayers(ambient, march) {
  ambientEnabled = ambient;
  marchEnabled = march;
  setNatureSound("ambient", ambient);
  setNatureSound("march", march);
}
function runDiscrete(key, fallback) {
  if (!enabled) return;
  const level = vol(key);
  if (level <= 1e-3) return;
  if (hasCustomSfx(key)) {
    playCustomClip(key, level);
    return;
  }
  fallback();
}
var sfx = {
  select: () => runDiscrete("select", () => beep(560, 0.05, "triangle", 0.045, "select")),
  deselect: () => runDiscrete("deselect", () => beep(330, 0.05, "sine", 0.04, "deselect")),
  send: () => runDiscrete("send", () => sweep(420, 720, 0.16, "triangle", 0.05, "send")),
  capture: () => captureFanfare(),
  lose: () => runDiscrete("lose", () => beep(170, 0.32, "sawtooth", 0.05, "lose")),
  repel: () => runDiscrete("repel", () => beep(220, 0.1, "sawtooth", 0.04, "repel")),
  upgrade: () => runDiscrete("upgrade", () => beep(680, 0.16, "triangle", 0.05, "upgrade")),
  shot: () => runDiscrete("shot", () => beep(920, 0.045, "square", 0.018, "shot")),
  clash: () => runDiscrete("clash", () => beep(300, 0.06, "sawtooth", 0.028, "clash")),
  win: () => runDiscrete("win", () => jingle([523, 659, 784, 1047], "win")),
  defeat: () => runDiscrete("defeat", () => jingle([392, 330, 262, 196], "defeat")),
  start: () => runDiscrete("start", () => jingle([392, 523], "start")),
  hover: () => runDiscrete("hover", () => beep(760, 0.03, "sine", 0.02, "hover"))
};
var activePreview = null;
var previewListeners = /* @__PURE__ */ new Set();
function emitPreview(active) {
  for (const fn of previewListeners) {
    try {
      fn(active);
    } catch {
    }
  }
}
function stopSfxPreview() {
  if (!activePreview) return;
  const cur = activePreview;
  activePreview = null;
  cur.stop();
  emitPreview(null);
}
function previewSfx(key, overrideLevel) {
  if (activePreview?.key === key) {
    stopSfxPreview();
    return false;
  }
  stopSfxPreview();
  const rawLevel = overrideLevel !== void 0 ? overrideLevel : vol(key);
  const level = rawLevel > 5e-3 ? Math.max(0.05, Math.min(1, rawLevel)) : DEFAULT_SFX_VOLUMES[key];
  if (hasCustomSfx(key)) {
    const stopClip = playCustomClip(key, level, () => {
      if (activePreview?.key === key) {
        activePreview = null;
        emitPreview(null);
      }
    });
    if (stopClip) {
      activePreview = { key, stop: stopClip };
      emitPreview(key);
      return true;
    }
  }
  if (key === "ambient" || key === "march") {
    const stopSample = previewNatureSample(key, level, () => {
      if (activePreview?.key === key) {
        activePreview = null;
        emitPreview(null);
      }
    });
    activePreview = { key, stop: stopSample };
    emitPreview(key);
    return true;
  }
  const prevEnabled = enabled;
  const prevVol = volumes[key];
  enabled = true;
  volumes[key] = level;
  try {
    sfx[key]();
  } finally {
    const holdMs = key === "win" || key === "defeat" ? 560 : key === "start" || key === "capture" ? 650 : 280;
    const timer = setTimeout(() => {
      enabled = prevEnabled;
      volumes[key] = prevVol;
      if (activePreview?.key === key) {
        activePreview = null;
        emitPreview(null);
      }
    }, holdMs);
    activePreview = {
      key,
      stop: () => {
        clearTimeout(timer);
        enabled = prevEnabled;
        volumes[key] = prevVol;
      }
    };
    emitPreview(key);
  }
  return true;
}
async function uploadCustomSfx(key) {
  await initCustomSfx(ctx);
  const res = await pickCustomSfxFile(key, ctx);
  if (res.ok) {
    previewSfx(key);
  }
  return res;
}
async function resetCustomSfx(key) {
  if (activePreview?.key === key) stopSfxPreview();
  await clearCustomSfx(key);
}
async function resetAllCustomSfx() {
  stopSfxPreview();
  await clearAllCustomSfx();
}

// src/game/troops.ts
var EPSILON = 1e-8;
var producedUnit = (building) => building === "speed" ? "fast" : building === "heavy" ? "heavy" : "normal";
var emptyArmy = () => ({ normal: 0, fast: 0, heavy: 0 });
var unitCount = (points, type) => Math.max(0, Math.ceil((points - EPSILON) / UNITS[type].power));
var armyCount = (army) => TROOP_TYPES.reduce((sum, type) => sum + unitCount(army[type], type), 0);
var armyPower = (army) => TROOP_TYPES.reduce((sum, type) => sum + Math.max(0, army[type]), 0);
function createArmy(type, count) {
  const army = emptyArmy();
  army[type] = Math.max(0, Math.floor(count)) * UNITS[type].power;
  return army;
}
function addUnit(army, type, count = 1) {
  army[type] += count * UNITS[type].power;
}
function selectArmy(army, requested) {
  const selected = emptyArmy();
  const total = armyCount(army);
  const amount = Math.max(0, Math.min(total, Math.floor(requested)));
  if (!total || !amount) return selected;
  const shares = TROOP_TYPES.map((type, index) => {
    const count = unitCount(army[type], type);
    const ideal = count * amount / total;
    return { type, count, take: Math.floor(ideal), remainder: ideal - Math.floor(ideal), index };
  });
  let rest = amount - shares.reduce((sum, share) => sum + share.take, 0);
  for (const share of [...shares].sort((a, b) => b.remainder - a.remainder || a.index - b.index)) {
    if (rest && share.take < share.count) {
      share.take++;
      rest--;
    }
  }
  for (const share of shares) selected[share.type] = Math.min(army[share.type], share.take * UNITS[share.type].power);
  return selected;
}
function takeArmy(army, amount) {
  const selected = selectArmy(army, amount);
  for (const type of TROOP_TYPES) army[type] = Math.max(0, army[type] - selected[type]);
  return selected;
}
function damageArmy(army, damage) {
  for (const type of TROOP_TYPES) {
    const hit = Math.min(army[type], Math.max(0, damage));
    army[type] -= hit;
    if (army[type] < EPSILON) army[type] = 0;
    damage -= hit;
    if (damage <= EPSILON) break;
  }
}

// src/game/scene-geometry.ts
function noise2(seed) {
  const n = Math.sin(seed * 127.1 + 31.7) * 43758.5453;
  return n - Math.floor(n);
}
function tint(hex, amount) {
  const value = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (value >> 16) + amount));
  const g = Math.max(0, Math.min(255, (value >> 8 & 255) + amount));
  const b = Math.max(0, Math.min(255, (value & 255) + amount));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
function polygon(c, points, fill, stroke) {
  if (points.length < 3) return;
  c.beginPath();
  c.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.stroke();
  }
}
function ring(x, y, rx, ry, sides = 8, phase = Math.PI / 8) {
  return Array.from({ length: sides }, (_, i) => {
    const angle = phase + i / sides * Math.PI * 2;
    return { x: x + Math.cos(angle) * rx, y: y + Math.sin(angle) * ry };
  });
}
function prism(c, base, height, color, roof = tint(color, 24)) {
  const top = base.map((p) => ({ x: p.x, y: p.y - height }));
  for (let i = 0; i < base.length; i++) {
    const j = (i + 1) % base.length;
    const dx = base[j].x - base[i].x;
    if (dx >= 0) continue;
    const dy = base[j].y - base[i].y;
    const light = -10 - 24 * dy / Math.max(1, Math.hypot(dx, dy));
    polygon(c, [top[i], top[j], base[j], base[i]], tint(color, light));
    c.strokeStyle = "rgba(9,24,28,.09)";
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(top[j].x, top[j].y);
    c.lineTo(base[j].x, base[j].y);
    c.stroke();
  }
  polygon(c, top, roof);
  return top;
}
function block(c, x, y, w, d, h, color) {
  return prism(c, [
    { x: x + w / 2, y: y - d / 2 },
    { x: x + w / 2, y: y + d / 2 },
    { x: x - w / 2, y: y + d / 2 },
    { x: x - w / 2, y: y - d / 2 }
  ], h, color);
}
function shadow(c, x, y, rx, ry, alpha = 0.23) {
  c.fillStyle = `rgba(5,24,29,${alpha})`;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
}
function crystal(c, x, y, width, height, color) {
  const apex = { x: x - width * 0.08, y: y - height };
  const left = { x: x - width * 0.53, y: y - height * 0.35 };
  const right = { x: x + width * 0.53, y: y - height * 0.35 };
  const middle = { x: x + width * 0.07, y: y - height * 0.22 };
  const foot = { x, y };
  polygon(c, [apex, left, middle], tint(color, 30));
  polygon(c, [apex, middle, right], tint(color, -20));
  polygon(c, [left, foot, middle], tint(color, -8));
  polygon(c, [middle, foot, right], tint(color, -49));
  c.strokeStyle = "rgba(255,255,255,.45)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(apex.x, apex.y);
  c.lineTo(middle.x, middle.y);
  c.stroke();
}

// src/game/bridge-geometry.ts
var BRIDGE_HALF_WIDTH = 15;
var BRIDGE_APPROACH = BRIDGE_HALF_WIDTH * 2;
var TROOP_LANE_SPACING = 6;
var TROOP_FOOT_RADIUS = 3;
function distanceToSegment(point, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
var EPSILON2 = 1e-7;
var cross = (ax, ay, bx, by) => ax * by - ay * bx;
function pointInPolygon(point, vertices) {
  if (vertices.length < 3) return false;
  let inside2 = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[j], b = vertices[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const px = point.x - a.x, py = point.y - a.y;
    if (dx * dx + dy * dy <= EPSILON2) {
      if (px * px + py * py <= EPSILON2) return true;
      continue;
    }
    if (Math.abs(cross(dx, dy, px, py)) <= EPSILON2 && px * dx + py * dy >= -EPSILON2 && px * dx + py * dy <= dx * dx + dy * dy + EPSILON2) return true;
    if (a.y > point.y !== b.y > point.y && point.x < a.x + dx * (point.y - a.y) / dy) inside2 = !inside2;
  }
  return inside2;
}
function bridgeWaterSpans(a, b, shores) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= EPSILON2) return [];
  const cuts = [0, 1];
  const add = (t) => {
    if (t >= -EPSILON2 && t <= 1 + EPSILON2) cuts.push(Math.max(0, Math.min(1, t)));
  };
  for (const vertices of shores) {
    for (let i = 0; i < vertices.length; i++) {
      const p = vertices[i], q = vertices[(i + 1) % vertices.length];
      const ex = q.x - p.x, ey = q.y - p.y;
      const px = p.x - a.x, py = p.y - a.y;
      const denominator = cross(dx, dy, ex, ey);
      if (Math.abs(denominator) <= EPSILON2) {
        if (Math.abs(cross(px, py, dx, dy)) <= EPSILON2) {
          add((px * dx + py * dy) / lengthSquared);
          add(((q.x - a.x) * dx + (q.y - a.y) * dy) / lengthSquared);
        }
        continue;
      }
      const t = cross(px, py, ex, ey) / denominator;
      const u = cross(px, py, dx, dy) / denominator;
      if (u >= -EPSILON2 && u <= 1 + EPSILON2) add(t);
    }
  }
  cuts.sort((x, y) => x - y);
  const unique = cuts.filter((t, i) => !i || t - cuts[i - 1] > EPSILON2);
  const at = (t) => ({ x: a.x + dx * t, y: a.y + dy * t });
  const intervals = [];
  for (let i = 1; i < unique.length; i++) {
    const from = unique[i - 1], to = unique[i];
    if (shores.some((vertices) => pointInPolygon(at((from + to) / 2), vertices))) continue;
    const last = intervals[intervals.length - 1];
    if (last && Math.abs(last.to - from) <= EPSILON2) last.to = to;
    else intervals.push({ from, to });
  }
  return intervals.map(({ from, to }) => ({ a: at(from), b: at(to) }));
}

// src/game/map.ts
var DEFAULT_RANDOM_MAP = {
  players: 3,
  normal: 5,
  fast: 2,
  heavy: 2,
  towers: 2,
  lakes: 2,
  ships: 2,
  boats: 3,
  largeMap: true,
  minDistance: 0
};
var PX_PER_METER = 6;
var MAX_LAKES = 16;
var MAX_SHIPS = 12;
var MAX_BOATS = 16;
var NATIVE_RANDOM = Math.random;
var entropyCounter = 0;
var recentLayouts = [];
var recentThemes = [];
function createUnpredictableRng() {
  if (Math.random !== NATIVE_RANDOM) {
    const seed2 = (Math.floor(Math.random() * 2147483647) || 1) >>> 0;
    return { rand: () => Math.random(), seed: seed2, isMocked: true };
  }
  const buf = new Uint32Array(2);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(buf);
  } else {
    buf[0] = NATIVE_RANDOM() * 4294967295 >>> 0;
    buf[1] = NATIVE_RANDOM() * 4294967295 >>> 0;
  }
  const hires = typeof globalThis.performance?.now === "function" ? Math.floor(globalThis.performance.now() * 1e3) : 0;
  const timeMix = Math.imul((Date.now() ^ hires) >>> 0, 2654435761);
  let state = (buf[0] ^ timeMix ^ Math.imul(++entropyCounter, 2246822507)) >>> 0;
  if (state === 0) state = 1831565813;
  const seed = (buf[1] ^ Math.imul(state, 3266489909)) >>> 0 || 1;
  const rand = () => {
    state = state + 1831565813 | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
  return { rand, seed, isMocked: false };
}
function normalizeRandomMap(input) {
  const source = { ...DEFAULT_RANDOM_MAP, ...input };
  const whole = (value, low, high) => Number.isFinite(Number(value)) ? Math.max(low, Math.min(high, Math.floor(Number(value)))) : low;
  return {
    players: whole(source.players, 2, 4),
    normal: whole(source.normal, 0, 50),
    fast: whole(source.fast, 0, 50),
    heavy: whole(source.heavy, 0, 50),
    towers: whole(source.towers, 0, 50),
    lakes: whole(source.lakes, 0, MAX_LAKES),
    ships: whole(source.ships, 0, MAX_SHIPS),
    boats: whole(source.boats, 0, MAX_BOATS),
    largeMap: source.largeMap !== false,
    minDistance: whole(source.minDistance, 0, 120)
  };
}
function validateRandomMap(input) {
  const totalCastles = input.normal + input.fast + input.heavy;
  const total = totalCastles + input.towers;
  if (input.players < 2 || input.players > 4) return "تعداد بازیکنان باید بین ۲ تا ۴ باشد.";
  if ([input.normal, input.fast, input.heavy, input.towers].some((n) => !Number.isInteger(n) || n < 0 || n > 50)) {
    return "تعداد ساختمان‌های هر نوع باید بین صفر تا ۵۰ باشد.";
  }
  if (totalCastles < input.players) return "برای هر بازیکن دست‌کم یک قلعه لازم است؛ برج پایگاه شروع نیست.";
  if (total > 50) return "نقشه برای حفظ فاصلهٔ قلعه‌ها حداکثر ۵۰ ساختمان می‌تواند داشته باشد.";
  if (input.lakes != null && (!Number.isInteger(input.lakes) || input.lakes < 0 || input.lakes > MAX_LAKES)) {
    return `تعداد خلیج باید بین صفر تا ${MAX_LAKES} باشد.`;
  }
  if (input.ships != null && (!Number.isInteger(input.ships) || input.ships < 0 || input.ships > MAX_SHIPS)) {
    return `تعداد کشتی باید بین صفر تا ${MAX_SHIPS} باشد.`;
  }
  if (input.boats != null && (!Number.isInteger(input.boats) || input.boats < 0 || input.boats > MAX_BOATS)) {
    return `تعداد قایق باید بین صفر تا ${MAX_BOATS} باشد.`;
  }
  return null;
}
function shuffled(items, rand) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function furthestStarts(points, count, rand) {
  const chosen = [Math.floor(rand() * points.length)];
  while (chosen.length < count) {
    let best = -1;
    let bestDistance = -1;
    for (let i = 0; i < points.length; i++) {
      if (chosen.includes(i)) continue;
      const p = points[i];
      const minDistance = Math.min(...chosen.map((index) => Math.hypot(p.x - points[index].x, p.y - points[index].y)));
      const score = minDistance * (0.9 + rand() * 0.2);
      if (score > bestDistance) {
        best = i;
        bestDistance = score;
      }
    }
    if (best >= 0) chosen.push(best);
  }
  return shuffled(chosen, rand);
}
var LAYOUTS = ["scatter", "rows", "ring", "clusters", "valley", "twin", "spiral", "cross"];
var LAYOUT_LABEL = {
  scatter: "مجمع‌الجزایر آزاد",
  rows: "جبهه‌های موجی",
  ring: "حلقه‌ای چرخان",
  clusters: "خوشه‌های جزیره‌ای",
  valley: "تنگهٔ مارپیچ",
  twin: "دو قارهٔ روبه‌رو",
  spiral: "مارپیچ کهکشانی",
  cross: "چهارراه دریایی"
};
function repairOverlap(cells, sep, w, h, margin) {
  for (let pass = 0; pass < 70; pass++) {
    let moved = false;
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i], b = cells[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 0.01;
        if (d >= sep) continue;
        const push = (sep - d) / 2;
        const ux = dx / d, uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
        moved = true;
      }
    }
    for (const p of cells) {
      p.x = Math.max(margin * 0.55, Math.min(w - margin * 0.55, p.x));
      p.y = Math.max(margin * 0.55, Math.min(h - margin * 0.55, p.y));
    }
    if (!moved) break;
  }
}
function applySymmetryTransform(cells, w, h, margin, rand) {
  const mirrorX = rand() < 0.5;
  const mirrorY = rand() < 0.5;
  const rot = (rand() - 0.5) * 0.46;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const cx = w / 2;
  const cy = h / 2;
  const scaleY = h / w;
  for (const p of cells) {
    let nx = (p.x - cx) * (mirrorX ? -1 : 1);
    let ny = (p.y - cy) / scaleY * (mirrorY ? -1 : 1);
    const rx = nx * cos - ny * sin;
    const ry = (nx * sin + ny * cos) * scaleY;
    p.x = Math.max(margin * 0.65, Math.min(w - margin * 0.65, cx + rx));
    p.y = Math.max(margin * 0.65, Math.min(h - margin * 0.65, cy + ry));
  }
}
function scatterCells(count, w, h, margin, sep, centerClear, rand) {
  const cells = [];
  let minSep = sep;
  for (let attempt = 0; attempt < 6e3 && cells.length < count; attempt++) {
    const p = { x: margin + rand() * (w - margin * 2), y: margin + rand() * (h - margin * 2) };
    if (centerClear > 0 && Math.hypot(p.x - w / 2, p.y - h / 2) < centerClear) continue;
    if (cells.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minSep)) cells.push(p);
    else if (attempt % 700 === 699) minSep = Math.max(88, minSep * 0.9);
  }
  while (cells.length < count) {
    cells.push({ x: margin + rand() * (w - margin * 2), y: margin + rand() * (h - margin * 2) });
  }
  return cells;
}
function rowsCells(count, w, h, margin, large, rand) {
  const transpose = rand() < 0.4;
  const spanA = transpose ? h - margin * 2 : w - margin * 2;
  const spanB = transpose ? w - margin * 2 : h - margin * 2;
  const columns = Math.max(2, Math.ceil(Math.sqrt(count * (spanA / spanB)) + (rand() - 0.5) * 1.2));
  const rows = Math.max(2, Math.ceil(count / columns));
  const rowCounts = shuffled(
    Array.from({ length: rows }, (_, row) => Math.floor(count / rows) + (row < count % rows ? 1 : 0)),
    rand
  );
  const jitter = large ? 62 : 20;
  const curveAmp = large ? 28 + rand() * 58 : 9 + rand() * 15;
  const curveFreq = 0.5 + rand() * 1.35;
  const curvePhase = rand() * Math.PI * 2;
  const shear = (rand() - 0.5) * (large ? 90 : 28);
  const cells = [];
  for (let row = 0; row < rows; row++) {
    const n = rowCounts[row];
    if (n <= 0) continue;
    const squeeze = 0.66 + rand() * 0.34;
    const width = spanA * squeeze;
    const indent = (spanA - width) * rand();
    const step = width / Math.max(1, n - 1);
    const baseB = margin + row / Math.max(1, rows - 1) * spanB;
    for (let col = 0; col < n; col++) {
      const u = n === 1 ? 0.5 : col / (n - 1);
      const a = n === 1 ? margin + spanA * (0.25 + rand() * 0.5) : margin + indent + col * step + (rand() - 0.5) * jitter;
      const b = baseB + (u - 0.5) * shear + Math.sin(col * curveFreq + row * 1.4 + curvePhase) * curveAmp + (rand() - 0.5) * jitter;
      cells.push(transpose ? { x: b, y: a } : { x: a, y: b });
    }
  }
  return cells;
}
function ringCells(count, w, h, margin, rand) {
  const cx = w / 2 + (rand() - 0.5) * w * 0.06;
  const cy = h / 2 + (rand() - 0.5) * h * 0.06;
  const maxRx = w / 2 - margin;
  const maxRy = h / 2 - margin;
  const rings = Math.max(1, Math.min(4, Math.ceil(count / (7 + Math.floor(rand() * 4)))));
  const baseAngle = rand() * Math.PI * 2;
  const spinDir = rand() < 0.5 ? -1 : 1;
  const arcSpan = rand() < 0.45 ? Math.PI * (1.35 + rand() * 0.4) : Math.PI * 2;
  const cells = [];
  let placed = 0;
  for (let r = 0; r < rings; r++) {
    const n = Math.ceil((count - placed) / (rings - r));
    const radius = 0.4 + 0.56 * (rings === 1 ? 0.88 : r / Math.max(1, rings - 1));
    const ringOffset = baseAngle + spinDir * r * (0.7 + rand() * 0.9);
    for (let k = 0; k < n && placed < count; k++) {
      const frac = arcSpan < Math.PI * 1.99 && n > 1 ? k / (n - 1) : k / n;
      const angle = ringOffset + spinDir * frac * arcSpan + (rand() - 0.5) * 0.48;
      const wobble = 0.78 + rand() * 0.38;
      cells.push({
        x: cx + Math.cos(angle) * maxRx * radius * wobble,
        y: cy + Math.sin(angle) * maxRy * radius * wobble
      });
      placed++;
    }
  }
  return cells;
}
function clusterCells(count, w, h, margin, sep, centerClear, rand) {
  const nClusters = Math.max(2, Math.min(5, 2 + Math.floor(rand() * 3) + (count > 18 ? 1 : 0)));
  const centers = [];
  for (let guard = 0; guard < 800 && centers.length < nClusters; guard++) {
    const p = { x: margin + rand() * (w - margin * 2), y: margin + rand() * (h - margin * 2) };
    if (centerClear > 0 && Math.hypot(p.x - w / 2, p.y - h / 2) < centerClear * 0.7) continue;
    if (centers.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > sep * 1.25)) centers.push(p);
  }
  while (centers.length < nClusters) {
    centers.push({ x: margin + rand() * (w - margin * 2), y: margin + rand() * (h - margin * 2) });
  }
  const cells = [];
  let minSep = sep;
  for (let attempt = 0; attempt < 6e3 && cells.length < count; attempt++) {
    const center = centers[attempt % centers.length];
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * sep * (1.4 + rand() * 0.85);
    const p = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius * 0.84 };
    if (p.x < margin || p.x > w - margin || p.y < margin || p.y > h - margin) continue;
    if (centerClear > 0 && Math.hypot(p.x - w / 2, p.y - h / 2) < centerClear) continue;
    if (cells.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minSep)) cells.push(p);
    else if (attempt % 700 === 699) minSep = Math.max(88, minSep * 0.9);
  }
  while (cells.length < count) {
    const center = centers[cells.length % centers.length];
    cells.push({ x: center.x + (rand() - 0.5) * sep, y: center.y + (rand() - 0.5) * sep });
  }
  return cells;
}
function valleyCells(count, w, h, margin, sep, rand) {
  const vertical = rand() < 0.45;
  const diagSlope = rand() < 0.3 ? 0 : rand() < 0.5 ? -1 : 1;
  const waveFlip = rand() < 0.5 ? -1 : 1;
  const amp = (vertical ? w : h) * (0.11 + rand() * 0.18);
  const freq = 0.85 + rand() * 1.85;
  const phase = rand() * Math.PI * 2;
  const cells = [];
  for (let i = 0; i < count; i++) {
    const t = Math.max(0.02, Math.min(0.98, (i + 0.5) / count + (rand() - 0.5) * 0.65 / count));
    const along = margin + t * ((vertical ? h : w) - margin * 2);
    const crossSpan = (vertical ? w : h) - margin * 2;
    const baseRatio = diagSlope === 0 ? 0.5 : diagSlope > 0 ? t : 1 - t;
    const wave = Math.sin(t * Math.PI * freq + phase) * amp * waveFlip + (rand() - 0.5) * sep * 0.85;
    const across = margin + baseRatio * crossSpan + wave;
    const p = vertical ? { x: across, y: along } : { x: along, y: across };
    p.x = Math.max(margin, Math.min(w - margin, p.x));
    p.y = Math.max(margin, Math.min(h - margin, p.y));
    cells.push(p);
  }
  return cells;
}
function twinCells(count, w, h, margin, rand) {
  const angle = rand() * Math.PI * 2;
  const dx = Math.cos(angle) * (w * 0.27);
  const dy = Math.sin(angle) * (h * 0.27);
  const lobes = [
    { x: w / 2 - dx, y: h / 2 - dy },
    { x: w / 2 + dx, y: h / 2 + dy }
  ];
  const spreadX = w * (0.17 + rand() * 0.08);
  const spreadY = h * (0.2 + rand() * 0.09);
  const cells = [];
  for (let i = 0; i < count; i++) {
    const lobe = lobes[i % 2];
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    cells.push({
      x: Math.max(margin, Math.min(w - margin, lobe.x + Math.cos(a) * spreadX * r)),
      y: Math.max(margin, Math.min(h - margin, lobe.y + Math.sin(a) * spreadY * r))
    });
  }
  return cells;
}
function spiralCells(count, w, h, margin, rand) {
  const cx = w / 2;
  const cy = h / 2;
  const maxRx = w / 2 - margin;
  const maxRy = h / 2 - margin;
  const arms = 2 + Math.floor(rand() * 2);
  const spin = (rand() < 0.5 ? -1 : 1) * (2.4 + rand() * 1.9);
  const baseAngle = rand() * Math.PI * 2;
  const cells = [];
  for (let i = 0; i < count; i++) {
    const arm = i % arms;
    const u = Math.min(1, (Math.floor(i / arms) + 0.45 + (rand() - 0.5) * 0.3) / Math.max(1, Math.ceil(count / arms)));
    const r = 0.24 + 0.74 * Math.sqrt(u);
    const theta = baseAngle + arm / arms * Math.PI * 2 + u * spin + (rand() - 0.5) * 0.35;
    cells.push({
      x: cx + Math.cos(theta) * maxRx * r,
      y: cy + Math.sin(theta) * maxRy * r
    });
  }
  return cells;
}
function crossCells(count, w, h, margin, rand) {
  const cx = w / 2;
  const cy = h / 2;
  const maxRx = w / 2 - margin;
  const maxRy = h / 2 - margin;
  const branches = 3 + Math.floor(rand() * 3);
  const baseAngle = rand() * Math.PI * 2;
  const bend = (rand() - 0.5) * 0.55;
  const cells = [];
  for (let i = 0; i < count; i++) {
    const br = i % branches;
    const rank = Math.floor(i / branches);
    const maxRank = Math.max(1, Math.ceil(count / branches) - 1);
    const r = 0.22 + rank / maxRank * 0.74 + (rand() - 0.5) * 0.1;
    const theta = baseAngle + br / branches * Math.PI * 2 + r * bend + (rand() - 0.5) * 0.28;
    cells.push({
      x: Math.max(margin, Math.min(w - margin, cx + Math.cos(theta) * maxRx * r)),
      y: Math.max(margin, Math.min(h - margin, cy + Math.sin(theta) * maxRy * r))
    });
  }
  return cells;
}
function centralizeTowers(cells, towerCount, w, h, rand) {
  if (towerCount <= 0) return [];
  const ranked = cells.map((p, index) => ({
    index,
    distance: ((p.x - w / 2) / w) ** 2 + ((p.y - h / 2) / h) ** 2
  })).sort((a, b) => a.distance - b.distance).slice(0, towerCount);
  const baseAngle = rand() * Math.PI * 2;
  ranked.forEach(({ index }, k) => {
    const p = cells[index];
    const targetAngle = baseAngle + k / Math.max(1, towerCount) * Math.PI * 2 + (rand() - 0.5) * 0.7;
    const targetRadius = towerCount === 1 ? rand() * 0.11 : 0.05 + rand() * 0.11;
    const anchorX = w / 2 + Math.cos(targetAngle) * w * targetRadius;
    const anchorY = h / 2 + Math.sin(targetAngle) * h * targetRadius;
    for (let guard = 0; guard < 5; guard++) {
      const distance2 = Math.hypot((p.x - w / 2) / w, (p.y - h / 2) / h);
      if (distance2 < 0.165) {
        p.x = p.x * 0.45 + anchorX * 0.55;
        p.y = p.y * 0.45 + anchorY * 0.55;
        break;
      }
      p.x += (anchorX - p.x) * 0.42;
      p.y += (anchorY - p.y) * 0.42;
    }
  });
  return ranked.map((item) => item.index);
}
function keepTowersCentral(cells, towerIndices, w, h) {
  for (const index of towerIndices) {
    const p = cells[index];
    const dx = (p.x - w / 2) / w;
    const dy = (p.y - h / 2) / h;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.215) {
      const scale = 0.205 / dist;
      p.x = w / 2 + dx * scale * w;
      p.y = h / 2 + dy * scale * h;
    }
  }
}
function createRandomLevel(raw) {
  const config = normalizeRandomMap(raw);
  const error = validateRandomMap(config);
  if (error) throw new Error(error);
  const { rand, seed, isMocked } = createUnpredictableRng();
  const castleTypes = [
    ...Array.from({ length: config.normal }, () => "barracks"),
    ...Array.from({ length: config.fast }, () => "speed"),
    ...Array.from({ length: config.heavy }, () => "heavy")
  ];
  const towerTypes = Array.from({ length: config.towers }, () => "tower");
  shuffled(castleTypes, rand);
  const total = castleTypes.length + towerTypes.length;
  const margin = config.largeMap ? 110 : 82;
  const naturalMinSep = config.largeMap ? total <= 14 ? 156 : total <= 24 ? 126 : 94 : 96;
  const overlapSep = Math.max(naturalMinSep, config.minDistance * PX_PER_METER);
  const layoutSpread = Math.max(config.largeMap ? 185 : 116, overlapSep);
  const columns = Math.max(2, Math.ceil(Math.sqrt(total * CFG.W / CFG.H)));
  const rows = Math.max(2, Math.ceil(total / columns));
  const baseW = margin * 2 + Math.max(0, columns - 1) * overlapSep;
  const baseH = margin * 2 + Math.max(0, rows - 1) * overlapSep;
  const worldWidth = config.largeMap ? Math.round(Math.max(1320, baseW) * (0.96 + rand() * 0.34)) : CFG.W;
  const worldHeight = config.largeMap ? Math.round(Math.max(830, baseH) * (0.96 + rand() * 0.3)) : CFG.H;
  const basePool = total > 24 ? ["scatter", "rows", "clusters", "twin", "spiral"] : config.largeMap ? [...LAYOUTS] : ["scatter", "rows", "ring", "clusters", "twin", "cross"];
  const freshLayouts = !isMocked ? basePool.filter((l) => !recentLayouts.includes(l)) : basePool;
  const layoutPool = freshLayouts.length > 0 ? freshLayouts : basePool;
  const layout = layoutPool[Math.floor(rand() * layoutPool.length)];
  if (!isMocked) {
    recentLayouts.push(layout);
    if (recentLayouts.length > 3) recentLayouts.shift();
  }
  const centerClear = config.towers > 0 && layout !== "rows" && layout !== "ring" && layout !== "cross" ? Math.min(worldWidth, worldHeight) * 0.15 : 0;
  let cells;
  if (layout === "rows") cells = rowsCells(total, worldWidth, worldHeight, margin, config.largeMap, rand);
  else if (layout === "ring") cells = ringCells(total, worldWidth, worldHeight, margin, rand);
  else if (layout === "clusters") cells = clusterCells(total, worldWidth, worldHeight, margin, layoutSpread, centerClear, rand);
  else if (layout === "valley") cells = valleyCells(total, worldWidth, worldHeight, margin, layoutSpread, rand);
  else if (layout === "twin") cells = twinCells(total, worldWidth, worldHeight, margin, rand);
  else if (layout === "spiral") cells = spiralCells(total, worldWidth, worldHeight, margin, rand);
  else if (layout === "cross") cells = crossCells(total, worldWidth, worldHeight, margin, rand);
  else cells = scatterCells(total, worldWidth, worldHeight, margin, layoutSpread, centerClear, rand);
  applySymmetryTransform(cells, worldWidth, worldHeight, margin, rand);
  const towerCells = centralizeTowers(cells, config.towers, worldWidth, worldHeight, rand);
  repairOverlap(cells, config.largeMap ? overlapSep : 96, worldWidth, worldHeight, margin);
  keepTowersCentral(cells, towerCells, worldWidth, worldHeight);
  repairOverlap(cells, config.largeMap ? Math.min(overlapSep, 90) : 86, worldWidth, worldHeight, margin);
  const towerCellSet = new Set(towerCells);
  const castleCells = cells.map((_, index) => index).filter((index) => !towerCellSet.has(index));
  const starts = furthestStarts(castleCells.map((index) => cells[index]), config.players, rand).map((index) => castleCells[index]);
  const reserved = new Set(starts);
  const available = shuffled(castleCells.filter((index) => !reserved.has(index)), rand);
  const startTypes = castleTypes.splice(0, config.players);
  const buildings = [];
  for (let player = 0; player < config.players; player++) {
    const p = cells[starts[player]];
    buildings.push([p.x, p.y, player + 1, startTypes[player], startTypes[player] === "heavy" ? 15 : 22]);
  }
  const neutralTypes = shuffled(castleTypes, rand);
  neutralTypes.forEach((type, index) => {
    const p = cells[available[index]];
    const troops = type === "tower" ? 7 + Math.floor(rand() * 4) : 4 + Math.floor(rand() * 6);
    buildings.push([p.x, p.y, 0, type, troops]);
  });
  towerCells.forEach((cellIndex) => {
    const p = cells[cellIndex];
    buildings.push([p.x, p.y, 0, "tower", 7 + Math.floor(rand() * 4)]);
  });
  const allThemes = Array.from({ length: THEME_COUNT }, (_, i) => i);
  const freshThemes = !isMocked ? allThemes.filter((t) => !recentThemes.includes(t)) : allThemes;
  const themePool = freshThemes.length > 0 ? freshThemes : allThemes;
  const theme = themePool[Math.floor(rand() * themePool.length)];
  if (!isMocked) {
    recentThemes.push(theme);
    if (recentThemes.length > 2) recentThemes.shift();
  }
  const summary = `${config.normal} عادی، ${config.fast} سریع، ${config.heavy} سنگین و ${config.towers} برج`;
  return {
    name: "نقشهٔ رندوم",
    ai: 0.55 + rand() * 0.3,
    hint: `${config.players} بازیکن · ${summary} · ${config.lakes} خلیج · ${config.ships} کشتی و ${config.boats} قایق · چیدمان ${LAYOUT_LABEL[layout]}. قلعه‌های شروع در اطراف نقشه پخش شده‌اند؛ برج‌ها و بقیهٔ قلعه‌ها خنثی هستند.`,
    b: buildings,
    worldWidth,
    worldHeight,
    largeMap: config.largeMap,
    theme,
    lakes: config.lakes,
    ships: config.ships,
    boats: config.boats,
    seed
  };
}

// src/game/terrain.ts
var THEMES = [
  { water: ["#0b3440", "#16716c", "#1f8e80"], ground: ["#7da85c", "#89b566", "#709b52", "#9ab96a"], rock: "#40585b", rim: "#b8c888", tree: "#547e41" },
  { water: ["#15363d", "#1d6866", "#369080"], ground: ["#a7a17b", "#b8b08a", "#999875", "#b2b182"], rock: "#5c625d", rim: "#d3c7a2", tree: "#668758" },
  { water: ["#192f40", "#235c6a", "#388294"], ground: ["#8fa6a6", "#a6b9b5", "#7f9f9f", "#acc2ba"], rock: "#455a67", rim: "#c8d6cc", tree: "#42696b" },
  { water: ["#14323c", "#20626b", "#2f8a8f"], ground: ["#b58a4c", "#c99f5f", "#a5763f", "#d4b071"], rock: "#6b5847", rim: "#e0c290", tree: "#b06a3c" },
  { water: ["#241d3f", "#453a70", "#6a5a9e"], ground: ["#6f7fa8", "#8293bb", "#5d6c94", "#93a4c9"], rock: "#3f4566", rim: "#b6c2e2", tree: "#4d5c86" }
];
var cache = /* @__PURE__ */ new WeakMap();
function clip(points, nx, ny, limit) {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const da = a.x * nx + a.y * ny - limit, db = b.x * nx + b.y * ny - limit;
    if (da <= 0) out.push(a);
    if (da <= 0 !== db <= 0) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}
function distanceToPolygon(p, points) {
  let best = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const d = distanceToLine(p, points[j], points[i]);
    if (d < best) best = d;
  }
  return best;
}
function carveBay(points, center, vertex, depth) {
  const n = points.length;
  if (n < 6) return points;
  const a = points[(vertex - 1 + n) % n];
  const b = points[(vertex + 1) % n];
  const v = points[vertex];
  const inward = { x: center.x - v.x, y: center.y - v.y };
  const len = Math.hypot(inward.x, inward.y) || 1;
  const ux = inward.x / len, uy = inward.y / len;
  const steps = 9;
  const bay = [];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const bulge = Math.sin(Math.PI * t) * depth;
    bay.push({ x: a.x + (b.x - a.x) * t + ux * bulge, y: a.y + (b.y - a.y) * t + uy * bulge });
  }
  return [...points.slice(0, vertex), ...bay, ...points.slice(vertex + 1)];
}
function bayCandidate(points, center, i, depth) {
  const v = points[i];
  const a = points[(i - 1 + points.length) % points.length];
  const b = points[(i + 1) % points.length];
  if (Math.hypot(v.x - center.x, v.y - center.y) < 78) return false;
  const chordMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const inward = { x: center.x - chordMid.x, y: center.y - chordMid.y };
  const len = Math.hypot(inward.x, inward.y) || 1;
  const tip = { x: chordMid.x + inward.x / len * depth, y: chordMid.y + inward.y / len * depth };
  if (Math.hypot(tip.x - center.x, tip.y - center.y) < 66) return false;
  return true;
}
function placeVessels(g, ships, boats, shores) {
  const out = [];
  const margin = 46;
  const sails = ["#f3ead6", "#e8b44c", "#dfe9ef"];
  const hulls = ["#6b4a2b", "#5c3f26", "#7a5533"];
  const build = (kind, i) => {
    const scale = kind === "ship" ? 0.98 + i % 3 * 0.12 : 0.74 + i % 3 * 0.08;
    const clear = (kind === "ship" ? 34 : 20) * scale;
    const cruise = out.length % 3 === 0;
    const drift = cruise ? kind === "ship" ? 20 : 13 : 0;
    const keep = clear + drift + 4;
    for (let guard = 0; guard < 260; guard++) {
      const x = margin + Math.random() * (g.worldWidth - margin * 2);
      const y = margin + Math.random() * (g.worldHeight - margin * 2);
      const p = { x, y };
      if (shores.some((points) => inside(p, points) || distanceToPolygon(p, points) < keep)) continue;
      if (g.links.some(([ia, ib]) => distanceToLine(p, g.bs[ia], g.bs[ib]) < 40 + keep)) continue;
      if (out.some((v) => Math.hypot(v.x - x, v.y - y) < 56 + keep)) continue;
      out.push({
        kind,
        x,
        y,
        scale,
        seed: out.length * 17 + (kind === "ship" ? 5 : 9),
        hull: hulls[out.length % hulls.length],
        sail: sails[out.length % sails.length],
        cruise,
        driftX: drift,
        driftY: drift * 0.42,
        spin: out.length % 2 === 0 ? 1 : -1,
        phase: out.length * 1.7 + (kind === "ship" ? 0.6 : 0)
      });
      return;
    }
  };
  for (let i = 0; i < ships; i++) build("ship", i);
  for (let i = 0; i < boats; i++) build("boat", i);
  return out;
}
function isOpenSea(p, islands, shores, g, clear) {
  for (let idx = 0; idx < shores.length; idx++) {
    const pts = shores[idx];
    if (inside(p, pts) || distanceToPolygon(p, pts) < clear) return false;
    const isl = islands[idx];
    if (isl && p.y > isl.y && Math.abs(p.x - isl.x) < 190) {
      const shifted = pts.map((q) => ({ x: q.x + 3, y: q.y + isl.depth + 8 }));
      if (inside(p, shifted) || distanceToPolygon(p, shifted) < clear * 0.85) return false;
    }
  }
  for (const [ia, ib] of g.links) {
    if (distanceToLine(p, g.bs[ia], g.bs[ib]) < 42 + clear) return false;
  }
  return true;
}
function isSeaRouteSafe(pts, islands, shores, g, clear) {
  if (pts.length < 2) return false;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.max(1, Math.ceil(seg / 10));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      if (!isOpenSea({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, islands, shores, g, clear)) {
        return false;
      }
    }
  }
  return true;
}
function buildVoyagers(g, count, islands, shores) {
  if (count <= 0) return [];
  const W = g.worldWidth;
  const H = g.worldHeight;
  const marginX = Math.max(380, Math.round(W * 0.48));
  const startX = -marginX;
  const endX = W + marginX;
  const steps = 38;
  const sails = ["#f3ead6", "#e8b44c", "#dfe9ef", "#f7d99c"];
  const hulls = ["#6b4a2b", "#5c3f26", "#7a5533", "#654328"];
  const routes = [];
  const yCandidates = [0.5, 0.22, 0.78, 0.35, 0.65, 0.12, 0.88].map((r) => r * H);
  const arches = [0, 58, -58, 95, -95];
  for (const yMid of yCandidates) {
    if (routes.length >= 2) break;
    for (const arch of arches) {
      const candidate = [];
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const x = startX + u * (endX - startX);
        const y = yMid + arch * Math.sin(Math.PI * u);
        candidate.push({ x, y });
      }
      if (isSeaRouteSafe(candidate, islands, shores, g, 46) && routes.every((prev) => Math.abs(prev[Math.floor(steps / 2)].y - candidate[Math.floor(steps / 2)].y) > 95)) {
        routes.push(candidate);
        break;
      }
    }
  }
  const buildCoastalLane = (south, extraMargin) => {
    const rawY = [];
    const baseEdgeY = south ? H - 54 + extraMargin * 0.5 : 58 - extraMargin * 0.5;
    for (let k = 0; k <= steps; k++) {
      const u = k / steps;
      const x = startX + u * (endX - startX);
      let bound = baseEdgeY;
      for (const isl of islands) {
        const pts2 = shores.find((_, idx) => islands[idx] === isl) ?? isl.points;
        for (const p of pts2) {
          const dx = Math.abs(p.x - x);
          if (dx > 135) continue;
          const weight = Math.cos(dx / 135 * (Math.PI / 2));
          if (south) {
            bound = Math.max(bound, p.y + isl.depth + (48 + extraMargin) * (0.55 + 0.45 * weight));
          } else {
            bound = Math.min(bound, p.y - (52 + extraMargin) * (0.55 + 0.45 * weight));
          }
        }
      }
      for (const [ia, ib] of g.links) {
        const A = g.bs[ia], B = g.bs[ib];
        const minX = Math.min(A.x, B.x) - 90, maxX = Math.max(A.x, B.x) + 90;
        if (x < minX || x > maxX) continue;
        const t = Math.max(0, Math.min(1, (x - A.x) / (B.x - A.x || 1)));
        const by = A.y + (B.y - A.y) * t;
        if (south) bound = Math.max(bound, by + 84 + extraMargin);
        else bound = Math.min(bound, by - 84 - extraMargin);
      }
      rawY.push(bound);
    }
    let smoothed = rawY.map((_, i) => {
      let sum = 0, wSum = 0;
      for (let d = -3; d <= 3; d++) {
        const j = Math.max(0, Math.min(steps, i + d));
        const w = 4 - Math.abs(d);
        sum += rawY[j] * w;
        wSum += w;
      }
      return sum / wSum;
    });
    let pts = smoothed.map((y, k) => ({ x: startX + k / steps * (endX - startX), y }));
    for (let push = 0; push < 12 && !isSeaRouteSafe(pts, islands, shores, g, 42); push++) {
      smoothed = smoothed.map((y) => y + (south ? 18 : -18));
      pts = smoothed.map((y, k) => ({ x: startX + k / steps * (endX - startX), y }));
    }
    return pts;
  };
  routes.push(buildCoastalLane(true, 0));
  routes.push(buildCoastalLane(false, 0));
  routes.push(buildCoastalLane(true, 56));
  const out = [];
  const speeds = [25, 29, 22, 27];
  const startFracs = [0.24, 0.63, 0.44, 0.81];
  for (let i = 0; i < count; i++) {
    const baseRoute = routes[i % routes.length];
    const ordered = i % 2 === 0 ? baseRoute : [...baseRoute].reverse();
    if (!isSeaRouteSafe(ordered, islands, shores, g, 38)) continue;
    const cumLen = [0];
    for (let k = 1; k < ordered.length; k++) {
      cumLen.push(cumLen[k - 1] + Math.hypot(ordered[k].x - ordered[k - 1].x, ordered[k].y - ordered[k - 1].y));
    }
    const totalLen = cumLen[cumLen.length - 1];
    if (totalLen < 80) continue;
    out.push({
      waypoints: ordered,
      cumLen,
      totalLen,
      speed: speeds[i % speeds.length],
      offset: totalLen * startFracs[i % startFracs.length],
      scale: 0.96 + i % 3 * 0.1,
      seed: 101 + i * 29,
      hull: hulls[i % hulls.length],
      sail: sails[i % sails.length]
    });
  }
  return out;
}
function voyagerPose(v, time) {
  const pauseGap = 90;
  const cycle = v.totalLen + pauseGap;
  const d = ((time * v.speed + v.offset) % cycle + cycle) % cycle;
  if (d > v.totalLen) {
    const last = v.waypoints[v.waypoints.length - 1];
    const prev = v.waypoints[v.waypoints.length - 2] ?? last;
    return { x: last.x, y: last.y, tilt: 0, dir: last.x >= prev.x ? 1 : -1, visible: false };
  }
  let idx = 0;
  while (idx < v.cumLen.length - 2 && v.cumLen[idx + 1] < d) idx++;
  const segStart = v.cumLen[idx];
  const segLen = Math.max(1e-6, v.cumLen[idx + 1] - segStart);
  const t = (d - segStart) / segLen;
  const a = v.waypoints[idx];
  const b = v.waypoints[idx + 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dir = dx >= 0 ? 1 : -1;
  const bob = Math.sin(time * 1.45 + v.seed) * 1.7;
  const slopeTilt = Math.max(-0.12, Math.min(0.12, dy / (Math.abs(dx) || 1) * 0.22));
  const waveTilt = Math.sin(time * 1.05 + v.seed * 1.3) * 0.028 + slopeTilt * dir;
  return {
    x: a.x + dx * t,
    y: a.y + dy * t + bob,
    tilt: waveTilt,
    dir,
    visible: true
  };
}
function landscapeFor(g) {
  const known = cache.get(g);
  if (known?.buildings === g.bs && known.links === g.links) return known.landscape;
  const themeIndex = g.demo ? 0 : Math.abs(g.L.theme ?? Math.floor(g.i / 10)) % THEMES.length;
  const theme = THEMES[themeIndex];
  const mapSalt = (g.L.seed ?? 0) % 9973 * 0.37;
  const scenery = [];
  const hills = [];
  const vessels = [];
  const lakeCount = Math.max(0, Math.min(MAX_LAKES, g.L.lakes ?? 0));
  const bayOrder = g.bs.map((b) => b.id);
  if (lakeCount > 0 && bayOrder.length > 1) {
    for (let i = bayOrder.length - 1; i > 0; i--) {
      const j = Math.floor(noise2(g.i * 97 + i * 13 + 5 + mapSalt) * (i + 1));
      [bayOrder[i], bayOrder[j]] = [bayOrder[j], bayOrder[i]];
    }
  }
  const basePolys = /* @__PURE__ */ new Map();
  for (const b of g.bs) {
    const nearest = Math.min(...g.bs.filter((q) => q !== b).map((q) => Math.hypot(q.x - b.x, (q.y - b.y) * 1.15)));
    const rx = Math.max(70, Math.min(190, nearest * 0.56 + 28));
    const ry = rx * 0.72;
    let points = ring(b.x, b.y + 8, rx, ry, 10, 0.16 + noise2(b.id * 5 + g.i + mapSalt) * 0.25).map((p, i) => ({ x: b.x + (p.x - b.x) * (0.88 + noise2(i * 7 + b.id * 13 + mapSalt) * 0.17), y: b.y + (p.y - b.y) * (0.88 + noise2(i * 9 + b.id * 3 + mapSalt) * 0.17) }));
    for (const other of g.bs) {
      if (other === b) continue;
      const nx = other.x - b.x, ny = (other.y - b.y) * 1.4;
      points = clip(points, nx, ny, nx * (b.x + other.x) / 2 + ny * (b.y + other.y) / 2);
    }
    points = points.map((p) => ({ x: b.x + (p.x - b.x) * 0.9, y: b.y + (p.y - b.y) * 0.9 }));
    if (points.length > 12) {
      points = points.filter((p, i) => {
        const next = points[(i + 1) % points.length];
        return Math.hypot(p.x - next.x, p.y - next.y) >= 12;
      });
    }
    basePolys.set(b.id, { b, rx, ry, points });
  }
  let baysCarved = 0;
  for (const id of bayOrder) {
    if (baysCarved >= lakeCount) break;
    const entry = basePolys.get(id);
    if (!entry) continue;
    const { b, points } = entry;
    const center = { x: b.x, y: b.y + 4 };
    let bestVertex = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < points.length; i++) {
      const v = points[i];
      const clearance = Math.hypot(v.x - center.x, v.y - center.y);
      if (clearance < 84) continue;
      if (g.links.some(([ia, ib]) => distanceToLine(v, g.bs[ia], g.bs[ib]) < 62)) continue;
      if (!bayCandidate(points, center, i, 32)) continue;
      const openness = Math.min(...g.bs.filter((q) => q !== b).map((q) => Math.hypot(q.x - v.x, (q.y - v.y) * 1.2)));
      const score = Math.min(clearance, 190) * 0.35 + Math.min(openness, 220) * 0.65;
      if (score > bestScore) {
        bestScore = score;
        bestVertex = i;
      }
    }
    if (bestVertex >= 0) {
      const v = points[bestVertex];
      const reach = Math.hypot(v.x - center.x, v.y - center.y);
      const clearance = Math.min(...g.links.flatMap(([ia, ib]) => {
        const A = g.bs[ia], B = g.bs[ib];
        const dx = B.x - A.x, dy = B.y - A.y;
        const len2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((v.x - A.x) * dx + (v.y - A.y) * dy) / len2));
        return [Math.hypot(v.x - A.x - t * dx, v.y - A.y - t * dy)];
      }).concat([999]));
      const carve = Math.max(30, Math.min(76, Math.min(reach - 82, clearance - 20)));
      const carved = carveBay(points, center, bestVertex, carve);
      if (carved.length >= 6) {
        entry.points = carved;
        baysCarved++;
      }
    }
  }
  const islands = g.bs.map((b) => {
    const { rx, ry, points } = basePolys.get(b.id);
    const depth = 15 + noise2(b.id * 17 + 6 + mapSalt) * 38 + (noise2(b.id * 29 + 3 + mapSalt) > 0.7 ? 14 : 0);
    for (let k = 0; k < 4; k++) {
      const angle = k / 4 * Math.PI * 2 + noise2(b.id + k * 4 + mapSalt) * 0.7;
      const p = { x: b.x + Math.cos(angle) * rx * 0.67, y: b.y + Math.sin(angle) * ry * 0.67 };
      if (Math.hypot(p.x - b.x, (p.y - b.y) * 1.6) < 65) continue;
      if (Math.abs(p.x - b.x) < 48 && p.y > b.y - 20) continue;
      if (!inside(p, points)) continue;
      if (g.links.some(([a, z]) => distanceToLine(p, g.bs[a], g.bs[z]) < 24)) continue;
      scenery.push({ ...p, scale: 0.65 + noise2(k * 19 + b.id + mapSalt) * 0.7, type: k === 3 ? "ruin" : k % 2 ? "rock" : "pine", seed: b.id * 13 + k, color: theme.tree });
    }
    const hillCount = rx > 120 ? noise2(b.id * 41 + 5 + mapSalt) > 0.45 ? 2 : 1 : noise2(b.id * 41 + 5 + mapSalt) > 0.6 ? 1 : 0;
    for (let k = 0; k < hillCount; k++) {
      const angle = noise2(b.id * 53 + k * 7 + mapSalt) * Math.PI * 2;
      const reach = 0.34 + noise2(b.id * 61 + k * 3 + mapSalt) * 0.32;
      const p = { x: b.x + Math.cos(angle) * rx * reach, y: b.y + 10 + Math.sin(angle) * ry * reach };
      const r = 16 + noise2(b.id * 67 + k * 11 + mapSalt) * 20;
      const h = 8 + noise2(b.id * 71 + k * 13 + mapSalt) * 13;
      if (!inside(p, points)) continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) < 62) continue;
      if (g.links.some(([a, z]) => distanceToLine(p, g.bs[a], g.bs[z]) < 42)) continue;
      if (hills.some((hill) => Math.hypot(hill.x - p.x, hill.y - p.y) < hill.r + r + 12)) continue;
      if ([[10, 0], [-10, 0], [0, 8], [0, -8]].some(([dx, dy]) => !inside({ x: p.x + dx, y: p.y + dy }, points))) continue;
      hills.push({ island: b.id, ...p, r, h, seed: b.id * 17 + k * 5 });
    }
    const surface = b.type === "tower" ? { ...theme, ground: ["#8c9b8e", "#a1aca0", "#7e8e86", "#adb5a6"], rim: "#bac3ac" } : theme;
    return { id: b.id, x: b.x, y: b.y, points, depth, theme: surface };
  }).sort((a, b) => a.y - b.y);
  const shores = islands.map((island) => island.points);
  const shipSetting = g.L.ships;
  const boatSetting = g.L.boats;
  const localShips = Math.max(0, Math.min(MAX_SHIPS, shipSetting ?? 1));
  const localBoats = Math.max(0, Math.min(MAX_BOATS, boatSetting ?? 2));
  vessels.push(...placeVessels(g, localShips, localBoats, shores));
  const voyagerCount = shipSetting === 0 ? 0 : Math.min(4, Math.max(3, shipSetting ?? 3));
  const voyagers = buildVoyagers(g, voyagerCount, islands, shores);
  const bridges = g.links.flatMap(([a, b]) => bridgeWaterSpans(g.bs[a], g.bs[b], shores));
  const roads = [];
  for (const [ia, ib] of g.links) {
    const A = g.bs[ia], B = g.bs[ib];
    const dx = B.x - A.x, dy = B.y - A.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= 1) continue;
    const water = bridgeWaterSpans(A, B, shores).map((span) => [
      ((span.a.x - A.x) * dx + (span.a.y - A.y) * dy) / lengthSquared,
      ((span.b.x - A.x) * dx + (span.b.y - A.y) * dy) / lengthSquared
    ]).sort((x, y) => x[0] - y[0]);
    let cursor = 0;
    for (const [t0, t1] of [...water, [1, 1]]) {
      if (t0 - cursor > 0.012) {
        const p0 = { x: A.x + dx * cursor, y: A.y + dy * cursor };
        const p1 = { x: A.x + dx * t0, y: A.y + dy * t0 };
        const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const island = islands.find((item) => inside(mid, item.points));
        if (island) roads.push({ island: island.id, a: p0, b: p1 });
      }
      cursor = Math.max(cursor, t1);
    }
  }
  const landscape = { islands, scenery, hills, vessels, voyagers, roads, bridges, theme };
  cache.set(g, { buildings: g.bs, links: g.links, landscape });
  return landscape;
}
function inside(p, points) {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if (a.y > p.y !== b.y > p.y && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}
function distanceToLine(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}
function drawWater(c, g, width, height, time) {
  const colors = g ? landscapeFor(g).theme.water : THEMES[0].water;
  const gradient = c.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.55, colors[1]);
  gradient.addColorStop(1, colors[2]);
  c.fillStyle = gradient;
  c.fillRect(0, 0, width, height);
  c.lineCap = "round";
  for (let i = 0; i < 60; i++) {
    const x = noise2(i * 5.71) * width, y = noise2(i * 8.91 + 2) * height;
    const drift = Math.sin(time * 0.4 + i) * 8;
    c.strokeStyle = `rgba(164,236,208,${0.035 + 0.035 * Math.sin(time * 0.7 + i)})`;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(x + drift, y);
    c.quadraticCurveTo(x + 14 + drift, y + 3, x + 31 + drift, y);
    c.stroke();
  }
}
var BRIDGE_WALL = 16;
function drawBridge(c, a, b, depthA, depthB) {
  const spanLength = Math.hypot(b.x - a.x, b.y - a.y);
  if (spanLength < 0.5) return;
  const ux = (b.x - a.x) / spanLength, uy = (b.y - a.y) / spanLength;
  const approach = BRIDGE_APPROACH;
  a = { x: a.x - ux * approach, y: a.y - uy * approach };
  b = { x: b.x + ux * approach, y: b.y + uy * approach };
  const length = spanLength + approach * 2;
  const vx = -uy * BRIDGE_HALF_WIDTH, vy = ux * BRIDGE_HALF_WIDTH;
  const wallA = Math.max(BRIDGE_WALL, Math.min(64, depthA * 0.9));
  const wallB = Math.max(BRIDGE_WALL, Math.min(64, depthB * 0.9));
  const top = [
    { x: a.x + vx, y: a.y + vy },
    { x: a.x - vx, y: a.y - vy },
    { x: b.x - vx, y: b.y - vy },
    { x: b.x + vx, y: b.y + vy }
  ];
  polygon(c, top.map((p, i) => ({ x: p.x + 3, y: p.y + (i < 2 ? wallA : wallB) + 6 })), "rgba(4,28,30,.28)");
  polygon(c, [top[1], top[2], { x: top[2].x, y: top[2].y + wallB }, { x: top[1].x, y: top[1].y + wallA }], "#2f4a46");
  polygon(c, [top[3], top[0], { x: top[0].x, y: top[0].y + wallA }, { x: top[3].x, y: top[3].y + wallB }], "#3a5751");
  c.strokeStyle = "rgba(146,178,168,.35)";
  c.lineWidth = 1;
  for (let d = 20; d < length - 12; d += 26) {
    const t = d / length;
    const wall = wallA + (wallB - wallA) * t;
    const x = a.x + ux * d, y = a.y + uy * d;
    c.beginPath();
    c.moveTo(x - vx, y - vy + wall * 0.25);
    c.lineTo(x - vx, y - vy + wall * 0.85);
    c.stroke();
    c.beginPath();
    c.moveTo(x + vx, y + vy + wall * 0.25);
    c.lineTo(x + vx, y + vy + wall * 0.85);
    c.stroke();
  }
  const deck = c.createLinearGradient(a.x, a.y, b.x, b.y);
  const highFirst = wallA >= wallB;
  deck.addColorStop(0, highFirst ? "#e7ebd2" : "#c2c8aa");
  deck.addColorStop(1, highFirst ? "#c2c8aa" : "#e7ebd2");
  polygon(c, top, deck);
  c.strokeStyle = "#aab297";
  c.lineWidth = 1.1;
  for (let d = 13; d < length; d += 15) {
    const x = a.x + ux * d, y = a.y + uy * d;
    c.beginPath();
    c.moveTo(x + vx, y + vy);
    c.lineTo(x - vx, y - vy);
    c.stroke();
  }
  c.strokeStyle = "rgba(255,255,255,.22)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.stroke();
  c.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    c.strokeStyle = side < 0 ? "#e8ead0" : "#7f8b76";
    c.beginPath();
    c.moveTo(a.x + vx * side, a.y + vy * side);
    c.lineTo(b.x + vx * side, b.y + vy * side);
    c.stroke();
  }
}
function shoreDepth(islands, point) {
  let best = 30;
  let bestDistance = Infinity;
  for (const island of islands) {
    const distance2 = Math.hypot(island.x - point.x, island.y - point.y);
    if (distance2 < bestDistance) {
      bestDistance = distance2;
      best = island.depth;
    }
  }
  return best;
}
function drawHill(c, hill, theme) {
  shadow(c, hill.x + 5, hill.y + 7, hill.r * 0.95, hill.r * 0.48, 0.15);
  prism(c, ring(hill.x, hill.y, hill.r, hill.r * 0.5, 8), hill.h, theme.ground[2]);
  prism(c, ring(hill.x - hill.r * 0.12, hill.y - hill.h + 1, hill.r * 0.55, hill.r * 0.3, 7), hill.h * 0.5, theme.ground[1]);
}
function vesselPose(v, time) {
  const angle = time * 0.13 * v.spin + v.phase;
  const driftX = v.cruise ? Math.cos(angle) * v.driftX : 0;
  const driftY = v.cruise ? Math.sin(angle) * v.driftY : 0;
  const bob = Math.sin(time * 1.3 + v.seed) * 1.6;
  const tilt = Math.sin(time * 0.9 + v.seed * 1.7) * 0.02 - (v.cruise ? Math.sin(angle) * 0.045 : 0);
  return { x: v.x + driftX, y: v.y + driftY + bob, tilt, moving: v.cruise };
}
function drawVessel(c, v, time) {
  const pose = vesselPose(v, time);
  if (Math.abs(pose.tilt) > 1e-4) {
    c.save();
    c.translate(pose.x, pose.y);
    c.rotate(pose.tilt * 0.45);
    c.translate(-pose.x, -pose.y);
    paintVessel(c, v, pose);
    c.restore();
  } else {
    paintVessel(c, v, pose);
  }
}
function paintVessel(c, v, pose) {
  const tilt = pose.tilt;
  const s = v.scale;
  const x = pose.x;
  const y = pose.y;
  c.fillStyle = "rgba(6,40,46,.22)";
  c.beginPath();
  c.ellipse(x + 1, y + 4, 26 * s, 8 * s, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = "rgba(164,236,208,.22)";
  c.lineWidth = 1.2;
  c.beginPath();
  c.ellipse(x, y + 3, 22 * s, 7 * s, 0, 0, Math.PI * 2);
  c.stroke();
  if (pose.moving) {
    c.strokeStyle = "rgba(198,248,232,.20)";
    c.lineWidth = 1.4 * s;
    c.beginPath();
    c.moveTo(x - 15 * s, y + 6 * s);
    c.quadraticCurveTo(x, y + 11 * s, x + 15 * s, y + 6 * s);
    c.stroke();
  }
  const hull = v.hull;
  const deck = tint(hull, 26);
  const dark = tint(hull, -32);
  if (v.kind === "boat") {
    c.beginPath();
    c.moveTo(x - 16 * s, y - 2 * s);
    c.quadraticCurveTo(x, y + 8 * s, x + 16 * s, y - 2 * s);
    c.lineTo(x + 11 * s, y - 6 * s);
    c.lineTo(x - 11 * s, y - 6 * s);
    c.closePath();
    c.fillStyle = dark;
    c.fill();
    c.beginPath();
    c.moveTo(x - 13 * s, y - 4.5 * s);
    c.quadraticCurveTo(x, y + 4 * s, x + 13 * s, y - 4.5 * s);
    c.closePath();
    c.fillStyle = tint(hull, 62);
    c.fill();
    c.strokeStyle = tint(hull, 88);
    c.lineWidth = 1.1 * s;
    c.beginPath();
    c.moveTo(x - 13 * s, y - 4.5 * s);
    c.quadraticCurveTo(x, y + 4 * s, x + 13 * s, y - 4.5 * s);
    c.stroke();
    c.strokeStyle = dark;
    c.lineWidth = 1.2 * s;
    c.beginPath();
    c.moveTo(x - 6 * s, y - 4.2 * s);
    c.lineTo(x + 6 * s, y - 4.2 * s);
    c.stroke();
    for (const dir of [-1, 1]) {
      c.strokeStyle = tint(deck, 60);
      c.lineWidth = 1.4 * s;
      c.beginPath();
      c.moveTo(x + dir * 4 * s, y - 3 * s);
      c.lineTo(x + dir * 17 * s, y + 4 * s);
      c.stroke();
      c.beginPath();
      c.ellipse(x + dir * 18 * s, y + 4.6 * s, 3.2 * s, 1.7 * s, dir * 0.5, 0, Math.PI * 2);
      c.fillStyle = tint(deck, 44);
      c.fill();
    }
    const post = y - 22 * s;
    c.strokeStyle = tint(hull, -52);
    c.lineWidth = 1.3 * s;
    c.beginPath();
    c.moveTo(x, y - 5 * s);
    c.lineTo(x, post);
    c.stroke();
    c.beginPath();
    c.moveTo(x, post);
    c.lineTo(x + 8 * s, post + 3 * s);
    c.lineTo(x, post + 6 * s);
    c.closePath();
    c.fillStyle = v.sail;
    c.fill();
    return;
  }
  c.beginPath();
  c.moveTo(x - 26 * s, y - 6 * s);
  c.quadraticCurveTo(x, y + 10 * s, x + 26 * s, y - 6 * s);
  c.lineTo(x + 19 * s, y - 11 * s);
  c.lineTo(x - 19 * s, y - 11 * s);
  c.closePath();
  c.fillStyle = dark;
  c.fill();
  c.beginPath();
  c.moveTo(x - 22 * s, y - 9 * s);
  c.quadraticCurveTo(x, y + 5 * s, x + 22 * s, y - 9 * s);
  c.closePath();
  c.fillStyle = deck;
  c.fill();
  c.strokeStyle = tint(hull, 46);
  c.lineWidth = 1.2 * s;
  c.beginPath();
  c.moveTo(x - 20 * s, y - 8.5 * s);
  c.quadraticCurveTo(x, y + 3 * s, x + 20 * s, y - 8.5 * s);
  c.stroke();
  const mastTop = y - 42 * s;
  c.strokeStyle = tint(hull, -52);
  c.lineWidth = 1.6 * s;
  c.beginPath();
  c.moveTo(x, y - 9 * s);
  c.lineTo(x, mastTop);
  c.stroke();
  c.save();
  c.translate(x, y - 9 * s);
  c.rotate(tilt);
  const sail = v.sail;
  c.beginPath();
  c.moveTo(x * 0 + 1.2 * s, -34 * s);
  c.quadraticCurveTo(17 * s, -22 * s, 12 * s, -2 * s);
  c.lineTo(1.2 * s, -2 * s);
  c.closePath();
  c.fillStyle = sail;
  c.fill();
  c.strokeStyle = "rgba(0,0,0,.16)";
  c.lineWidth = 0.9 * s;
  c.stroke();
  c.beginPath();
  c.moveTo(-2.4 * s, -31 * s);
  c.quadraticCurveTo(-15 * s, -20 * s, -11 * s, -3 * s);
  c.lineTo(-2.4 * s, -3 * s);
  c.closePath();
  c.fillStyle = tint(sail, 26);
  c.fill();
  c.strokeStyle = "rgba(0,0,0,.16)";
  c.stroke();
  c.beginPath();
  c.moveTo(0, -38 * s);
  c.lineTo(7 * s, -35.5 * s);
  c.lineTo(0, -33 * s);
  c.closePath();
  c.fillStyle = "#e8b44c";
  c.fill();
  c.restore();
}
function drawVoyager(c, v, time) {
  const pose = voyagerPose(v, time);
  if (!pose.visible) return;
  const s = v.scale;
  const x = pose.x;
  const y = pose.y;
  const dir = pose.dir;
  c.save();
  c.strokeStyle = "rgba(206,250,236,.26)";
  c.lineWidth = 1.6 * s;
  c.beginPath();
  c.moveTo(x - dir * 18 * s, y + 1 * s);
  c.quadraticCurveTo(x - dir * 36 * s, y - 4 * s, x - dir * 56 * s, y - 8 * s);
  c.moveTo(x - dir * 18 * s, y + 3 * s);
  c.quadraticCurveTo(x - dir * 36 * s, y + 8 * s, x - dir * 56 * s, y + 12 * s);
  c.stroke();
  c.translate(x, y);
  if (dir < 0) c.scale(-1, 1);
  if (Math.abs(pose.tilt) > 1e-4) c.rotate(pose.tilt * 0.45);
  c.translate(-x, -y);
  paintVessel(
    c,
    {
      kind: "ship",
      x,
      y,
      scale: s,
      seed: v.seed,
      hull: v.hull,
      sail: v.sail,
      cruise: true,
      driftX: 0,
      driftY: 0,
      spin: 1,
      phase: 0
    },
    { x, y, tilt: pose.tilt, moving: true }
  );
  c.restore();
}
function drawTerrain(c, g, time) {
  const { islands, bridges, hills, vessels, voyagers } = landscapeFor(g);
  for (const vessel of vessels) drawVessel(c, vessel, time);
  for (const ship of voyagers) drawVoyager(c, ship, time);
  for (const island of islands) {
    polygon(c, island.points.map((p) => ({ x: p.x + 10, y: p.y + island.depth + 5 })), "rgba(6,40,40,.22)");
    c.strokeStyle = `rgba(121,228,202,${0.12 + Math.sin(time * 1.1 + island.id) * 0.04})`;
    c.lineWidth = 9;
    c.beginPath();
    island.points.forEach((p, i) => i ? c.lineTo(p.x, p.y + island.depth + 3) : c.moveTo(p.x, p.y + island.depth + 3));
    c.closePath();
    c.stroke();
  }
  for (const island of islands) {
    const bottom = island.points.map((p) => ({ x: p.x + 3, y: p.y + island.depth }));
    const top = island.points;
    for (let i = 0; i < top.length; i++) {
      const j = (i + 1) % top.length;
      if (top[j].x >= top[i].x) continue;
      const face = [top[i], top[j], bottom[j], bottom[i]];
      polygon(c, face, tint(island.theme.rock, -15 + noise2(i + island.id) * 25));
      polygon(c, [top[j], bottom[j], bottom[i]], tint(island.theme.rock, -35 + noise2(i * 2) * 12));
      const seam = { x: top[i].x + (top[j].x - top[i].x) * 0.56, y: top[i].y + (top[j].y - top[i].y) * 0.56 };
      polygon(c, [seam, { x: seam.x - 6, y: seam.y + island.depth * 0.72 }, bottom[j]], "rgba(0,15,22,.14)");
    }
    polygon(c, top, island.theme.ground[0]);
    const center = { x: island.x + 8, y: island.y + 12 };
    for (let i = 0; i < top.length; i++) polygon(c, [center, top[i], top[(i + 1) % top.length]], island.theme.ground[(island.id + i) % island.theme.ground.length]);
    if (top.length >= 3) {
      c.save();
      c.beginPath();
      c.moveTo(top[0].x, top[0].y);
      for (let i = 1; i < top.length; i++) c.lineTo(top[i].x, top[i].y);
      c.closePath();
      c.clip();
      const light = c.createRadialGradient(island.x - 40, island.y - 46, 12, island.x, island.y, 210);
      light.addColorStop(0, "rgba(255,252,230,.14)");
      light.addColorStop(0.62, "rgba(255,252,230,0)");
      light.addColorStop(1, "rgba(10,26,24,.12)");
      c.fillStyle = light;
      c.fill();
      c.restore();
    }
    for (let i = 0; i < top.length; i++) {
      const j = (i + 1) % top.length;
      c.strokeStyle = top[j].x < top[i].x ? island.theme.rim : "#b9d68b44";
      c.lineWidth = 2.3;
      c.beginPath();
      c.moveTo(top[i].x, top[i].y);
      c.lineTo(top[j].x, top[j].y);
      c.stroke();
    }
    for (const hill of hills) if (hill.island === island.id) drawHill(c, hill, island.theme);
    for (let i = 0; i < 5; i++) {
      const x = island.x + (noise2(island.id * 51 + i * 3) - 0.5) * 110;
      const y = island.y + 32 + noise2(island.id * 19 + i * 6) * 20;
      if (inside({ x, y }, top)) polygon(c, ring(x, y, 4 + noise2(i) * 5, 2 + noise2(i + 2) * 3, 5), "rgba(232,224,186,.3)");
    }
  }
  if (bridges.length) {
    c.save();
    c.beginPath();
    c.rect(-512, -512, g.worldWidth + 1024, g.worldHeight + 1024);
    for (const { points } of islands) {
      if (points.length < 3) continue;
      c.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
      c.closePath();
    }
    c.clip("evenodd");
    for (const { a, b } of bridges) drawBridge(c, a, b, shoreDepth(islands, a), shoreDepth(islands, b));
    c.restore();
  }
}
function drawScenery(c, item, time) {
  c.save();
  c.translate(item.x, item.y);
  c.scale(item.scale, item.scale);
  shadow(c, 10, 7, 17, 6, 0.18);
  if (item.type === "pine") {
    const sway = Math.sin(time * 0.8 + item.seed) * 0.8;
    prism(c, ring(0, 1, 3, 2, 5), 20, "#5e5440");
    for (let i = 0; i < 3; i++) {
      const w = 21 - i * 5, y = -9 - i * 12;
      polygon(c, [{ x: -w, y }, { x: sway, y: y - 27 }, { x: 0, y: y + 7 }], tint(item.color, 15));
      polygon(c, [{ x: 0, y: y + 7 }, { x: sway, y: y - 27 }, { x: w, y }], tint(item.color, -19));
      polygon(c, [{ x: -w, y }, { x: 0, y: y + 7 }, { x: w, y }], tint(item.color, -32));
    }
  } else if (item.type === "rock") {
    const top = prism(c, ring(0, 0, 15, 9, 5), 10, "#8c9c8e");
    polygon(c, [top[0], { x: -3, y: -19 }, top[2]], "#c0c7aa");
    polygon(c, [top[2], { x: -3, y: -19 }, top[4]], "#9cab9d");
  } else {
    prism(c, ring(0, 2, 9, 5, 6), 5, "#a4ad92");
    prism(c, ring(-1, 0, 5, 3, 6), 18, "#b4bda4");
  }
  c.restore();
}

// src/game/navigation.ts
var EPSILON3 = 1e-7;
var distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function pathLength(points) {
  return points.slice(1).reduce((sum, point, i) => sum + distance(points[i], point), 0);
}
function samplePath(points, travelled) {
  if (!points.length) return { x: 0, y: 0, angle: 0, laneWidth: 0 };
  let remaining = Math.max(0, travelled);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const length = distance(a, b);
    if (length <= EPSILON3) continue;
    if (remaining <= length || i === points.length - 1) {
      const t = Math.min(1, remaining / length);
      const laneWidth = Math.min(a.laneWidth ?? TROOP_LANE_SPACING, b.laneWidth ?? TROOP_LANE_SPACING);
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        angle: Math.atan2(b.y - a.y, b.x - a.x),
        laneWidth
      };
    }
    remaining -= length;
  }
  const p = points[points.length - 1];
  return { x: p.x, y: p.y, angle: 0, laneWidth: 0 };
}
function bypassFor(building, surfaces) {
  const shore = surfaces.find((island) => island.id === building.id)?.points ?? [];
  const bankDistance = shore.length >= 3 ? Math.min(...shore.map((a, i) => distanceToSegment(building, a, shore[(i + 1) % shore.length]))) : 64;
  const radius = Math.max(1, Math.min(58, bankDistance - TROOP_FOOT_RADIUS - 1));
  const laneWidth = Math.max(0, Math.min(TROOP_LANE_SPACING, bankDistance - radius - TROOP_FOOT_RADIUS - 1));
  return { center: building, radius, laneWidth };
}
function radial(circle, toward) {
  const dx = toward.x - circle.center.x, dy = toward.y - circle.center.y;
  const length = Math.hypot(dx, dy) || 1;
  return {
    x: circle.center.x + dx / length * circle.radius,
    y: circle.center.y + dy / length * circle.radius,
    laneWidth: circle.laneWidth
  };
}
function append(output, point) {
  const last = output[output.length - 1];
  if (last && distance(last, point) < EPSILON3) {
    last.laneWidth = Math.min(last.laneWidth ?? TROOP_LANE_SPACING, point.laneWidth ?? TROOP_LANE_SPACING);
  } else output.push({ ...point });
}
function arc(circle, a, b) {
  const from = Math.atan2(a.y - circle.center.y, a.x - circle.center.x);
  let turn = Math.atan2(b.y - circle.center.y, b.x - circle.center.x) - from;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn <= -Math.PI) turn += Math.PI * 2;
  if (Math.abs(Math.abs(turn) - Math.PI) < EPSILON3 && Math.sin(from + turn / 2) < 0) turn = -turn;
  const steps = Math.max(1, Math.ceil(Math.abs(turn) / (Math.PI / 24)));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = from + turn * i / steps;
    return {
      x: circle.center.x + Math.cos(angle) * circle.radius,
      y: circle.center.y + Math.sin(angle) * circle.radius,
      laneWidth: circle.laneWidth
    };
  });
}
function bypassCrossedKeeps(a, b, circles, output) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < EPSILON3) {
    append(output, b);
    return;
  }
  const crossings = [];
  for (const circle of circles) {
    const x = a.x - circle.center.x, y = a.y - circle.center.y;
    const projection = x * dx + y * dy;
    const discriminant = projection * projection - lengthSquared * (x * x + y * y - circle.radius ** 2);
    if (discriminant <= EPSILON3) continue;
    const root = Math.sqrt(discriminant);
    const entry = (-projection - root) / lengthSquared;
    const exit = (-projection + root) / lengthSquared;
    if (entry <= EPSILON3 || exit >= 1 - EPSILON3) continue;
    crossings.push({ circle, entry, exit });
  }
  crossings.sort((p, q) => p.entry - q.entry);
  for (const { circle, entry, exit } of crossings) {
    const from = { x: a.x + dx * entry, y: a.y + dy * entry };
    const to = { x: a.x + dx * exit, y: a.y + dy * exit };
    for (const p of arc(circle, from, to)) append(output, p);
  }
  append(output, b);
}
function islandClearance(point, polygon2) {
  let best = Infinity;
  for (let i = 0, j = polygon2.length - 1; i < polygon2.length; j = i++) {
    const d = distanceToSegment(point, polygon2[j], polygon2[i]);
    if (d < best) best = d;
  }
  return best;
}
function shoreGuard(points, surfaces, buildings) {
  if (points.length < 2 || !surfaces.length) return points;
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length < 24) {
      out.push(b);
      continue;
    }
    const steps = Math.max(2, Math.ceil(length / 7));
    let runStart = -1;
    let runIsland = null;
    const flush = (runEnd) => {
      if (runStart >= 0 && runIsland) {
        const t = (runStart + runEnd) / (2 * steps);
        const m = { x: a.x + dx * t, y: a.y + dy * t };
        let px = 0, py = 0, bestEdge = Infinity;
        const poly = runIsland.points;
        for (let k = 0, j = poly.length - 1; k < poly.length; j = k++) {
          const d = distanceToSegment(m, poly[j], poly[k]);
          if (d < bestEdge) {
            bestEdge = d;
            px = poly[j].x - poly[k].x;
            py = poly[j].y - poly[k].y;
          }
        }
        const edgeLength = Math.hypot(px, py) || 1;
        let nx = -py / edgeLength, ny = px / edgeLength;
        if (!pointInPolygon({ x: m.x + nx * 3, y: m.y + ny * 3 }, poly)) {
          nx = -nx;
          ny = -ny;
        }
        let best = m;
        let bestClear = bestEdge;
        for (let off = 2; off <= 20; off += 2) {
          const cand = { x: m.x + nx * off, y: m.y + ny * off };
          if (!pointInPolygon(cand, poly)) continue;
          if (buildings.some((keep) => Math.hypot(keep.x - cand.x, keep.y - cand.y) < 52)) continue;
          const clear = islandClearance(cand, poly);
          if (clear > bestClear) {
            best = cand;
            bestClear = clear;
          }
          if (bestClear >= 7) break;
        }
        if (best !== m) {
          out.push({
            x: best.x,
            y: best.y,
            laneWidth: Math.max(0, Math.min(TROOP_LANE_SPACING, bestClear - TROOP_FOOT_RADIUS - 1))
          });
        }
      }
      runStart = -1;
      runIsland = null;
    };
    for (let s = 1; s < steps; s++) {
      const p = { x: a.x + dx * s / steps, y: a.y + dy * s / steps };
      const island = surfaces.find((item) => pointInPolygon(p, item.points)) ?? null;
      const clear = island ? islandClearance(p, island.points) : Infinity;
      if (island && clear < 7) {
        if (runStart < 0) {
          runStart = s;
          runIsland = island;
        }
      } else flush(s - 1);
    }
    flush(steps - 1);
    out.push(b);
  }
  return out;
}
function buildMarchPath(route, surfaces, buildings = route) {
  if (!route.length) return [];
  const obstacles = buildings.filter((b) => b !== route[0] && b !== route[route.length - 1]);
  const circles = obstacles.map((building) => bypassFor(building, surfaces));
  const nodePoints = [{ x: route[0].x, y: route[0].y, laneWidth: TROOP_LANE_SPACING }];
  for (let i = 1; i < route.length - 1; i++) {
    const circle = bypassFor(route[i], surfaces);
    const entry = radial(circle, route[i - 1]);
    const exit = radial(circle, route[i + 1]);
    for (const p of arc(circle, entry, exit)) append(nodePoints, p);
  }
  const end = route[route.length - 1];
  append(nodePoints, { x: end.x, y: end.y, laneWidth: TROOP_LANE_SPACING });
  const result = [{ ...nodePoints[0] }];
  for (let i = 1; i < nodePoints.length; i++) {
    const a = nodePoints[i - 1], b = nodePoints[i];
    if (distance(a, b) < 15) append(result, b);
    else bypassCrossedKeeps(a, b, circles, result);
  }
  return shoreGuard(result, surfaces, buildings);
}

// src/game/tower-range.ts
function towerCanTarget(tower, target) {
  if (tower.type !== "tower" || target.hp <= 0) return false;
  if (Math.hypot(target.x - tower.x, target.y - tower.y) >= CFG.range) return false;
  if (tower.o === 0) return target.o !== 0;
  return target.o !== tower.o;
}
function drawTowerRanges(c, g, time = 0) {
  const scale = Math.max(0.35, g.view.s);
  c.save();
  for (const b of g.bs) {
    if (b.type !== "tower") continue;
    const active = b.o !== 0;
    const focus = g.hover === b || g.sels.includes(b) || g.ptr?.draft.includes(b);
    const color = active ? COL[b.o] : "#d0d9cf";
    const pulse = 0.75 + 0.25 * Math.sin(time * 2.1 + b.id * 1.7);
    c.globalCompositeOperation = "lighter";
    const glow = c.createRadialGradient(b.x, b.y, CFG.range * 0.1, b.x, b.y, CFG.range * 1.06);
    glow.addColorStop(0, color + "00");
    glow.addColorStop(0.62, color + (active ? "10" : "07"));
    glow.addColorStop(0.88, color + (active ? "2c" : "16"));
    glow.addColorStop(1, color + "00");
    c.fillStyle = glow;
    c.beginPath();
    c.arc(b.x, b.y, CFG.range * 1.06, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = color + (active ? "38" : "1c");
    c.lineWidth = (focus ? 14 : 10) / scale;
    c.beginPath();
    c.arc(b.x, b.y, CFG.range, 0, Math.PI * 2);
    c.stroke();
    c.setLineDash(active ? [] : [5 / scale, 6 / scale]);
    c.strokeStyle = "rgba(4,26,30,.55)";
    c.lineWidth = (focus ? 5.5 : 4) / scale;
    c.beginPath();
    c.arc(b.x, b.y, CFG.range, 0, Math.PI * 2);
    c.stroke();
    c.strokeStyle = active ? color + "ff" : color + "b8";
    c.lineWidth = (focus ? 3 : 2) / scale;
    c.stroke();
    c.setLineDash([]);
    const sweepAngle = time * (g.haloSpin ?? DEFAULT_HALO_SPIN) + b.id;
    for (let k = 0; k < 3; k++) {
      const a0 = sweepAngle + k / 3 * Math.PI * 2;
      const px = b.x + Math.cos(a0) * CFG.range, py = b.y + Math.sin(a0) * CFG.range;
      const spark = c.createRadialGradient(px, py, 0, px, py, 26 / scale);
      spark.addColorStop(0, "#ffffff" + (focus ? "aa" : active ? "77" : "66"));
      spark.addColorStop(0.35, color + (active ? "88" : "66"));
      spark.addColorStop(1, color + "00");
      c.fillStyle = spark;
      c.beginPath();
      c.arc(px, py, 26 / scale, 0, Math.PI * 2);
      c.fill();
    }
    if (active) {
      c.fillStyle = color + (focus ? "1c" : "0e");
      c.beginPath();
      c.arc(b.x, b.y, CFG.range, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = "#f0f5dfcc";
      c.lineWidth = (1.6 + pulse * 1.2) / scale;
      c.shadowColor = color;
      c.shadowBlur = 8 / scale;
      for (let k = 0; k < 12; k++) {
        const angle = k * Math.PI / 6;
        c.beginPath();
        c.moveTo(b.x + Math.cos(angle) * (CFG.range - 4 / scale), b.y + Math.sin(angle) * (CFG.range - 4 / scale));
        c.lineTo(b.x + Math.cos(angle) * (CFG.range + 2 / scale), b.y + Math.sin(angle) * (CFG.range + 2 / scale));
        c.stroke();
      }
      c.shadowBlur = 0;
    } else {
      c.setLineDash([6 / scale, 7 / scale]);
      c.strokeStyle = color + (pulse > 0.9 ? "5a" : "3a");
      c.lineWidth = (focus ? 3 : 2) / scale;
      c.beginPath();
      c.arc(b.x, b.y, CFG.range * (0.97 + pulse * 0.02), 0, Math.PI * 2);
      c.stroke();
      c.setLineDash([]);
      c.strokeStyle = "#eef2e6" + (pulse > 0.9 ? "88" : "55");
      c.lineWidth = 1.8 / scale;
      for (let k = 0; k < 4; k++) {
        const angle = k * Math.PI / 2 + Math.PI / 4;
        c.beginPath();
        c.moveTo(b.x + Math.cos(angle) * (CFG.range - 5 / scale), b.y + Math.sin(angle) * (CFG.range - 5 / scale));
        c.lineTo(b.x + Math.cos(angle) * (CFG.range + 1 / scale), b.y + Math.sin(angle) * (CFG.range + 1 / scale));
        c.stroke();
      }
    }
    c.globalCompositeOperation = "source-over";
  }
  c.restore();
}

// src/game/engine.ts
function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}
var Game = class {
  constructor(i, demo = false, levelOverride) {
    __publicField(this, "i");
    __publicField(this, "L");
    __publicField(this, "bs", []);
    /** Faction ids present at match start; retained in the HUD even after elimination. */
    __publicField(this, "participants", []);
    __publicField(this, "sq", []);
    __publicField(this, "fx", []);
    __publicField(this, "links", []);
    __publicField(this, "adj", []);
    __publicField(this, "t", 0);
    /** درصدِ اعزام (۲۰ / ۶۰ / ۸۰) */
    __publicField(this, "pct", 60);
    __publicField(this, "run", true);
    __publicField(this, "paused", false);
    __publicField(this, "over", false);
    __publicField(this, "demo", false);
    /** اگر خاموش باشد، گروه‌های دشمن در مسیر از کنار هم عبور می‌کنند. */
    __publicField(this, "fieldCombat", true);
    /** سقف نهایی تولید برای قلعه‌های دو تیم */
    __publicField(this, "baseCap", CFG.cap);
    /**
     * اگر روشن باشد، نیروها می‌توانند از کنار هر قلعه (خنثی یا دشمن) عبور کنند
     * تا به هدف برسند؛ پل‌های اضافه‌ای رسم نمی‌شود.
     */
    __publicField(this, "openRoads", true);
    /** حداقل فاصلهٔ پل بین دو قلعهٔ همسایه (پیکسل) */
    __publicField(this, "minRoadLength", 0);
    /** تایمر کاهش هر ثانیه ۱ نیرو برای قلعه‌های فراتر از سقف */
    __publicField(this, "decayTimer", 0);
    __publicField(this, "shake", 0);
    __publicField(this, "sels", []);
    __publicField(this, "sel", null);
    __publicField(this, "ptr", null);
    /** مسیر محوشوندهٔ کشیدن برای جلوهٔ بصری پس از رها کردن */
    __publicField(this, "ghostTrail", []);
    __publicField(this, "hover", null);
    __publicField(this, "preview", null);
    __publicField(this, "view", { s: 1, ox: 0, oy: 0 });
    __publicField(this, "worldWidth", CFG.W);
    __publicField(this, "worldHeight", CFG.H);
    __publicField(this, "largeMap", false);
    /** سرعتِ چرخشِ نورهای دور برج (صفر = بی‌حرکت) */
    __publicField(this, "haloSpin", DEFAULT_HALO_SPIN);
    /** شفافیتِ نقطه‌چینِ مسیر حمله (۰..۱) */
    __publicField(this, "attackDash", DEFAULT_ATTACK_DASH);
    /** مقیاسِ اندازهٔ کوه‌های دریایی (از تنظیماتِ سراسری) — فقط ظاهر */
    /** ارتفاعِ نوارِ بالای صفحه (پیکسل) که نقشه نباید زیرش برود */
    __publicField(this, "hudInset", 0);
    /** برج‌های خنثی از خودشان دفاع می‌کنند */
    __publicField(this, "neutralDefense", true);
    __publicField(this, "zoom", 1);
    __publicField(this, "panX", 0);
    __publicField(this, "panY", 0);
    __publicField(this, "aiT", [0, 2.5, 3, 3, 3]);
    __publicField(this, "lastHoverId", -1);
    __publicField(this, "lastAllyClick", null);
    __publicField(this, "onToast", () => {
    });
    __publicField(this, "onFinish", () => {
    });
    __publicField(this, "onDemoReset", () => {
    });
    this.i = i;
    this.L = levelOverride ?? LEVELS[i] ?? LEVELS[0];
    this.demo = demo;
    this.build();
  }
  /* ================= ساخت مرحله ================= */
  build() {
    this.worldWidth = this.L.worldWidth ?? CFG.W;
    this.worldHeight = this.L.worldHeight ?? CFG.H;
    this.largeMap = this.L.largeMap ?? false;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.bs = this.L.b.map((d, k) => ({
      id: k,
      x: d[0],
      y: d[1],
      o: d[2],
      type: d[3],
      army: createArmy(producedUnit(d[3]), d[2] === 0 ? Math.min(d[4], CFG.neutralCap) : d[4]),
      get tr() {
        return armyCount(this.army);
      },
      set tr(value) {
        this.army = createArmy(producedUnit(this.type), value);
      },
      cap: d[2] === 0 ? CFG.neutralCap : Math.min(CFG.capStart, this.baseCap),
      lvl: 1,
      capTimer: 0,
      pt: 0,
      tt: 0,
      fl: 0,
      hit: 0
    }));
    this.participants = Array.from(new Set(this.bs.map((b) => b.o).filter((owner) => owner !== 0))).sort();
    this.sq = [];
    this.fx = [];
    this.links = [];
    this.t = 0;
    this.sels = [];
    this.sel = null;
    this.ptr = null;
    this.ghostTrail = [];
    this.hover = null;
    this.preview = null;
    this.lastAllyClick = null;
    this.over = false;
    this.paused = false;
    this.run = true;
    const maxOwner = Math.max(2, ...this.bs.map((b) => b.o));
    this.aiT = Array.from({ length: maxOwner + 1 }, (_, owner) => owner === 1 ? 2.5 : owner >= 2 ? 3 : 0);
    this.decayTimer = 0;
    this.rebuildRoads();
  }
  /**
   * فقط شبکهٔ راه‌ها را از نو می‌سازد (بدونِ دست‌زدن به وضعیتِ نبرد).
   * build() پس از بازنشانیِ کامل هم همین را صدا می‌زند.
   */
  rebuildRoads() {
    this.links = [];
    this.adj = [];
    const bs = this.bs;
    if (!bs.length) return;
    const pairs = [];
    for (let a = 0; a < bs.length; a++)
      for (let b = a + 1; b < bs.length; b++) pairs.push([a, b, Math.hypot(bs[a].x - bs[b].x, bs[a].y - bs[b].y)]);
    pairs.sort((p, q) => p[2] - q[2]);
    const u = bs.map((_, k) => k);
    const f = (n) => u[n] === n ? n : u[n] = f(u[n]);
    const minLength = this.minRoadLength;
    const linkCap = Math.max(bs.length - 1, Math.round(bs.length * 1.35));
    for (const [a, b, d] of pairs) {
      if (d < minLength) continue;
      if (this.links.length >= linkCap) break;
      if (f(a) !== f(b)) {
        u[f(a)] = f(b);
        this.links.push([a, b]);
      } else if (!this.largeMap && d < 300) {
        this.links.push([a, b]);
      }
    }
    this.adj = bs.map(() => []);
    this.links.forEach(([a, b]) => {
      this.adj[a].push(b);
      this.adj[b].push(a);
    });
    this.guaranteeConnectivity();
  }
  /**
   * تضمین می‌کند همهٔ قلعه‌ها در یک شبکهٔ پیوسته باشند: ابتدا قلعه‌های رهاشده به نزدیک‌ترین
   * قلعهٔ وصل‌شده وصل می‌شوند و اگر هنوز جزیرهٔ جدا باقی مانده بود، کوتاه‌ترین پلِ بینِ جزایر
   * ساخته می‌شود. این کار حتی حداکثر طول پل را نقض می‌کند، چون «نرسیدن به هیچ‌جا» بدتر از
   * یک پل بلند است.
   */
  guaranteeConnectivity() {
    const bs = this.bs;
    const connected = (from, to) => {
      const seen = /* @__PURE__ */ new Set([from]);
      const walk = (n) => {
        for (const m of this.adj[n]) if (!seen.has(m)) {
          seen.add(m);
          walk(m);
        }
      };
      walk(from);
      return seen.has(to);
    };
    const add = (a, b) => {
      this.links.push([a, b]);
      this.adj[a].push(b);
      this.adj[b].push(a);
    };
    for (let a = 0; a < bs.length; a++) {
      if (this.adj[a].length) continue;
      let nearest = -1;
      let nearestD = Infinity;
      for (let b = 0; b < bs.length; b++) {
        if (b === a) continue;
        const d = Math.hypot(bs[a].x - bs[b].x, bs[a].y - bs[b].y);
        if (d < nearestD) {
          nearestD = d;
          nearest = b;
        }
      }
      if (nearest >= 0) add(a, nearest);
    }
    for (let guard = 0; guard < bs.length; guard++) {
      let bestA = -1, bestB = -1, bestD = Infinity;
      for (let a = 0; a < bs.length; a++)
        for (let b = a + 1; b < bs.length; b++) {
          if (connected(a, b)) continue;
          const d = Math.hypot(bs[a].x - bs[b].x, bs[a].y - bs[b].y);
          if (d < bestD) {
            bestD = d;
            bestA = a;
            bestB = b;
          }
        }
      if (bestA < 0) break;
      add(bestA, bestB);
    }
  }
  fxAdd(o) {
    this.fx.push({ t: 0, l: 1, ...o });
    if (this.fx.length > 90) this.fx.splice(0, this.fx.length - 90);
  }
  /** قوانین راه‌ها را اعمال می‌کند و در صورت نیاز نقشه را دوباره می‌سازد. */
  /**
   * تغییرِ قوانینِ راه در میانهٔ نبرد.
   * عمداً فقط گرافِ راه بازسازی می‌شود؛ قلعه‌ها، نیروها، لشکرهای در حرکت،
   * تایمرها و وضعیتِ برد/باخت دست‌نخورده می‌مانند. (پیش‌تر اینجا build() صدا
   * زده می‌شد و هر تغییرِ تنظیمات کلِ نبرد را از صفر می‌کرد.)
   */
  setRoadRules(options) {
    const before = { openRoads: this.openRoads, minRoadLength: this.minRoadLength };
    if (options.openRoads !== void 0) this.openRoads = options.openRoads;
    if (options.minRoadLength !== void 0) this.minRoadLength = Math.max(0, Math.min(900, Math.floor(options.minRoadLength)));
    const changed = before.openRoads !== this.openRoads || before.minRoadLength !== this.minRoadLength;
    if (changed) this.rebuildRoads();
  }
  setMaxTroops(value) {
    const cap = Number.isFinite(value) ? Math.max(1, Math.min(1e3, Math.floor(value))) : CFG.cap;
    this.baseCap = cap;
    for (const b of this.bs) {
      if (b.o === 0) {
        b.cap = CFG.neutralCap;
        b.lvl = 1;
        b.capTimer = 0;
        continue;
      }
      const start = Math.min(CFG.capStart, cap);
      const previous = b.cap;
      b.cap = Math.max(start, Math.min(b.cap, cap));
      b.lvl = 1 + Math.ceil((b.cap - start) / 10);
      if (b.cap !== previous) b.capTimer = 0;
    }
  }
  zoomBy(delta) {
    if (delta === 0) {
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
    } else {
      const next = Math.round((this.zoom + delta) * 100) / 100;
      this.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next));
    }
    this.preview = this.computePreview();
  }
  /**
   * زوم به سمت یک نقطهٔ مشخص روی صفحه، طوری که همان نقطه زیر نشانگر بماند.
   * مختصات صفحه‌ای و اندازهٔ پنجره لازم است.
   */
  zoomAt(delta, screenX, screenY, viewWidth, viewHeight) {
    const before = this.zoom;
    this.zoomBy(delta);
    if (this.zoom === before) return;
    const geo = this.fitGeometry(viewWidth, viewHeight);
    const worldX = (screenX - this.view.ox) / this.view.s;
    const worldY = (screenY - this.view.oy) / this.view.s;
    this.panX += screenX - (this.view.ox + worldX * geo.s);
    this.panY += screenY - (this.view.oy + worldY * geo.s);
    this.clampPan(viewWidth, viewHeight);
  }
  /** هندسهٔ جاشدنِ نقشه در ناحیهٔ زیرِ نوارِ بالا (هم‌راستا با render.ts). */
  fitGeometry(viewWidth, viewHeight) {
    const top = this.demo ? 0 : Math.max(0, Math.min(viewHeight * 0.26, this.hudInset || 0));
    const areaH = Math.max(140, viewHeight - top);
    const s = Math.min(viewWidth / this.worldWidth, areaH / this.worldHeight) * 0.94 * this.zoom;
    return { s, areaH };
  }
  /** دور نگه‌داشتن جابه‌جایی نقشه درون کادر پنجره */
  clampPan(viewWidth, viewHeight) {
    const { s, areaH } = this.fitGeometry(viewWidth, viewHeight);
    const maxX = Math.max(0, (this.worldWidth * s - viewWidth) / 2);
    const maxY = Math.max(0, (this.worldHeight * s - areaH) / 2);
    this.panX = Math.max(-maxX, Math.min(maxX, this.panX));
    this.panY = Math.max(-maxY, Math.min(maxY, this.panY));
  }
  panBy(dx, dy) {
    this.panX += dx;
    this.panY += dy;
  }
  /* ================= مسیر و اعزام ================= */
  findRoute(from, to) {
    const queue = [from.id];
    const prev = /* @__PURE__ */ new Map([[from.id, null]]);
    for (let i = 0; i < queue.length; i++) {
      const id2 = queue[i];
      if (id2 === to.id) break;
      for (const next of this.adj[id2]) {
        if (prev.has(next)) continue;
        const castle = this.bs[next];
        if (!this.openRoads && next !== to.id && castle.o !== from.o) continue;
        prev.set(next, id2);
        queue.push(next);
      }
    }
    if (!prev.has(to.id)) return null;
    const route = [];
    let id = to.id;
    while (id !== null) {
      route.unshift(this.bs[id]);
      id = prev.get(id) ?? null;
    }
    return route;
  }
  sendN(from, to, n, route = null) {
    n = Math.min(Math.floor(n), from.tr);
    if (!Number.isFinite(n) || n < 1 || from === to) return false;
    route = route || [from, to];
    const dispatched = takeArmy(from.army, n);
    const waypoints = buildMarchPath(route, landscapeFor(this).islands, this.bs);
    const len = pathLength(waypoints);
    for (const unit of TROOP_TYPES) {
      if (dispatched[unit] <= 0) continue;
      const squad = {
        o: from.o,
        from,
        to,
        route,
        waypoints,
        unit,
        hp: dispatched[unit],
        get n() {
          return unitCount(this.hp, this.unit);
        },
        set n(value) {
          this.hp = Math.max(0, Math.floor(value)) * UNITS[this.unit].power;
        },
        x: from.x,
        y: from.y,
        d: 0,
        len,
        sp: CFG.speed * UNITS[unit].speed,
        id: Math.random() * 9,
        ang: 0
      };
      this.sq.push(squad);
    }
    this.fxAdd({ k: "txt", x: from.x, y: from.y - 52, s: "-" + fa(n), c: "#ffffff" });
    if (from.o === 1) sfx.send();
    return true;
  }
  arrive(s) {
    const t = s.to;
    if (t.o === s.o) {
      t.army[s.unit] += s.hp;
      t.fl = Math.max(t.fl, 0.35);
      this.fxAdd({ k: "txt", x: t.x, y: t.y - 58, s: "+" + fa(s.n), c: COL[s.o] });
      return;
    }
    const m = defOf(t);
    const dv = armyPower(t.army) * m;
    if (s.hp > dv + 1e-8) {
      const prev = t.o;
      t.o = s.o;
      t.army = emptyArmy();
      t.army[s.unit] = s.hp - dv;
      t.pt = 0;
      t.hit = 0.5;
      t.fl = 0.72;
      t.lvl = 1;
      t.cap = Math.min(CFG.capStart, this.baseCap);
      t.capTimer = 0;
      this.shake = Math.min(0.65, this.shake + 0.18);
      this.fxAdd({ k: "capture", x: t.x, y: t.y, c: COL[s.o], l: 1.05, r: 86 });
      if (s.o === 1) {
        this.onToast(prev === 0 ? "ساختمان تصرف شد!" : "ساختمان دشمن گرفته شد!");
        sfx.capture();
      } else if (prev === 1) {
        this.onToast("یک ساختمان را از دست دادی!");
        sfx.lose();
      }
    } else {
      t.hit = 0.85;
      this.shake = Math.min(0.8, this.shake + 0.24);
      this.fxAdd({ k: "ring", x: t.x, y: t.y + 8, c: "#ffffff", l: 0.5, r: 46 });
      const before = t.tr;
      damageArmy(t.army, s.hp / m);
      const lost = before - t.tr;
      this.fxAdd({ k: "txt", x: t.x, y: t.y - 58, s: lost ? "-" + fa(lost) : "آسیب", c: "#ffffff" });
      if (s.o === 1) this.onToast("حمله دفع شد؛ نیروی بیشتری بفرست");
      sfx.repel();
    }
  }
  /* ================= انتخاب کشیدنی ================= */
  buildingAt(x, y) {
    let best = null;
    let bd = 1;
    for (const b of this.bs) {
      const d = Math.hypot((b.x - x) / 54, (b.y - 18 - y) / 76);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }
  /** لغو کامل انتخاب‌ها (کلیک روی زمین خالی یا کلید Escape/B) */
  deselectAll() {
    this.sels = [];
    this.sel = null;
    this.lastAllyClick = null;
    this.preview = null;
  }
  /** نیروی قابل ارسال از یک قلعه با درصد فعلی */
  amountOf(b) {
    return Math.floor(b.tr * this.pct / 100);
  }
  dispatchPower(b, amount = this.amountOf(b)) {
    return armyPower(selectArmy(b.army, amount));
  }
  computePreview() {
    const target = this.hover;
    if (!target) return null;
    const drafted = this.ptr && this.ptr.draft.length ? this.ptr.draft : this.sels;
    if (target.o === 1) {
      const others = drafted.filter((s) => s !== target && s.o === 1);
      if (!others.length) return { target, sources: [], total: 0, power: 0, need: 0, ok: true, blocked: 0, mode: "select" };
      let total2 = 0;
      let power2 = 0;
      let blocked2 = 0;
      const src2 = [];
      for (const s of others) {
        const n = this.amountOf(s);
        if (n < 1) continue;
        if (!this.findRoute(s, target)) {
          blocked2++;
          continue;
        }
        total2 += n;
        power2 += this.dispatchPower(s, n);
        src2.push(s);
      }
      return { target, sources: src2, total: total2, power: power2, need: 0, ok: total2 > 0, blocked: blocked2, mode: "reinforce" };
    }
    if (!drafted.length) return { target, sources: [], total: 0, power: 0, need: armyPower(target.army) * defOf(target), ok: false, blocked: 0, mode: "attack" };
    let total = 0;
    let power = 0;
    let blocked = 0;
    const src = [];
    for (const s of drafted) {
      if (s === target) continue;
      const n = this.amountOf(s);
      if (n < 1) continue;
      if (!this.findRoute(s, target)) {
        blocked++;
        continue;
      }
      total += n;
      power += this.dispatchPower(s, n);
      src.push(s);
    }
    const need = armyPower(target.army) * defOf(target);
    return { target, sources: src, total, power, need, ok: power > need + 1e-8, blocked, mode: "attack" };
  }
  down(id, wx, wy, shift) {
    if (this.over || this.paused) return;
    const b = this.buildingAt(wx, wy);
    const startAlly = b && b.o === 1 ? b : null;
    this.ptr = {
      id,
      sx: wx,
      sy: wy,
      x: wx,
      y: wy,
      lx: wx,
      ly: wy,
      shift,
      moved: false,
      startB: startAlly,
      draft: startAlly ? [startAlly] : [],
      trail: [{ x: wx, y: wy }]
    };
    this.ghostTrail = [];
    this.hover = b;
    this.lastHoverId = b ? b.id : -1;
    this.preview = this.computePreview();
  }
  /** هر قلعهٔ خودی که نشانگر هنگام کشیدن از رویش عبور کند، به انتخاب اضافه می‌شود */
  sweepSelect(p, x1, y1, x2, y2) {
    for (const b of this.bs) {
      if (b.o !== 1 || p.draft.includes(b)) continue;
      if (distToSeg(b.x / 46, (b.y - 18) / 66, x1 / 46, y1 / 66, x2 / 46, y2 / 66) <= 1) {
        p.draft.push(b);
        this.fxAdd({ k: "ring", x: b.x, y: b.y, c: "#3ddc84", l: 0.45, r: 60 });
        sfx.select();
      }
    }
  }
  move(id, wx, wy) {
    const p = this.ptr;
    if (p) {
      if (p.id !== id) return;
      if (!p.moved && Math.hypot(wx - p.sx, wy - p.sy) > 8) p.moved = true;
      if (p.moved) {
        this.sweepSelect(p, p.lx, p.ly, wx, wy);
        if (Math.hypot(wx - p.trail[p.trail.length - 1].x, wy - p.trail[p.trail.length - 1].y) > 5) {
          p.trail.push({ x: wx, y: wy });
          if (p.trail.length > 220) p.trail.shift();
        }
      }
      p.lx = wx;
      p.ly = wy;
      p.x = wx;
      p.y = wy;
    }
    const h = this.buildingAt(wx, wy);
    if ((h ? h.id : -1) !== this.lastHoverId) {
      this.lastHoverId = h ? h.id : -1;
      if (h && this.ptr) sfx.hover();
    }
    this.hover = h;
    this.preview = this.computePreview();
  }
  up(id, wx, wy) {
    const p = this.ptr;
    if (!p || p.id !== id) return;
    this.ptr = null;
    if (p.trail.length > 1) this.ghostTrail = p.trail.map((pt) => ({ ...pt, t: 0 }));
    if (this.over || this.paused) return;
    this.hover = this.buildingAt(wx, wy);
    this.move(id, wx, wy);
    const target = this.hover;
    const drafted = p.draft.length ? p.draft : this.sels;
    if (target) {
      if (target.o === 1) {
        if (p.moved) {
          this.lastAllyClick = null;
          this.sels = Array.from(/* @__PURE__ */ new Set([...this.sels, ...p.draft]));
          this.sel = this.sels[0] || null;
          if (this.sels.length) {
            sfx.select();
            this.onToast(fa(this.sels.length) + " قلعه انتخاب شد؛ برای انتقال روی مقصد دوبار کلیک کن");
          }
        } else {
          const now = Date.now();
          const last = this.lastAllyClick;
          if (last && last.target === target && now - last.at <= 520 && last.sources.length) {
            this.lastAllyClick = null;
            this.reinforce(target, last.sources);
          } else {
            const sources = this.sels.filter((s) => s !== target && s.o === target.o);
            this.lastAllyClick = { target, sources: [...sources], at: now };
            this.addToSelection(target);
            if (sources.length) this.onToast("برای انتقال نیرو، دوباره روی قلعهٔ هم‌تیمی کلیک کن");
          }
        }
      } else {
        this.lastAllyClick = null;
        this.attack(target, drafted);
      }
      this.preview = null;
      return;
    }
    if (p.moved) {
      this.sels = p.shift ? Array.from(/* @__PURE__ */ new Set([...this.sels, ...p.draft])) : p.draft;
      this.sel = this.sels[0] || null;
      if (this.sels.length) {
        sfx.select();
        if (this.sels.length > 1) this.onToast(fa(this.sels.length) + " قلعه انتخاب شد — حالا روی هدف رها کن");
      }
    } else if (p.startB) {
      this.addToSelection(p.startB);
    } else {
      this.sels = [];
      this.sel = null;
    }
    this.preview = null;
  }
  /**
   * هر کلیک روی یک قلعهٔ خودی، آن قلعه را به انتخاب‌ها اضافه می‌کند.
   * کلیک دوباره روی همان قلعه آن را حذف نمی‌کند؛ شمار انتخاب‌ها هرگز کم نمی‌شود.
   * برای برداشتن یک قلعه از انتخاب، Shift+کلیک یا کلید B (لغو همه) استفاده می‌شود.
   */
  addToSelection(target) {
    if (!this.sels.includes(target)) {
      this.sels = [...this.sels, target];
      sfx.select();
    } else {
      sfx.deselect();
    }
    this.sel = this.sels[0] || null;
  }
  /** انتقال نیروی قلعه‌های هم‌رنگ به یک قلعهٔ مقصد */
  reinforce(target, sources) {
    if (!target.o) return 0;
    const list = Array.from(new Set(sources)).filter((s) => s !== target && s.o === target.o);
    let sent = 0;
    let blocked = 0;
    let empty = 0;
    for (const source of list) {
      const n = this.amountOf(source);
      if (n < 1) {
        empty++;
        continue;
      }
      const route = this.findRoute(source, target);
      if (!route) {
        blocked++;
        this.fxAdd({ k: "txt", x: source.x, y: source.y - 60, s: "مسیر بسته", c: "#ffd166" });
        continue;
      }
      if (this.sendN(source, target, n, route)) sent++;
    }
    if (list.length) {
      this.sels = [];
      this.sel = null;
    } else if (!this.sels.includes(target)) {
      this.sels = [...this.sels, target];
      this.sel = this.sels[0] || null;
    }
    if (sent) {
      this.fxAdd({ k: "ring", x: target.x, y: target.y, c: COL[target.o], l: 0.75, r: 72 });
      this.onToast(sent > 1 ? fa(sent) + " گروه نیروی کمکی اعزام شدند" : "نیروی کمکی اعزام شد");
    } else if (blocked) this.onToast("مسیر بازی تا آن قلعه وجود ندارد");
    else if (empty) this.onToast("نیروی کافی برای انتقال وجود ندارد");
    else this.onToast("ابتدا قلعه‌های هم‌رنگ را انتخاب کن");
    return sent;
  }
  cancel() {
    this.ptr = null;
    this.preview = null;
  }
  /** حمله گروهی به یک قلعه هدف */
  attack(target, sources) {
    const list = sources.filter((s) => s.o === 1 && s !== target);
    if (!list.length) {
      this.onToast("ابتدا قلعه‌های سبز خودت را انتخاب کن");
      return;
    }
    let sent = 0;
    let blocked = 0;
    let empty = 0;
    for (const s of list) {
      const n = this.amountOf(s);
      if (n < 1) {
        empty++;
        continue;
      }
      const route = this.findRoute(s, target);
      if (!route) {
        blocked++;
        this.fxAdd({ k: "txt", x: s.x, y: s.y - 60, s: "مسیر بسته", c: "#ffd166" });
        continue;
      }
      if (this.sendN(s, target, n, route)) sent++;
    }
    this.sels = [];
    this.sel = null;
    if (sent) this.onToast(sent > 1 ? fa(sent) + " گروه به سمت هدف اعزام شدند" : "نیروها اعزام شدند");
    else if (blocked) this.onToast("مسیر بازی تا مقصد وجود ندارد؛ قلعه‌های میانی را بگیر");
    else if (empty) this.onToast("نیروی کافی نیست");
  }
  /** حمله به همه اهداف ممکن از انتخاب فعلی (میان‌بر کیبورد) */
  selectAll() {
    this.sels = this.bs.filter((b) => b.o === 1);
    this.sel = this.sels[0] || null;
    if (this.sels.length) {
      sfx.select();
      this.onToast("همه قلعه‌های تو انتخاب شدند");
    }
  }
  /* ================= هوش مصنوعی ================= */
  ai(dt, o) {
    this.aiT[o] -= dt;
    if (this.aiT[o] > 0) return;
    const base = o === 1 ? this.demo ? this.L.ai * 0.8 : 0.5 : this.L.ai;
    const pc = this.bs.filter((b) => b.o === o).length;
    const ec = this.bs.filter((b) => b.o !== 0 && b.o !== o).length;
    const ag = Math.min(1, base + 0.12 * Math.max(0, pc - ec));
    this.aiT[o] = 2.8 - 1.7 * ag;
    const mine = this.bs.filter((b) => b.o === o);
    for (const b of mine) {
      const thr = this.sq.filter((s) => s.o !== o && s.to === b).reduce((a, s) => a + s.hp, 0);
      if (thr > armyPower(b.army) * defOf(b) * 0.8) {
        const h = this.adj[b.id].map((k) => this.bs[k]).filter((n) => n.o === o && n.tr > 12).sort((p, q) => q.tr - p.tr)[0];
        if (h) this.sendN(h, b, h.tr * 0.5, this.findRoute(h, b));
      }
    }
    let cmds = 0;
    for (const b of mine) {
      if (cmds >= 2) break;
      if (b.tr < 10) continue;
      const av = Math.floor(b.tr * (0.45 + 0.35 * ag));
      const availablePower = this.dispatchPower(b, av);
      let best = null;
      let bsc = 1e9;
      let bn = 0;
      for (const k of this.adj[b.id]) {
        const t = this.bs[k];
        if (t.o === o) continue;
        const inc = this.sq.filter((s) => s.o === o && s.to === t).reduce((a, s) => a + s.hp, 0);
        const need = armyPower(t.army) * defOf(t) + 3 - inc;
        const sc = need - (t.o !== 0 ? ag * 10 : 0) - (t.type === "barracks" ? 4 : 0);
        if (availablePower > need && sc < bsc) {
          best = t;
          bsc = sc;
          bn = 1;
          while (bn < av && this.dispatchPower(b, bn) <= need + 3 + ag * 4) bn++;
        }
      }
      if (best) {
        const route = this.findRoute(b, best);
        if (route && this.sendN(b, best, Math.max(bn, 1), route)) cmds++;
      }
    }
  }
  /* ================= به‌روزرسانی ================= */
  step(dt) {
    this.t += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.4);
    for (const s of this.sq) {
      s.d = Math.min(s.len, s.d + s.sp * dt);
      const pose = samplePath(s.waypoints, s.d);
      s.x = pose.x;
      s.y = pose.y;
      s.ang = pose.angle;
    }
    this.decayTimer += dt;
    const shouldDecay = this.decayTimer >= 1;
    if (shouldDecay) {
      this.decayTimer -= 1;
      if (this.decayTimer >= 1) this.decayTimer = 0;
    }
    for (const b of this.bs) {
      if (b.fl > 0) b.fl = Math.max(0, b.fl - dt * 1.5);
      if (b.hit > 0) b.hit = Math.max(0, b.hit - dt * 2.2);
      if (shouldDecay && b.o && b.tr > this.baseCap) {
        takeArmy(b.army, 1);
        if (b.o === 1) {
          this.fxAdd({ k: "txt", x: b.x - 20, y: b.y - 46, s: "-۱ سرریز", c: "#ff8a80", l: 0.75 });
        }
      }
      if (b.o && b.cap < this.baseCap && b.tr >= b.cap) {
        b.capTimer += dt;
        while (b.capTimer >= CFG.capHold && b.cap < this.baseCap && b.tr >= b.cap) {
          b.capTimer -= CFG.capHold;
          b.cap = Math.min(this.baseCap, b.cap + CFG.capStep);
          b.lvl++;
          b.fl = 1;
          this.fxAdd({ k: "ring", x: b.x, y: b.y, c: "#e8b44c", l: 0.85 });
          this.fxAdd({ k: "txt", x: b.x, y: b.y - 72, s: "ظرفیت " + fa(b.cap), c: "#ffe6ab" });
          if (b.o === 1) {
            this.onToast("ظرفیت قلعه به " + fa(b.cap) + " نفر افزایش یافت");
            sfx.upgrade();
          }
        }
        if (b.tr < b.cap || b.cap >= this.baseCap) b.capTimer = 0;
      } else {
        b.capTimer = 0;
      }
      if (b.type !== "tower") {
        b.pt += dt;
        const rate = CFG.spawn[b.type] / (1 + 0.25 * (b.lvl - 1));
        while (b.pt >= rate) {
          b.pt -= rate;
          if (b.tr < b.cap) {
            addUnit(b.army, producedUnit(b.type));
            if (b.o === 1 && Math.random() < 0.35)
              this.fxAdd({ k: "txt", x: b.x + 20, y: b.y - 46, s: "+۱", c: "#bbf7d0", l: 0.7 });
          }
        }
      } else {
        b.pt = 0;
      }
      const armed = b.type === "tower" && (b.o !== 0 || this.neutralDefense);
      if (armed) {
        b.tt += dt;
        if (b.tt >= CFG.shot) {
          const e = this.sq.find((s) => towerCanTarget(b, s));
          if (e) {
            b.tt = 0;
            const hit = b.o === 0 ? CFG.neutralShotDamage : 1;
            e.hp = Math.max(0, e.hp - hit);
            b.fl = Math.max(b.fl, 0.3);
            this.fxAdd({ k: "ring", x: e.x, y: e.y, c: "#fde047", l: 0.35 });
            this.fxAdd({ k: "txt", x: e.x, y: e.y - 26, s: "💥", c: "#fde047", l: 0.5 });
            if (b.o === 0 && e.o === 1) this.onToast("برج خنثی به نیروهایت شلیک کرد!");
            sfx.shot();
          }
        }
      }
    }
    if (this.fieldCombat) {
      for (let i = 0; i < this.sq.length; i++)
        for (let j = i + 1; j < this.sq.length; j++) {
          const a = this.sq[i];
          const b = this.sq[j];
          if (a.o !== b.o && a.n > 0 && b.n > 0 && Math.hypot(a.x - b.x, a.y - b.y) < 22) {
            const m = Math.min(a.hp, b.hp);
            a.hp = Math.max(0, a.hp - m);
            b.hp = Math.max(0, b.hp - m);
            this.fxAdd({ k: "ring", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, c: "#ffffff", l: 0.4 });
            this.fxAdd({ k: "burst", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, c: "#ffd166", l: 0.45 });
            sfx.clash();
          }
        }
    }
    const arrived = this.sq.filter((s) => s.n > 0 && s.d >= s.len);
    this.sq = this.sq.filter((s) => s.n > 0 && s.d < s.len);
    arrived.forEach((s) => this.arrive(s));
    if (this.demo) {
      this.ai(dt, 2);
      this.ai(dt, 1);
    } else {
      for (let owner = 2; owner < this.aiT.length; owner++) {
        if (this.bs.some((b) => b.o === owner)) this.ai(dt, owner);
      }
    }
    setNatureSound("march", this.sq.some((s) => s.n > 0));
    this.fx.forEach((f) => f.t += dt);
    this.fx = this.fx.filter((f) => f.t < f.l);
    if (this.ghostTrail.length) {
      this.ghostTrail.forEach((p) => p.t += dt);
      if (this.ghostTrail[0].t > 0.5) this.ghostTrail = [];
    }
    this.sels = this.sels.filter((b) => b.o === 1);
    this.sel = this.sels[0] || null;
    if (this.demo) {
      const pOwn2 = this.bs.some((b) => b.o === 1);
      const eOwn2 = this.bs.some((b) => b.o > 1);
      if (!pOwn2 && !this.sq.some((q) => q.o === 1) || !eOwn2 && !this.sq.some((q) => q.o > 1)) this.onDemoReset();
      return;
    }
    const pOwn = this.bs.some((b) => b.o === 1);
    const eOwn = this.bs.some((b) => b.o > 1);
    if (!eOwn && !this.sq.some((q) => q.o > 1)) this.finish(true);
    else if (!pOwn && !this.sq.some((q) => q.o === 1)) this.finish(false);
  }
  /** پس از پایان بازی فقط افکت‌ها را پیش می‌برد (کاغذرنگی پیروزی) */
  idle(dt) {
    this.t += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.4);
    this.fx.forEach((f) => f.t += dt);
    this.fx = this.fx.filter((f) => f.t < f.l);
  }
  finish(win) {
    if (this.over) return;
    this.over = true;
    this.cancel();
    if (win) {
      sfx.win();
      for (let k = 0; k < 26; k++)
        this.fxAdd({
          k: "burst",
          x: 80 + Math.random() * Math.max(1, this.worldWidth - 160),
          y: 80 + Math.random() * Math.max(1, this.worldHeight - 160),
          c: ["#e8b44c", "#3ddc84", "#ffffff", "#ffd166"][k % 4],
          l: 0.9 + Math.random() * 0.7
        });
    } else sfx.defeat();
    this.onFinish(win);
  }
  /* ================= آمار ================= */
  count(o) {
    return this.bs.filter((b) => b.o === o).reduce((a, b) => a + b.tr, 0) + this.sq.filter((s) => s.o === o).reduce((a, s) => a + s.n, 0);
  }
  power(o) {
    return this.bs.filter((b) => b.o === o).reduce((sum, b) => sum + armyPower(b.army), 0) + this.sq.filter((s) => s.o === o).reduce((sum, s) => sum + s.hp, 0);
  }
  opponentCount() {
    return this.bs.filter((b) => b.o > 1).reduce((sum, b) => sum + b.tr, 0) + this.sq.filter((s) => s.o > 1).reduce((sum, s) => sum + s.n, 0);
  }
  opponentPower() {
    return this.bs.filter((b) => b.o > 1).reduce((sum, b) => sum + armyPower(b.army), 0) + this.sq.filter((s) => s.o > 1).reduce((sum, s) => sum + s.hp, 0);
  }
  castles(o) {
    return this.bs.filter((b) => b.o === o).length;
  }
  opponentCastles() {
    return this.bs.filter((b) => b.o > 1).length;
  }
};

// src/game/structures.ts
function banner(c, x, y, color, time, seed) {
  c.lineWidth = 2;
  c.strokeStyle = "#5a6965";
  c.beginPath();
  c.moveTo(x, y + 3);
  c.lineTo(x, y - 24);
  c.stroke();
  const wave = Math.sin(time * 3.6 + seed) * 2.3;
  polygon(c, [{ x, y: y - 24 }, { x: x + 18, y: y - 22 + wave }, { x: x + 14, y: y - 16 + wave }, { x: x + 18, y: y - 11 + wave }, { x, y: y - 13 }], color);
  c.strokeStyle = "rgba(255,255,255,.42)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x + 1, y - 23);
  c.lineTo(x + 17, y - 21 + wave);
  c.stroke();
}
function doorway(c, x, y, width, height, trim) {
  c.fillStyle = trim;
  c.beginPath();
  c.roundRect(x - width / 2 - 3, y - height - 3, width + 6, height + 3, [width / 2 + 2, width / 2 + 2, 0, 0]);
  c.fill();
  c.fillStyle = "#283f45";
  c.beginPath();
  c.roundRect(x - width / 2, y - height, width, height, [width / 2, width / 2, 0, 0]);
  c.fill();
  c.strokeStyle = "#687c77";
  c.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    c.beginPath();
    c.moveTo(x - width / 2 + width * i / 4, y - height + 5);
    c.lineTo(x - width / 2 + width * i / 4, y);
    c.stroke();
  }
  c.fillStyle = "#c4cdb7";
  c.fillRect(x - width / 2 - 2, y, width + 4, 3);
}
function slits(c, x, y, width) {
  c.fillStyle = "#344b4f";
  c.fillRect(x - width, y, 3, 10);
  c.fillRect(x + width - 3, y - 2, 3, 10);
  c.fillStyle = "#eadba4";
  c.fillRect(x - width, y, 1, 7);
  c.fillRect(x + width - 3, y - 2, 1, 7);
}
function stoneBody(c, x, y, rx, height) {
  prism(c, ring(x, y, rx + 3, rx * 0.5 + 2), 7, "#879b95", "#bac9b8");
  const top = prism(c, ring(x, y - 3, rx, rx * 0.53), height, "#bbcbc0", "#e2e3c7");
  c.strokeStyle = "rgba(79,108,106,.28)";
  c.lineWidth = 1;
  for (let z = 13; z < height; z += 14) {
    c.beginPath();
    c.moveTo(x - rx * 0.92, y - z);
    c.lineTo(x, y + rx * 0.48 - z);
    c.lineTo(x + rx * 0.92, y - z);
    c.stroke();
  }
  return top;
}
function battlements(c, x, y, rx, color) {
  prism(c, ring(x, y, rx, rx * 0.52), 13, color);
  polygon(c, ring(x, y - 13, rx - 6, (rx - 6) * 0.5), tint(color, -68));
  const positions = ring(x, y - 13, rx - 3, (rx - 3) * 0.52, 8);
  positions.sort((a, b) => a.y - b.y);
  for (const p of positions) prism(c, ring(p.x, p.y, 6, 3.7, 4, Math.PI / 4), 9, color, tint(color, 48));
}
function dome(c, x, y, rx, color) {
  const bottom = ring(x, y, rx, rx * 0.48, 10);
  const belt = ring(x, y - 17, rx * 0.78, rx * 0.36, 10);
  const crown = { x: x - 4, y: y - 35 };
  for (let i = 0; i < bottom.length; i++) {
    const j = (i + 1) % bottom.length;
    if (bottom[j].x >= bottom[i].x) continue;
    polygon(c, [belt[i], belt[j], bottom[j]], tint(color, -8 + i % 3 * 11));
    polygon(c, [belt[i], bottom[j], bottom[i]], tint(color, -28 + i % 2 * 15));
  }
  for (let i = 0; i < belt.length; i++) polygon(c, [belt[i], belt[(i + 1) % belt.length], crown], tint(color, i > 4 ? 35 : i < 2 ? -3 : 18));
  prism(c, ring(crown.x, crown.y + 1, 6, 3, 6), 4, "#cdd5bc");
}
function drawStructure(c, b, time, focused) {
  const X = b.x, Y = b.y;
  const color = COL[b.o];
  c.save();
  const footprint = ring(X, Y + 8, b.type === "heavy" ? 43 : 36, 18, 8);
  polygon(c, [{ x: X - 25, y: Y + 6 }, { x: X + 39, y: Y + 2 }, { x: X + 76, y: Y + 38 }, { x: X + 18, y: Y + 37 }], "rgba(12,35,36,.2)");
  shadow(c, X + 2, Y + 12, 43, 18, 0.16);
  prism(c, footprint, 5, "#718c82", "#adb99b");
  if (b.type === "barracks") {
    stoneBody(c, X, Y + 4, 26, 49);
    battlements(c, X, Y - 45, 31, color);
    slits(c, X, Y - 24, 17);
    for (const side of [-1, 1]) {
      const x = X + side * 30;
      stoneBody(c, x, Y + 12, 10, 28);
      battlements(c, x, Y - 16, 12, color);
    }
    doorway(c, X + 2, Y + 19, 14, 23, "#8da49c");
    banner(c, X - 8, Y - 70, color, time, b.id);
  } else if (b.type === "speed") {
    stoneBody(c, X, Y + 5, 25, 37);
    prism(c, ring(X, Y - 32, 29, 15), 5, color);
    crystal(c, X, Y - 36, 43, 48, color);
    for (const side of [-1, 1]) {
      polygon(c, [
        { x: X + side * 27, y: Y + 8 },
        { x: X + side * 32, y: Y - 10 },
        { x: X + side * 23, y: Y - 36 },
        { x: X + side * 18, y: Y - 29 },
        { x: X + side * 23, y: Y - 7 },
        { x: X + side * 18, y: Y + 10 }
      ], side === -1 ? "#e5e4cb" : "#8fa8a1");
    }
    doorway(c, X, Y + 18, 13, 20, "#92aba3");
    c.strokeStyle = tint(color, 65);
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(X - 14, Y - 43);
    c.lineTo(X - 3, Y - 65);
    c.stroke();
  } else if (b.type === "heavy") {
    for (const side of [-1, 1]) block(c, X + side * 31, Y + 5, 13, 12, 32, "#8fa59b");
    stoneBody(c, X, Y + 6, 31, 44);
    prism(c, ring(X, Y - 38, 33, 16.5, 10), 8, color);
    dome(c, X, Y - 46, 34, color);
    slits(c, X, Y - 20, 20);
    for (const side of [-1, 0, 1]) {
      const x = X + side * 14;
      polygon(c, [{ x, y: Y - 36 }, { x: x + 4, y: Y - 31 }, { x, y: Y - 25 }, { x: x - 4, y: Y - 31 }], "#e4cf8f");
    }
    doorway(c, X, Y + 23, 18, 26, "#8b9d92");
  } else {
    prism(c, ring(X, Y + 11, 34, 18), 11, "#72938d", "#afc4b4");
    prism(c, ring(X, Y - 2, 26, 14), 24, "#bacbbe");
    prism(c, ring(X, Y - 27, 31, 16), 8, color);
    for (const side of [-1, 1]) {
      polygon(c, [{ x: X + side * 24, y: Y - 32 }, { x: X + side * 29, y: Y - 60 }, { x: X + side * 19, y: Y - 51 }, { x: X + side * 16, y: Y - 34 }], side === -1 ? "#dfebd6" : "#8baca4");
    }
    const bob = Math.sin(time * 2.2 + b.id) * 2;
    {
      const pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + b.id);
      const radius = 44 + pulse * 9;
      const glow = c.createRadialGradient(X, Y - 57, 2, X, Y - 57, radius);
      if (b.o) {
        glow.addColorStop(0, color + "90");
        glow.addColorStop(0.22, color + "55");
        glow.addColorStop(0.6, color + (pulse > 0.5 ? "2c" : "22"));
        glow.addColorStop(1, color + "00");
      } else {
        glow.addColorStop(0, "#e2eef07a");
        glow.addColorStop(0.35, "#b7cdca3d");
        glow.addColorStop(1, "#b7cdca00");
      }
      c.save();
      c.globalCompositeOperation = "lighter";
      c.fillStyle = glow;
      c.beginPath();
      c.arc(X, Y - 57, radius, 0, Math.PI * 2);
      c.fill();
      const ringCol = b.o ? color : "#d0dde0";
      c.strokeStyle = ringCol + (pulse > 0.5 ? "4d" : "30");
      c.lineWidth = 1.8;
      c.beginPath();
      c.arc(X, Y - 57, 34 + pulse * 5, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
    crystal(c, X, Y - 38 + bob, 28, 53, b.o ? color : "#9db9b8");
    doorway(c, X, Y + 12, 10, 15, "#83a29a");
    if (b.o && focused) {
      c.strokeStyle = color + "90";
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(X, Y + 9, 45 + Math.sin(time * 2) * 2, 22, 0, 0, Math.PI * 2);
      c.stroke();
    }
  }
  c.restore();
}
function troopPosition(s, index, count) {
  const path = s.waypoints.length > 1 ? s.waypoints : s.route;
  const narrow = s.waypoints.some((point) => (point.laneWidth ?? TROOP_LANE_SPACING) < TROOP_LANE_SPACING);
  const columns = narrow ? 1 : Math.min(3, Math.ceil(Math.sqrt(count)));
  const row = Math.floor(index / columns);
  const lane = index % columns - (Math.min(columns, count - row * columns) - 1) / 2;
  const travelled = Math.max(0, s.d - row * 13 - 3);
  const pose = samplePath(path, travelled);
  const offset = lane * pose.laneWidth * Math.min(1, travelled / 30);
  return {
    ...pose,
    x: pose.x - Math.sin(pose.angle) * offset,
    y: pose.y + Math.cos(pose.angle) * offset
  };
}

// src/game/render.ts
var F_BODY = "'Vazirmatn',Tahoma,sans-serif";
function rr(c, a, b, w, h, r) {
  c.beginPath();
  if (c.roundRect) c.roundRect(a, b, w, h, r);
  else c.rect(a, b, w, h);
}
function drawB(c, g, b, T) {
  const X = b.x;
  const Y = b.y;
  const isSel = g.sels.includes(b);
  const isDraft = !!g.ptr && g.ptr.draft.includes(b);
  const isTarget = g.preview?.target === b;
  if (isSel || isDraft || g.hover === b) {
    const color = isSel || isDraft ? "#d8ffe8" : "#e2e4ce";
    c.fillStyle = "rgba(201,255,217,.10)";
    c.strokeStyle = color;
    c.lineWidth = isSel || isDraft ? 2.7 : 1.2;
    c.beginPath();
    c.ellipse(X, Y + 10, 48, 24, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.strokeStyle = color + "55";
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(X, Y + 10, 55 + Math.sin(T * 3) * 2, 28, 0, 0, Math.PI * 2);
    c.stroke();
  }
  drawStructure(c, b, T, isSel || isDraft || g.hover === b);
  if (b.hit > 0) {
    const h = Math.max(0, Math.min(1, b.hit));
    const rx = 40 + (1 - h) * 16;
    c.strokeStyle = `rgba(255,108,92,${(h * 0.72).toFixed(3)})`;
    c.lineWidth = 2.6 * h + 0.8;
    c.beginPath();
    c.ellipse(X, Y + 9, rx, rx * 0.5, 0, 0, Math.PI * 2);
    c.stroke();
  }
  if (b.fl > 0) {
    const fl = Math.max(0, Math.min(1, b.fl));
    const col = COL[b.o] || "#ffffff";
    c.save();
    c.globalCompositeOperation = "lighter";
    const glow = c.createRadialGradient(X, Y - 20, 4, X, Y - 20, 52);
    glow.addColorStop(0, withAlpha("#ffffff", fl * 0.28));
    glow.addColorStop(0.45, withAlpha(tint(col, 42), fl * 0.2));
    glow.addColorStop(1, withAlpha(col, 0));
    c.fillStyle = glow;
    c.beginPath();
    c.arc(X, Y - 20, 52, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  if (isTarget && g.preview?.sources.length) drawTargetMark(c, g.preview, T, dashAlpha(g));
}
function drawBuildingLabel(c, g, b) {
  const X = b.x, Y = b.y;
  const col = COL[b.o], dk = DK[b.o];
  const isSel = g.sels.includes(b);
  const excess = b.o && b.tr > g.baseCap;
  const badgeColor = excess ? "#ac3943" : b.o ? dk : "#567577";
  c.fillStyle = "rgba(4,25,30,.3)";
  rr(c, X - 25 + 3, Y + 33, 50, 31, 5);
  c.fill();
  c.fillStyle = "#cfdbc4";
  rr(c, X - 26, Y + 28, 52, 32, 5);
  c.fill();
  c.fillStyle = badgeColor;
  rr(c, X - 23, Y + 30, 46, 27, 3);
  c.fill();
  c.font = "900 19px " + F_BODY;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.lineWidth = 2.5;
  c.strokeStyle = "#153739";
  c.strokeText(fa(b.tr), X, Y + 44);
  c.fillStyle = "#f5f7e8";
  c.fillText(fa(b.tr), X, Y + 44);
  c.fillStyle = "#d1dbc1";
  rr(c, X - 28, Y + 22, 56, 8, 3);
  c.fill();
  c.fillStyle = "#193735";
  rr(c, X - 26, Y + 24, 52, 4, 1);
  c.fill();
  c.fillStyle = excess ? "#f7a281" : col;
  c.fillRect(X - 26, Y + 24, 52 * Math.min(1, b.tr / b.cap), 4);
  if (isSel || g.hover === b) {
    c.font = "bold 10px " + F_BODY;
    c.textAlign = "center";
    c.fillStyle = "#e9ecd3";
    c.strokeStyle = "#223d39";
    c.lineWidth = 3;
    const name = BUILDING_LABELS[b.type] + " / " + fa(b.cap);
    c.strokeText(name, X, Y + 72);
    c.fillText(name, X, Y + 72);
    if (isSel) {
      const composition = TROOP_TYPES.filter((type) => b.army[type] > 0).map((type) => UNITS[type].label + " " + fa(unitCount(b.army[type], type))).join(" / ");
      c.font = "9px " + F_BODY;
      c.strokeText(composition, X, Y + 86);
      c.fillText(composition, X, Y + 86);
    }
  }
}
function drawTargetMark(c, pv, T, alpha = 1) {
  const t = pv.target;
  const attack = pv.mode === "attack";
  const col = attack ? "#ff6b5f" : "#5ee39a";
  const pulse = 1 + Math.sin(T * 8) * 0.06;
  const ring2 = withAlpha(col, alpha);
  c.save();
  c.translate(t.x, t.y);
  c.scale(pulse, pulse);
  c.strokeStyle = ring2;
  c.lineWidth = 4;
  c.setLineDash([16, 10]);
  c.lineDashOffset = T * 40;
  c.beginPath();
  c.arc(0, 0, 62, 0, 7);
  c.stroke();
  c.setLineDash([]);
  c.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 4;
    c.beginPath();
    c.moveTo(Math.cos(a) * 68, Math.sin(a) * 68);
    c.lineTo(Math.cos(a) * 80, Math.sin(a) * 80);
    c.stroke();
  }
  c.restore();
  if (attack || pv.mode === "reinforce") {
    const txt1 = "اعزام " + fa(pv.total) + " نفر";
    const txt2 = attack ? "توان " + fa(Math.round(pv.power * 10) / 10) + " / دفاع " + fa(Math.round(pv.need * 10) / 10) : "توان " + fa(Math.round(pv.power * 10) / 10) + " / دوبار کلیک";
    c.font = "900 15px " + F_BODY;
    const w = Math.max(c.measureText(txt1).width, c.measureText(txt2).width) + 46;
    const bx = t.x - w / 2;
    const by = t.y - 128;
    c.fillStyle = "rgba(4,18,25,.9)";
    rr(c, bx, by, w, 42, 10);
    c.fill();
    c.strokeStyle = pv.ok || pv.mode === "reinforce" ? "#5ee39a" : "#ff8a7a";
    c.lineWidth = 2;
    rr(c, bx, by, w, 42, 10);
    c.stroke();
    c.textAlign = "right";
    c.textBaseline = "middle";
    c.fillStyle = "#fff";
    c.fillText(txt1, bx + w - 34, by + 13);
    c.fillStyle = "rgba(255,255,255,.62)";
    c.font = "12px " + F_BODY;
    c.fillText(txt2, bx + w - 34, by + 30);
    c.font = "18px " + F_BODY;
    c.textAlign = "center";
    const good = pv.mode === "reinforce" ? pv.total > 0 : pv.ok;
    c.fillStyle = good ? "#5ee39a" : "#ff8a7a";
    c.fillText(pv.blocked ? "⚠" : good ? "✓" : "✕", bx + 18, by + 21);
    if (pv.blocked) {
      c.font = "10px " + F_BODY;
      c.fillStyle = "#ffd166";
      c.textAlign = "center";
      c.fillText(fa(pv.blocked) + " مسیر بسته", t.x, by + 52);
    }
  }
}
function drawTrooper(c, s, X, Y, T, seed, angle) {
  const heavy = s.unit === "heavy";
  const fast = s.unit === "fast";
  const pace = UNITS[s.unit].speed;
  const bob = Math.sin(T * 12 * pace + seed) * (heavy ? 0.8 : 1.4);
  const col = COL[s.o];
  const dir = Math.cos(angle) < 0 ? -1 : 1;
  const heightScale = heavy ? 0.85 : 0.72;
  c.fillStyle = "rgba(4,29,33,.25)";
  c.beginPath();
  c.ellipse(X + 1, Y, heavy ? 6 : 5, 2.4, 0, 0, Math.PI * 2);
  c.fill();
  c.save();
  c.translate(X, Y - 12 * heightScale);
  c.scale(dir * (heavy ? 0.82 : 0.67), heightScale);
  const step = Math.sin(T * 13 * pace + seed) * 2.5;
  c.strokeStyle = "#35494d";
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-3, 4 + bob);
  c.lineTo(-3 + step, 12);
  c.moveTo(3, 4 + bob);
  c.lineTo(3 - step, 12);
  c.stroke();
  polygon(c, [{ x: -8, y: -7 + bob }, { x: 5, y: -9 + bob }, { x: 9, y: 5 + bob }, { x: 1, y: 10 + bob }, { x: -8, y: 5 + bob }], col);
  polygon(c, [{ x: 2, y: -8 + bob }, { x: 7, y: -5 + bob }, { x: 9, y: 5 + bob }, { x: 1, y: 10 + bob }], tint(col, -40));
  c.fillStyle = "#efd5a4";
  c.fillRect(-5, -16 + bob, 10, 9);
  polygon(c, ring(0, -18 + bob, 9, 6, 6), tint(col, 28));
  polygon(c, [{ x: -8, y: -18 + bob }, { x: 0, y: -14 + bob }, { x: 8, y: -18 + bob }, { x: 7, y: -11 + bob }, { x: -7, y: -11 + bob }], tint(col, -20));
  c.fillStyle = "#294044";
  c.fillRect(1, -11 + bob, 5, 1.5);
  c.strokeStyle = "#a3afa1";
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(11, 10);
  c.lineTo(11, -28 + bob);
  c.stroke();
  polygon(c, [{ x: 8, y: -25 + bob }, { x: 11, y: -33 + bob }, { x: 14, y: -25 + bob }], "#dce4ce");
  if (heavy) {
    polygon(c, [{ x: -12, y: -7 + bob }, { x: -1, y: -7 + bob }, { x: -1, y: 6 + bob }, { x: -7, y: 11 + bob }, { x: -13, y: 5 + bob }], "#bdcbb7", "#506b69");
    polygon(c, [{ x: -11, y: -4 + bob }, { x: -4, y: -4 + bob }, { x: -4, y: 4 + bob }, { x: -7, y: 7 + bob }, { x: -11, y: 3 + bob }], col);
    c.fillStyle = "#b1c1b1";
    c.fillRect(-1, -24 + bob, 3, 14);
  } else if (fast) {
    polygon(c, [{ x: -5, y: -21 + bob }, { x: -13, y: -30 + bob }, { x: -8, y: -17 + bob }], "#e0f4e6");
  }
  c.restore();
}
function arrows(c, g, T) {
  const pv = g.preview;
  if (!pv || !pv.sources.length && pv.mode === "select") return;
  const t = pv.target;
  const col = pv.mode === "attack" ? "#ff7a63" : "#63e7a4";
  for (const s of pv.sources) {
    const route = g.findRoute(s, t);
    if (!route) continue;
    const points = buildMarchPath(route, landscapeFor(g).islands, g.bs);
    const a = dashAlpha(g);
    c.strokeStyle = `rgba(4,18,25,${0.35 * a})`;
    c.lineWidth = 5;
    c.beginPath();
    points.forEach((point, i) => i ? c.lineTo(point.x, point.y) : c.moveTo(point.x, point.y));
    c.stroke();
    c.strokeStyle = withAlpha(col, a);
    c.lineWidth = 2.5;
    c.setLineDash([13, 9]);
    c.lineDashOffset = -T * 46;
    c.beginPath();
    points.forEach((point, i) => i ? c.lineTo(point.x, point.y) : c.moveTo(point.x, point.y));
    c.stroke();
    c.setLineDash([]);
    const n = g.amountOf(s);
    const marker = samplePath(points, Math.min(90, pathLength(points) * 0.25));
    c.font = "900 13px " + F_BODY;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "rgba(4,18,25,.85)";
    rr(c, marker.x - 16, marker.y - 27, 32, 20, 8);
    c.fill();
    c.fillStyle = col;
    c.fillText(fa(n), marker.x, marker.y - 16);
  }
  if (pv.sources.length) {
    const s = pv.sources[0];
    const route = g.findRoute(s, t);
    if (!route) return;
    const points = buildMarchPath(route, landscapeFor(g).islands, g.bs);
    const head = samplePath(points, Math.max(0, pathLength(points) - 58));
    c.save();
    c.translate(head.x, head.y);
    c.rotate(head.angle);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(14, 0);
    c.lineTo(-8, 9);
    c.lineTo(-8, -9);
    c.closePath();
    c.fill();
    c.restore();
  }
}
function drawCaptureEffect(c, f, p) {
  const clamped = Math.max(0, Math.min(1, p));
  const ease = 1 - Math.pow(1 - clamped, 3);
  const fade = Math.pow(1 - clamped, 1.4);
  const maxR = f.r || 86;
  const bright = tint(f.c, 56);
  const gold = "#ffe8a3";
  const gy = f.y + 9;
  c.save();
  c.save();
  c.translate(f.x, gy);
  c.scale(1, 0.5);
  const groundGlow = c.createRadialGradient(0, 0, 8, 0, 0, maxR);
  groundGlow.addColorStop(0, withAlpha(bright, 0.22 * fade));
  groundGlow.addColorStop(0.55, withAlpha(f.c, 0.16 * fade));
  groundGlow.addColorStop(1, withAlpha(f.c, 0));
  c.fillStyle = groundGlow;
  c.beginPath();
  c.arc(0, 0, maxR, 0, Math.PI * 2);
  c.fill();
  c.restore();
  const rx1 = 30 + ease * (maxR - 30);
  c.strokeStyle = withAlpha(f.c, 0.85 * fade);
  c.lineWidth = 3 * (1 - clamped) + 0.9;
  c.beginPath();
  c.ellipse(f.x, gy, rx1, rx1 * 0.5, 0, 0, Math.PI * 2);
  c.stroke();
  if (clamped > 0.05) {
    const p2 = Math.min(1, (clamped - 0.05) / 0.9);
    const ease2 = 1 - Math.pow(1 - p2, 3);
    const fade2 = Math.pow(1 - p2, 1.5);
    const rx2 = 22 + ease2 * (maxR * 0.76 - 22);
    c.strokeStyle = withAlpha(gold, 0.72 * fade2);
    c.lineWidth = 1.9 * (1 - p2) + 0.6;
    c.beginPath();
    c.ellipse(f.x, gy, rx2, rx2 * 0.5, 0, 0, Math.PI * 2);
    c.stroke();
  }
  const beamEnvelope = clamped < 0.18 ? clamped / 0.18 : Math.pow(Math.max(0, 1 - (clamped - 0.18) / 0.82), 1.85);
  if (beamEnvelope > 5e-3) {
    c.save();
    c.globalCompositeOperation = "lighter";
    c.translate(f.x, f.y - 26);
    c.scale(0.62, 1.15);
    const auraR = 46 + ease * 10;
    const beam = c.createRadialGradient(0, 0, 3, 0, 0, auraR);
    beam.addColorStop(0, withAlpha("#ffffff", 0.3 * beamEnvelope));
    beam.addColorStop(0.4, withAlpha(bright, 0.24 * beamEnvelope));
    beam.addColorStop(1, withAlpha(f.c, 0));
    c.fillStyle = beam;
    c.beginPath();
    c.arc(0, 0, auraR, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  const moteCount = 10;
  for (let k = 0; k < moteCount; k++) {
    const delay = k % 4 * 0.045;
    if (clamped <= delay) continue;
    const mp = Math.min(1, (clamped - delay) / (1 - delay));
    const mEase = 1 - Math.pow(1 - mp, 2.4);
    const mAlpha = Math.sin(Math.min(1, mp) * Math.PI) * 0.92;
    if (mAlpha <= 0.02) continue;
    const baseAng = k / moteCount * Math.PI * 2 + 0.35;
    const swirl = baseAng + mEase * 0.55;
    const orbitR = 22 + k % 3 * 7 + mEase * 12;
    const mx = f.x + Math.cos(swirl) * orbitR;
    const my = f.y - 8 + Math.sin(swirl) * orbitR * 0.46 - mEase * (44 + k % 3 * 13);
    const sz = (5.2 - k % 3 * 0.75) * (1 - mp * 0.65);
    const col = k % 2 === 0 ? bright : gold;
    c.globalAlpha = mAlpha;
    polygon(
      c,
      [
        { x: mx, y: my - sz * 1.35 },
        { x: mx + sz * 0.85, y: my },
        { x: mx, y: my + sz * 1.35 },
        { x: mx - sz * 0.85, y: my }
      ],
      col
    );
  }
  c.restore();
}
function withAlpha(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}
var dashAlpha = (g) => {
  const a = Number(g.attackDash);
  return Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 1;
};
function strokePath(c, pts, width, color, dashOff = 0) {
  if (pts.length < 2) return;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  if (dashOff) {
    c.setLineDash([3, 10]);
    c.lineDashOffset = dashOff;
    c.stroke();
    c.setLineDash([]);
  } else c.stroke();
}
function trail(c, g, T) {
  const p = g.ptr;
  if (p && p.moved && p.trail.length > 1) {
    strokePath(c, p.trail, 16, "rgba(61,220,132,.12)");
    strokePath(c, p.trail, 8, "rgba(61,220,132,.28)");
    strokePath(c, p.trail, 3, "rgba(232,180,76,.95)", -T * 60);
    const tip = p.trail[p.trail.length - 1];
    c.fillStyle = "rgba(255,255,255,.9)";
    c.beginPath();
    c.arc(tip.x, tip.y, 6 + Math.sin(T * 16) * 1.5, 0, 7);
    c.fill();
    c.strokeStyle = "#e8b44c";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(tip.x, tip.y, 10 + Math.sin(T * 16) * 1.5, 0, 7);
    c.stroke();
    const n = p.draft.length;
    if (n) {
      const txt = fa(n) + " قلعه انتخاب شد";
      c.font = "900 14px " + F_BODY;
      const tw = c.measureText(txt).width + 18;
      const bx = tip.x - tw / 2;
      const by = tip.y - 34;
      c.fillStyle = "rgba(4,18,25,.9)";
      rr(c, bx, by, tw, 22, 8);
      c.fill();
      c.strokeStyle = "rgba(61,220,132,.7)";
      c.lineWidth = 1.5;
      rr(c, bx, by, tw, 22, 8);
      c.stroke();
      c.fillStyle = "#9ff5c4";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(txt, tip.x, by + 11);
    }
    return;
  }
  if (g.ghostTrail.length > 1) {
    const fade = 1 - g.ghostTrail[0].t / 0.5;
    c.globalAlpha = Math.max(0, fade);
    strokePath(c, g.ghostTrail, 8, "rgba(61,220,132,.4)");
    c.globalAlpha = 1;
  }
}
function fitView(g, W, H) {
  const top = g.demo ? 0 : Math.max(0, Math.min(H * 0.26, g.hudInset || 0));
  const areaH = Math.max(140, H - top);
  const pad = g.demo ? 1.02 : 0.94;
  const s = Math.min(W / g.worldWidth, areaH / g.worldHeight) * pad * g.zoom;
  return {
    s,
    ox: (W - g.worldWidth * s) / 2,
    oy: top + (areaH - g.worldHeight * s) / 2,
    maxPanX: Math.max(0, (g.worldWidth * s - W) / 2),
    maxPanY: Math.max(0, (g.worldHeight * s - areaH) / 2),
    areaH
  };
}
function render(c, g, T, W, H, dpr) {
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  drawWater(c, g, W, H, T);
  if (!g) return;
  const view = fitView(g, W, H);
  const s = view.s;
  g.panX = Math.max(-view.maxPanX, Math.min(view.maxPanX, g.panX));
  g.panY = Math.max(-view.maxPanY, Math.min(view.maxPanY, g.panY));
  const finalOx = view.ox + g.panX;
  const finalOy = view.oy + g.panY;
  g.view = { s, ox: finalOx, oy: finalOy };
  const sh = g.shake * 7;
  const shx = sh ? (Math.random() - 0.5) * sh : 0;
  const shy = sh ? (Math.random() - 0.5) * sh : 0;
  c.setTransform(dpr * s, 0, 0, dpr * s, dpr * (finalOx + shx), dpr * (finalOy + shy));
  drawTerrain(c, g, T);
  drawTowerRanges(c, g, T);
  arrows(c, g, T);
  const drawables = [
    ...landscapeFor(g).scenery.map((item) => ({ y: item.y, draw: () => drawScenery(c, item, T) })),
    ...g.bs.map((b) => ({ y: b.y + 12, draw: () => drawB(c, g, b, T) })),
    ...g.sq.flatMap((squad) => Array.from({ length: squad.n }, (_, index) => {
      const p = troopPosition(squad, index, squad.n);
      return { y: p.y, draw: () => drawTrooper(c, squad, p.x, p.y, T, squad.id + index * 0.6, p.angle) };
    }))
  ];
  drawables.sort((a, b) => a.y - b.y).forEach((item) => item.draw());
  for (const f of g.fx) {
    const p = Math.max(0, Math.min(1, f.t / f.l));
    if (f.k === "capture") {
      drawCaptureEffect(c, f, p);
      continue;
    }
    c.globalAlpha = Math.max(0, 1 - p);
    if (f.k === "txt") {
      c.font = "900 22px " + F_BODY;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineWidth = 4;
      c.strokeStyle = "rgba(0,0,0,.55)";
      c.strokeText(f.s || "", f.x, f.y - p * 36);
      c.fillStyle = f.c;
      c.fillText(f.s || "", f.x, f.y - p * 36);
    } else if (f.k === "burst") {
      const ease = 1 - Math.pow(1 - p, 2.5);
      const R = (f.r || 40) * (0.25 + ease * 0.85);
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2 + ease * 0.6;
        const r0 = R * 0.32;
        const r1 = R * (0.9 + k % 2 * 0.14);
        const mid = (r0 + r1) * 0.5;
        const w = 2.6 * (1 - p);
        const nx = -Math.sin(a) * w;
        const ny = Math.cos(a) * w;
        polygon(
          c,
          [
            { x: f.x + Math.cos(a) * r0, y: f.y + Math.sin(a) * r0 },
            { x: f.x + Math.cos(a) * mid + nx, y: f.y + Math.sin(a) * mid + ny },
            { x: f.x + Math.cos(a) * r1, y: f.y + Math.sin(a) * r1 },
            { x: f.x + Math.cos(a) * mid - nx, y: f.y + Math.sin(a) * mid - ny }
          ],
          k % 2 === 0 ? f.c : tint(f.c, 45)
        );
      }
    } else {
      const ease = 1 - Math.pow(1 - p, 2.6);
      const rx = 14 + ease * (f.r || 56);
      c.strokeStyle = f.c;
      c.lineWidth = 3.2 * (1 - p) + 0.8;
      c.beginPath();
      c.ellipse(f.x, f.y, rx, rx * 0.52, 0, 0, Math.PI * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  for (const b of g.bs) drawBuildingLabel(c, g, b);
  trail(c, g, T);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// src/game/save.ts
var GLOBAL_KEY = "bt_settings_v1";
var MAP_KEY = "bt_map_v1";
var GLOBAL_BACKUP = "bt_settings_v1.bak";
var MAP_BACKUP = "bt_map_v1.bak";
var RECOVERED_KEY = "bt_settings_v1.recovered";
var LEGACY_KEY = "bt_save_v2";
var OLD_KEYS = ["bt_save", "bt_settings_v0", "castle_defense_v1"];
var DEAD_GLOBAL_FIELDS = ["customMap", "mountains", "mountainScale"];
var globalExtras = {};
var mapExtras = {};
var VALID_CAPS = [30, 40, 50, 60, 80, 100];
var DEFAULT_GLOBAL_SETTINGS = {
  unlocked: 1,
  done: [],
  snd: true,
  speed: 1,
  battleMode: "field",
  maxTroops: 50,
  openRoads: true,
  minCastleDistance: 0,
  ambientSound: true,
  marchSound: true,
  unitTuning: DEFAULT_UNIT_TUNING,
  haloSpin: DEFAULT_HALO_SPIN,
  attackDash: DEFAULT_ATTACK_DASH,
  volumes: { ...DEFAULT_SFX_VOLUMES }
};
function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
  }
}
function readRaw(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function parseObject(text) {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function writeWithBackup(key, backupKey, value) {
  const current = readRaw(key);
  if (current) {
    if (parseObject(current)) {
      try {
        localStorage.setItem(backupKey, current);
      } catch {
      }
    } else {
      try {
        localStorage.setItem(RECOVERED_KEY, current);
      } catch {
      }
    }
  }
  writeJSON(key, value);
}
function pickExtras(source, known) {
  if (!source) return {};
  const extras = {};
  for (const [key, value] of Object.entries(source)) {
    if (!known.includes(key)) extras[key] = value;
  }
  return extras;
}
function readFirstAvailable(primary, backup, legacyKeys) {
  for (const key of [primary, backup, ...legacyKeys]) {
    const raw = readRaw(key);
    const parsed = parseObject(raw);
    if (parsed) return { parsed, key };
  }
  return null;
}
function normalizeGlobalSettings(raw) {
  const base = {
    ...DEFAULT_GLOBAL_SETTINGS,
    unitTuning: { ...DEFAULT_UNIT_TUNING },
    done: [...DEFAULT_GLOBAL_SETTINGS.done]
  };
  if (raw && typeof raw === "object") {
    const source = raw;
    for (const key of Object.keys(DEFAULT_GLOBAL_SETTINGS)) {
      const value = source[key];
      if (value === void 0) continue;
      if (key === "done") {
        base.done = Array.isArray(value) ? value : [];
      } else if (key === "unitTuning") {
        base.unitTuning = value;
      } else {
        base[key] = value;
      }
    }
  }
  if (!Array.isArray(base.done)) base.done = [];
  else base.done = base.done.slice(0, 30).map((d) => d === true);
  base.unlocked = Math.max(1, Math.min(30, Number(base.unlocked) || 1));
  if (base.battleMode !== "field" && base.battleMode !== "castle") base.battleMode = "field";
  const cap = Number(base.maxTroops);
  base.maxTroops = VALID_CAPS.includes(cap) ? cap : Number.isFinite(cap) && cap >= 1 && cap <= 1e3 ? Math.floor(cap) : 50;
  base.openRoads = base.openRoads === true;
  const dist = Number(base.minCastleDistance);
  base.minCastleDistance = Number.isFinite(dist) ? Math.max(0, Math.min(120, Math.floor(dist))) : 0;
  base.ambientSound = base.ambientSound !== false;
  base.marchSound = base.marchSound !== false;
  base.snd = base.snd !== false;
  const speed = Number(base.speed);
  base.speed = speed === 2 || speed === 3 ? speed : 1;
  base.unitTuning = normalizeUnitTuning(base.unitTuning);
  base.haloSpin = normalizeHaloSpin(base.haloSpin);
  base.attackDash = normalizeAttackDash(base.attackDash);
  const rawVolumes = base.volumes && typeof base.volumes === "object" ? base.volumes : {};
  base.volumes = Object.fromEntries(
    SFX_KEYS.map((key) => {
      const v = Number(rawVolumes[key]);
      return [key, Number.isFinite(v) ? Math.max(0, Math.min(1, Math.round(v * 100) / 100)) : DEFAULT_SFX_VOLUMES[key]];
    })
  );
  return base;
}
function globalSliceOf(s) {
  return {
    unlocked: s.unlocked,
    done: s.done,
    snd: s.snd,
    speed: s.speed,
    battleMode: s.battleMode,
    maxTroops: s.maxTroops,
    openRoads: s.openRoads,
    minCastleDistance: s.minCastleDistance,
    ambientSound: s.ambientSound,
    marchSound: s.marchSound,
    unitTuning: s.unitTuning,
    haloSpin: s.haloSpin,
    attackDash: s.attackDash,
    volumes: s.volumes
  };
}
function loadGlobalSettings() {
  const found = readFirstAvailable(GLOBAL_KEY, GLOBAL_BACKUP, [...OLD_KEYS, LEGACY_KEY]);
  if (found) {
    const clean2 = normalizeGlobalSettings(found.parsed);
    globalExtras = pickExtras(found.parsed, Object.keys(DEFAULT_GLOBAL_SETTINGS));
    for (const dead of DEAD_GLOBAL_FIELDS) delete globalExtras[dead];
    const merged = { ...globalExtras, ...globalSliceOf(clean2) };
    if (found.key !== GLOBAL_KEY || JSON.stringify(merged) !== JSON.stringify(found.parsed)) {
      writeWithBackup(GLOBAL_KEY, GLOBAL_BACKUP, merged);
    }
    return clean2;
  }
  const clean = normalizeGlobalSettings(null);
  writeJSON(GLOBAL_KEY, globalSliceOf(clean));
  return clean;
}
function loadMapSettings() {
  const found = readFirstAvailable(MAP_KEY, MAP_BACKUP, [...OLD_KEYS, LEGACY_KEY]);
  if (found) {
    const source = found.parsed;
    const clean2 = normalizeRandomMap(source.customMap ?? source);
    mapExtras = pickExtras(source.customMap ?? source, Object.keys(DEFAULT_RANDOM_MAP));
    delete mapExtras.mountains;
    delete mapExtras.randomRoads;
    const merged = { ...mapExtras, ...clean2 };
    if (found.key !== MAP_KEY || JSON.stringify(merged) !== JSON.stringify(found.parsed)) {
      writeWithBackup(MAP_KEY, MAP_BACKUP, merged);
    }
    return clean2;
  }
  const clean = normalizeRandomMap(DEFAULT_RANDOM_MAP);
  writeJSON(MAP_KEY, clean);
  return clean;
}
function loadSave() {
  const global = loadGlobalSettings();
  const customMap = loadMapSettings();
  applyUnitTuning(global.unitTuning);
  return { ...global, customMap };
}
var SETTINGS_TRANSFER_FORMAT = "battle-time-settings";
var SETTINGS_TRANSFER_VERSION = 1;
var SETTINGS_FILE_NAME = "battle-time-settings.json";
var round2 = (v) => Math.round(v * 100) / 100;
function toPortableSettings(save) {
  const g = normalizeGlobalSettings(save);
  const m = normalizeRandomMap(save.customMap);
  const units = {};
  for (const t of TROOP_TYPES) {
    units[t] = {
      power: round2(g.unitTuning[t].power),
      speed: round2(g.unitTuning[t].speed)
    };
  }
  return {
    format: SETTINGS_TRANSFER_FORMAT,
    version: SETTINGS_TRANSFER_VERSION,
    sound: {
      enabled: g.snd,
      ambient: g.ambientSound,
      march: g.marchSound,
      volumes: { ...g.volumes }
    },
    gameplay: {
      speed: g.speed,
      battleMode: g.battleMode,
      maxTroops: g.maxTroops,
      openRoads: g.openRoads,
      minCastleDistance: g.minCastleDistance
    },
    units,
    visuals: {
      haloSpin: round2(g.haloSpin),
      attackDash: round2(g.attackDash)
    },
    randomMap: m
  };
}
function exportSettingsJson(save) {
  return JSON.stringify(toPortableSettings(save), null, 2);
}
function asPlainRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function readProp(source, ...keys) {
  if (!source) return { found: false, value: void 0 };
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== void 0) {
      return { found: true, value: source[key] };
    }
  }
  return { found: false, value: void 0 };
}
function parseBattleModeValue(value) {
  if (value === "field" || value === "Field" || value === 0) return "field";
  if (value === "castle" || value === "Castle" || value === 1) return "castle";
  return null;
}
function importSettingsJson(text, current) {
  const cleaned = typeof text === "string" ? text.replace(/^\uFEFF/, "").trim() : "";
  if (!cleaned) {
    return { ok: false, error: "کادر خالی است؛ کد JSON تنظیمات را وارد یا فایل را انتخاب کنید." };
  }
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: "کد واردشده JSON معتبر نیست؛ مطمئن شوید متن کامل کپی شده باشد." };
  }
  const root = asPlainRecord(parsed);
  if (!root) {
    return { ok: false, error: "ساختار تنظیمات نامعتبر است؛ یک شیء JSON انتظار می‌رفت." };
  }
  const base = current ? { ...normalizeGlobalSettings(current), customMap: normalizeRandomMap(current.customMap) } : loadSave();
  const soundObj = asPlainRecord(readProp(root, "sound", "Sound").value);
  const gameObj = asPlainRecord(readProp(root, "gameplay", "Gameplay").value);
  const unitsObj = asPlainRecord(
    readProp(root, "units", "Units", "unitTuning", "UnitTuning", "troopTuning", "TroopTuning").value
  );
  const visObj = asPlainRecord(readProp(root, "visuals", "Visuals").value);
  const nestedMapObj = asPlainRecord(readProp(root, "randomMap", "RandomMap", "customMap", "CustomMap").value);
  const draftGlobal = {
    ...globalSliceOf(base),
    unlocked: base.unlocked,
    done: [...base.done],
    unitTuning: {
      normal: { ...base.unitTuning.normal },
      fast: { ...base.unitTuning.fast },
      heavy: { ...base.unitTuning.heavy }
    },
    volumes: { ...base.volumes }
  };
  const draftMap = { ...base.customMap };
  let recognized = 0;
  const sndProp = soundObj ? readProp(soundObj, "enabled", "Enabled") : readProp(root, "snd", "soundEnabled", "SoundEnabled");
  if (sndProp.found && typeof sndProp.value === "boolean") {
    draftGlobal.snd = sndProp.value;
    recognized++;
  }
  const ambProp = soundObj ? readProp(soundObj, "ambient", "Ambient") : readProp(root, "ambientSound", "AmbientSound");
  if (ambProp.found && typeof ambProp.value === "boolean") {
    draftGlobal.ambientSound = ambProp.value;
    recognized++;
  }
  const marchProp = soundObj ? readProp(soundObj, "march", "March") : readProp(root, "marchSound", "MarchSound");
  if (marchProp.found && typeof marchProp.value === "boolean") {
    draftGlobal.marchSound = marchProp.value;
    recognized++;
  }
  const volsRaw = asPlainRecord((soundObj ? readProp(soundObj, "volumes", "Volumes") : readProp(root, "volumes", "Volumes")).value);
  if (volsRaw) {
    for (const key of SFX_KEYS) {
      if (Object.prototype.hasOwnProperty.call(volsRaw, key) && Number.isFinite(Number(volsRaw[key]))) {
        draftGlobal.volumes[key] = Number(volsRaw[key]);
        recognized++;
      }
    }
  }
  const speedProp = gameObj ? readProp(gameObj, "speed", "Speed") : readProp(root, "speed", "speedMultiplier", "SpeedMultiplier");
  if (speedProp.found && Number.isFinite(Number(speedProp.value))) {
    draftGlobal.speed = Number(speedProp.value);
    recognized++;
  }
  const bmProp = gameObj ? readProp(gameObj, "battleMode", "BattleMode") : readProp(root, "battleMode", "BattleMode");
  if (bmProp.found) {
    const bm = parseBattleModeValue(bmProp.value);
    if (bm) {
      draftGlobal.battleMode = bm;
      recognized++;
    }
  }
  const capProp = gameObj ? readProp(gameObj, "maxTroops", "MaxTroops", "maxTroopsCap", "MaxTroopsCap") : readProp(root, "maxTroops", "maxTroopsCap", "MaxTroopsCap");
  if (capProp.found && Number.isFinite(Number(capProp.value))) {
    draftGlobal.maxTroops = Number(capProp.value);
    recognized++;
  }
  const roadsProp = gameObj ? readProp(gameObj, "openRoads", "OpenRoads") : readProp(root, "openRoads", "OpenRoads");
  if (roadsProp.found && typeof roadsProp.value === "boolean") {
    draftGlobal.openRoads = roadsProp.value;
    recognized++;
  }
  const distProp = gameObj ? readProp(gameObj, "minCastleDistance", "MinCastleDistance") : readProp(root, "minCastleDistance", "MinCastleDistance");
  if (distProp.found && Number.isFinite(Number(distProp.value))) {
    draftGlobal.minCastleDistance = Number(distProp.value);
    recognized++;
  }
  if (unitsObj) {
    for (const type of TROOP_TYPES) {
      const capType = type[0].toUpperCase() + type.slice(1);
      const sub = asPlainRecord(readProp(unitsObj, type, capType).value);
      const pProp = sub ? readProp(sub, "power", "Power") : readProp(unitsObj, `${type}Power`, `${capType}Power`);
      const sProp = sub ? readProp(sub, "speed", "Speed") : readProp(unitsObj, `${type}Speed`, `${capType}Speed`);
      if (pProp.found && Number.isFinite(Number(pProp.value))) {
        draftGlobal.unitTuning[type].power = Number(pProp.value);
        recognized++;
      }
      if (sProp.found && Number.isFinite(Number(sProp.value))) {
        draftGlobal.unitTuning[type].speed = Number(sProp.value);
        recognized++;
      }
    }
  }
  const haloProp = visObj ? readProp(visObj, "haloSpin", "HaloSpin") : readProp(root, "haloSpin", "HaloSpin");
  if (haloProp.found && Number.isFinite(Number(haloProp.value))) {
    draftGlobal.haloSpin = Number(haloProp.value);
    recognized++;
  }
  const dashProp = visObj ? readProp(visObj, "attackDash", "AttackDash") : readProp(root, "attackDash", "AttackDash");
  if (dashProp.found && Number.isFinite(Number(dashProp.value))) {
    draftGlobal.attackDash = Number(dashProp.value);
    recognized++;
  }
  const mapSource = nestedMapObj ?? root;
  const mapNumKeys = [
    ["players", "Players"],
    ["normal", "Normal"],
    ["fast", "Fast"],
    ["heavy", "Heavy"],
    ["towers", "Towers"],
    ["lakes", "Lakes"],
    ["ships", "Ships"],
    ["boats", "Boats"],
    ["minDistance", "MinDistance"]
  ];
  let touchedMap = false;
  for (const [camel, pascal] of mapNumKeys) {
    const p = readProp(mapSource, camel, pascal);
    if (p.found && Number.isFinite(Number(p.value))) {
      draftMap[camel] = Number(p.value);
      recognized++;
      touchedMap = true;
    }
  }
  const largeProp = readProp(mapSource, "largeMap", "LargeMap");
  if (largeProp.found && typeof largeProp.value === "boolean") {
    draftMap.largeMap = largeProp.value;
    recognized++;
    touchedMap = true;
  }
  if (recognized === 0) {
    return { ok: false, error: "هیچ تنظیم شناخته‌شده‌ای در این کد یا فایل پیدا نشد." };
  }
  const nextMap = normalizeRandomMap(draftMap);
  if (touchedMap) {
    const mapErr = validateRandomMap(nextMap);
    if (mapErr) return { ok: false, error: mapErr };
  }
  const nextGlobal = normalizeGlobalSettings(draftGlobal);
  return {
    ok: true,
    save: {
      ...nextGlobal,
      unlocked: base.unlocked,
      done: [...base.done],
      customMap: nextMap
    }
  };
}
async function copyTextToClipboard(text) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
  }
  if (typeof document === "undefined") return false;
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "true");
    area.style.position = "fixed";
    area.style.opacity = "0";
    area.style.pointerEvents = "none";
    area.style.left = "-9999px";
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
function downloadJsonFile(text, filename = SETTINGS_FILE_NAME) {
  if (typeof document === "undefined" || typeof Blob === "undefined" || typeof URL === "undefined") return false;
  try {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || SETTINGS_FILE_NAME;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch {
    return false;
  }
}

// scripts/blazor-battle.ts
var sessions = /* @__PURE__ */ new WeakMap();
var globalKey = "castle_blazor9_settings_v2";
var mapKey = "castle_blazor9_map_v1";
var legacyKey = "castle_blazor9_settings_v1";
var defaultSettings = {
  unlockedLevel: 1,
  completedLevels: [],
  soundEnabled: true,
  speedMultiplier: 1,
  battleMode: 0,
  maxTroopsCap: 50,
  customMap: DEFAULT_RANDOM_MAP,
  openRoads: true,
  minCastleDistance: 0,
  ambientSound: true,
  marchSound: true,
  haloSpin: DEFAULT_HALO_SPIN,
  attackDash: DEFAULT_ATTACK_DASH,
  volumes: { ...DEFAULT_SFX_VOLUMES }
};
function extractUnitTuning(raw) {
  const t = raw && typeof raw === "object" ? raw : {};
  const normal = t.normal && typeof t.normal === "object" ? t.normal : {};
  const fast = t.fast && typeof t.fast === "object" ? t.fast : {};
  const heavy = t.heavy && typeof t.heavy === "object" ? t.heavy : {};
  return normalizeUnitTuning({
    normal: { power: t.normalPower ?? normal.power, speed: t.normalSpeed ?? normal.speed },
    fast: { power: t.fastPower ?? fast.power, speed: t.fastSpeed ?? fast.speed },
    heavy: { power: t.heavyPower ?? heavy.power, speed: t.heavySpeed ?? heavy.speed }
  });
}
function normalize(input) {
  const settings = { ...defaultSettings, ...input };
  const cap = Number(settings.maxTroopsCap);
  settings.maxTroopsCap = Number.isFinite(cap) ? Math.max(1, Math.min(1e3, Math.floor(cap))) : 50;
  settings.speedMultiplier = [1, 2, 3].includes(Number(settings.speedMultiplier)) ? Number(settings.speedMultiplier) : 1;
  settings.unlockedLevel = Math.max(1, Math.min(30, Math.floor(Number(settings.unlockedLevel) || 1)));
  settings.battleMode = Number(settings.battleMode) === 1 ? 1 : 0;
  settings.completedLevels = Array.isArray(settings.completedLevels) ? [...new Set(settings.completedLevels.filter((i) => Number.isInteger(i) && i >= 0 && i < 30))] : [];
  settings.soundEnabled = settings.soundEnabled !== false;
  settings.customMap = normalizeRandomMap(settings.customMap);
  settings.openRoads = settings.openRoads === true;
  const dist = Number(settings.minCastleDistance);
  settings.minCastleDistance = Number.isFinite(dist) ? Math.max(0, Math.min(120, Math.floor(dist))) : 0;
  settings.ambientSound = settings.ambientSound !== false;
  settings.marchSound = settings.marchSound !== false;
  const tuned = extractUnitTuning(settings.troopTuning);
  settings.troopTuning = {
    normalPower: tuned.normal.power,
    normalSpeed: tuned.normal.speed,
    fastPower: tuned.fast.power,
    fastSpeed: tuned.fast.speed,
    heavyPower: tuned.heavy.power,
    heavySpeed: tuned.heavy.speed
  };
  settings.haloSpin = normalizeHaloSpin(settings.haloSpin);
  settings.attackDash = normalizeAttackDash(settings.attackDash);
  const vols = settings.volumes && typeof settings.volumes === "object" ? settings.volumes : {};
  settings.volumes = Object.fromEntries(
    Object.entries(vols).filter(([k, v]) => typeof k === "string" && Number.isFinite(Number(v))).map(([k, v]) => [k, Math.max(0, Math.min(1, Number(v)))])
  );
  return settings;
}
function globalSlice(input) {
  const { customMap, ...rest } = normalize(input);
  void customMap;
  return rest;
}
function loadSettings() {
  try {
    const gRaw = localStorage.getItem(globalKey);
    const mRaw = localStorage.getItem(mapKey);
    const legacyRaw = gRaw || mRaw ? null : localStorage.getItem(legacyKey);
    const base = gRaw ? JSON.parse(gRaw) : legacyRaw ? JSON.parse(legacyRaw) : null;
    const map = mRaw ? JSON.parse(mRaw) : legacyRaw ? JSON.parse(legacyRaw)?.customMap : null;
    if (!base && !map) return null;
    if (legacyRaw) {
      const migrated = normalize({ ...JSON.parse(legacyRaw) });
      localStorage.setItem(globalKey, JSON.stringify(globalSlice(migrated)));
      localStorage.setItem(mapKey, JSON.stringify(migrated.customMap));
      return migrated;
    }
    return normalize({ ...base ?? {}, customMap: map ?? void 0 });
  } catch {
    return null;
  }
}
function saveGlobalSettings(input) {
  try {
    localStorage.setItem(globalKey, JSON.stringify(globalSlice(input)));
  } catch {
  }
}
function saveMapSettings(map) {
  try {
    localStorage.setItem(mapKey, JSON.stringify(normalizeRandomMap(map)));
  } catch {
  }
}
function saveSettings(input) {
  const value = normalize(input);
  saveGlobalSettings(value);
  saveMapSettings(value.customMap);
}
function blazorToSave(input) {
  const s = normalize(input);
  const done = Array.from({ length: 30 }, (_, idx) => s.completedLevels.includes(idx));
  const volumes2 = Object.fromEntries(
    SFX_KEYS.map((key) => [
      key,
      Number.isFinite(Number(s.volumes?.[key])) ? Number(s.volumes[key]) : DEFAULT_SFX_VOLUMES[key]
    ])
  );
  const global = normalizeGlobalSettings({
    unlocked: s.unlockedLevel,
    done,
    snd: s.soundEnabled,
    speed: s.speedMultiplier,
    battleMode: s.battleMode === 1 ? "castle" : "field",
    maxTroops: s.maxTroopsCap,
    openRoads: s.openRoads,
    minCastleDistance: s.minCastleDistance,
    ambientSound: s.ambientSound,
    marchSound: s.marchSound,
    unitTuning: extractUnitTuning(s.troopTuning),
    haloSpin: s.haloSpin ?? void 0,
    attackDash: s.attackDash ?? void 0,
    volumes: volumes2
  });
  return { ...global, customMap: normalizeRandomMap(s.customMap) };
}
function saveToBlazor(save, current) {
  const prev = normalize(current ?? null);
  return normalize({
    unlockedLevel: prev.unlockedLevel,
    completedLevels: [...prev.completedLevels],
    soundEnabled: save.snd,
    speedMultiplier: save.speed,
    battleMode: save.battleMode === "castle" ? 1 : 0,
    maxTroopsCap: save.maxTroops,
    customMap: save.customMap,
    openRoads: save.openRoads,
    minCastleDistance: save.minCastleDistance,
    ambientSound: save.ambientSound,
    marchSound: save.marchSound,
    troopTuning: {
      normalPower: save.unitTuning.normal.power,
      normalSpeed: save.unitTuning.normal.speed,
      fastPower: save.unitTuning.fast.power,
      fastSpeed: save.unitTuning.fast.speed,
      heavyPower: save.unitTuning.heavy.power,
      heavySpeed: save.unitTuning.heavy.speed
    },
    haloSpin: save.haloSpin,
    attackDash: save.attackDash,
    volumes: { ...save.volumes }
  });
}
function exportPortableSettings(input) {
  return exportSettingsJson(blazorToSave(input));
}
function importPortableSettings(json, current) {
  const result = importSettingsJson(json, blazorToSave(current ?? null));
  if (!result.ok) return { ok: false, settings: null, error: result.error };
  const settings = saveToBlazor(result.save, current);
  saveSettings(settings);
  return { ok: true, settings, error: null };
}
function copySettingsText(text) {
  return copyTextToClipboard(text);
}
function downloadSettingsFile(text, filename = SETTINGS_FILE_NAME) {
  return downloadJsonFile(text, filename);
}
function getCustomSoundsMeta() {
  return getCustomSfxMeta();
}
function previewSoundEffect(key, level = 1) {
  if (!SFX_KEYS.includes(key)) return false;
  return previewSfx(key, Number.isFinite(Number(level)) ? Number(level) : 1);
}
function stopSoundPreview() {
  stopSfxPreview();
}
async function uploadCustomSound(key) {
  if (!SFX_KEYS.includes(key)) return { ok: false, error: "کلید افکت نامعتبر است." };
  return uploadCustomSfx(key);
}
async function resetCustomSound(key) {
  if (!SFX_KEYS.includes(key)) return;
  await resetCustomSfx(key);
}
async function resetAllCustomSounds() {
  await resetAllCustomSfx();
}
function snapshot(s) {
  const g = s.game;
  const selected = g.ptr?.draft.length ? g.ptr.draft : g.sels;
  return {
    levelIndex: g.i,
    levelName: g.L.name,
    isCustom: g.i >= LEVELS.length,
    largeMap: g.largeMap,
    zoom: g.zoom,
    // بازیکنی که همهٔ قلعه‌هایش را از دست داده از کادر توان رزمی حذف می‌شود.
    factions: g.participants.map((owner) => ({
      id: owner,
      name: owner === 1 ? "تو" : `بازیکن ${owner.toLocaleString("fa-IR")}`,
      troops: g.count(owner),
      power: g.power(owner),
      castles: g.castles(owner),
      color: COL[owner]
    })).filter((faction) => faction.castles > 0),
    playerTroops: g.count(1),
    enemyTroops: g.opponentCount(),
    playerPower: g.power(1),
    enemyPower: g.opponentPower(),
    playerCastles: g.castles(1),
    enemyCastles: g.opponentCastles(),
    selectedCount: selected.length,
    selectedTroops: selected.reduce((n, b) => n + g.amountOf(b), 0),
    readyTroops: selected.reduce((n, b) => n + g.amountOf(b), 0),
    readyPower: selected.reduce((sum, b) => sum + g.dispatchPower(b), 0),
    percent: g.pct,
    timeSeconds: g.t,
    isPaused: g.paused,
    isOver: g.over,
    win: s.win,
    message: performance.now() < s.messageUntil ? s.message : ""
  };
}
function notify2(s, now, force = false) {
  if (s.stopped || s.game.demo || s.inFlight || !force && now - s.lastSent < 500) return;
  s.inFlight = true;
  s.lastSent = now;
  s.callback.invokeMethodAsync("OnGameState", snapshot(s)).catch(() => {
    if (!s.stopped) {
      s.game.paused = true;
      s.game.cancel();
    }
  }).finally(() => {
    s.inFlight = false;
  });
}
function readHudInset(canvas) {
  const bar = canvas.parentElement?.querySelector(".cg-hud-top");
  return bar ? bar.getBoundingClientRect().height : 44;
}
function applyRules(s) {
  const g = s.game;
  g.fieldCombat = s.settings.battleMode === 0;
  g.setMaxTroops(s.settings.maxTroopsCap);
  g.setRoadRules({
    openRoads: s.settings.openRoads,
    minRoadLength: s.settings.minCastleDistance * PX_PER_METER
  });
  applyUnitTuning(extractUnitTuning(s.settings.troopTuning));
  g.haloSpin = normalizeHaloSpin(s.settings.haloSpin);
  g.attackDash = normalizeAttackDash(s.settings.attackDash);
  g.hudInset = readHudInset(s.canvas);
  setSfxVolumes(s.settings.volumes);
  setSound(!g.demo && s.settings.soundEnabled);
  setNatureLayers(!g.demo && s.settings.ambientSound, !g.demo && s.settings.marchSound);
}
function newGame(s, index, demo, levelOverride) {
  const percent = s.game?.pct ?? 60;
  applyUnitTuning(extractUnitTuning(s.settings.troopTuning));
  s.game = new Game(index, demo, levelOverride);
  s.game.pct = percent;
  s.win = null;
  s.message = "";
  s.messageUntil = 0;
  s.resetDemo = false;
  applyRules(s);
  s.game.onToast = (message) => {
    if (s.game.demo) return;
    s.message = message;
    s.messageUntil = performance.now() + 2400;
  };
  s.game.onFinish = (win) => {
    s.win = win;
    notify2(s, performance.now(), true);
  };
  s.game.onDemoReset = () => {
    s.resetDemo = true;
  };
}
function initialize(canvas, callback, input) {
  dispose(canvas);
  const ctx2 = canvas.getContext("2d");
  if (!ctx2) throw new Error("Canvas 2D is not available in this browser.");
  const s = {
    game: new Game(0, true),
    canvas,
    settings: normalize(input),
    callback,
    win: null,
    message: "",
    messageUntil: 0,
    inFlight: false,
    lastSent: 0,
    raf: 0,
    stopped: false,
    resetDemo: false,
    abort: new AbortController(),
    resizeObserver: null,
    detachObserver: null
  };
  sessions.set(canvas, s);
  newGame(s, 3, true);
  const signal = s.abort.signal;
  let pan = null;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  }
  function point(event) {
    const bounds = canvas.getBoundingClientRect();
    const { ox, oy, s: scale } = s.game.view;
    return { x: (event.clientX - bounds.left - ox) / scale, y: (event.clientY - bounds.top - oy) / scale };
  }
  function clampPan() {
    s.game.clampPan(canvas.clientWidth, canvas.clientHeight);
  }
  const canPlay = () => !s.game.demo && !s.game.over && !s.game.paused && !s.stopped;
  canvas.addEventListener("pointerdown", (event) => {
    if (!canPlay() || s.game.ptr) return;
    const explicitPan = event.button === 1 || event.button === 2;
    if (event.pointerType === "mouse" && event.button !== 0 && !explicitPan) return;
    event.preventDefault();
    canvas.focus({ preventScroll: true });
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
    }
    const p = point(event);
    if (explicitPan || !s.game.buildingAt(p.x, p.y)) {
      pan = { id: event.pointerId, x: event.clientX, y: event.clientY, sx: event.clientX, sy: event.clientY };
      canvas.style.cursor = "grabbing";
      return;
    }
    s.game.down(event.pointerId, p.x, p.y, event.shiftKey);
  }, { signal });
  canvas.addEventListener("pointermove", (event) => {
    if (!canPlay()) return;
    if (pan?.id === event.pointerId) {
      s.game.panBy(event.clientX - pan.x, event.clientY - pan.y);
      pan.x = event.clientX;
      pan.y = event.clientY;
      clampPan();
      return;
    }
    const points = event.getCoalescedEvents?.() ?? [];
    for (const sample of points.length ? points : [event]) {
      const p = point(sample);
      s.game.move(event.pointerId, p.x, p.y);
    }
    canvas.style.cursor = s.game.ptr ? "grabbing" : s.game.hover ? "pointer" : "grab";
  }, { signal });
  canvas.addEventListener("pointerup", (event) => {
    if (pan?.id === event.pointerId) {
      const start = pan;
      pan = null;
      const p2 = point(event);
      if (Math.hypot(event.clientX - start.sx, event.clientY - start.sy) < 6 && !s.game.buildingAt(p2.x, p2.y)) s.game.deselectAll();
      canvas.style.cursor = s.game.buildingAt(p2.x, p2.y) ? "pointer" : "grab";
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      return;
    }
    if (!canPlay() || !s.game.ptr) return;
    const p = point(event);
    s.game.move(event.pointerId, p.x, p.y);
    s.game.up(event.pointerId, p.x, p.y);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }, { signal });
  canvas.addEventListener("pointercancel", () => {
    pan = null;
    s.game.cancel();
  }, { signal });
  canvas.addEventListener("lostpointercapture", () => {
    pan = null;
    s.game.cancel();
  }, { signal });
  canvas.addEventListener("wheel", (event) => {
    if (!canPlay()) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const step = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    s.game.zoomAt(step, event.clientX - rect.left, event.clientY - rect.top, canvas.clientWidth, canvas.clientHeight);
    notify2(s, performance.now(), true);
  }, { signal, passive: false });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault(), { signal });
  canvas.addEventListener("keydown", (event) => {
    if (s.game.demo || s.game.over) return;
    if (event.code === "Space" || event.code === "Escape") {
      event.preventDefault();
      s.game.cancel();
      s.game.paused = !s.game.paused;
      notify2(s, performance.now(), true);
    } else if (!s.game.paused) {
      if (event.code === "KeyA") {
        event.preventDefault();
        s.game.selectAll();
      } else if (/^Digit[1-3]$/.test(event.code)) s.game.pct = [20, 60, 80][Number(event.code.slice(-1)) - 1];
    }
  }, { signal });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !s.game.demo && !s.game.over) {
      s.game.paused = true;
      s.game.cancel();
      notify2(s, performance.now(), true);
    }
  }, { signal });
  window.addEventListener("resize", resize, { signal });
  s.resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  s.resizeObserver?.observe(canvas);
  s.detachObserver = new MutationObserver(() => {
    if (!canvas.isConnected) dispose(canvas);
  });
  s.detachObserver.observe(document.body, { childList: true, subtree: true });
  resize();
  let last = 0;
  function frame(now) {
    if (s.stopped) return;
    const dt = Math.max(0, Math.min(0.05, last ? (now - last) / 1e3 : 0));
    last = now;
    const g = s.game;
    if (!g.paused && !g.over) g.step(dt * s.settings.speedMultiplier);
    else if (g.over) g.idle(dt * s.settings.speedMultiplier);
    if (g.ptr || g.hover) g.preview = g.computePreview();
    render(ctx2, g, now / 1e3, canvas.clientWidth, canvas.clientHeight, Math.min(2, devicePixelRatio || 1));
    notify2(s, now);
    if (s.resetDemo) newGame(s, Math.floor(Math.random() * LEVELS.length), true);
    s.raf = requestAnimationFrame(frame);
  }
  s.raf = requestAnimationFrame(frame);
  return snapshot(s);
}
function command(canvas, action, value = 0) {
  const s = sessions.get(canvas);
  if (!s || s.stopped) throw new Error("The game is not initialized.");
  const g = s.game;
  if (action === "randomMap") {
    const config = normalizeRandomMap(value);
    const error = validateRandomMap(config);
    if (error) {
      s.message = error;
      s.messageUntil = performance.now() + 3500;
      return snapshot(s);
    }
    s.settings.customMap = config;
    saveMapSettings(config);
    newGame(s, LEVELS.length, false, createRandomLevel({ ...config, minDistance: s.settings.minCastleDistance }));
    sfx.start();
  } else if (action === "restart") {
    newGame(s, g.i, false, g.i >= LEVELS.length ? g.L : void 0);
    sfx.start();
  } else if (action === "start" && typeof value === "number" && value >= 0 && value < s.settings.unlockedLevel) {
    newGame(s, value, false);
    sfx.start();
  } else if (action === "demo") newGame(s, 3, true);
  else if (action === "pause") {
    g.paused = true;
    g.cancel();
  } else if (action === "resume") g.paused = false;
  else if (action === "zoom" && typeof value === "number") {
    if (value === 0) g.zoomBy(0);
    else g.zoomAt(value, canvas.clientWidth / 2, canvas.clientHeight / 2, canvas.clientWidth, canvas.clientHeight);
  } else if (action === "percent" && [20, 60, 80].includes(value)) g.pct = value;
  else if (!g.over && !g.paused && !g.demo) {
    if (action === "selectAll") g.selectAll();
    else if (action === "clear") {
      g.cancel();
      g.sels = [];
      g.sel = null;
    }
  }
  return snapshot(s);
}
function applySettings(canvas, input) {
  const s = sessions.get(canvas);
  if (!s) return;
  s.settings = normalize(input);
  applyRules(s);
}
function dispose(canvas) {
  const s = sessions.get(canvas);
  if (!s) return;
  s.stopped = true;
  cancelAnimationFrame(s.raf);
  s.game.cancel();
  s.abort.abort();
  s.resizeObserver?.disconnect();
  s.detachObserver?.disconnect();
  sessions.delete(canvas);
  setSound(false);
}
export {
  applySettings,
  blazorToSave,
  command,
  copySettingsText,
  dispose,
  downloadSettingsFile,
  exportPortableSettings,
  getCustomSoundsMeta,
  importPortableSettings,
  initialize,
  loadSettings,
  previewSoundEffect,
  resetAllCustomSounds,
  resetCustomSound,
  saveGlobalSettings,
  saveMapSettings,
  saveSettings,
  saveToBlazor,
  stopSoundPreview,
  uploadCustomSound
};
