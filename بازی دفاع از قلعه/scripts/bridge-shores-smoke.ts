import assert from "node:assert/strict";
import { bridgeWaterSpans, pointInPolygon } from "../src/game/bridge-geometry";
import type { Point } from "../src/game/scene-geometry";
import { Game } from "../src/game/engine";
import { LEVELS, UNITS } from "../src/game/config";
import { landscapeFor } from "../src/game/terrain";
import { createRandomLevel, DEFAULT_RANDOM_MAP } from "../src/game/map";

const rectangle = (x0: number, y0: number, x1: number, y1: number): Point[] => [
  { x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 },
];
const start = { x: 0, y: 0 }, finish = { x: 100, y: 0 };
const left = rectangle(-20, -25, 20, 25);
const right = rectangle(80, -25, 120, 25);
assert.deepEqual(bridgeWaterSpans(start, finish, [left, right]), [
  { a: { x: 20, y: 0 }, b: { x: 80, y: 0 } },
]);
assert.deepEqual(bridgeWaterSpans(finish, start, [left, right]), [
  { a: { x: 80, y: 0 }, b: { x: 20, y: 0 } },
]);
console.log("PASS: a bridge runs from shoreline to shoreline, never from castle center to center.");

const middle = rectangle(40, -10, 60, 10);
assert.deepEqual(bridgeWaterSpans(start, finish, [left, middle, right]), [
  { a: { x: 20, y: 0 }, b: { x: 40, y: 0 } },
  { a: { x: 60, y: 0 }, b: { x: 80, y: 0 } },
]);
assert.deepEqual(bridgeWaterSpans(start, { x: 10, y: 5 }, [left]), []);
assert.deepEqual(bridgeWaterSpans(start, start, [left]), []);
console.log("PASS: a link crossing a third island is split, leaving that island's grass untouched.");

const diamond = [{ x: 0, y: -30 }, { x: 30, y: 0 }, { x: 0, y: 30 }, { x: -30, y: 0 }];
assert.deepEqual(bridgeWaterSpans(start, { x: 100, y: 100 }, [diamond]), [
  { a: { x: 15, y: 15 }, b: { x: 100, y: 100 } },
]);
assert.deepEqual(bridgeWaterSpans({ x: 0, y: 0 }, { x: 0, y: 100 }, [diamond]), [
  { a: { x: 0, y: 30 }, b: { x: 0, y: 100 } },
]);
assert.deepEqual(bridgeWaterSpans(start, finish, [rectangle(-10, -20, 50, 20), rectangle(40, -20, 70, 20)]), [
  { a: { x: 70, y: 0 }, b: { x: 100, y: 0 } },
]);
assert.deepEqual(bridgeWaterSpans(start, finish, [[left[0], left[0], ...left.slice(1)], right]), [
  { a: { x: 20, y: 0 }, b: { x: 80, y: 0 } },
]);
console.log("PASS: diagonal, vertical, overlapping and repeated-vertex shorelines are handled.");

function verify(g: Game) {
  const scene = landscapeFor(g);
  const before = JSON.stringify(g.links);
  for (const span of scene.bridges) {
    const length = Math.hypot(span.b.x - span.a.x, span.b.y - span.a.y);
    assert.ok(length > 0 && Number.isFinite(length));
    for (let sample = 1; sample < 24; sample++) {
      const fraction = sample / 24;
      const point = { x: span.a.x + (span.b.x - span.a.x) * fraction, y: span.a.y + (span.b.y - span.a.y) * fraction };
      assert.ok(!scene.islands.some((island) => pointInPolygon(point, island.points)), "A bridge span must not pass over any island's ground");
    }
  }
  assert.equal(JSON.stringify(g.links), before, "Shore trimming must not alter route connectivity");
  assert.equal(landscapeFor(g), scene, "Shoreline geometry is cached");
}

for (let index = 0; index < LEVELS.length; index++) verify(new Game(index));
for (const players of [2, 3, 4]) {
  for (let i = 0; i < 8; i++) {
    verify(new Game(LEVELS.length, false, createRandomLevel({ ...DEFAULT_RANDOM_MAP, players })));
    verify(new Game(LEVELS.length, false, createRandomLevel({ ...DEFAULT_RANDOM_MAP, players, normal: 30, fast: 5, heavy: 2, towers: 3 })));
  }
}
assert.equal(UNITS.fast.speed, 1.5, "The previous fast-soldier speed setting is preserved");
console.log("PASS: bridge spans stay off grass across all 30 campaign stages and 48 random maps.");