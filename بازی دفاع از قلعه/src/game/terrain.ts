import type { Game } from "./engine";
import { noise, polygon, prism, ring, shadow, tint, type Context, type Point } from "./scene-geometry";
import { BRIDGE_APPROACH, BRIDGE_HALF_WIDTH, bridgeWaterSpans, type BridgeSpan } from "./bridge-geometry";
import { MAX_BOATS, MAX_LAKES, MAX_SHIPS } from "./map";
export { BRIDGE_HALF_WIDTH } from "./bridge-geometry";

type Theme = {
  water: [string, string, string];
  ground: string[];
  rock: string;
  rim: string;
  tree: string;
};

const THEMES: Theme[] = [
  { water: ["#0b3440", "#16716c", "#1f8e80"], ground: ["#7da85c", "#89b566", "#709b52", "#9ab96a"], rock: "#40585b", rim: "#b8c888", tree: "#547e41" },
  { water: ["#15363d", "#1d6866", "#369080"], ground: ["#a7a17b", "#b8b08a", "#999875", "#b2b182"], rock: "#5c625d", rim: "#d3c7a2", tree: "#668758" },
  { water: ["#192f40", "#235c6a", "#388294"], ground: ["#8fa6a6", "#a6b9b5", "#7f9f9f", "#acc2ba"], rock: "#455a67", rim: "#c8d6cc", tree: "#42696b" },
  { water: ["#14323c", "#20626b", "#2f8a8f"], ground: ["#b58a4c", "#c99f5f", "#a5763f", "#d4b071"], rock: "#6b5847", rim: "#e0c290", tree: "#b06a3c" },
  { water: ["#241d3f", "#453a70", "#6a5a9e"], ground: ["#6f7fa8", "#8293bb", "#5d6c94", "#93a4c9"], rock: "#3f4566", rim: "#b6c2e2", tree: "#4d5c86" },
];

interface Island { id: number; x: number; y: number; points: Point[]; depth: number; theme: Theme; }
export interface Scenery { x: number; y: number; scale: number; type: "pine" | "rock" | "ruin"; seed: number; color: string; }
/** تپهٔ کوچک روی سطح جزیره برای پستی و بلندیِ زمین */
export interface Hill { island: number; x: number; y: number; r: number; h: number; seed: number; }
/**
 * شناورِ روی دریا: کشتیِ بادبانی یا قایقِ پارویی (فقط ظاهر، بی‌اثر روی نبرد).
 * بخشی از شناورها (cruise) آرام روی آب کروز می‌کنند و بقیه لنگر انداخته‌اند.
 * مسیرِ کروز یک بیضیِ کوچک حولِ نقطهٔ لنگر است و شعاعش از حاشیهٔ امنِ ساحل
 * کمتر است، پس هیچ شناوری در هیچ لحظه‌ای به خشکی نمی‌رسد.
 */
export interface Vessel {
  kind: "ship" | "boat";
  x: number;
  y: number;
  scale: number;
  seed: number;
  hull: string;
  sail: string;
  /** در حالِ حرکتِ آرام روی آب */
  cruise: boolean;
  /** شعاعِ افقی و عمودیِ مسیرِ کروز (پیکسل) */
  driftX: number;
  driftY: number;
  /** ±۱: جهتِ چرخش روی مسیر */
  spin: number;
  /** فازِ شروع تا هر شناور در نقطهٔ دیگری از مسیر باشد */
  phase: number;
}
/** بخشِ خشکیِ یک راه بین دو قلعه؛ روی جزیره رسم می‌شود */
export interface RoadSpan { island: number; a: Point; b: Point; }
interface Landscape { islands: Island[]; scenery: Scenery[]; hills: Hill[]; vessels: Vessel[]; roads: RoadSpan[]; bridges: BridgeSpan[]; theme: Theme; }
const cache = new WeakMap<Game, { buildings: Game["bs"]; links: Game["links"]; landscape: Landscape }>();

