import { DEFAULT_RANDOM_MAP, normalizeRandomMap, RandomMapSettings, validateRandomMap } from "./map";
import { DEFAULT_SFX_VOLUMES, SFX_KEYS, type SfxKey } from "./sound";
import {
  applyUnitTuning,
  DEFAULT_ATTACK_DASH,
  DEFAULT_HALO_SPIN,
  DEFAULT_UNIT_TUNING,
  normalizeHaloSpin,
  normalizeAttackDash,
  normalizeUnitTuning,
  TROOP_TYPES,
  UnitTuningMap,
} from "./config";

/* =====================================================================
 * مدیریتِ تنظیمات در دو انبارِ جداگانه
 *
 *  ۱) تنظیماتِ سراسریِ بازی (GLOBAL_KEY)  — مستقل از نقشه و حالتِ بازی
 *  ۲) تنظیماتِ ساختِ نقشهٔ تصادفی (MAP_KEY) — فقط برای تولیدِ نقشه
 *
 * چرا جدا؟ چون پیش‌تر هر دو در یک رکورد ذخیره می‌شدند و نوشتنِ تنظیماتِ
 * نقشهٔ رندوم، کلِ رکورد را با یک نسخهٔ کهنه بازنویسی می‌کرد و تنظیماتِ
 * سراسری به عقب برمی‌گشتند. با دو کلیدِ مستقل، نوشتنِ یکی هرگز نمی‌تواند
 * دیگری را تغییر دهد یا بازنویسی کند.
 * ===================================================================== */

/** تنظیماتِ سراسری — در همهٔ نقشه‌ها و حالت‌ها یکی است */
export interface GlobalSettings {
  unlocked: number;
  done: boolean[];
  snd: boolean;
  speed: number;
  battleMode: "field" | "castle";
  maxTroops: number;
  /** همهٔ قلعه‌ها به هم راه دارند */
  openRoads: boolean;
  /** حداقل فاصلهٔ دو قلعهٔ همسایه (متر) */
  minCastleDistance: number;
  /** صدای طبیعی پس‌زمینه */
  ambientSound: boolean;
  /** صدای حرکت لشکر */
  marchSound: boolean;
  /** قدرت و سرعتِ هر نوع سرباز */
  unitTuning: UnitTuningMap;
  /** سرعتِ چرخشِ نورهای دور برج */
  haloSpin: number;
  /** شفافیتِ نقطه‌چینِ مسیر حمله (۰..۱) */
  attackDash: number;
  /** بلندیِ هر صدا و افکت (۰..۱) — کلیدها در sound.ts */
  volumes: Record<SfxKey, number>;
}

/** نمای یکپارچه برای رابط کاربری: تنظیماتِ سراسری + تنظیماتِ نقشهٔ رندوم */
export interface Save extends GlobalSettings {
  customMap: RandomMapSettings;
}

/*
 * سیاستِ ماندگاریِ تنظیمات (دورِ ۱۹)
 * ---------------------------------
 * • نامِ کلیدها هرگز عوض نمی‌شود؛ نسخه‌های تازهٔ بازی همان کلید را می‌خوانند،
 *   پس آپدیتِ بازی هیچ‌وقت تنظیماتِ کاربر را «نمی‌بیند» و از دست نمی‌رود.
 * • پیش از هر بازنویسی، نسخهٔ سالمِ قبلی در کلیدِ پشتیبان (‎.bak) نگه داشته
 *   می‌شود؛ اگر نوشتنِ بعدی نیمه‌کاره بماند یا رکورد خراب شود، همان پشتیبان
 *   خوانده می‌شود.
 * • فیلدهای ناشناخته (مثلاً تنظیماتی که نسخهٔ تازه‌ترِ بازی افزوده) دور ریخته
 *   نمی‌شوند؛ در حافظه نگه داشته و هنگامِ نوشتن دوباره کنارِ بقیه ذخیره می‌شوند.
 *   پس باز کردنِ یک نسخهٔ قدیمی هم تنظیماتِ نسخهٔ جدید را پاک نمی‌کند.
 * • اگر رکوردِ اصلی خراب (JSON نامعتبر) باشد، خامِ آن در کلیدِ بازیابی نگه
 *   داشته می‌شود؛ هیچ‌چیز بی‌سروصدا حذف نمی‌شود.
 */
