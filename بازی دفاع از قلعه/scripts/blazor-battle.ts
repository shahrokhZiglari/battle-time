import { applyUnitTuning, COL, DEFAULT_ATTACK_DASH, DEFAULT_HALO_SPIN, LEVELS, normalizeAttackDash, normalizeHaloSpin, normalizeUnitTuning, ZOOM_STEP, type UnitTuningMap } from "../src/game/config";
import { Game } from "../src/game/engine";
import { render } from "../src/game/render";
import {
  DEFAULT_SFX_VOLUMES,
  getCustomSfxMeta,
  previewSfx,
  resetAllCustomSfx,
  resetCustomSfx,
  setNatureLayers,
  setSfxVolumes,
  setSound,
  sfx,
  SFX_KEYS,
  stopSfxPreview,
  uploadCustomSfx,
  type SfxKey,
} from "../src/game/sound";
import { createRandomLevel, DEFAULT_RANDOM_MAP, normalizeRandomMap, validateRandomMap, PX_PER_METER, type RandomMapSettings } from "../src/game/map";
import {
  copyTextToClipboard,
  downloadJsonFile,
  exportSettingsJson,
  importSettingsJson,
  normalizeGlobalSettings,
  SETTINGS_FILE_NAME,
  type Save,
} from "../src/game/save";

interface Settings {
  unlockedLevel: number;
  completedLevels: number[];
  soundEnabled: boolean;
  speedMultiplier: number;
  battleMode: number;
  maxTroopsCap: number;
  customMap: RandomMapSettings;
  /** every castle can reach every other castle */
  openRoads: boolean;
  /** shortest road that may be built, in meters */
  minCastleDistance: number;
  /** calm nature ambience */
  ambientSound: boolean;
  /** marching sound while troops travel */
  marchSound: boolean;
  /** قدرت و سرعتِ هر نوع سرباز */
  troopTuning?: {
    normalPower?: number; normalSpeed?: number;
    fastPower?: number; fastSpeed?: number;
    heavyPower?: number; heavySpeed?: number;
  } | null;
  /** سرعتِ چرخشِ نورهای دور برج */
  haloSpin?: number | null;
  /** شفافیتِ نقطه‌چینِ مسیر حمله (۰..۱) */
  attackDash?: number | null;
  /** بلندیِ هر صدا/افکت (۰..۱) */
  volumes?: Record<string, number> | null;
  lakes?: number | null;
}

interface Callback {
  invokeMethodAsync(method: string, data: unknown): Promise<unknown>;
}

interface Session {
  game: Game;
  canvas: HTMLCanvasElement;
  settings: Settings;
  win: boolean | null;
  message: string;
  messageUntil: number;
  callback: Callback;
  inFlight: boolean;
  lastSent: number;
  raf: number;
  stopped: boolean;
  resetDemo: boolean;
  abort: AbortController;
  resizeObserver: ResizeObserver | null;
  detachObserver: MutationObserver | null;
}

const sessions = new WeakMap<HTMLCanvasElement, Session>();
/* دو انبارِ جدا: تنظیماتِ سراسری هیچ‌وقت با تنظیماتِ نقشهٔ رندوم قاطی نمی‌شود */
const globalKey = "castle_blazor9_settings_v2";
const mapKey = "castle_blazor9_map_v1";
const legacyKey = "castle_blazor9_settings_v1";

const defaultSettings: Settings = {
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
  volumes: { ...DEFAULT_SFX_VOLUMES },
};

function extractUnitTuning(raw: unknown): UnitTuningMap {
  const t = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const normal = (t.normal && typeof t.normal === "object" ? t.normal : {}) as Record<string, unknown>;
  const fast = (t.fast && typeof t.fast === "object" ? t.fast : {}) as Record<string, unknown>;
  const heavy = (t.heavy && typeof t.heavy === "object" ? t.heavy : {}) as Record<string, unknown>;
  return normalizeUnitTuning({
    normal: { power: (t.normalPower ?? normal.power) as number, speed: (t.normalSpeed ?? normal.speed) as number },
    fast: { power: (t.fastPower ?? fast.power) as number, speed: (t.fastSpeed ?? fast.speed) as number },
    heavy: { power: (t.heavyPower ?? heavy.power) as number, speed: (t.heavySpeed ?? heavy.speed) as number },
  });
}