function clip(points: Point[], nx: number, ny: number, limit: number) {
  const out: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const da = a.x * nx + a.y * ny - limit, db = b.x * nx + b.y * ny - limit;
    if (da <= 0) out.push(a);
    if ((da <= 0) !== (db <= 0)) {
      const t = da / (da - db);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/** فاصلهٔ یک نقطه تا نزدیک‌ترین یالِ یک چندضلعی */
function distanceToPolygon(p: Point, points: Point[]) {
  let best = Infinity;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const d = distanceToLine(p, points[j], points[i]);
    if (d < best) best = d;
  }
  return best;
}

/**
 * یک خلیجِ نرم در ساحلِ جزیره می‌کند: رأسِ انتخاب‌شده حذف و به‌جایش
 * کمانی به سمتِ مرکزِ جزیره کشیده می‌شود، پس آبِ دریا در آن دیده می‌شود.
 * چندضلعی همچنان ساده و بسته می‌ماند، بنابراین مسیریابی و برخوردها معتبر می‌مانند.
 */
function carveBay(points: Point[], center: Point, vertex: number, depth: number): Point[] {
  const n = points.length;
  if (n < 6) return points;
  const a = points[(vertex - 1 + n) % n];
  const b = points[(vertex + 1) % n];
  const v = points[vertex];
  const inward = { x: center.x - v.x, y: center.y - v.y };
  const len = Math.hypot(inward.x, inward.y) || 1;
  const ux = inward.x / len, uy = inward.y / len;
  const steps = 9;
  const bay: Point[] = [];
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const bulge = Math.sin(Math.PI * t) * depth;
    bay.push({ x: a.x + (b.x - a.x) * t + ux * bulge, y: a.y + (b.y - a.y) * t + uy * bulge });
  }
  return [...points.slice(0, vertex), ...bay, ...points.slice(vertex + 1)];
}

/** آیا رأسِ i برای کندنِ خلیج مناسب است؟ (دور از قلعه، پل‌ها و مرکزِ جزیره) */
function bayCandidate(points: Point[], center: Point, i: number, depth: number) {
  const v = points[i];
  const a = points[(i - 1 + points.length) % points.length];
  const b = points[(i + 1) % points.length];
  if (Math.hypot(v.x - center.x, v.y - center.y) < 78) return false;
  // کمان نباید به قلعه برسد
  const chordMid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const inward = { x: center.x - chordMid.x, y: center.y - chordMid.y };
  const len = Math.hypot(inward.x, inward.y) || 1;
  const tip = { x: chordMid.x + (inward.x / len) * depth, y: chordMid.y + (inward.y / len) * depth };
  if (Math.hypot(tip.x - center.x, tip.y - center.y) < 66) return false;
  return true;
}


/**
 * کشتی‌ها و قایق‌ها را روی آبِ آزاد می‌چیند.
 * نه روی خشکی، نه چسبیده به ساحل، نه روی مسیرهای پل، و نه روی شناورِ دیگر.
 */
function placeVessels(g: Game, ships: number, boats: number, shores: Point[][]): Vessel[] {
  const out: Vessel[] = [];
  const margin = 46;
  const sails = ["#f3ead6", "#e8b44c", "#dfe9ef"];
  const hulls = ["#6b4a2b", "#5c3f26", "#7a5533"];
  const build = (kind: "ship" | "boat", i: number) => {
    const scale = kind === "ship" ? 0.98 + (i % 3) * 0.12 : 0.74 + (i % 3) * 0.08;
    const clear = (kind === "ship" ? 34 : 20) * scale;
    // حدود یک‌سومِ شناورها کروز می‌کنند؛ بقیه لنگر انداخته‌اند تا دریا آرام بماند
    const cruise = out.length % 3 === 0;
    const drift = cruise ? (kind === "ship" ? 20 : 13) : 0;
    // شناورِ در حرکت موقعِ جای‌گذاری، «حاشیهٔ امن + کلِ شعاعِ مسیر» را رعایت
    // می‌کند؛ پس در تمامِ مسیر هم هرگز به ساحل یا پل نمی‌رسد.
    const keep = clear + drift;
    for (let guard = 0; guard < 260; guard++) {
      const x = margin + Math.random() * (g.worldWidth - margin * 2);
      const y = margin + Math.random() * (g.worldHeight - margin * 2);
      const p = { x, y };
      if (shores.some((points) => inside(p, points) || distanceToPolygon(p, points) < keep)) continue;
      if (g.links.some(([ia, ib]) => distanceToLine(p, g.bs[ia], g.bs[ib]) < 40 + keep)) continue;
      if (out.some((v) => Math.hypot(v.x - x, v.y - y) < 56 + keep)) continue;
      out.push({
        kind, x, y, scale,
        seed: out.length * 17 + (kind === "ship" ? 5 : 9),
        hull: hulls[out.length % hulls.length],
        sail: sails[out.length % sails.length],
        cruise,
        driftX: drift,
        driftY: drift * 0.42,
        spin: out.length % 2 === 0 ? 1 : -1,
        phase: out.length * 1.7 + (kind === "ship" ? 0.6 : 0),
      });
      return;
    }
  };
  for (let i = 0; i < ships; i++) build("ship", i);
  for (let i = 0; i < boats; i++) build("boat", i);
  return out;
}

