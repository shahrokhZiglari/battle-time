import assert from "node:assert/strict";
import { CFG, LEVELS, type BType } from "../src/game/config";
import { Game } from "../src/game/engine";
import { createRandomLevel, DEFAULT_RANDOM_MAP, validateRandomMap } from "../src/game/map";
import { setSound } from "../src/game/sound";

setSound(false);

assert.equal(LEVELS.length, 30, "Campaign mode contains the requested 30 levels.");
assert.ok(LEVELS[29].name.length > 0);
console.log("PASS: 30 campaign levels are available in addition to random-map mode.");

const request = { players: 3, normal: 5, fast: 2, heavy: 2, towers: 2, lakes: 2, ships: 2, boats: 3, largeMap: true, minDistance: 10 };
assert.equal(validateRandomMap(request), null);
const level = createRandomLevel(request);
assert.equal(level.name, "نقشهٔ رندوم");
assert.equal(level.b.length, 11);
assert.ok((level.worldWidth ?? 0) > CFG.W && (level.worldHeight ?? 0) > CFG.H);
assert.equal(level.largeMap, true);
assert.equal(level.b.filter((b) => b[3] === "barracks").length, 5);
assert.equal(level.b.filter((b) => b[3] === "speed").length, 2);
assert.equal(level.b.filter((b) => b[3] === "heavy").length, 2);
assert.equal(level.b.filter((b) => b[3] === "tower").length, 2);
for (const tower of level.b.filter((b) => b[3] === "tower")) {
  const centerDistance = Math.hypot((tower[0] - level.worldWidth! / 2) / level.worldWidth!, (tower[1] - level.worldHeight! / 2) / level.worldHeight!);
  assert.ok(centerDistance < .24, "The requested towers are placed in the central part of the map.");
}
for (const owner of [1, 2, 3]) {
  assert.equal(level.b.filter((b) => b[2] === owner).length, 1, `Player ${owner} gets exactly one starting castle`);
  assert.notEqual(level.b.find((b) => b[2] === owner)![3], "tower", "A tower isn't a starting castle");
}
assert.equal(level.b.filter((b) => b[2] === 0).length, 8);
for (let i = 0; i < level.b.length; i++) {
  for (let j = i + 1; j < level.b.length; j++) {
    const a = level.b[i], b = level.b[j];
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > 75, "Castle locations shouldn't overlap");
  }
}
console.log("PASS: requested 3-player map has exactly 5 normal, 2 fast, 2 heavy castles and 2 towers.");

// Every faction gets a real AI, and the aggregate victory rule recognizes the last AI.
{
  const g = new Game(LEVELS.length, false, level);
  assert.equal(g.i, LEVELS.length);
  assert.equal(g.aiT.length, 4);
  assert.equal(g.castles(1), 1);
  assert.equal(g.castles(2), 1);
  assert.equal(g.castles(3), 1);
  assert.equal(g.opponentCastles(), 2);
  assert.equal(g.links.length, g.bs.length - 1, "Large maps use a clean spanning road network rather than crossing shortcuts.");
  g.setMaxTroops(50);
  g.aiT[2] = 999;
  g.aiT[3] = 0;
  g.step(0.01);
  assert.ok(g.aiT[3] > 0, "Owner 3 AI timer is initialized when its turn runs");
  assert.ok(g.bs.some((b) => b.o === 3 && b.tr > 0));
  for (const b of g.bs) if (b.o === 3) b.o = 1;
  assert.equal(g.opponentCastles(), 1);
  for (const b of g.bs) if (b.o === 2) b.o = 1;
  assert.equal(g.opponentCastles(), 0);
  console.log("PASS: both opposing factions are represented and counted for a 3-player match.");
}

const invalid = [
  [{ ...request, players: 1 }, "player minimum"],
  [{ ...request, players: 4, normal: 3, fast: 0, heavy: 0 }, "one castle per player"],
  [{ ...request, normal: 50, fast: 1 }, "50 building maximum"],
  [{ ...request, heavy: -1 }, "non-negative counts"],
] as const;
for (const [value, reason] of invalid) assert.ok(validateRandomMap(value), `Reject invalid config: ${reason}`);
assert.deepEqual(DEFAULT_RANDOM_MAP, { players: 3, normal: 5, fast: 2, heavy: 2, towers: 2, lakes: 2, ships: 2, boats: 3, largeMap: true, minDistance: 10 });
console.log("PASS: invalid player/building counts are rejected and settings default to the requested example.");

{
  const small = createRandomLevel({ ...request, largeMap: false });
  assert.equal(small.worldWidth, CFG.W);
  assert.equal(small.worldHeight, CFG.H);
  assert.equal(small.largeMap, false);
  const zoomGame = new Game(LEVELS.length, false, level);
  assert.equal(zoomGame.zoom, 1);
  zoomGame.zoomBy(.3);
  assert.ok(zoomGame.zoom > 1);
  zoomGame.panBy(80, -45);
  assert.equal(zoomGame.panX, 80);
  assert.equal(zoomGame.panY, -45);
  zoomGame.zoomBy(0);
  assert.equal(zoomGame.zoom, 1);
  assert.equal(zoomGame.panX, 0);
  assert.equal(zoomGame.panY, 0);
  console.log("PASS: large-map mode expands the board, zooms, pans, and resets the camera; standard mode stays compact.");
}

for (const type of ["barracks", "speed", "heavy", "tower"] as BType[]) {
  const g = new Game(LEVELS.length, false, { ...level, b: [[250, 300, 1, type, 8], [750, 300, 2, type, 8]] });
  assert.equal(g.bs[0].type, type);
  assert.equal(g.bs[1].type, type);
}
console.log("PASS: custom-map generation supports all castle types and the single tower type.");