function normalize(input: Partial<Settings> | null): Settings {
  const settings = { ...defaultSettings, ...input };
  const cap = Number(settings.maxTroopsCap);
  settings.maxTroopsCap = Number.isFinite(cap) ? Math.max(1, Math.min(1000, Math.floor(cap))) : 50;
  settings.speedMultiplier = [1, 2, 3].includes(Number(settings.speedMultiplier)) ? Number(settings.speedMultiplier) : 1;
  settings.unlockedLevel = Math.max(1, Math.min(30, Math.floor(Number(settings.unlockedLevel) || 1)));
  settings.battleMode = Number(settings.battleMode) === 1 ? 1 : 0;
  settings.completedLevels = Array.isArray(settings.completedLevels)
    ? [...new Set(settings.completedLevels.filter((i) => Number.isInteger(i) && i >= 0 && i < 30))]
    : [];
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
    heavySpeed: tuned.heavy.speed,
  };
  settings.haloSpin = normalizeHaloSpin(settings.haloSpin);
  settings.attackDash = normalizeAttackDash(settings.attackDash);
  // بلندیِ صداها: هر کلیدِ ناشناس دور ریخته می‌شود و مقدارها در بازهٔ ۰..۱ می‌مانند
  const vols = settings.volumes && typeof settings.volumes === "object" ? settings.volumes : {};
  settings.volumes = Object.fromEntries(
    Object.entries(vols)
      .filter(([k, v]) => typeof k === "string" && Number.isFinite(Number(v)))
      .map(([k, v]) => [k, Math.max(0, Math.min(1, Number(v)))]),
  );
  return settings;
}

/** فقط تنظیماتِ سراسری (بدونِ بخشِ نقشهٔ رندوم) */
function globalSlice(input: Settings) {
  const { customMap, ...rest } = normalize(input) as Settings & { customMap?: RandomMapSettings };
  void customMap;
  return rest;
}

export function loadSettings(): Settings | null {
  try {
    const gRaw = localStorage.getItem(globalKey);
    const mRaw = localStorage.getItem(mapKey);
    const legacyRaw = gRaw || mRaw ? null : localStorage.getItem(legacyKey);
    const base = gRaw ? JSON.parse(gRaw) : legacyRaw ? JSON.parse(legacyRaw) : null;
    const map = mRaw ? JSON.parse(mRaw) : legacyRaw ? JSON.parse(legacyRaw)?.customMap : null;
    if (!base && !map) return null;
    // مهاجرتِ یک‌باره: از این پس هر دسته در کلیدِ خودش می‌ماند
    if (legacyRaw) {
      const migrated = normalize({ ...JSON.parse(legacyRaw) });
      localStorage.setItem(globalKey, JSON.stringify(globalSlice(migrated)));
      localStorage.setItem(mapKey, JSON.stringify(migrated.customMap));
      return migrated;
    }
    return normalize({ ...(base ?? {}), customMap: map ?? undefined });
  } catch {
    return null;
  }
}

/** نوشتنِ فقط تنظیماتِ سراسری؛ به تنظیماتِ نقشه دست نمی‌زند */
export function saveGlobalSettings(input: Settings) {
  try { localStorage.setItem(globalKey, JSON.stringify(globalSlice(input))); } catch { /* Storage may be disabled. */ }
}

/** نوشتنِ فقط تنظیماتِ ساختِ نقشهٔ رندوم؛ به تنظیماتِ سراسری دست نمی‌زند */
export function saveMapSettings(map: RandomMapSettings) {
  try { localStorage.setItem(mapKey, JSON.stringify(normalizeRandomMap(map))); } catch { /* Storage may be disabled. */ }
}

/** نوشتنِ هر دو بخش (برای ذخیرهٔ کامل از سمتِ تنظیمات) */
export function saveSettings(input: Settings) {
  const value = normalize(input);
  saveGlobalSettings(value);
  saveMapSettings(value.customMap);
}

