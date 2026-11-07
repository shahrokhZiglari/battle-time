export type BType = "barracks" | "tower" | "speed" | "heavy";
export type TroopType = "normal" | "fast" | "heavy";
// Remaining combat points per troop type. A heavy soldier starts with two points.
export type Army = Record<TroopType, number>;
export interface Point { x: number; y: number; }
export interface Waypoint extends Point {
  /** Maximum sideways offset that is safe at this part of the walkway. */
  laneWidth?: number;
}
export type Owner = 0 | 1 | 2 | 3 | 4;

export interface Building {
  id: number;
  x: number;
  y: number;
  o: Owner;
  type: BType;
  army: Army;
  tr: number;
  cap: number;
  lvl: number;
  capTimer: number;
  pt: number;
  tt: number;
  fl: number;
  hit: number;
}

export interface Squad {
  o: Owner;
  from: Building;
  to: Building;
  route: Building[];
  /** نقاط واقعی حرکت لشکر؛ گوشه‌های میانی قلعه‌ها را از کنار می‌گذرد نه از وسط */
  waypoints: Waypoint[];
  unit: TroopType;
  hp: number;
  n: number;
  x: number;
  y: number;
  d: number;
  len: number;
  sp: number;
  id: number;
  ang: number;
}

export interface Effect {
  k: "txt" | "ring" | "burst";
  x: number;
  y: number;
  s?: string;
  c: string;
  t: number;
  l: number;
  r?: number;
}

export interface Level {
  name: string;
  ai: number;
  hint: string;
  b: [number, number, Owner, BType, number][];
  worldWidth?: number;
  worldHeight?: number;
  largeMap?: boolean;
  /** ایندکس پالت رنگی نقشه؛ اگر تعیین نشود از شمارهٔ مرحله گرفته می‌شود */
  theme?: number;
  /** تعداد خلیج‌های کنده‌شده در ساحلِ جزیره‌ها */
  lakes?: number;
  /** کشتی‌های بادبانی روی دریا */
  ships?: number;
  /** قایق‌های پارویی روی دریا */
  boats?: number;
}

/** هماهنگ با آرایهٔ THEMES در terrain.ts — تعداد پالت‌های رنگی نقشه */
export const THEME_COUNT = 5;

export const CFG = {
  W: 1000,
  H: 600,
  spawn: { barracks: 2, tower: 0, speed: 3, heavy: 3 } as Record<BType, number>,
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
  def: { barracks: 1, tower: 1.5, speed: 1, heavy: 1 } as Record<BType, number>,
};

export const TROOP_TYPES: TroopType[] = ["normal", "fast", "heavy"];
export const UNITS: Record<TroopType, { label: string; power: number; speed: number }> = {
  normal: { label: "عادی", power: 1, speed: 0.9 },
  fast: { label: "سریع", power: 1, speed: 1.3 },
  heavy: { label: "سنگین", power: 1.5, speed: 0.7 },
};

/** تنظیمِ دلخواهِ هر نوع سرباز — از بخش تنظیمات قابل تغییر است */
export interface UnitTuning {
  /** قدرتِ هر سرباز (نیروی رزمی) */
  power: number;
  /** ضریبِ سرعتِ راهپیمایی */
  speed: number;
}
export type UnitTuningMap = Record<TroopType, UnitTuning>;

export const UNIT_LIMITS = { power: [0.5, 4] as [number, number], speed: [0.4, 2.5] as [number, number] };

export const DEFAULT_UNIT_TUNING: UnitTuningMap = {
  normal: { power: 1, speed: 0.9 },
  fast: { power: 1, speed: 1.3 },
  heavy: { power: 1.5, speed: 0.7 },
};

const clampNumber = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** پاک‌سازیِ مقادیرِ ذخیره‌شده؛ هر مقدارِ نامعتبر به پیش‌فرض برمی‌گردد. */
export function normalizeUnitTuning(raw?: Partial<Record<TroopType, Partial<UnitTuning>>> | null): UnitTuningMap {
  const out = {} as UnitTuningMap;
  for (const type of TROOP_TYPES) {
    const src = raw?.[type];
    const fallback = DEFAULT_UNIT_TUNING[type];
    const power = Number(src?.power);
    const speed = Number(src?.speed);
    out[type] = {
      power: Number.isFinite(power) ? Math.round(clampNumber(power, ...UNIT_LIMITS.power) * 100) / 100 : fallback.power,
      speed: Number.isFinite(speed) ? Math.round(clampNumber(speed, ...UNIT_LIMITS.speed) * 100) / 100 : fallback.speed,
    };
  }
  return out;
}

/** اعمالِ تنظیمات روی جدولِ زندهٔ UNITS (همهٔ محاسبات قدرت و سرعت از همین‌جا می‌خوانند). */
export function applyUnitTuning(raw?: Partial<Record<TroopType, Partial<UnitTuning>>> | null) {
  const tuning = normalizeUnitTuning(raw);
  for (const type of TROOP_TYPES) {
    UNITS[type].power = tuning[type].power;
    UNITS[type].speed = tuning[type].speed;
  }
  return tuning;
}