export function landscapeFor(g: Game): Landscape {
  const known = cache.get(g);
  if (known?.buildings === g.bs && known.links === g.links) return known.landscape;
  const themeIndex = g.demo ? 0 : Math.abs(g.L.theme ?? Math.floor(g.i / 10)) % THEMES.length;
  const theme = THEMES[themeIndex];
  const scenery: Scenery[] = [];
  const hills: Hill[] = [];
  const vessels: Vessel[] = [];
  // کدام جزیره‌ها خلیج می‌گیرند؟ (خلیج = آب در دلِ خشکی، کنارِ ساحل)
  const lakeCount = Math.max(0, Math.min(MAX_LAKES, g.L.lakes ?? 0));
  const bayIslands = new Set<number>();
  if (lakeCount > 0 && g.bs.length > 1) {
    const order = g.bs.map((b) => b.id);
    // بر زدنِ با-seed تا خلیج‌ها هر بار روی جزیره‌های تازه بیفتند
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(noise(g.i * 97 + i * 13 + 5) * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.slice(0, Math.min(lakeCount, order.length)).forEach((id) => bayIslands.add(id));
  }
  const islands = g.bs.map((b) => {
    const nearest = Math.min(...g.bs.filter((q) => q !== b).map((q) => Math.hypot(q.x - b.x, (q.y - b.y) * 1.15)));
    const rx = Math.max(70, Math.min(190, nearest * .56 + 28));
    const ry = rx * .72;
    let points: Point[] = ring(b.x, b.y + 8, rx, ry, 10, .16 + noise(b.id * 5 + g.i) * .25)
      .map((p, i) => ({ x: b.x + (p.x - b.x) * (.88 + noise(i * 7 + b.id * 13) * .17), y: b.y + (p.y - b.y) * (.88 + noise(i * 9 + b.id * 3) * .17) }));
    // Voronoi clipping leaves readable water channels between nearby platforms.
    for (const other of g.bs) {
      if (other === b) continue;
      const nx = other.x - b.x, ny = (other.y - b.y) * 1.4;
      points = clip(points, nx, ny, nx * (b.x + other.x) / 2 + ny * (b.y + other.y) / 2);
    }
    points = points.map((p) => ({ x: b.x + (p.x - b.x) * .9, y: b.y + (p.y - b.y) * .9 }));
    // خلیج: یک بریدگیِ نرم در ساحل که آبِ دریا در آن دیده می‌شود.
    if (bayIslands.has(b.id)) {
      const center = { x: b.x, y: b.y + 4 };
      let bestVertex = -1;
      let bestScore = -Infinity;
      for (let i = 0; i < points.length; i++) {
        const v = points[i];
        const clearance = Math.hypot(v.x - center.x, v.y - center.y);
        if (clearance < 88) continue;
        if (g.links.some(([ia, ib]) => distanceToLine(v, g.bs[ia], g.bs[ib]) < 62)) continue;
        if (!bayCandidate(points, center, i, 34)) continue;
        // رأسِ رو به دریا و دور از پل‌ها بهتر است
        const openness = Math.min(...g.bs.filter((q) => q !== b).map((q) => Math.hypot(q.x - v.x, (q.y - v.y) * 1.2)));
        const score = Math.min(clearance, 190) * .35 + Math.min(openness, 220) * .65;
        if (score > bestScore) { bestScore = score; bestVertex = i; }
      }
      if (bestVertex >= 0) {
        const v = points[bestVertex];
        const reach = Math.hypot(v.x - center.x, v.y - center.y);
        // هر چه جزیره بزرگ‌تر، خلیج عمیق‌تر؛ ولی هرگز به قلعه یا پل نرسد.
        const clearance = Math.min(...g.links.flatMap(([ia, ib]) => {
          const A = g.bs[ia], B = g.bs[ib];
          const dx = B.x - A.x, dy = B.y - A.y;
          const len2 = dx * dx + dy * dy || 1;
          const t = Math.max(0, Math.min(1, ((v.x - A.x) * dx + (v.y - A.y) * dy) / len2));
          return [Math.hypot(v.x - A.x - t * dx, v.y - A.y - t * dy)];
        }).concat([999]));
        const carve = Math.max(30, Math.min(76, Math.min(reach - 86, clearance - 20)));
        const carved = carveBay(points, center, bestVertex, carve);
        if (carved.length >= 6) {
          points = carved;
        }
      }
    }
    // پستی و بلندی: ارتفاع سکوی هر جزیره با دیگران فرق می‌کند.
    const depth = 15 + noise(b.id * 17 + 6) * 38 + (noise(b.id * 29 + 3) > .7 ? 14 : 0);
    for (let k = 0; k < 4; k++) {
      const angle = (k / 4) * Math.PI * 2 + noise(b.id + k * 4) * .7;
      const p = { x: b.x + Math.cos(angle) * rx * .67, y: b.y + Math.sin(angle) * ry * .67 };
      if (Math.hypot(p.x - b.x, (p.y - b.y) * 1.6) < 65) continue;
      if (Math.abs(p.x - b.x) < 48 && p.y > b.y - 20) continue;
      if (!inside(p, points)) continue;
      if (g.links.some(([a, z]) => distanceToLine(p, g.bs[a], g.bs[z]) < 24)) continue;
      scenery.push({ ...p, scale: .65 + noise(k * 19 + b.id) * .7, type: k === 3 ? "ruin" : k % 2 ? "rock" : "pine", seed: b.id * 13 + k, color: theme.tree });
    }
    // تپه‌های ملایم روی سطح جزیره (پستی و بلندیِ چشم‌نواز، بی‌مزاحمت برای بازی)
    const hillCount = rx > 120 ? (noise(b.id * 41 + 5) > .45 ? 2 : 1) : noise(b.id * 41 + 5) > .6 ? 1 : 0;
    for (let k = 0; k < hillCount; k++) {
      const angle = noise(b.id * 53 + k * 7) * Math.PI * 2;
      const reach = .34 + noise(b.id * 61 + k * 3) * .32;
      const p = { x: b.x + Math.cos(angle) * rx * reach, y: b.y + 10 + Math.sin(angle) * ry * reach };
      const r = 16 + noise(b.id * 67 + k * 11) * 20;
      const h = 8 + noise(b.id * 71 + k * 13) * 13;
      if (!inside(p, points)) continue;
      if (Math.hypot(p.x - b.x, p.y - b.y) < 62) continue;
      if (g.links.some(([a, z]) => distanceToLine(p, g.bs[a], g.bs[z]) < 42)) continue;
      if (hills.some((hill) => Math.hypot(hill.x - p.x, hill.y - p.y) < hill.r + r + 12)) continue;
      if ([[10, 0], [-10, 0], [0, 8], [0, -8]].some(([dx, dy]) => !inside({ x: p.x + dx, y: p.y + dy }, points))) continue;
      hills.push({ island: b.id, ...p, r, h, seed: b.id * 17 + k * 5 });
    }
    const surface = b.type === "tower"
      ? { ...theme, ground: ["#8c9b8e", "#a1aca0", "#7e8e86", "#adb5a6"], rim: "#bac3ac" }
      : theme;
    return { id: b.id, x: b.x, y: b.y, points, depth, theme: surface };
  }).sort((a, b) => a.y - b.y);
  const shores = islands.map((island) => island.points);
  // شناورها: کشتیِ بادبانی و قایقِ پارویی روی آبِ آزاد
  vessels.push(...placeVessels(g, Math.max(0, Math.min(MAX_SHIPS, g.L.ships ?? 0)), Math.max(0, Math.min(MAX_BOATS, g.L.boats ?? 0)), shores));
  const bridges = g.links.flatMap(([a, b]) => bridgeWaterSpans(g.bs[a], g.bs[b], shores));
  // بخش‌های خشکیِ راه‌ها: هر پیوند بین دو قلعه، روی جزیره‌ها راهِ خاکی دارد.
  const roads: RoadSpan[] = [];
  for (const [ia, ib] of g.links) {
    const A = g.bs[ia], B = g.bs[ib];
    const dx = B.x - A.x, dy = B.y - A.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared <= 1) continue;
    const water = bridgeWaterSpans(A, B, shores)
      .map((span) => [((span.a.x - A.x) * dx + (span.a.y - A.y) * dy) / lengthSquared,
        ((span.b.x - A.x) * dx + (span.b.y - A.y) * dy) / lengthSquared])
      .sort((x, y) => x[0] - y[0]);
    let cursor = 0;
    for (const [t0, t1] of [...water, [1, 1] as [number, number]]) {
      if (t0 - cursor > .012) {
        const p0 = { x: A.x + dx * cursor, y: A.y + dy * cursor };
        const p1 = { x: A.x + dx * t0, y: A.y + dy * t0 };
        const mid = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const island = islands.find((item) => inside(mid, item.points));
        if (island) roads.push({ island: island.id, a: p0, b: p1 });
      }
      cursor = Math.max(cursor, t1);
    }
  }
  const landscape = { islands, scenery, hills, vessels, roads, bridges, theme };
  cache.set(g, { buildings: g.bs, links: g.links, landscape });
  return landscape;
}

