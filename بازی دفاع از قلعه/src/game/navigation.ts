import type { Building, Point, Waypoint } from "./config";
import { distanceToSegment, pointInPolygon, TROOP_FOOT_RADIUS, TROOP_LANE_SPACING } from "./bridge-geometry";

export interface IslandSurface {
  id: number;
  points: readonly Point[];
}

export interface WalkPose extends Point {
  angle: number;
  laneWidth: number;
}

interface Bypass {
  center: Point;
  radius: number;
  laneWidth: number;
}

const EPSILON = 1e-7;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function pathLength(points: readonly Point[]) {
  return points.slice(1).reduce((sum, point, i) => sum + distance(points[i], point), 0);
}

/** One sampler for the simulation, the visible soldiers and the route preview. */
export function samplePath(points: readonly Waypoint[], travelled: number): WalkPose {
  if (!points.length) return { x: 0, y: 0, angle: 0, laneWidth: 0 };
  let remaining = Math.max(0, travelled);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const length = distance(a, b);
    if (length <= EPSILON) continue;
    if (remaining <= length || i === points.length - 1) {
      const t = Math.min(1, remaining / length);
      // Stay on the safe side at a narrow island bend; never jump lanes at the bank.
      const laneWidth = Math.min(a.laneWidth ?? TROOP_LANE_SPACING, b.laneWidth ?? TROOP_LANE_SPACING);
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t,
        angle: Math.atan2(b.y - a.y, b.x - a.x), laneWidth };
    }
    remaining -= length;
  }
  const p = points[points.length - 1];
  return { x: p.x, y: p.y, angle: 0, laneWidth: 0 };
}

function bypassFor(building: Building, surfaces: readonly IslandSurface[]): Bypass {
  const shore = surfaces.find((island) => island.id === building.id)?.points ?? [];
  const bankDistance = shore.length >= 3
    ? Math.min(...shore.map((a, i) => distanceToSegment(building, a, shore[(i + 1) % shore.length])))
    : 64;
  // Every turn fits completely on this island. Tight banks force a narrower formation.
  const radius = Math.max(1, Math.min(58, bankDistance - TROOP_FOOT_RADIUS - 1));
  const laneWidth = Math.max(0, Math.min(TROOP_LANE_SPACING, bankDistance - radius - TROOP_FOOT_RADIUS - 1));
  return { center: building, radius, laneWidth };
}

function radial(circle: Bypass, toward: Point): Waypoint {
  const dx = toward.x - circle.center.x, dy = toward.y - circle.center.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: circle.center.x + dx / length * circle.radius,
    y: circle.center.y + dy / length * circle.radius, laneWidth: circle.laneWidth };
}

function append(output: Waypoint[], point: Waypoint) {
  const last = output[output.length - 1];
  if (last && distance(last, point) < EPSILON) {
    last.laneWidth = Math.min(last.laneWidth ?? TROOP_LANE_SPACING, point.laneWidth ?? TROOP_LANE_SPACING);
  } else output.push({ ...point });
}

function arc(circle: Bypass, a: Point, b: Point): Waypoint[] {
  const from = Math.atan2(a.y - circle.center.y, a.x - circle.center.x);
  let turn = Math.atan2(b.y - circle.center.y, b.x - circle.center.x) - from;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn <= -Math.PI) turn += Math.PI * 2;
  // Opposite directions use the same side of a straight-through courtyard.
  if (Math.abs(Math.abs(turn) - Math.PI) < EPSILON && Math.sin(from + turn / 2) < 0) turn = -turn;
  const steps = Math.max(1, Math.ceil(Math.abs(turn) / (Math.PI / 24)));
  return Array.from({ length: steps + 1 }, (_, i) => {
    const angle = from + turn * i / steps;
    return { x: circle.center.x + Math.cos(angle) * circle.radius,
      y: circle.center.y + Math.sin(angle) * circle.radius, laneWidth: circle.laneWidth };
  });
}

// Long links can cross a third island that is not a node in the selected route.
// Detour only inside that island's safe disk; the water sections stay on their bridge.
function bypassCrossedKeeps(a: Waypoint, b: Waypoint, circles: readonly Bypass[], output: Waypoint[]) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared < EPSILON) { append(output, b); return; }
  const crossings: { circle: Bypass; entry: number; exit: number }[] = [];
  for (const circle of circles) {
    const x = a.x - circle.center.x, y = a.y - circle.center.y;
    const projection = x * dx + y * dy;
    const discriminant = projection * projection - lengthSquared * (x * x + y * y - circle.radius ** 2);
    if (discriminant <= EPSILON) continue;
    const root = Math.sqrt(discriminant);
    const entry = (-projection - root) / lengthSquared;
    const exit = (-projection + root) / lengthSquared;
    if (entry <= EPSILON || exit >= 1 - EPSILON) continue;
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

/* ============ حفاظ ساحلی: پای سرباز از لبهٔ جزیره به آب نمی‌افتد ============ */

/** فاصلهٔ یک نقطه تا نزدیک‌ترین ضلعِ چندضلعی جزیره. */
function islandClearance(point: Point, polygon: readonly Point[]): number {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const d = distanceToSegment(point, polygon[j], polygon[i]);
    if (d < best) best = d;
  }
  return best;
}