const GLOBAL_KEY = "bt_settings_v1";
const MAP_KEY = "bt_map_v1";
const GLOBAL_BACKUP = "bt_settings_v1.bak";
const MAP_BACKUP = "bt_map_v1.bak";
/** رکوردِ خرابِ کنارگذاشته‌شده — برای بازیابیِ دستی */
const RECOVERED_KEY = "bt_settings_v1.recovered";
/** کلیدِ نسخهٔ قدیمی که هر دو دسته با هم در آن بودند (فقط برای مهاجرت) */
const LEGACY_KEY = "bt_save_v2";
/** کلیدهای نسخه‌های خیلی قدیمی که در مسیرِ مهاجرت خوانده می‌شوند */
const OLD_KEYS = ["bt_save", "bt_settings_v0", "castle_defense_v1"];

/** فیلدهای قدیمیِ کلیدِ سراسری که در دورِ ۱۹ بازنویسی/حذف می‌شوند */
const DEAD_GLOBAL_FIELDS = ["customMap", "mountains", "mountainScale"] as const;

/** فیلدهای ناشناختهٔ هر انبار که باید دست‌نخورده بمانند */
let globalExtras: Record<string, unknown> = {};
let mapExtras: Record<string, unknown> = {};

const VALID_CAPS = [30, 40, 50, 60, 80, 100];

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  unlocked: 1,
  done: [],
  snd: true,
  speed: 1,
  battleMode: "field",
  maxTroops: 50,
  openRoads: true,
  minCastleDistance: 10,
  ambientSound: true,
  marchSound: true,
  unitTuning: DEFAULT_UNIT_TUNING,
  haloSpin: DEFAULT_HALO_SPIN,
  attackDash: DEFAULT_ATTACK_DASH,
  volumes: { ...DEFAULT_SFX_VOLUMES },
};

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

/** متنِ خامِ یک کلید (بدونِ تجزیه) */
function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** تجزیهٔ متن؛ اگر خراب بود null */
function parseObject(text: string | null): Record<string, unknown> | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/**
 * نوشتنِ ایمن: اول نسخهٔ سالمِ فعلی را در کلیدِ پشتیبان می‌گذارد، بعد مقدارِ
 * تازه را می‌نویسد. اگر مقدارِ فعلی خراب باشد، آن را به کلیدِ بازیابی منتقل
 * می‌کند تا هیچ داده‌ای بی‌سروصدا از بین نرود.
 */
function writeWithBackup(key: string, backupKey: string, value: unknown) {
  const current = readRaw(key);
  if (current) {
    if (parseObject(current)) {
      try {
        localStorage.setItem(backupKey, current);
      } catch {
        /* ignore */
      }
    } else {
      try {
        localStorage.setItem(RECOVERED_KEY, current);
      } catch {
        /* ignore */
      }
    }
  }
  writeJSON(key, value);
}

/** کلیدهای ناشناختهٔ یک رکورد را جدا می‌کند تا در نوشتنِ بعدی حفظ شوند */
function pickExtras(source: Record<string, unknown> | null, known: string[]): Record<string, unknown> {
  if (!source) return {};
  const extras: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!known.includes(key)) extras[key] = value;
  }
  return extras;
}

/** رکوردی را از کلیدِ اصلی، بعد پشتیبان، بعد کلیدهای قدیمی می‌خوانَد */
function readFirstAvailable(primary: string, backup: string, legacyKeys: string[]) {
  for (const key of [primary, backup, ...legacyKeys]) {
    const raw = readRaw(key);
    const parsed = parseObject(raw);
    if (parsed) return { parsed, key };
  }
  return null;
}