function inside(p: Point, points: Point[]) {
  let result = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if (((a.y > p.y) !== (b.y > p.y)) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}

function distanceToLine(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

export function drawWater(c: Context, g: Game | null, width: number, height: number, time: number) {
  const colors = g ? landscapeFor(g).theme.water : THEMES[0].water;
  const gradient = c.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors[0]); gradient.addColorStop(.55, colors[1]); gradient.addColorStop(1, colors[2]);
  c.fillStyle = gradient; c.fillRect(0, 0, width, height);
  c.lineCap = "round";
  for (let i = 0; i < 60; i++) {
    const x = noise(i * 5.71) * width, y = noise(i * 8.91 + 2) * height;
    const drift = Math.sin(time * .4 + i) * 8;
    c.strokeStyle = `rgba(164,236,208,${.035 + .035 * Math.sin(time * .7 + i)})`;
    c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(x + drift, y); c.quadraticCurveTo(x + 14 + drift, y + 3, x + 31 + drift, y); c.stroke();
  }
}

/** بلندی دیوارهٔ پل که از سطح زمین به سمت آب پایین می‌رود (حداقل). */
export const BRIDGE_WALL = 16;

/**
 * پل در ترازِ سطح زمین (همان تراز سکوی قلعه) کشیده می‌شود، نه سطح آب؛
 * دیوارهٔ زیرین آن تا آب ادامه دارد، پس حس یک گذرگاه مرتفع را می‌دهد.
 * ارتفاع دیواره در دو سر متناسب با ارتفاع سکوی جزیره است و در طول پل تغییر می‌کند؛
 * همین تغییر ارتفاع به‌همراه سایه‌روشنِ رویه، حس «شیبِ راه» را می‌سازد.
 */
function drawBridge(c: Context, a: Point, b: Point, depthA: number, depthB: number) {
  const spanLength = Math.hypot(b.x - a.x, b.y - a.y);
  if (spanLength < .5) return;
  const ux = (b.x - a.x) / spanLength, uy = (b.y - a.y) / spanLength;
  // Extend beneath the shore mask so diagonal banks meet the whole deck without gaps.
  const approach = BRIDGE_APPROACH;
  a = { x: a.x - ux * approach, y: a.y - uy * approach };
  b = { x: b.x + ux * approach, y: b.y + uy * approach };
  const length = spanLength + approach * 2;
  const vx = -uy * BRIDGE_HALF_WIDTH, vy = ux * BRIDGE_HALF_WIDTH;
  // دیواره تا سطح آب؛ در سرِ جزیرهٔ بلندتر، دیواره بلندتر است → پل شیب دارد.
  const wallA = Math.max(BRIDGE_WALL, Math.min(64, depthA * .9));
  const wallB = Math.max(BRIDGE_WALL, Math.min(64, depthB * .9));
  const top = [
    { x: a.x + vx, y: a.y + vy }, { x: a.x - vx, y: a.y - vy },
    { x: b.x - vx, y: b.y - vy }, { x: b.x + vx, y: b.y + vy },
  ];
  // سایهٔ زیر پل
  polygon(c, top.map((p, i) => ({ x: p.x + 3, y: p.y + (i < 2 ? wallA : wallB) + 6 })), "rgba(4,28,30,.28)");
  // دیوارهٔ کناریِ شیب‌دار تا سطح آب
  polygon(c, [top[1], top[2], { x: top[2].x, y: top[2].y + wallB }, { x: top[1].x, y: top[1].y + wallA }], "#2f4a46");
  polygon(c, [top[3], top[0], { x: top[0].x, y: top[0].y + wallA }, { x: top[3].x, y: top[3].y + wallB }], "#3a5751");
  // میخ‌های روشن روی دیواره، در امتداد شیب
  c.strokeStyle = "rgba(146,178,168,.35)";
  c.lineWidth = 1;
  for (let d = 20; d < length - 12; d += 26) {
    const t = d / length;
    const wall = wallA + (wallB - wallA) * t;
    const x = a.x + ux * d, y = a.y + uy * d;
    c.beginPath(); c.moveTo(x - vx, y - vy + wall * .25); c.lineTo(x - vx, y - vy + wall * .85); c.stroke();
    c.beginPath(); c.moveTo(x + vx, y + vy + wall * .25); c.lineTo(x + vx, y + vy + wall * .85); c.stroke();
  }
  // رویهٔ سنگیِ روشن در تراز خشکی؛ سایه‌روشنِ طولی، سطح شیب‌دار را نشان می‌دهد
  const deck = c.createLinearGradient(a.x, a.y, b.x, b.y);
  const highFirst = wallA >= wallB;
  deck.addColorStop(0, highFirst ? "#e7ebd2" : "#c2c8aa");
  deck.addColorStop(1, highFirst ? "#c2c8aa" : "#e7ebd2");
  polygon(c, top, deck);
  c.strokeStyle = "#aab297";
  c.lineWidth = 1.1;
  for (let d = 13; d < length; d += 15) {
    const x = a.x + ux * d, y = a.y + uy * d;
    c.beginPath(); c.moveTo(x + vx, y + vy); c.lineTo(x - vx, y - vy); c.stroke();
  }
  // خط مرکزی روشن: مسیر دقیقی که سربازان روی آن گام برمی‌دارند.
  c.strokeStyle = "rgba(255,255,255,.22)";
  c.lineWidth = 2;
  c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
  c.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    c.strokeStyle = side < 0 ? "#e8ead0" : "#7f8b76";
    c.beginPath();
    c.moveTo(a.x + vx * side, a.y + vy * side);
    c.lineTo(b.x + vx * side, b.y + vy * side);
    c.stroke();
  }
}