/** سرعتِ چرخشِ نورهای دور برج — پیش‌فرض و بازهٔ مجاز */
export const DEFAULT_HALO_SPIN = 0.1;
export const HALO_SPIN_LIMITS = [0, 3] as [number, number];
export const normalizeHaloSpin = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(clampNumber(n, ...HALO_SPIN_LIMITS) * 100) / 100 : DEFAULT_HALO_SPIN;
};
/** شفافیتِ نقطه‌چینِ مسیر حمله — پیش‌فرض و بازهٔ مجاز */
export const DEFAULT_ATTACK_DASH = 0.3;
export const ATTACK_DASH_LIMITS = [0, 1] as [number, number];
export const normalizeAttackDash = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(clampNumber(n, ...ATTACK_DASH_LIMITS) * 100) / 100 : DEFAULT_ATTACK_DASH;
};
export const BUILDING_LABELS: Record<BType, string> = {
  barracks: "قلعهٔ عادی", speed: "قلعهٔ سریع", heavy: "قلعهٔ سنگین", tower: "برج دفاعی",
};

export const COL: Record<number, string> = { 0: "#cfd8dc", 1: "#3ddc84", 2: "#ff5f57", 3: "#55b7ff", 4: "#c084fc" };
export const DK: Record<number, string> = { 0: "#78909c", 1: "#12855a", 2: "#a52a24", 3: "#2169a5", 4: "#7442a0" };
export const LT: Record<number, string> = { 0: "#eef4f7", 1: "#9ff5c4", 2: "#ffb3ad", 3: "#b5e4ff", 4: "#e7cbff" };

const INTRO_LEVELS: Level[] = [
  {
    name: "آموزش",
    ai: 0.25,
    hint: "کلیک چپ را روی یک قلعهٔ سبز نگه دار و نشانگر را حرکت بده؛ هر قلعهٔ سبزی که از رویش رد شوی انتخاب می‌شود. سپس روی قلعهٔ هدف رها کن.",
    b: [
      [150, 300, 1, "barracks", 25],
      [500, 300, 0, "barracks", 8],
      [850, 300, 2, "barracks", 10],
    ],
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
      [890, 300, 2, "barracks", 22],
    ],
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
      [900, 300, 2, "barracks", 25],
    ],
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
      [910, 300, 2, "barracks", 28],
    ],
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
      [920, 300, 2, "heavy", 50],
    ],
  },
];

export const fa = (n: number) => Number(n).toLocaleString("fa-IR");

function makeCampaignLevel(stage: number): Level {
  const playerStarts = [[100, 300], [150, 150]] as const;
  const enemyStarts = [[900, 300], [850, 140], [850, 460], [790, 300]] as const;
  const neutralSpots = [
    [300, 300], [300, 150], [300, 450], [440, 150], [440, 450],
    [560, 150], [560, 450], [700, 300], [700, 150], [700, 450],
    [500, 220], [500, 380], [650, 220],
  ] as const;
  const castleTypes: BType[] = ["barracks", "speed", "heavy"];
  const neutralTypes: BType[] = ["barracks", "speed", "heavy", "tower"];
  const playerCount = stage >= 19 ? 2 : 1;
  const enemyCount = Math.min(4, 1 + Math.floor((stage - 6) / 8));
  const neutralCount = Math.min(neutralSpots.length, 2 + Math.floor((stage - 6) / 3));
  const buildings: Level["b"] = [];

  for (let i = 0; i < playerCount; i++) {
    const type = castleTypes[(stage + i * 2) % castleTypes.length];
    const [x, y] = playerStarts[i];
    buildings.push([x, y, 1, type, Math.min(50, 27 + Math.floor(stage * .45))]);
  }
  for (let i = 0; i < neutralCount; i++) {
    const type = neutralTypes[(stage + i * 3) % neutralTypes.length];
    const [x, y] = neutralSpots[i];
    buildings.push([x, y, 0, type, 5 + ((stage * 2 + i * 3) % 6)]);
  }
  for (let i = 0; i < enemyCount; i++) {
    const type = castleTypes[(stage * 2 + i) % castleTypes.length];
    const [x, y] = enemyStarts[i];
    buildings.push([x, y, 2, type, Math.min(50, 18 + Math.floor(stage * .85) + i * 2)]);
  }

  return {
    name: "نبرد " + stage.toLocaleString("fa-IR"),
    ai: Math.min(1, .3 + (stage - 6) * .027),
    hint: "قلعه‌های خنثی را بگیر، ترکیب سربازها را بسنج و ظرفیت قلعه‌ها را با پُر نگه‌داشتن خودکار افزایش بده.",
    b: buildings,
  };
}

export const LEVELS: Level[] = [
  ...INTRO_LEVELS,
  ...Array.from({ length: 25 }, (_, i) => makeCampaignLevel(i + INTRO_LEVELS.length + 1)),
];

export const defOf = (b: Building) => CFG.def[b.type];