/** اعتبارسنجی و پاک‌سازیِ تنظیماتِ سراسری (هر ورودی‌ای را می‌پذیرد) */
export function normalizeGlobalSettings(raw: Partial<GlobalSettings> | null | undefined): GlobalSettings {
  const base: GlobalSettings = {
    ...DEFAULT_GLOBAL_SETTINGS,
    unitTuning: { ...DEFAULT_UNIT_TUNING },
    done: [...DEFAULT_GLOBAL_SETTINGS.done],
  };
  // فقط کلیدهای شناخته‌شده کپی می‌شوند؛ فیلدهای مربوط به نقشه (customMap) هرگز
  // به انبارِ تنظیماتِ سراسری راه پیدا نمی‌کنند.
  if (raw && typeof raw === "object") {
    const source = raw as Record<string, unknown>;
    for (const key of Object.keys(DEFAULT_GLOBAL_SETTINGS) as (keyof GlobalSettings)[]) {
      const value = source[key];
      if (value === undefined) continue;
      if (key === "done") {
        base.done = Array.isArray(value) ? (value as boolean[]) : [];
      } else if (key === "unitTuning") {
        base.unitTuning = value as UnitTuningMap;
      } else {
        (base as unknown as Record<string, unknown>)[key] = value;
      }
    }
  }

  if (!Array.isArray(base.done)) base.done = [];
  else base.done = base.done.slice(0, 30).map((d) => d === true);
  base.unlocked = Math.max(1, Math.min(30, Number(base.unlocked) || 1));
  if (base.battleMode !== "field" && base.battleMode !== "castle") base.battleMode = "field";
  const cap = Number(base.maxTroops);
  base.maxTroops = VALID_CAPS.includes(cap)
    ? cap
    : Number.isFinite(cap) && cap >= 1 && cap <= 1000
      ? Math.floor(cap)
      : 50;
  base.openRoads = base.openRoads === true;
  const dist = Number(base.minCastleDistance);
  base.minCastleDistance = Number.isFinite(dist) ? Math.max(0, Math.min(120, Math.floor(dist))) : 10;
  base.ambientSound = base.ambientSound !== false;
  base.marchSound = base.marchSound !== false;
  base.snd = base.snd !== false;
  const speed = Number(base.speed);
  base.speed = speed === 2 || speed === 3 ? speed : 1;
  base.unitTuning = normalizeUnitTuning(base.unitTuning);
  base.haloSpin = normalizeHaloSpin(base.haloSpin);
  base.attackDash = normalizeAttackDash(base.attackDash);
  // بلندیِ صداها: هر کلیدِ ناشناخته کنار گذاشته می‌شود و مقدارِ خراب به پیش‌فرضِ همان کلید برمی‌گردد
  const rawVolumes = (base.volumes && typeof base.volumes === "object" ? base.volumes : {}) as Record<string, unknown>;
  base.volumes = Object.fromEntries(
    SFX_KEYS.map((key) => {
      const v = Number(rawVolumes[key]);
      return [key, Number.isFinite(v) ? Math.max(0, Math.min(1, Math.round(v * 100) / 100)) : DEFAULT_SFX_VOLUMES[key]];
    }),
  ) as Record<SfxKey, number>;
  return base;
}

/** فقط فیلدهای سراسری را از یک Save جدا می‌کند */
export function globalSliceOf(s: Save): GlobalSettings {
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
    volumes: s.volumes,
  };
}

/** آیا تنظیماتِ سراسریِ دو نسخه برابرند؟ (برای پرهیز از نوشتنِ بی‌مورد) */
export function sameGlobalSettings(a: GlobalSettings, b: GlobalSettings): boolean {
  return JSON.stringify(globalSliceOf(a as Save)) === JSON.stringify(globalSliceOf(b as Save));
}

export function sameMapSettings(a: RandomMapSettings, b: RandomMapSettings): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/* ---------------------------- خواندن ---------------------------- */

export function loadGlobalSettings(): GlobalSettings {
  const found = readFirstAvailable(GLOBAL_KEY, GLOBAL_BACKUP, [...OLD_KEYS, LEGACY_KEY]);
  if (found) {
    const clean = normalizeGlobalSettings(found.parsed as Partial<GlobalSettings>);
    // فیلدهای ناشناخته (از نسخه‌های دیگرِ بازی) حفظ می‌شوند تا بازنویسی نشوند
    globalExtras = pickExtras(found.parsed, Object.keys(DEFAULT_GLOBAL_SETTINGS));
    // فیلدهای بازماندهٔ نسخه‌های قدیمی که دیگر معنایی ندارند حذف می‌شوند:
    //   • customMap در کلیدِ سراسری، نسخهٔ کهنهٔ تنظیماتِ نقشه است و اگر روزی
    //     کلیدِ نقشه نبود، از همین‌جا نقشه را بازمی‌گرداند.
    //   • mountains و mountainScale با حذفِ کاملِ کوه‌ها (دورِ ۱۹) مرده‌اند.
    for (const dead of DEAD_GLOBAL_FIELDS) delete globalExtras[dead];
    const merged = { ...globalExtras, ...globalSliceOf(clean as Save) };
    // خودترمیمی: رکوردِ ناقص/خراب با نسخهٔ پاکیزه تکمیل می‌شود، ولی نسخهٔ
    // سالمِ قبلی در پشتیبان می‌مانَد.
    if (found.key !== GLOBAL_KEY || JSON.stringify(merged) !== JSON.stringify(found.parsed)) {
      writeWithBackup(GLOBAL_KEY, GLOBAL_BACKUP, merged);
    }
    return clean;
  }
  const clean = normalizeGlobalSettings(null);
  writeJSON(GLOBAL_KEY, globalSliceOf(clean as Save));
  return clean;
}

