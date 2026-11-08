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
  minDistance: 0,
};

/** هر متر در فضای جهان بازی برابر چند پیکسل است (۱ متر ≈ ۶ پیکسل). */
export const PX_PER_METER = 6;

/** بیشترین تعداد خلیج در یک نقشه (خلیج فقط شکلِ ساحل را عوض می‌کند، بی‌اثر روی نبرد) */
export const MAX_LAKES = 16;
/** بیشترین کشتی و قایق در یک نقشه */
export const MAX_SHIPS = 12;
export const MAX_BOATS = 16;

/* ================= مولد تصادفیِ غیرقابل‌پیش‌بینی (CSPRNG) ================= */

const NATIVE_RANDOM = Math.random;
let entropyCounter = 0;
const recentLayouts: Layout[] = [];
const recentThemes: number[] = [];

type Rng = () => number;

/**
 * در اجرای واقعی بازی از آنتروپی سخت‌افزاری مرورگر/سیستم‌عامل (crypto.getRandomValues)
 * به‌همراه زمان دقیق استفاده می‌کند تا ترتیب نقشه‌های اول، دوم، سوم و ... هرگز
 * قابل پیش‌بینی یا تکراری نباشد. اگر در آزمونی Math.random بازنویسی شده باشد، از همان پیروی می‌کند.
 */
function createUnpredictableRng(): { rand: Rng; seed: number; isMocked: boolean } {
  if (Math.random !== NATIVE_RANDOM) {
    const seed = (Math.floor(Math.random() * 0x7fffffff) || 1) >>> 0;
    return { rand: () => Math.random(), seed, isMocked: true };
  }
  const buf = new Uint32Array(2);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(buf);
  } else {
    buf[0] = (NATIVE_RANDOM() * 0xffffffff) >>> 0;
    buf[1] = (NATIVE_RANDOM() * 0xffffffff) >>> 0;
  }
  const hires = typeof globalThis.performance?.now === "function" ? Math.floor(globalThis.performance.now() * 1000) : 0;
  const timeMix = Math.imul((Date.now() ^ hires) >>> 0, 0x9e3779b1);
  let state = (buf[0] ^ timeMix ^ Math.imul(++entropyCounter, 0x85ebca6b)) >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  const seed = ((buf[1] ^ Math.imul(state, 0xc2b2ae35)) >>> 0) || 1;
  const rand: Rng = () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return { rand, seed, isMocked: false };
}

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