/** ارتفاع سکوی نزدیک‌ترین جزیره به یک نقطهٔ ساحلی؛ برای شیبِ پل به کار می‌رود. */
function shoreDepth(islands: Island[], point: Point): number {
  let best = 30;
  let bestDistance = Infinity;
  for (const island of islands) {
    const distance = Math.hypot(island.x - point.x, island.y - point.y);
    if (distance < bestDistance) { bestDistance = distance; best = island.depth; }
  }
  return best;
}


/** تپهٔ کوچکِ چندلایه با سبکِ کم‌پلیِ نقشه */
function drawHill(c: Context, hill: Hill, theme: Theme) {
  shadow(c, hill.x + 5, hill.y + 7, hill.r * .95, hill.r * .48, .15);
  // prism خودش سایه‌روشن می‌زند؛ رنگ پایه باید هگز خام باشد نه خروجی tint
  prism(c, ring(hill.x, hill.y, hill.r, hill.r * .5, 8), hill.h, theme.ground[2]);
  prism(c, ring(hill.x - hill.r * .12, hill.y - hill.h + 1, hill.r * .55, hill.r * .3, 7), hill.h * .5, theme.ground[1]);
}

/** کوهِ دریایی: سکوی سنگی و قلهٔ چندوجهی با کلاهکِ برف، ایستاده در آب */