export function loadMapSettings(): RandomMapSettings {
  const found = readFirstAvailable(MAP_KEY, MAP_BACKUP, [...OLD_KEYS, LEGACY_KEY]);
  if (found) {
    const source = found.parsed as Partial<RandomMapSettings> & { customMap?: Partial<RandomMapSettings> };
    // سازگاری: در نسخه‌های خیلی قدیمی تنظیماتِ نقشه زیرِ customMap بود
    const clean = normalizeRandomMap(source.customMap ?? source);
    mapExtras = pickExtras(source.customMap ?? source, Object.keys(DEFAULT_RANDOM_MAP));
    // فیلدهای حذف‌شده (mountains و randomRoads) دیگر نگه‌داری نمی‌شوند.
    delete mapExtras.mountains;
    delete mapExtras.randomRoads;
    const merged = { ...mapExtras, ...clean };
    if (found.key !== MAP_KEY || JSON.stringify(merged) !== JSON.stringify(found.parsed)) {
      writeWithBackup(MAP_KEY, MAP_BACKUP, merged);
    }
    return clean;
  }
  const clean = normalizeRandomMap(DEFAULT_RANDOM_MAP);
  writeJSON(MAP_KEY, clean);
  return clean;
}

export function loadSave(): Save {
  const global = loadGlobalSettings();
  const customMap = loadMapSettings();
  // تنظیماتِ نیروها باید پیش از ساختِ اولین بازی اعمال شود.
  applyUnitTuning(global.unitTuning);
  return { ...global, customMap };
}

/* ---------------------------- نوشتن ---------------------------- */

/** فقط تنظیماتِ سراسری را می‌نویسد؛ به تنظیماتِ نقشه دست نمی‌زند */
export function persistGlobalSettings(g: GlobalSettings) {
  writeWithBackup(GLOBAL_KEY, GLOBAL_BACKUP, { ...globalExtras, ...globalSliceOf(g as Save) });
}

/** فقط تنظیماتِ ساختِ نقشهٔ رندوم را می‌نویسد؛ به تنظیماتِ سراسری دست نمی‌زند */
export function persistMapSettings(m: RandomMapSettings) {
  writeWithBackup(MAP_KEY, MAP_BACKUP, { ...mapExtras, ...m });
}

/**
 * نوشتنِ هوشمند: فقط بخشی که واقعاً تغییر کرده ذخیره می‌شود.
 * این تضمین می‌کند تولیدِ نقشهٔ رندوم هرگز تنظیماتِ سراسری را بازنویسی نکند.
 */
export function persistChanges(prev: Save, next: Save) {
  if (!sameGlobalSettings(prev, next)) persistGlobalSettings(next);
  if (!sameMapSettings(prev.customMap, next.customMap)) persistMapSettings(next.customMap);
}

/** نوشتنِ کاملِ هر دو بخش (برای بازنشانی یا مهاجرت) */
export function persist(s: Save) {
  persistGlobalSettings(s);
  persistMapSettings(s.customMap);
}

/* =====================================================================
 * تبادلِ تنظیمات بین همهٔ نسخه‌ها (وب، فایل آفلاین و Blazor Server)
 * ===================================================================== */

export const SETTINGS_TRANSFER_FORMAT = "battle-time-settings" as const;
export const SETTINGS_TRANSFER_VERSION = 1 as const;
export const SETTINGS_FILE_NAME = "battle-time-settings.json";