function shuffled<T>(items: T[], rand: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function furthestStarts(points: { x: number; y: number }[], count: number, rand: Rng) {
  const chosen = [Math.floor(rand() * points.length)];
  while (chosen.length < count) {
    let best = -1;
    let bestDistance = -1;
    for (let i = 0; i < points.length; i++) {
      if (chosen.includes(i)) continue;
      const p = points[i];
      const minDistance = Math.min(...chosen.map((index) => Math.hypot(p.x - points[index].x, p.y - points[index].y)));
      // کمی لرزش تصادفی تا همیشه دقیقاً یک گوشهٔ ثابت انتخاب نشود ولی فاصلهٔ زیاد حفظ گردد
      const score = minDistance * (0.9 + rand() * 0.2);
      if (score > bestDistance) {
        best = i;
        bestDistance = score;
      }
    }
    if (best >= 0) chosen.push(best);
  }
  // بُر زدن جایگاه شروع بازیکنان تا بازیکن ۱ هر بار در سمت متفاوتی از نقشه قرار بگیرد
  return shuffled(chosen, rand);
}

/* ================= چیدمان‌های متنوع و غیرتکراری نقشه ================= */

interface Cell { x: number; y: number; }

const LAYOUTS = ["scatter", "rows", "ring", "clusters", "valley", "twin", "spiral", "cross"] as const;
type Layout = typeof LAYOUTS[number];
const LAYOUT_LABEL: Record<Layout, string> = {
  scatter: "مجمع‌الجزایر آزاد",
  rows: "جبهه‌های موجی",
  ring: "حلقه‌ای چرخان",
  clusters: "خوشه‌های جزیره‌ای",
  valley: "تنگهٔ مارپیچ",
  twin: "دو قارهٔ روبه‌رو",
  spiral: "مارپیچ کهکشانی",
  cross: "چهارراه دریایی",
};

/** جداسازی جفت‌های نزدیک؛ هیچ دو قلعه‌ای به هم نمی‌چسبند و همه داخل نقشه می‌مانند. */
function repairOverlap(cells: Cell[], sep: number, w: number, h: number, margin: number) {
  for (let pass = 0; pass < 70; pass++) {
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

/** تبدیل تصادفیِ تقارن (آینه افقی/عمودی + چرخش ملایم حول مرکز) تا هیچ الگویی شکل ثابت نداشته باشد */
function applySymmetryTransform(cells: Cell[], w: number, h: number, margin: number, rand: Rng) {
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
    let ny = ((p.y - cy) / scaleY) * (mirrorY ? -1 : 1);
    const rx = nx * cos - ny * sin;
    const ry = (nx * sin + ny * cos) * scaleY;
    p.x = Math.max(margin * 0.65, Math.min(w - margin * 0.65, cx + rx));
    p.y = Math.max(margin * 0.65, Math.min(h - margin * 0.65, cy + ry));
  }
}

/** نقاط پراکنده با حفظ حداقل فاصله (الگوی پواسونی با چگالی متغیر). */
function scatterCells(count: number, w: number, h: number, margin: number, sep: number, centerClear: number, rand: Rng): Cell[] {
  const cells: Cell[] = [];
  let minSep = sep;
  for (let attempt = 0; attempt < 6000 && cells.length < count; attempt++) {
    const p = { x: margin + rand() * (w - margin * 2), y: margin + rand() * (h - margin * 2) };
    if (centerClear > 0 && Math.hypot(p.x - w / 2, p.y - h / 2) < centerClear) continue;
    if (cells.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minSep)) cells.push(p);
    else if (attempt % 700 === 699) minSep = Math.max(88, minSep * .9);
  }
  while (cells.length < count) {
    cells.push({ x: margin + rand() * (w - margin * 2), y: margin + rand() * (h - margin * 2) });
  }
  return cells;
}

/** چیدمان ردیفیِ موجی (افقی یا عمودی، با شیب و فاز کاملاً تصادفی). */
function rowsCells(count: number, w: number, h: number, margin: number, large: boolean, rand: Rng): Cell[] {
  const transpose = rand() < 0.4;
  const spanA = transpose ? h - margin * 2 : w - margin * 2;
  const spanB = transpose ? w - margin * 2 : h - margin * 2;
  const columns = Math.max(2, Math.ceil(Math.sqrt(count * (spanA / spanB)) + (rand() - 0.5) * 1.2));
  const rows = Math.max(2, Math.ceil(count / columns));
  const rowCounts = shuffled(
    Array.from({ length: rows }, (_, row) => Math.floor(count / rows) + (row < count % rows ? 1 : 0)),
    rand,
  );
  const jitter = large ? 62 : 20;
  const curveAmp = large ? 28 + rand() * 58 : 9 + rand() * 15;
  const curveFreq = .5 + rand() * 1.35;
  const curvePhase = rand() * Math.PI * 2;
  const shear = (rand() - 0.5) * (large ? 90 : 28);
  const cells: Cell[] = [];
  for (let row = 0; row < rows; row++) {
    const n = rowCounts[row];
    if (n <= 0) continue;
    const squeeze = .66 + rand() * .34;
    const width = spanA * squeeze;
    const indent = (spanA - width) * rand();
    const step = width / Math.max(1, n - 1);
    const baseB = margin + (row / Math.max(1, rows - 1)) * spanB;
    for (let col = 0; col < n; col++) {
      const u = n === 1 ? 0.5 : col / (n - 1);
      const a = n === 1
        ? margin + spanA * (0.25 + rand() * 0.5)
        : margin + indent + col * step + (rand() - .5) * jitter;
      const b = baseB + (u - 0.5) * shear + Math.sin(col * curveFreq + row * 1.4 + curvePhase) * curveAmp + (rand() - .5) * jitter;
      cells.push(transpose ? { x: b, y: a } : { x: a, y: b });
    }
  }
  return cells;
}

/** قلعه‌ها روی یک یا چند حلقه یا کمانِ هلالی با زاویهٔ شروع کاملاً تصادفی. */
function ringCells(count: number, w: number, h: number, margin: number, rand: Rng): Cell[] {
  const cx = w / 2 + (rand() - 0.5) * w * 0.06;
  const cy = h / 2 + (rand() - 0.5) * h * 0.06;
  const maxRx = w / 2 - margin;
  const maxRy = h / 2 - margin;
  const rings = Math.max(1, Math.min(4, Math.ceil(count / (7 + Math.floor(rand() * 4)))));
  const baseAngle = rand() * Math.PI * 2;
  const spinDir = rand() < 0.5 ? -1 : 1;
  // گاهی حلقهٔ کامل و گاهی خلیجِ نعل‌اسبیِ باز
  const arcSpan = rand() < 0.45 ? Math.PI * (1.35 + rand() * 0.4) : Math.PI * 2;
  const cells: Cell[] = [];
  let placed = 0;
  for (let r = 0; r < rings; r++) {
    const n = Math.ceil((count - placed) / (rings - r));
    const radius = .40 + .56 * (rings === 1 ? .88 : r / Math.max(1, rings - 1));
    const ringOffset = baseAngle + spinDir * r * (0.7 + rand() * 0.9);
    for (let k = 0; k < n && placed < count; k++) {
      const frac = arcSpan < Math.PI * 1.99 && n > 1 ? k / (n - 1) : k / n;
      const angle = ringOffset + spinDir * frac * arcSpan + (rand() - .5) * .48;
      const wobble = .78 + rand() * .38;
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
function clusterCells(count: number, w: number, h: number, margin: number, sep: number, centerClear: number, rand: Rng): Cell[] {
  const nClusters = Math.max(2, Math.min(5, 2 + Math.floor(rand() * 3) + (count > 18 ? 1 : 0)));
  const centers: Cell[] = [];
  for (let guard = 0; guard < 800 && centers.length < nClusters; guard++) {
    const p = { x: margin + rand() * (w - margin * 2), y: margin + rand() * (h - margin * 2) };
    if (centerClear > 0 && Math.hypot(p.x - w / 2, p.y - h / 2) < centerClear * .7) continue;
    if (centers.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > sep * 1.25)) centers.push(p);
  }
  while (centers.length < nClusters) {
    centers.push({ x: margin + rand() * (w - margin * 2), y: margin + rand() * (h - margin * 2) });
  }
  const cells: Cell[] = [];
  let minSep = sep;
  for (let attempt = 0; attempt < 6000 && cells.length < count; attempt++) {
    const center = centers[attempt % centers.length];
    const angle = rand() * Math.PI * 2;
    const radius = Math.sqrt(rand()) * sep * (1.4 + rand() * 0.85);
    const p = { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius * .84 };
    if (p.x < margin || p.x > w - margin || p.y < margin || p.y > h - margin) continue;
    if (centerClear > 0 && Math.hypot(p.x - w / 2, p.y - h / 2) < centerClear) continue;
    if (cells.every((q) => Math.hypot(q.x - p.x, q.y - p.y) >= minSep)) cells.push(p);
    else if (attempt % 700 === 699) minSep = Math.max(88, minSep * .9);
  }
  while (cells.length < count) {
    const center = centers[cells.length % centers.length];
    cells.push({ x: center.x + (rand() - .5) * sep, y: center.y + (rand() - .5) * sep });
  }
  return cells;
}

/** نوار مورب یا S-شکل در جهت‌های مختلف (شمال‌غرب به جنوب‌شرق، شمال‌شرق به جنوب‌غرب، افقی یا عمودی). */
function valleyCells(count: number, w: number, h: number, margin: number, sep: number, rand: Rng): Cell[] {
  const vertical = rand() < .45;
  const diagSlope = rand() < 0.3 ? 0 : rand() < 0.5 ? -1 : 1;
  const waveFlip = rand() < .5 ? -1 : 1;
  const amp = (vertical ? w : h) * (.11 + rand() * .18);
  const freq = 0.85 + rand() * 1.85;
  const phase = rand() * Math.PI * 2;
  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) {
    const t = Math.max(0.02, Math.min(0.98, (i + .5) / count + (rand() - .5) * .65 / count));
    const along = margin + t * ((vertical ? h : w) - margin * 2);
    const crossSpan = (vertical ? w : h) - margin * 2;
    const baseRatio = diagSlope === 0 ? 0.5 : diagSlope > 0 ? t : 1 - t;
    const wave = Math.sin(t * Math.PI * freq + phase) * amp * waveFlip + (rand() - .5) * sep * .85;
    const across = margin + baseRatio * crossSpan + wave;
    const p = vertical ? { x: across, y: along } : { x: along, y: across };
    p.x = Math.max(margin, Math.min(w - margin, p.x));
    p.y = Math.max(margin, Math.min(h - margin, p.y));
    cells.push(p);
  }
  return cells;
}

/** دو مجمع‌الجزایر بزرگ در دو سوی دریا با تنگهٔ باز در میانه (چپ/راست، بالا/پایین یا مورب). */
function twinCells(count: number, w: number, h: number, margin: number, rand: Rng): Cell[] {
  const angle = rand() * Math.PI * 2;
  const dx = Math.cos(angle) * (w * 0.27);
  const dy = Math.sin(angle) * (h * 0.27);
  const lobes = [
    { x: w / 2 - dx, y: h / 2 - dy },
    { x: w / 2 + dx, y: h / 2 + dy },
  ];
  const spreadX = w * (0.17 + rand() * 0.08);
  const spreadY = h * (0.20 + rand() * 0.09);
  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) {
    const lobe = lobes[i % 2];
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    cells.push({
      x: Math.max(margin, Math.min(w - margin, lobe.x + Math.cos(a) * spreadX * r)),
      y: Math.max(margin, Math.min(h - margin, lobe.y + Math.sin(a) * spreadY * r)),
    });
  }
  return cells;
}

/** مارپیچ کهکشانی از مرکز به بیرون با جهت و زاویهٔ تصادفی. */
function spiralCells(count: number, w: number, h: number, margin: number, rand: Rng): Cell[] {
  const cx = w / 2;
  const cy = h / 2;
  const maxRx = w / 2 - margin;
  const maxRy = h / 2 - margin;
  const arms = 2 + Math.floor(rand() * 2);
  const spin = (rand() < 0.5 ? -1 : 1) * (2.4 + rand() * 1.9);
  const baseAngle = rand() * Math.PI * 2;
  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) {
    const arm = i % arms;
    const u = Math.min(1, (Math.floor(i / arms) + 0.45 + (rand() - 0.5) * 0.3) / Math.max(1, Math.ceil(count / arms)));
    const r = 0.24 + 0.74 * Math.sqrt(u);
    const theta = baseAngle + (arm / arms) * Math.PI * 2 + u * spin + (rand() - 0.5) * 0.35;
    cells.push({
      x: cx + Math.cos(theta) * maxRx * r,
      y: cy + Math.sin(theta) * maxRy * r,
    });
  }
  return cells;
}

