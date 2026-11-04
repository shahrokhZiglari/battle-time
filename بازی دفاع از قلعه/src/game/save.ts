import { DEFAULT_RANDOM_MAP, normalizeRandomMap, RandomMapSettings } from "./map";
import { SFX_KEYS, type SfxKey } from "./sound";
import {
  applyUnitTuning,
  DEFAULT_ATTACK_DASH,
  DEFAULT_HALO_SPIN,
  DEFAULT_UNIT_TUNING,
  normalizeHaloSpin,
  normalizeAttackDash,
  normalizeUnitTuning,
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
  minCastleDistance: 30,
  ambientSound: true,
  marchSound: true,
  unitTuning: DEFAULT_UNIT_TUNING,
  haloSpin: DEFAULT_HALO_SPIN,
  attackDash: DEFAULT_ATTACK_DASH,
  volumes: Object.fromEntries(SFX_KEYS.map((k) => [k, 1])) as Record<SfxKey, number>,
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
  base.maxTroops = VALID_CAPS.includes(Number(base.maxTroops)) ? Number(base.maxTroops) : 50;
  base.openRoads = base.openRoads === true;
  const dist = Number(base.minCastleDistance);
  base.minCastleDistance = Number.isFinite(dist) ? Math.max(0, Math.min(120, Math.floor(dist))) : 30;
  base.ambientSound = base.ambientSound !== false;
  base.marchSound = base.marchSound !== false;
  base.snd = base.snd !== false;
  const speed = Number(base.speed);
  base.speed = speed === 2 || speed === 3 ? speed : 1;
  base.unitTuning = normalizeUnitTuning(base.unitTuning);
  base.haloSpin = normalizeHaloSpin(base.haloSpin);
  base.attackDash = normalizeAttackDash(base.attackDash);
  // بلندیِ صداها: هر کلیدِ ناشناخته کنار گذاشته می‌شود و مقدارِ خراب به ۱ برمی‌گردد
  const rawVolumes = (base.volumes && typeof base.volumes === "object" ? base.volumes : {}) as Record<string, unknown>;
  base.volumes = Object.fromEntries(
    SFX_KEYS.map((key) => {
      const v = Number(rawVolumes[key]);
      return [key, Number.isFinite(v) ? Math.max(0, Math.min(1, Math.round(v * 100) / 100)) : 1];
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
    // «mountains» از دورِ ۱۹ دیگر وجود ندارد؛ نگه‌داشتنش فقط دادهٔ مرده است.
    delete mapExtras.mountains;
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
