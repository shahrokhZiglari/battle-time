import { CFG, THEME_COUNT, type BType, type Level } from "./config";

export interface RandomMapSettings {
  players: number;
  normal: number;
  fast: number;
  heavy: number;
  towers: number;
  /** تعداد خلیج/دریاچه‌های کنده‌شده در ساحلِ جزیره‌ها */
  lakes: number;
  /** کشتی‌های بادبانی روی دریا */
  ships: number;
  /** قایق‌های پارویی روی دریا */
  boats: number;
  largeMap: boolean;
  /** حداقل فاصلهٔ دو قلعهٔ همسایه، به متر */
  minDistance: number;
}

export const DEFAULT_RANDOM_MAP: RandomMapSettings = {
  players: 3,
  normal: 5,
  fast: 2,
  heavy: 2,
  towers: 2,
  lakes: 2,
  ships: 2,
  boats: 3,
  largeMap: true,
  minDistance: 10,
};

/** هر متر در فضای جهان بازی برابر چند پیکسل است (۱ متر ≈ ۶ پیکسل). */
export const PX_PER_METER = 6;

/** بیشترین تعداد خلیج در یک نقشه (خلیج فقط شکلِ ساحل را عوض می‌کند، بی‌اثر روی نبرد) */
export const MAX_LAKES = 16;
/** بیشترین کشتی و قایق در یک نقشه */
export const MAX_SHIPS = 12;
export const MAX_BOATS = 16;

export function normalizeRandomMap(input?: Partial<RandomMapSettings> | null): RandomMapSettings {
  const source = { ...DEFAULT_RANDOM_MAP, ...input };
  const whole = (value: number, low: number, high: number) =>
    Number.isFinite(Number(value)) ? Math.max(low, Math.min(high, Math.floor(Number(value)))) : low;
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
    minDistance: whole(source.minDistance, 0, 120),
  };
}