/** تبدیلِ تنظیماتِ Blazor به مدلِ یکپارچهٔ وب برای خروجیِ مشترک */
export function blazorToSave(input: Partial<Settings> | null): Save {
  const s = normalize(input);
  const done = Array.from({ length: 30 }, (_, idx) => s.completedLevels.includes(idx));
  const volumes = Object.fromEntries(
    SFX_KEYS.map((key) => [
      key,
      Number.isFinite(Number(s.volumes?.[key])) ? Number(s.volumes![key]) : DEFAULT_SFX_VOLUMES[key],
    ]),
  ) as Record<SfxKey, number>;
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
    haloSpin: s.haloSpin ?? undefined,
    attackDash: s.attackDash ?? undefined,
    volumes,
  });
  return { ...global, customMap: normalizeRandomMap(s.customMap) };
}

/** تبدیلِ مدلِ یکپارچه به ساختارِ تنظیماتِ Blazor (با حفظِ پیشرفتِ مراحل) */
export function saveToBlazor(save: Save, current?: Partial<Settings> | null): Settings {
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
      heavySpeed: save.unitTuning.heavy.speed,
    },
    haloSpin: save.haloSpin,
    attackDash: save.attackDash,
    volumes: { ...save.volumes },
  });
}

/** خروجیِ استاندارد JSON از تنظیماتِ Blazor (کاملاً سازگار با نسخهٔ وب و آفلاین) */
export function exportPortableSettings(input: Partial<Settings> | null): string {
  return exportSettingsJson(blazorToSave(input));
}

/** خواندنِ JSON تنظیمات از هر نسخه و تبدیل به مدلِ Blazor */
export function importPortableSettings(json: string, current?: Partial<Settings> | null) {
  const result = importSettingsJson(json, blazorToSave(current ?? null));
  if (!result.ok) return { ok: false, settings: null, error: result.error };
  const settings = saveToBlazor(result.save, current);
  saveSettings(settings);
  return { ok: true, settings, error: null };
}

/** کپیِ متنِ تنظیمات در حافظهٔ مرورگر از سمتِ Blazor */
export function copySettingsText(text: string): Promise<boolean> {
  return copyTextToClipboard(text);
}

/** دانلودِ مستقیمِ فایلِ تنظیمات در مرورگر از سمتِ Blazor */
export function downloadSettingsFile(text: string, filename = SETTINGS_FILE_NAME): boolean {
  return downloadJsonFile(text, filename);
}

/** فهرست افکت‌هایی که فایل صوتی سفارشی برایشان آپلود شده است */
export function getCustomSoundsMeta(): Record<string, string> {
  return getCustomSfxMeta() as Record<string, string>;
}

/** پخش آزمایشی یک افکت صوتی در پنجرهٔ تنظیمات Blazor */
export function previewSoundEffect(key: string, level = 1): boolean {
  if (!SFX_KEYS.includes(key as SfxKey)) return false;
  return previewSfx(key as SfxKey, Number.isFinite(Number(level)) ? Number(level) : 1);
}

/** توقف پخش آزمایشی صدا */
export function stopSoundPreview(): void {
  stopSfxPreview();
}

/** باز کردن پنجرهٔ انتخاب فایل صوتی برای یک افکت از سمت Blazor */
export async function uploadCustomSound(key: string): Promise<{ ok: boolean; cancelled?: boolean; name?: string; error?: string }> {
  if (!SFX_KEYS.includes(key as SfxKey)) return { ok: false, error: "کلید افکت نامعتبر است." };
  return uploadCustomSfx(key as SfxKey);
}

/** بازگردانی یک افکت به صدای پیش‌فرض */
export async function resetCustomSound(key: string): Promise<void> {
  if (!SFX_KEYS.includes(key as SfxKey)) return;
  await resetCustomSfx(key as SfxKey);
}

/** بازگردانی همهٔ افکت‌ها به صداهای پیش‌فرض */
export async function resetAllCustomSounds(): Promise<void> {
  await resetAllCustomSfx();
}

function snapshot(s: Session) {
  const g = s.game;
  const selected = g.ptr?.draft.length ? g.ptr.draft : g.sels;
  return {
    levelIndex: g.i,
    levelName: g.L.name,
    isCustom: g.i >= LEVELS.length,
    largeMap: g.largeMap,
    zoom: g.zoom,
    // بازیکنی که همهٔ قلعه‌هایش را از دست داده از کادر توان رزمی حذف می‌شود.
    factions: g.participants
      .map((owner) => ({
        id: owner,
        name: owner === 1 ? "تو" : `بازیکن ${owner.toLocaleString("fa-IR")}`,
        troops: g.count(owner),
        power: g.power(owner),
        castles: g.castles(owner),
        color: COL[owner],
      }))
      .filter((faction) => faction.castles > 0),
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
    message: performance.now() < s.messageUntil ? s.message : "",
  };
}