/**
 * کشتیِ بادبانی و قایقِ پارویی — ایزومتریک، هم‌سبک با جزیره‌ها.
 * آرام روی آب تکان می‌خورند (فقط ظاهر).
 */
/** موقعیت و کجیِ یک شناور در لحظهٔ time — خالص و ارزان (بدونِ تخصیص) */
export function vesselPose(v: Vessel, time: number) {
  // چرخهٔ کروز: ۰٫۱۳ رادیان بر ثانیه ≈ یک دورِ کامل در ۴۸ ثانیه (آرام و طبیعی)
  const angle = time * 0.13 * v.spin + v.phase;
  const driftX = v.cruise ? Math.cos(angle) * v.driftX : 0;
  const driftY = v.cruise ? Math.sin(angle) * v.driftY : 0;
  const bob = Math.sin(time * 1.3 + v.seed) * 1.6;
  // کجیِ بدنه هم‌سو با حرکت + تکانِ آرامِ موج
  const tilt = Math.sin(time * 0.9 + v.seed * 1.7) * 0.02 - (v.cruise ? Math.sin(angle) * 0.045 : 0);
  return { x: v.x + driftX, y: v.y + driftY + bob, tilt, moving: v.cruise };
}

/**
 * رسمِ شناور: بدنه حولِ خطِ آب کمی کج می‌شود (موج + جهتِ حرکت) تا حرکت
 * طبیعی دیده شود؛ کلِ ترسیم یک‌بار save/restore می‌شود، پس هزینه‌اش ناچیز است.
 */