/**
 * بخش‌های مستقیمِ بلندِ مسیر را از لبه‌های تیز جزیره دور می‌کند:
 * هر جا خط از کنار ساحل می‌گذرد و جای پای سرباز (شعاع ۳ + عرض ستون) روی آب می‌افتد،
 * یک نقطهٔ میانی به سمت داخلِ خشکی اضافه می‌شود. کمان‌های دور قلعه کوتاه‌اند و دست نمی‌خورند.
 */
function shoreGuard(points: Waypoint[], surfaces: readonly IslandSurface[], buildings: readonly { x: number; y: number }[]): Waypoint[] {
  if (points.length < 2 || !surfaces.length) return points;
  const out: Waypoint[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const a = out[out.length - 1];
    const b = points[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length < 24) { out.push(b); continue; }
    const steps = Math.max(2, Math.ceil(length / 7));
    let runStart = -1;
    let runIsland: IslandSurface | null = null;
    const flush = (runEnd: number) => {
      if (runStart >= 0 && runIsland) {
        const t = (runStart + runEnd) / (2 * steps);
        const m = { x: a.x + dx * t, y: a.y + dy * t };
        // جهت داخل: عمود بر نزدیک‌ترین ضلعِ ساحل
        let px = 0, py = 0, bestEdge = Infinity;
        const poly = runIsland.points;
        for (let k = 0, j = poly.length - 1; k < poly.length; j = k++) {
          const d = distanceToSegment(m, poly[j], poly[k]);
          if (d < bestEdge) { bestEdge = d; px = poly[j].x - poly[k].x; py = poly[j].y - poly[k].y; }
        }
        const edgeLength = Math.hypot(px, py) || 1;
        let nx = -py / edgeLength, ny = px / edgeLength;
        if (!pointInPolygon({ x: m.x + nx * 3, y: m.y + ny * 3 }, poly)) { nx = -nx; ny = -ny; }
        let best = m;
        let bestClear = bestEdge;
        for (let off = 2; off <= 20; off += 2) {
          const cand = { x: m.x + nx * off, y: m.y + ny * off };
          if (!pointInPolygon(cand, poly)) continue;
          if (buildings.some((keep) => Math.hypot(keep.x - cand.x, keep.y - cand.y) < 52)) continue;
          const clear = islandClearance(cand, poly);
          if (clear > bestClear) { best = cand; bestClear = clear; }
          if (bestClear >= 7) break;
        }
        if (best !== m) {
          out.push({
            x: best.x, y: best.y,
            laneWidth: Math.max(0, Math.min(TROOP_LANE_SPACING, bestClear - TROOP_FOOT_RADIUS - 1)),
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
        if (runStart < 0) { runStart = s; runIsland = island; }
      } else flush(s - 1);
    }
    flush(steps - 1);
    out.push(b);
  }
  return out;
}

/** Keep every crossing straight on the bridge; turn around keeps only once on dry land. */
export function buildMarchPath(route: readonly Building[], surfaces: readonly IslandSurface[], buildings: readonly Building[] = route): Waypoint[] {
  if (!route.length) return [];
  const obstacles = buildings.filter((b) => b !== route[0] && b !== route[route.length - 1]);
  const circles = obstacles.map((building) => bypassFor(building, surfaces));
  const nodePoints: Waypoint[] = [{ x: route[0].x, y: route[0].y, laneWidth: TROOP_LANE_SPACING }];
  for (let i = 1; i < route.length - 1; i++) {
    const circle = bypassFor(route[i], surfaces);
    const entry = radial(circle, route[i - 1]);
    const exit = radial(circle, route[i + 1]);
    for (const p of arc(circle, entry, exit)) append(nodePoints, p);
  }
  const end = route[route.length - 1];
  append(nodePoints, { x: end.x, y: end.y, laneWidth: TROOP_LANE_SPACING });
  const result: Waypoint[] = [{ ...nodePoints[0] }];
  for (let i = 1; i < nodePoints.length; i++) {
    const a = nodePoints[i - 1], b = nodePoints[i];
    if (distance(a, b) < 15) append(result, b);
    else bypassCrossedKeeps(a, b, circles, result);
  }
  return shoreGuard(result, surfaces, buildings);
}