/** چند شاخهٔ شبه‌جزیره‌ایِ شعاعی از میانه به بیرون (ستاره / چهارراه دریایی). */
function crossCells(count: number, w: number, h: number, margin: number, rand: Rng): Cell[] {
  const cx = w / 2;
  const cy = h / 2;
  const maxRx = w / 2 - margin;
  const maxRy = h / 2 - margin;
  const branches = 3 + Math.floor(rand() * 3); // ۳ تا ۵ شاخه با چرخش تصادفی
  const baseAngle = rand() * Math.PI * 2;
  const bend = (rand() - 0.5) * 0.55;
  const cells: Cell[] = [];
  for (let i = 0; i < count; i++) {
    const br = i % branches;
    const rank = Math.floor(i / branches);
    const maxRank = Math.max(1, Math.ceil(count / branches) - 1);
    const r = 0.22 + (rank / maxRank) * 0.74 + (rand() - 0.5) * 0.1;
    const theta = baseAngle + (br / branches) * Math.PI * 2 + r * bend + (rand() - 0.5) * 0.28;
    cells.push({
      x: Math.max(margin, Math.min(w - margin, cx + Math.cos(theta) * maxRx * r)),
      y: Math.max(margin, Math.min(h - margin, cy + Math.sin(theta) * maxRy * r)),
    });
  }
  return cells;
}