function drawVessel(c: Context, v: Vessel, time: number) {
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

function paintVessel(c: Context, v: Vessel, pose: { x: number; y: number; tilt: number; moving: boolean }) {
  const tilt = pose.tilt;
  const s = v.scale;
  const x = pose.x;
  const y = pose.y;

  // سایه و حلقهٔ آبِ آرام
  c.fillStyle = "rgba(6,40,46,.22)";
  c.beginPath(); c.ellipse(x + 1, y + 4, 26 * s, 8 * s, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = "rgba(164,236,208,.22)";
  c.lineWidth = 1.2;
  c.beginPath(); c.ellipse(x, y + 3, 22 * s, 7 * s, 0, 0, Math.PI * 2); c.stroke();
  // ردِ آرامِ آب پشتِ شناورِ در حرکت (دو قوسِ کوتاه)
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
    // بدنهٔ قایق: عرشهٔ روشن با لبهٔ چوبی تا از فاصله هم «قایق» خوانده شود
    c.beginPath();
    c.moveTo(x - 16 * s, y - 2 * s);
    c.quadraticCurveTo(x, y + 8 * s, x + 16 * s, y - 2 * s);
    c.lineTo(x + 11 * s, y - 6 * s);
    c.lineTo(x - 11 * s, y - 6 * s);
    c.closePath();
    c.fillStyle = dark; c.fill();
    c.beginPath();
    c.moveTo(x - 13 * s, y - 4.5 * s);
    c.quadraticCurveTo(x, y + 4 * s, x + 13 * s, y - 4.5 * s);
    c.closePath();
    c.fillStyle = tint(hull, 62); c.fill();
    // لبهٔ چوبی
    c.strokeStyle = tint(hull, 88);
    c.lineWidth = 1.1 * s;
    c.beginPath();
    c.moveTo(x - 13 * s, y - 4.5 * s);
    c.quadraticCurveTo(x, y + 4 * s, x + 13 * s, y - 4.5 * s);
    c.stroke();
    // نیمکت
    c.strokeStyle = dark; c.lineWidth = 1.2 * s;
    c.beginPath(); c.moveTo(x - 6 * s, y - 4.2 * s); c.lineTo(x + 6 * s, y - 4.2 * s); c.stroke();
    // پاروها با تیغهٔ روشن
    for (const dir of [-1, 1]) {
      c.strokeStyle = tint(deck, 60);
      c.lineWidth = 1.4 * s;
      c.beginPath();
      c.moveTo(x + dir * 4 * s, y - 3 * s);
      c.lineTo(x + dir * 17 * s, y + 4 * s);
      c.stroke();
      c.beginPath();
      c.ellipse(x + dir * 18 * s, y + 4.6 * s, 3.2 * s, 1.7 * s, dir * 0.5, 0, Math.PI * 2);
      c.fillStyle = tint(deck, 44); c.fill();
    }
    // دکلِ کوتاه با پرچمِ ریز — نشانهٔ یک قایق، نه یک تکه چوب
    const post = y - 22 * s;
    c.strokeStyle = tint(hull, -52);
    c.lineWidth = 1.3 * s;
    c.beginPath(); c.moveTo(x, y - 5 * s); c.lineTo(x, post); c.stroke();
    c.beginPath();
    c.moveTo(x, post);
    c.lineTo(x + 8 * s, post + 3 * s);
    c.lineTo(x, post + 6 * s);
    c.closePath();
    c.fillStyle = v.sail;
    c.fill();
    return;
  }

  // بدنهٔ کشتی (دو وجه با سایه)
  c.beginPath();
  c.moveTo(x - 26 * s, y - 6 * s);
  c.quadraticCurveTo(x, y + 10 * s, x + 26 * s, y - 6 * s);
  c.lineTo(x + 19 * s, y - 11 * s);
  c.lineTo(x - 19 * s, y - 11 * s);
  c.closePath();
  c.fillStyle = dark; c.fill();
  c.beginPath();
  c.moveTo(x - 22 * s, y - 9 * s);
  c.quadraticCurveTo(x, y + 5 * s, x + 22 * s, y - 9 * s);
  c.closePath();
  c.fillStyle = deck; c.fill();
  // لبهٔ چوبی
  c.strokeStyle = tint(hull, 46);
  c.lineWidth = 1.2 * s;
  c.beginPath();
  c.moveTo(x - 20 * s, y - 8.5 * s);
  c.quadraticCurveTo(x, y + 3 * s, x + 20 * s, y - 8.5 * s);
  c.stroke();

  // دکل و بادبان‌های زاویه‌دار
  const mastTop = y - 42 * s;
  c.strokeStyle = tint(hull, -52);
  c.lineWidth = 1.6 * s;
  c.beginPath(); c.moveTo(x, y - 9 * s); c.lineTo(x, mastTop); c.stroke();

  c.save();
  c.translate(x, y - 9 * s);
  c.rotate(tilt);
  const sail = v.sail;
  // بادبانِ اصلی
  c.beginPath();
  c.moveTo(x * 0 + 1.2 * s, -34 * s);
  c.quadraticCurveTo(17 * s, -22 * s, 12 * s, -2 * s);
  c.lineTo(1.2 * s, -2 * s);
  c.closePath();
  c.fillStyle = sail; c.fill();
  c.strokeStyle = "rgba(0,0,0,.16)"; c.lineWidth = 0.9 * s; c.stroke();
  // بادبانِ جلو
  c.beginPath();
  c.moveTo(-2.4 * s, -31 * s);
  c.quadraticCurveTo(-15 * s, -20 * s, -11 * s, -3 * s);
  c.lineTo(-2.4 * s, -3 * s);
  c.closePath();
  c.fillStyle = tint(sail, 26); c.fill();
  c.strokeStyle = "rgba(0,0,0,.16)"; c.stroke();
  // پرچم
  c.beginPath();
  c.moveTo(0, -38 * s);
  c.lineTo(7 * s, -35.5 * s);
  c.lineTo(0, -33 * s);
  c.closePath();
  c.fillStyle = "#e8b44c"; c.fill();
  c.restore();
}

export function drawTerrain(c: Context, g: Game, time: number) {
  const { islands, bridges, hills, vessels } = landscapeFor(g);
  // شناورها روی آب و پیش از جزیره‌ها رسم می‌شوند تا هرگز روی خشکی نیفتند
  for (const vessel of vessels) drawVessel(c, vessel, time);
  for (const island of islands) {
    polygon(c, island.points.map((p) => ({ x: p.x + 10, y: p.y + island.depth + 5 })), "rgba(6,40,40,.22)");
    c.strokeStyle = `rgba(121,228,202,${.12 + Math.sin(time * 1.1 + island.id) * .04})`;
    c.lineWidth = 9;
    c.beginPath();
    island.points.forEach((p, i) => i ? c.lineTo(p.x, p.y + island.depth + 3) : c.moveTo(p.x, p.y + island.depth + 3));
    c.closePath(); c.stroke();
  }
  for (const island of islands) {
    const bottom = island.points.map((p) => ({ x: p.x + 3, y: p.y + island.depth }));
    const top = island.points;
    for (let i = 0; i < top.length; i++) {
      const j = (i + 1) % top.length;
      if (top[j].x >= top[i].x) continue;
      const face = [top[i], top[j], bottom[j], bottom[i]];
      polygon(c, face, tint(island.theme.rock, -15 + noise(i + island.id) * 25));
      polygon(c, [top[j], bottom[j], bottom[i]], tint(island.theme.rock, -35 + noise(i * 2) * 12));
      const seam = { x: top[i].x + (top[j].x - top[i].x) * .56, y: top[i].y + (top[j].y - top[i].y) * .56 };
      polygon(c, [seam, { x: seam.x - 6, y: seam.y + island.depth * .72 }, bottom[j]], "rgba(0,15,22,.14)");
    }
    polygon(c, top, island.theme.ground[0]);
    const center = { x: island.x + 8, y: island.y + 12 };
    for (let i = 0; i < top.length; i++) polygon(c, [center, top[i], top[(i + 1) % top.length]], island.theme.ground[(island.id + i) % island.theme.ground.length]);
    // سایه‌روشنِ ملایمِ سطح: حس پستی و بلندیِ نرم روی زمین
    if (top.length >= 3) {
      c.save();
      c.beginPath();
      c.moveTo(top[0].x, top[0].y);
      for (let i = 1; i < top.length; i++) c.lineTo(top[i].x, top[i].y);
      c.closePath();
      c.clip();
      const light = c.createRadialGradient(island.x - 40, island.y - 46, 12, island.x, island.y, 210);
      light.addColorStop(0, "rgba(255,252,230,.14)");
      light.addColorStop(.62, "rgba(255,252,230,0)");
      light.addColorStop(1, "rgba(10,26,24,.12)");
      c.fillStyle = light;
      c.fill();
      c.restore();
    }
    for (let i = 0; i < top.length; i++) {
      const j = (i + 1) % top.length;
      c.strokeStyle = top[j].x < top[i].x ? island.theme.rim : "#b9d68b44";
      c.lineWidth = 2.3;
      c.beginPath(); c.moveTo(top[i].x, top[i].y); c.lineTo(top[j].x, top[j].y); c.stroke();
    }
    // تپه‌های پستی‌بلندی روی سطح جزیره
    for (const hill of hills) if (hill.island === island.id) drawHill(c, hill, island.theme);
    // Pebbles and worn paving approach the keep without competing with its silhouette.
    for (let i = 0; i < 5; i++) {
      const x = island.x + (noise(island.id * 51 + i * 3) - .5) * 110;
      const y = island.y + 32 + noise(island.id * 19 + i * 6) * 20;
      if (inside({ x, y }, top)) polygon(c, ring(x, y, 4 + noise(i) * 5, 2 + noise(i + 2) * 3, 5), "rgba(232,224,186,.3)");
    }
    // راه‌های خاکیِ همین جزیره
    // راه‌های خاکی روی چمن رسم نمی‌شوند تا چمن دست‌نخورده و طبیعی بماند.
  }
  // Keep bridges above the cliff faces, but mask every island top so no deck, rail,
  // wall or shadow can paint over grass (even on wide or diagonal approaches).
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

export function drawScenery(c: Context, item: Scenery, time: number) {
  c.save(); c.translate(item.x, item.y); c.scale(item.scale, item.scale);
  shadow(c, 10, 7, 17, 6, .18);
  if (item.type === "pine") {
    const sway = Math.sin(time * .8 + item.seed) * .8;
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