export function validateRandomMap(input: RandomMapSettings): string | null {
  const totalCastles = input.normal + input.fast + input.heavy;
  const total = totalCastles + input.towers;
  if (input.players < 2 || input.players > 4) return "تعداد بازیکنان باید بین ۲ تا ۴ باشد.";
  if ([input.normal, input.fast, input.heavy, input.towers].some((n) => !Number.isInteger(n) || n < 0 || n > 50)) {
    return "تعداد ساختمان‌های هر نوع باید بین صفر تا ۵۰ باشد.";
  }
  if (totalCastles < input.players) return "برای هر بازیکن دست‌کم یک قلعه لازم است؛ برج پایگاه شروع نیست.";
  if (total > 50) return "نقشه برای حفظ فاصلهٔ قلعه‌ها حداکثر ۵۰ ساختمان می‌تواند داشته باشد.";
  // خلیج اختیاری است: مقدارِ نبود = صفر (سازگاری با نقشه‌های قدیمی و ورودی‌های ناقص)
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

function shuffled<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function furthestStarts(points: { x: number; y: number }[], count: number) {
  const chosen = [Math.floor(Math.random() * points.length)];
  while (chosen.length < count) {
    let best = -1;
    let bestDistance = -1;
    for (let i = 0; i < points.length; i++) {
      if (chosen.includes(i)) continue;
      const p = points[i];
      const minDistance = Math.min(...chosen.map((index) => Math.hypot(p.x - points[index].x, p.y - points[index].y)));
      if (minDistance > bestDistance) { best = i; bestDistance = minDistance; }
    }
    if (best >= 0) chosen.push(best);
  }
  return chosen;
}

/* ================= چیدمان‌های متنوع نقشه ================= */

interface Cell { x: number; y: number; }

const LAYOUTS = ["scatter", "rows", "ring", "clusters", "valley"] as const;
type Layout = typeof LAYOUTS[number];
const LAYOUT_LABEL: Record<Layout, string> = {
  scatter: "پراکنده",
  rows: "ردیفی",
  ring: "حلقه‌ای",
  clusters: "خوشه‌ای",
  valley: "دره",
};

/** جداسازی جفت‌های نزدیک؛ هیچ دو قلعه‌ای به هم نمی‌چسبند و همه داخل نقشه می‌مانند. */
function repairOverlap(cells: Cell[], sep: number, w: number, h: number, margin: number) {
  for (let pass = 0; pass < 60; pass++) {
    let moved = false;
    for (let i = 0; i < cells.length; i++) {
      for (let j = i + 1; j < cells.length; j++) {
        const a = cells[i], b = cells[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || .01;
        if (d >= sep) continue;
        const push = (sep - d) / 2;
        const ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
        moved = true;
      }
    }
    for (const p of cells) {
      p.x = Math.max(margin * .55, Math.min(w - margin * .55, p.x));
      p.y = Math.max(margin * .55, Math.min(h - margin * .55, p.y));
    }
    if (!moved) break;
  }
}

/** نقاط پراکنده با حفظ حداقل فاصله (الگوی پواسونی). */
function scatterCells(count: number, w: number, h: number, margin: number, sep: number, centerClear: number): Cell[] {
  const cells: Cell[] = [];
  let minSep = sep;
  for (let attempt = 0; attempt < 6000 && cells.length < count; attempt++) {
    const p = { x: margin + Math.random() * (w - margin * 2), y: margin + Math.random() * (h - margin * 2) };
    if (centerClear > 0 && Math.hypot(p.x - w / 2, p.y - h / 2) < centerClear) continue;
    if (cells.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minSep)) cells.push(p);
    else if (attempt % 700 === 699) minSep = Math.max(88, minSep * .9);
  }
  while (cells.length < count) {
    cells.push({ x: margin + Math.random() * (w - margin * 2), y: margin + Math.random() * (h - margin * 2) });
  }
  return cells;
}

/** چیدمان ردیفیِ مارپیچی با لرزش قوی تا هر بار شکل تازه‌ای بسازد. */
function rowsCells(count: number, w: number, h: number, margin: number, large: boolean): Cell[] {
  const columns = Math.max(2, Math.ceil(Math.sqrt(count * w / h)));
  const rows = Math.max(2, Math.ceil(count / columns));
  const left = margin, right = w - margin, top = margin, bottom = h - margin;
  const rowCounts = Array.from({ length: rows }, (_, row) => Math.floor(count / rows) + (row < count % rows ? 1 : 0));
  const jitter = large ? 52 : 16;
  const curveAmp = large ? 24 + Math.random() * 46 : 7 + Math.random() * 12;
  const curveFreq = .55 + Math.random() * 1.15;
  const curvePhase = Math.random() * Math.PI * 2;
  const cells: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    const n = rowCounts[row];
    const squeeze = .72 + Math.random() * .28;
    const width = (right - left) * (row === 0 || row === rows - 1 ? .82 + Math.random() * .16 : squeeze);
    const indent = (right - left - width) * (.2 + Math.random() * .6);
    const step = width / Math.max(1, n - 1);
    for (let col = 0; col < n; col++) {
      cells.push({
        x: n === 1 ? w / 2 + (Math.random() - .5) * jitter * 2 : left + indent + col * step + (Math.random() - .5) * jitter,
        y: top + row * (bottom - top) / Math.max(1, rows - 1) + Math.sin(col * curveFreq + row * 1.3 + curvePhase) * curveAmp + (Math.random() - .5) * jitter,
      });
    }
  }
  return cells;
}

/** قلعه‌ها روی یک یا چند حلقهٔ بیضوی دور مرکز؛ برج‌ها در میانه. */
function ringCells(count: number, w: number, h: number, margin: number): Cell[] {
  const cx = w / 2, cy = h / 2;
  const maxRx = w / 2 - margin, maxRy = h / 2 - margin;
  const rings = Math.max(1, Math.min(4, Math.ceil(count / 9)));
  const cells: Cell[] = [];
  let placed = 0;
  for (let r = 0; r < rings; r++) {
    const n = Math.ceil((count - placed) / (rings - r));
    const radius = .38 + .58 * (rings === 1 ? .9 : r / Math.max(1, rings - 1));
    for (let k = 0; k < n && placed < count; k++) {
      const angle = (k / n) * Math.PI * 2 + r * 1.1 + (Math.random() - .5) * .55;
      const wobble = .82 + Math.random() * .34;
      cells.push({
        x: cx + Math.cos(angle) * maxRx * radius * wobble,
        y: cy + Math.sin(angle) * maxRy * radius * wobble,
      });
      placed++;
    }
  }
  return cells;
}