/** برج‌ها را با زاویه و شعاع متنوع در ناحیهٔ میانی نقشه قرار می‌دهد تا همیشه یک نقطهٔ ثابت نباشند. */
function centralizeTowers(cells: Cell[], towerCount: number, w: number, h: number, rand: Rng): number[] {
  if (towerCount <= 0) return [];
  const ranked = cells
    .map((p, index) => ({
      index,
      distance: ((p.x - w / 2) / w) ** 2 + ((p.y - h / 2) / h) ** 2,
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, towerCount);

  const baseAngle = rand() * Math.PI * 2;
  ranked.forEach(({ index }, k) => {
    const p = cells[index];
    const targetAngle = baseAngle + (k / Math.max(1, towerCount)) * Math.PI * 2 + (rand() - 0.5) * 0.7;
    const targetRadius = towerCount === 1 ? rand() * 0.11 : 0.05 + rand() * 0.11;
    const anchorX = w / 2 + Math.cos(targetAngle) * w * targetRadius;
    const anchorY = h / 2 + Math.sin(targetAngle) * h * targetRadius;
    for (let guard = 0; guard < 5; guard++) {
      const distance = Math.hypot((p.x - w / 2) / w, (p.y - h / 2) / h);
      if (distance < .165) {
        p.x = p.x * 0.45 + anchorX * 0.55;
        p.y = p.y * 0.45 + anchorY * 0.55;
        break;
      }
      p.x += (anchorX - p.x) * .42;
      p.y += (anchorY - p.y) * .42;
    }
  });
  return ranked.map((item) => item.index);
}

/** تضمین می‌کند پس از رفع هم‌پوشانی هم برج‌ها همچنان در بخش مرکزی نقشه بمانند. */
function keepTowersCentral(cells: Cell[], towerIndices: number[], w: number, h: number) {
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

/** Creates a connected, genuinely unpredictable battlefield every single time. */
export function createRandomLevel(raw: RandomMapSettings): Level {
  const config = normalizeRandomMap(raw);
  const error = validateRandomMap(config);
  if (error) throw new Error(error);

  const { rand, seed, isMocked } = createUnpredictableRng();

  const castleTypes: BType[] = [
    ...Array.from({ length: config.normal }, () => "barracks" as const),
    ...Array.from({ length: config.fast }, () => "speed" as const),
    ...Array.from({ length: config.heavy }, () => "heavy" as const),
  ];
  const towerTypes: BType[] = Array.from({ length: config.towers }, () => "tower");
  shuffled(castleTypes, rand);

  const total = castleTypes.length + towerTypes.length;
  const margin = config.largeMap ? 110 : 82;
  // در نقشه‌های بزرگ با ساختمان‌های متعادل، جزیره‌ها فضای کافی می‌گیرند تا خلیج‌ها و تنگه‌ها خوانا باشند
  const naturalMinSep = config.largeMap
    ? total <= 14 ? 156 : total <= 24 ? 126 : 94
    : 96;
  const overlapSep = Math.max(naturalMinSep, config.minDistance * PX_PER_METER);
  const layoutSpread = Math.max(config.largeMap ? 185 : 116, overlapSep);

  // ابعاد جهان هر بار با نسبتِ طول و عرضِ متفاوت ساخته می‌شود تا نقشه‌ها قالبی نباشند.
  const columns = Math.max(2, Math.ceil(Math.sqrt(total * CFG.W / CFG.H)));
  const rows = Math.max(2, Math.ceil(total / columns));
  const baseW = margin * 2 + Math.max(0, columns - 1) * overlapSep;
  const baseH = margin * 2 + Math.max(0, rows - 1) * overlapSep;
  const worldWidth = config.largeMap ? Math.round(Math.max(1320, baseW) * (0.96 + rand() * .34)) : CFG.W;
  const worldHeight = config.largeMap ? Math.round(Math.max(830, baseH) * (0.96 + rand() * .30)) : CFG.H;

  // انتخاب الگوی چیدمان بدون تکرارِ پشت‌سرهمِ الگوهای قبلی
  const basePool: Layout[] = total > 24
    ? ["scatter", "rows", "clusters", "twin", "spiral"]
    : config.largeMap
      ? [...LAYOUTS]
      : ["scatter", "rows", "ring", "clusters", "twin", "cross"];
  const freshLayouts = !isMocked ? basePool.filter((l) => !recentLayouts.includes(l)) : basePool;
  const layoutPool = freshLayouts.length > 0 ? freshLayouts : basePool;
  const layout = layoutPool[Math.floor(rand() * layoutPool.length)];
  if (!isMocked) {
    recentLayouts.push(layout);
    if (recentLayouts.length > 3) recentLayouts.shift();
  }

  const centerClear = config.towers > 0 && layout !== "rows" && layout !== "ring" && layout !== "cross"
    ? Math.min(worldWidth, worldHeight) * .15 : 0;

  let cells: Cell[];
  if (layout === "rows") cells = rowsCells(total, worldWidth, worldHeight, margin, config.largeMap, rand);
  else if (layout === "ring") cells = ringCells(total, worldWidth, worldHeight, margin, rand);
  else if (layout === "clusters") cells = clusterCells(total, worldWidth, worldHeight, margin, layoutSpread, centerClear, rand);
  else if (layout === "valley") cells = valleyCells(total, worldWidth, worldHeight, margin, layoutSpread, rand);
  else if (layout === "twin") cells = twinCells(total, worldWidth, worldHeight, margin, rand);
  else if (layout === "spiral") cells = spiralCells(total, worldWidth, worldHeight, margin, rand);
  else if (layout === "cross") cells = crossCells(total, worldWidth, worldHeight, margin, rand);
  else cells = scatterCells(total, worldWidth, worldHeight, margin, layoutSpread, centerClear, rand);

  // تبدیلِ تقارن و چرخشِ تصادفی برای حذف هرگونه الگوی قابل‌پیش‌بینی
  applySymmetryTransform(cells, worldWidth, worldHeight, margin, rand);

  // برج‌ها در ناحیهٔ میانی با زاویهٔ متنوع قرار می‌گیرند و سپس هم‌پوشانی‌ها رفع می‌شود.
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
  const buildings: Level["b"] = [];
  for (let player = 0; player < config.players; player++) {
    const p = cells[starts[player]];
    buildings.push([p.x, p.y, (player + 1) as 1 | 2 | 3 | 4, startTypes[player], startTypes[player] === "heavy" ? 15 : 22]);
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

  // انتخاب پالت رنگی بدون تکرارِ بلافاصلهٔ پالتِ نقشهٔ قبلی
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
    ai: .55 + rand() * .3,
    hint: `${config.players} بازیکن · ${summary} · ${config.lakes} خلیج · ${config.ships} کشتی و ${config.boats} قایق · چیدمان ${LAYOUT_LABEL[layout]}. قلعه‌های شروع در اطراف نقشه پخش شده‌اند؛ برج‌ها و بقیهٔ قلعه‌ها خنثی هستند.`,
    b: buildings,
    worldWidth,
    worldHeight,
    largeMap: config.largeMap,
    theme,
    lakes: config.lakes,
    ships: config.ships,
    boats: config.boats,
    seed,
  };
}