// Canvas and pointer events never cross SignalR. Only a small HUD snapshot is sent twice a second.
function notify(s: Session, now: number, force = false) {
  if (s.stopped || s.game.demo || s.inFlight || (!force && now - s.lastSent < 500)) return;
  s.inFlight = true;
  s.lastSent = now;
  s.callback.invokeMethodAsync("OnGameState", snapshot(s)).catch(() => {
    if (!s.stopped) {
      s.game.paused = true;
      s.game.cancel();
    }
  }).finally(() => { s.inFlight = false; });
}

/** ارتفاعِ نوارِ بالای صفحه در نسخهٔ Blazor (px) تا نقشه زیرش نرود */
function readHudInset(canvas: HTMLCanvasElement) {
  const bar = canvas.parentElement?.querySelector<HTMLElement>(".cg-hud-top");
  return bar ? bar.getBoundingClientRect().height : 44;
}

function applyRules(s: Session) {
  const g = s.game;
  g.fieldCombat = s.settings.battleMode === 0;
  g.setMaxTroops(s.settings.maxTroopsCap);
  g.setRoadRules({
    openRoads: s.settings.openRoads,
    minRoadLength: s.settings.minCastleDistance * PX_PER_METER,
  });
  applyUnitTuning(extractUnitTuning(s.settings.troopTuning));
  g.haloSpin = normalizeHaloSpin(s.settings.haloSpin);
  g.attackDash = normalizeAttackDash(s.settings.attackDash);
  g.hudInset = readHudInset(s.canvas);
  setSfxVolumes(s.settings.volumes as never);
  setSound(!g.demo && s.settings.soundEnabled);
  setNatureLayers(!g.demo && s.settings.ambientSound, !g.demo && s.settings.marchSound);
}

function newGame(s: Session, index: number, demo: boolean, levelOverride?: typeof LEVELS[number]) {
  const percent = s.game?.pct ?? 60;
  // تنظیماتِ نیروها باید پیش از ساختِ ارتش‌های اولیه اعمال شود.
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
  s.game.onFinish = (win) => { s.win = win; notify(s, performance.now(), true); };
  s.game.onDemoReset = () => { s.resetDemo = true; };
}