export interface PortableSettings {
  format: typeof SETTINGS_TRANSFER_FORMAT;
  version: typeof SETTINGS_TRANSFER_VERSION;
  sound: {
    enabled: boolean;
    ambient: boolean;
    march: boolean;
    volumes: Record<SfxKey, number>;
  };
  gameplay: {
    speed: number;
    battleMode: "field" | "castle";
    maxTroops: number;
    openRoads: boolean;
    minCastleDistance: number;
  };
  units: UnitTuningMap;
  visuals: {
    haloSpin: number;
    attackDash: number;
  };
  randomMap: RandomMapSettings;
}

export type SettingsImportResult =
  | { ok: true; save: Save }
  | { ok: false; error: string };

const round2 = (v: number) => Math.round(v * 100) / 100;

/** ساختِ ساختارِ استاندارد و خوانا از روی تنظیماتِ فعلی */
export function toPortableSettings(save: Save): PortableSettings {
  const g = normalizeGlobalSettings(save);
  const m = normalizeRandomMap(save.customMap);
  const units = {} as UnitTuningMap;
  for (const t of TROOP_TYPES) {
    units[t] = {
      power: round2(g.unitTuning[t].power),
      speed: round2(g.unitTuning[t].speed),
    };
  }
  return {
    format: SETTINGS_TRANSFER_FORMAT,
    version: SETTINGS_TRANSFER_VERSION,
    sound: {
      enabled: g.snd,
      ambient: g.ambientSound,
      march: g.marchSound,
      volumes: { ...g.volumes },
    },
    gameplay: {
      speed: g.speed,
      battleMode: g.battleMode,
      maxTroops: g.maxTroops,
      openRoads: g.openRoads,
      minCastleDistance: g.minCastleDistance,
    },
    units,
    visuals: {
      haloSpin: round2(g.haloSpin),
      attackDash: round2(g.attackDash),
    },
    randomMap: m,
  };
}

/** خروجیِ متنیِ JSON برای کپی یا ذخیره در فایل */
export function exportSettingsJson(save: Save): string {
  return JSON.stringify(toPortableSettings(save), null, 2);
}

function asPlainRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readProp(source: Record<string, unknown> | null, ...keys: string[]): { found: boolean; value: unknown } {
  if (!source) return { found: false, value: undefined };
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      return { found: true, value: source[key] };
    }
  }
  return { found: false, value: undefined };
}

function parseBattleModeValue(value: unknown): "field" | "castle" | null {
  if (value === "field" || value === "Field" || value === 0) return "field";
  if (value === "castle" || value === "Castle" || value === 1) return "castle";
  return null;
}

/**
 * خواندن و اعتبارسنجیِ JSON تنظیمات از هر نسخهٔ بازی:
 *   • قالبِ مشترکِ خروجی (`battle-time-settings`)
 *   • قالبِ خامِ نسخهٔ وب / آفلاین (`bt_settings_v1` و `bt_map_v1`)
 *   • قالبِ خامِ نسخهٔ Blazor (`CastleSettings` چه‌ camelCase و چه‌ PascalCase)
 *   • یا فقط تنظیماتِ نقشهٔ رندوم
 * پیشرفتِ مراحلِ بازیکن (`unlocked` و `done`) دست‌نخورده حفظ می‌شود.
 */
