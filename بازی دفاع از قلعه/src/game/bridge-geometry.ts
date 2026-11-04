import type { Point } from "./scene-geometry";

export interface BridgeSpan {
  a: Point;
  b: Point;
}

export const BRIDGE_HALF_WIDTH = 15;
export const BRIDGE_APPROACH = BRIDGE_HALF_WIDTH * 2;
export const TROOP_LANE_SPACING = 6;
export const TROOP_FOOT_RADIUS = 3;

export function distanceToSegment(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}

export function onBridgeDeck(point: Point, span: BridgeSpan, inset = 0): boolean {
  const dx = span.b.x - span.a.x, dy = span.b.y - span.a.y;
  const length = Math.hypot(dx, dy);
  if (!length) return false;
  const along = ((point.x - span.a.x) * dx + (point.y - span.a.y) * dy) / length;
  const across = Math.abs((point.x - span.a.x) * dy - (point.y - span.a.y) * dx) / length;
  return along >= -BRIDGE_APPROACH + inset && along <= length + BRIDGE_APPROACH - inset
    && across <= BRIDGE_HALF_WIDTH - inset + 1e-7;
}

const EPSILON = 1e-7;
const cross = (ax: number, ay: number, bx: number, by: number) => ax * by - ay * bx;

export function pointInPolygon(point: Point, vertices: readonly Point[]): boolean {
  if (vertices.length < 3) return false;
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[j], b = vertices[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const px = point.x - a.x, py = point.y - a.y;
    if (dx * dx + dy * dy <= EPSILON) {
      if (px * px + py * py <= EPSILON) return true;
      continue;
    }
    if (Math.abs(cross(dx, dy, px, py)) <= EPSILON
        && px * dx + py * dy >= -EPSILON
        && px * dx + py * dy <= dx * dx + dy * dy + EPSILON) return true;
    if ((a.y > point.y) !== (b.y > point.y)
        && point.x < a.x + dx * (point.y - a.y) / dy) inside = !inside;
  }
  return inside;
}

/** Only the water portions of a connection are bridges, including gaps around intermediate islands. */
export function bridgeWaterSpans(a: Point, b: Point, shores: readonly (readonly Point[])[]): BridgeSpan[] {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= EPSILON) return [];
  const cuts = [0, 1];
  const add = (t: number) => {
    if (t >= -EPSILON && t <= 1 + EPSILON) cuts.push(Math.max(0, Math.min(1, t)));
  };
  for (const vertices of shores) {
    for (let i = 0; i < vertices.length; i++) {
      const p = vertices[i], q = vertices[(i + 1) % vertices.length];
      const ex = q.x - p.x, ey = q.y - p.y;
      const px = p.x - a.x, py = p.y - a.y;
      const denominator = cross(dx, dy, ex, ey);
      if (Math.abs(denominator) <= EPSILON) {
        if (Math.abs(cross(px, py, dx, dy)) <= EPSILON) {
          add((px * dx + py * dy) / lengthSquared);
          add(((q.x - a.x) * dx + (q.y - a.y) * dy) / lengthSquared);
        }
        continue;
      }
      const t = cross(px, py, ex, ey) / denominator;
      const u = cross(px, py, dx, dy) / denominator;
      if (u >= -EPSILON && u <= 1 + EPSILON) add(t);
    }
  }
  cuts.sort((x, y) => x - y);
  const unique = cuts.filter((t, i) => !i || t - cuts[i - 1] > EPSILON);
  const at = (t: number): Point => ({ x: a.x + dx * t, y: a.y + dy * t });
  const intervals: { from: number; to: number }[] = [];
  for (let i = 1; i < unique.length; i++) {
    const from = unique[i - 1], to = unique[i];
    if (shores.some((vertices) => pointInPolygon(at((from + to) / 2), vertices))) continue;
    const last = intervals[intervals.length - 1];
    if (last && Math.abs(last.to - from) <= EPSILON) last.to = to;
    else intervals.push({ from, to });
  }
  return intervals.map(({ from, to }) => ({ a: at(from), b: at(to) }));
}