export function initialize(canvas: HTMLCanvasElement, callback: Callback, input: Settings) {
  dispose(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available in this browser.");

  const s: Session = {
    game: new Game(0, true), canvas, settings: normalize(input), callback,
    win: null, message: "", messageUntil: 0, inFlight: false, lastSent: 0,
    raf: 0, stopped: false, resetDemo: false, abort: new AbortController(),
    resizeObserver: null, detachObserver: null,
  };
  sessions.set(canvas, s);
  newGame(s, 3, true);
  const signal = s.abort.signal;
  let pan: { id: number; x: number; y: number; sx: number; sy: number } | null = null;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
  }

  function point(event: PointerEvent) {
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
    try { canvas.setPointerCapture(event.pointerId); } catch { /* اشاره‌گر پیش از فشار رها شده */ }
    const p = point(event);
    // کشیدن روی زمین خالی = جابجایی نقشه؛ ژست انتخاب/حمله فقط با فشار روی قلعه شروع می‌شود.
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
      const p = point(event);
      // کلیکِ بدون کشیدن روی زمین خالی = لغو انتخاب‌ها
      if (Math.hypot(event.clientX - start.sx, event.clientY - start.sy) < 6 && !s.game.buildingAt(p.x, p.y)) s.game.deselectAll();
      canvas.style.cursor = s.game.buildingAt(p.x, p.y) ? "pointer" : "grab";
      if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
      return;
    }
    if (!canPlay() || !s.game.ptr) return;
    const p = point(event);
    s.game.move(event.pointerId, p.x, p.y);
    s.game.up(event.pointerId, p.x, p.y);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  }, { signal });
  canvas.addEventListener("pointercancel", () => { pan = null; s.game.cancel(); }, { signal });
  canvas.addEventListener("lostpointercapture", () => { pan = null; s.game.cancel(); }, { signal });
  canvas.addEventListener("wheel", (event) => {
    if (!canPlay()) return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const step = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    s.game.zoomAt(step, event.clientX - rect.left, event.clientY - rect.top, canvas.clientWidth, canvas.clientHeight);
    notify(s, performance.now(), true);
  }, { signal, passive: false });

  canvas.addEventListener("contextmenu", (event) => event.preventDefault(), { signal });

  canvas.addEventListener("keydown", (event) => {
    if (s.game.demo || s.game.over) return;
    if (event.code === "Space" || event.code === "Escape") {
      event.preventDefault();
      s.game.cancel();
      s.game.paused = !s.game.paused;
      notify(s, performance.now(), true);
    } else if (!s.game.paused) {
      if (event.code === "KeyA") { event.preventDefault(); s.game.selectAll(); }
      else if (/^Digit[1-3]$/.test(event.code)) s.game.pct = [20, 60, 80][Number(event.code.slice(-1)) - 1];
    }
  }, { signal });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && !s.game.demo && !s.game.over) {
      s.game.paused = true;
      s.game.cancel();
      notify(s, performance.now(), true);
    }
  }, { signal });
  window.addEventListener("resize", resize, { signal });
  s.resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
  s.resizeObserver?.observe(canvas);
  s.detachObserver = new MutationObserver(() => { if (!canvas.isConnected) dispose(canvas); });
  s.detachObserver.observe(document.body, { childList: true, subtree: true });
  resize();

  let last = 0;
  function frame(now: number) {
    if (s.stopped) return;
    const dt = Math.max(0, Math.min(.05, last ? (now - last) / 1000 : 0));
    last = now;
    const g = s.game;
    if (!g.paused && !g.over) g.step(dt * s.settings.speedMultiplier);
    else if (g.over) g.idle(dt * s.settings.speedMultiplier);
    if (g.ptr || g.hover) g.preview = g.computePreview();
    render(ctx!, g, now / 1000, canvas.clientWidth, canvas.clientHeight, Math.min(2, devicePixelRatio || 1));
    notify(s, now);
    if (s.resetDemo) newGame(s, Math.floor(Math.random() * LEVELS.length), true);
    s.raf = requestAnimationFrame(frame);
  }
  s.raf = requestAnimationFrame(frame);
  return snapshot(s);
}

export function command(canvas: HTMLCanvasElement, action: string, value: number | RandomMapSettings = 0) {
  const s = sessions.get(canvas);
  if (!s || s.stopped) throw new Error("The game is not initialized.");
  const g = s.game;
  if (action === "randomMap") {
    const config = normalizeRandomMap(value as RandomMapSettings);
    const error = validateRandomMap(config);
    if (error) { s.message = error; s.messageUntil = performance.now() + 3500; return snapshot(s); }
    s.settings.customMap = config;
    saveMapSettings(config); // فقط تنظیماتِ نقشه؛ تنظیماتِ سراسری دست‌نخورده می‌ماند
    newGame(s, LEVELS.length, false, createRandomLevel({ ...config, minDistance: s.settings.minCastleDistance }));
    sfx.start();
  }
  else if (action === "restart") {
    newGame(s, g.i, false, g.i >= LEVELS.length ? g.L : undefined);
    sfx.start();
  }
  else if (action === "start" && typeof value === "number" && value >= 0 && value < s.settings.unlockedLevel) { newGame(s, value, false); sfx.start(); }
  else if (action === "demo") newGame(s, 3, true);
  else if (action === "pause") { g.paused = true; g.cancel(); }
  else if (action === "resume") g.paused = false;
  else if (action === "zoom" && typeof value === "number") {
    if (value === 0) g.zoomBy(0);
    else g.zoomAt(value, canvas.clientWidth / 2, canvas.clientHeight / 2, canvas.clientWidth, canvas.clientHeight);
  }
  else if (action === "percent" && [20, 60, 80].includes(value)) g.pct = value;
  else if (!g.over && !g.paused && !g.demo) {
    if (action === "selectAll") g.selectAll();
    else if (action === "clear") { g.cancel(); g.sels = []; g.sel = null; }
  }
  return snapshot(s);
}

export function applySettings(canvas: HTMLCanvasElement, input: Settings) {
  const s = sessions.get(canvas);
  if (!s) return;
  s.settings = normalize(input);
  applyRules(s);
}

export function dispose(canvas: HTMLCanvasElement) {
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