/** چند خوشهٔ پراکنده در نقشه؛ قلعه‌ها دور هر خوشه جمع می‌شوند. */
function clusterCells(count: number, w: number, h: number, margin: number, sep: number, centerClear: number): Cell[] {
  const nClusters = Math.max(2, Math.min(5, Math.round(count / 4) + 1));
  const centers: Cell[] = [];
  while (centers.length < nClusters) {
    const p = { x: margin + Math.random() * (w - margin * 2), y: margin + Math.random() * (h - margin * 2) };
    if (centerClear > 0 && Math.hypot(p.x - w / 2, p.y - h / 2) < centerClear * .7) continue;
    if (centers.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > sep * 1.15)) centers.push(p);
  }
  const cells: Cell[] = [];
  let minSep = sep;
  for (let attempt = 0; attempt < 6000 && cells.length < count; attempt++) {
    const center = centers[attempt % centers.length];
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * sep * 1.75;
    const p = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius * .82 };
    if (p.x < margin || p.x > w - margin || p.y < margin || p.y > h - margin) continue;
    if (centerClear > 0 && Math.hypot(p.x - w / 2, p.y - h / 2) < centerClear) continue;
    if (cells.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minSep)) cells.push(p);
    else if (attempt % 700 === 699) minSep = Math.max(88, minSep * .9);
  }
  while (cells.length < count) {
    const center = centers[cells.length % centers.length];
    cells.push({ x: center.x + (Math.random() - .5) * sep, y: center.y + (Math.random() - .5) * sep });
  }
  return cells;
}

/** نوار موربِ موج‌دار از یک گوشه تا گوشهٔ دیگر (درهٔ کوهستانی). */
function valleyCells(count: number, w: number, h: number, margin: number, sep: number): Cell[] {
  const vertical = Math.random() < .5;
  const flip = Math.random() < .5 ? -1 : 1;
  const amp = h * (.1 + Math.random() * .16);
  const freq = 1 + Math.random() * 1.6;
  const phase = Math.random() * Math.PI * 2;
  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i + .5) / count + (Math.random() - .5) * .55 / count;
    const along = margin + t * ((vertical ? h : w) - margin * 2);
    const wave = Math.sin(t * Math.PI * freq + phase) * amp + (Math.random() - .5) * sep * .9;
    const across = t * ((vertical ? w : h) - margin * 2) + margin + wave * flip;
    const p = vertical ? { x: across, y: along } : { x: along, y: across };
    p.x = Math.max(margin, Math.min(w - margin, p.x));
    p.y = Math.max(margin, Math.min(h - margin, p.y));
    cells.push(p);
  }
  return cells;
}

/** برج‌ها را به ناحیهٔ مرکزی نقشه می‌چسباند تا نقش دفاعی داشته باشند؛ ایندکسشان را برمی‌گرداند. */
function centralizeTowers(cells: Cell[], towerCount: number, w: number, h: number): number[] {
  if (towerCount <= 0) return [];
  const ranked = cells.map((p, index) => ({
    index, distance: ((p.x - w / 2) / w) ** 2 + ((p.y - h / 2) / h) ** 2,
  })).sort((a, b) => a.distance - b.distance).slice(0, towerCount);
  for (const { index } of ranked) {
    const p = cells[index];
    for (let guard = 0; guard < 4; guard++) {
      const distance = Math.hypot((p.x - w / 2) / w, (p.y - h / 2) / h);
      if (distance < .17) break;
      p.x += (w / 2 - p.x) * .34;
      p.y += (h / 2 - p.y) * .34;
    }
  }
  return ranked.map((item) => item.index);
}