export function importSettingsJson(text: string, current?: Save): SettingsImportResult {
  const cleaned = typeof text === "string" ? text.replace(/^\uFEFF/, "").trim() : "";
  if (!cleaned) {
    return { ok: false, error: "کادر خالی است؛ کد JSON تنظیمات را وارد یا فایل را انتخاب کنید." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { ok: false, error: "کد واردشده JSON معتبر نیست؛ مطمئن شوید متن کامل کپی شده باشد." };
  }

  const root = asPlainRecord(parsed);
  if (!root) {
    return { ok: false, error: "ساختار تنظیمات نامعتبر است؛ یک شیء JSON انتظار می‌رفت." };
  }

  const base: Save = current
    ? { ...normalizeGlobalSettings(current), customMap: normalizeRandomMap(current.customMap) }
    : loadSave();

  const soundObj = asPlainRecord(readProp(root, "sound", "Sound").value);
  const gameObj = asPlainRecord(readProp(root, "gameplay", "Gameplay").value);
  const unitsObj = asPlainRecord(
    readProp(root, "units", "Units", "unitTuning", "UnitTuning", "troopTuning", "TroopTuning").value,
  );
  const visObj = asPlainRecord(readProp(root, "visuals", "Visuals").value);
  const nestedMapObj = asPlainRecord(readProp(root, "randomMap", "RandomMap", "customMap", "CustomMap").value);

  const draftGlobal: Partial<GlobalSettings> = {
    ...globalSliceOf(base),
    unlocked: base.unlocked,
    done: [...base.done],
    unitTuning: {
      normal: { ...base.unitTuning.normal },
      fast: { ...base.unitTuning.fast },
      heavy: { ...base.unitTuning.heavy },
    },
    volumes: { ...base.volumes },
  };
  const draftMap: Partial<RandomMapSettings> = { ...base.customMap };

  let recognized = 0;

  // ۱) صدا و بلندی‌ها
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
        draftGlobal.volumes![key] = Number(volsRaw[key]);
        recognized++;
      }
    }
  }

  // ۲) قوانینِ بازی
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
  const capProp = gameObj
    ? readProp(gameObj, "maxTroops", "MaxTroops", "maxTroopsCap", "MaxTroopsCap")
    : readProp(root, "maxTroops", "maxTroopsCap", "MaxTroopsCap");
  if (capProp.found && Number.isFinite(Number(capProp.value))) {
    draftGlobal.maxTroops = Number(capProp.value);
    recognized++;
  }
  const roadsProp = gameObj ? readProp(gameObj, "openRoads", "OpenRoads") : readProp(root, "openRoads", "OpenRoads");
  if (roadsProp.found && typeof roadsProp.value === "boolean") {
    draftGlobal.openRoads = roadsProp.value;
    recognized++;
  }
  const distProp = gameObj
    ? readProp(gameObj, "minCastleDistance", "MinCastleDistance")
    : readProp(root, "minCastleDistance", "MinCastleDistance");
  if (distProp.found && Number.isFinite(Number(distProp.value))) {
    draftGlobal.minCastleDistance = Number(distProp.value);
    recognized++;
  }

  // ۳) قدرت و سرعتِ سربازها (هم ساختارِ تودرتو و هم ساختارِ تختِ Blazor)
  if (unitsObj) {
    for (const type of TROOP_TYPES) {
      const capType = type[0].toUpperCase() + type.slice(1);
      const sub = asPlainRecord(readProp(unitsObj, type, capType).value);
      const pProp = sub
        ? readProp(sub, "power", "Power")
        : readProp(unitsObj, `${type}Power`, `${capType}Power`);
      const sProp = sub
        ? readProp(sub, "speed", "Speed")
        : readProp(unitsObj, `${type}Speed`, `${capType}Speed`);
      if (pProp.found && Number.isFinite(Number(pProp.value))) {
        draftGlobal.unitTuning![type].power = Number(pProp.value);
        recognized++;
      }
      if (sProp.found && Number.isFinite(Number(sProp.value))) {
        draftGlobal.unitTuning![type].speed = Number(sProp.value);
        recognized++;
      }
    }
  }

  // ۴) نمایش
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

  // ۵) نقشهٔ رندوم (چه در زیرشاخهٔ randomMap/customMap و چه به‌تنهایی در ریشه)
  const mapSource = nestedMapObj ?? root;
  const mapNumKeys: [keyof RandomMapSettings, string][] = [
    ["players", "Players"],
    ["normal", "Normal"],
    ["fast", "Fast"],
    ["heavy", "Heavy"],
    ["towers", "Towers"],
    ["lakes", "Lakes"],
    ["ships", "Ships"],
    ["boats", "Boats"],
    ["minDistance", "MinDistance"],
  ];
  let touchedMap = false;
  for (const [camel, pascal] of mapNumKeys) {
    const p = readProp(mapSource, camel, pascal);
    if (p.found && Number.isFinite(Number(p.value))) {
      (draftMap as Record<string, unknown>)[camel] = Number(p.value);
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
      customMap: nextMap,
    },
  };
}

/** کپیِ ایمن در حافظهٔ مرورگر (هم در وب و هم در حالتِ آفلاین file://) */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* در file:// یا قاب‌های محدود، به روشِ جایگزین می‌رویم */
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

/** دانلودِ مستقیمِ تنظیمات به‌صورت فایل JSON در مرورگر */
export function downloadJsonFile(text: string, filename = SETTINGS_FILE_NAME): boolean {
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