/** Creates a connected, randomized battlefield and spreads player start castles around the board. */
export function createRandomLevel(raw: RandomMapSettings): Level {
  const config = normalizeRandomMap(raw);
  const error = validateRandomMap(config);
  if (error) throw new Error(error);

  const castleTypes: BType[] = [
    ...Array.from({ length: config.normal }, () => "barracks" as const),
    ...Array.from({ length: config.fast }, () => "speed" as const),
    ...Array.from({ length: config.heavy }, () => "heavy" as const),
  ];
  const towerTypes: BType[] = Array.from({ length: config.towers }, () => "tower");
  shuffled(castleTypes);

  const total = castleTypes.length + towerTypes.length;
  const margin = config.largeMap ? 110 : 82;
  // حداقل فاصلهٔ همسایگان (متر) بر گامِ چیدمان اثر می‌گذارد.
  const spacing = Math.max(90, config.minDistance * PX_PER_METER);

  // ابعاد جهان هر بار کمی فرق می‌کند تا نقشه‌ها تکراری نباشند.
  const columns = Math.max(2, Math.ceil(Math.sqrt(total * CFG.W / CFG.H)));
  const rows = Math.max(2, Math.ceil(total / columns));
  const baseW = margin * 2 + Math.max(0, columns - 1) * spacing;
  const baseH = margin * 2 + Math.max(0, rows - 1) * spacing;
  const worldWidth = config.largeMap ? Math.round(Math.max(1350, baseW) * (1 + Math.random() * .22)) : CFG.W;
  const worldHeight = config.largeMap ? Math.round(Math.max(860, baseH) * (1 + Math.random() * .2)) : CFG.H;

  // الگوی چیدمان هر بار تصادفی انتخاب می‌شود؛ نقشه‌های شلوغ فقط الگوهای انعطاف‌پذیر می‌گیرند.
  const pool: Layout[] = total > 16 ? ["scatter", "rows"] : [...LAYOUTS];
  const layout = pool[Math.floor(Math.random() * pool.length)];
  const centerClear = config.towers > 0 && layout !== "rows" && layout !== "ring"
    ? Math.min(worldWidth, worldHeight) * .16 : 0;

  let cells: Cell[];
  if (layout === "rows") cells = rowsCells(total, worldWidth, worldHeight, margin, config.largeMap);
  else if (layout === "ring") cells = ringCells(total, worldWidth, worldHeight, margin);
  else if (layout === "clusters") cells = clusterCells(total, worldWidth, worldHeight, margin, spacing, centerClear);
  else if (layout === "valley" && config.largeMap) cells = valleyCells(total, worldWidth, worldHeight, margin, spacing);
  else cells = scatterCells(total, worldWidth, worldHeight, margin, spacing, centerClear);

  // برج‌ها نزدیک مرکز می‌مانند؛ بعد فاصلهٔ همهٔ ساختمان‌ها ترمیم می‌شود.
  const towerCells = centralizeTowers(cells, config.towers, worldWidth, worldHeight);
  repairOverlap(cells, config.largeMap ? spacing : 96, worldWidth, worldHeight, margin);

  const towerCellSet = new Set(towerCells);
  const castleCells = cells.map((_, index) => index).filter((index) => !towerCellSet.has(index));
  const starts = furthestStarts(castleCells.map((index) => cells[index]), config.players).map((index) => castleCells[index]);
  const reserved = new Set(starts);
  const available = shuffled(castleCells.filter((index) => !reserved.has(index)));
  const startTypes = castleTypes.splice(0, config.players);
  const buildings: Level["b"] = [];
  for (let player = 0; player < config.players; player++) {
    const p = cells[starts[player]];
    buildings.push([p.x, p.y, (player + 1) as 1 | 2 | 3 | 4, startTypes[player], startTypes[player] === "heavy" ? 15 : 22]);
  }

  const neutralTypes = shuffled(castleTypes);
  neutralTypes.forEach((type, index) => {
    const p = cells[available[index]];
    const troops = type === "tower" ? 7 + Math.floor(Math.random() * 4) : 4 + Math.floor(Math.random() * 6);
    buildings.push([p.x, p.y, 0, type, troops]);
  });
  towerCells.forEach((cellIndex) => {
    const p = cells[cellIndex];
    buildings.push([p.x, p.y, 0, "tower", 7 + Math.floor(Math.random() * 4)]);
  });

  const summary = `${config.normal} عادی، ${config.fast} سریع، ${config.heavy} سنگین و ${config.towers} برج`;
  return {
    name: "نقشهٔ رندوم",
    ai: .55 + Math.random() * .3,
    hint: `${config.players} بازیکن · ${summary} · ${config.lakes} خلیج · ${config.ships} کشتی و ${config.boats} قایق · چیدمان ${LAYOUT_LABEL[layout]}. قلعه‌های شروع در اطراف نقشه پخش شده‌اند؛ برج‌ها و بقیهٔ قلعه‌ها خنثی هستند.`,
    b: buildings,
    worldWidth,
    worldHeight,
    largeMap: config.largeMap,
    theme: Math.floor(Math.random() * THEME_COUNT),
    lakes: config.lakes,
    ships: config.ships,
    boats: config.boats,
  };
}
