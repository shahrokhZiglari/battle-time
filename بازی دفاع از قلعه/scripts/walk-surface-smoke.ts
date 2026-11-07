import assert from "node:assert/strict";
import { Game } from "../src/game/engine";
import { CFG, LEVELS, UNITS, type Level, type Point } from "../src/game/config";
import { createRandomLevel, DEFAULT_RANDOM_MAP } from "../src/game/map";
import { landscapeFor } from "../src/game/terrain";
import { onBridgeDeck, pointInPolygon, TROOP_FOOT_RADIUS } from "../src/game/bridge-geometry";
import { buildMarchPath, pathLength, samplePath } from "../src/game/navigation";
import { troopPosition } from "../src/game/structures";
import { setSound } from "../src/game/sound";

setSound(false);
let pointsChecked = 0;

function supported(g: Game, point: Point) {
  const scene = landscapeFor(g);
  return scene.islands.some((island) => pointInPolygon(point, island.points))
    || scene.bridges.some((span) => onBridgeDeck(point, span));
}

function checkRoute(g: Game, route: Game["bs"], count = 10) {
  const source = route[0], target = route[route.length - 1];
  source.tr = count;
  assert.ok(g.sendN(source, target, count, route));
  const s = g.sq.pop()!;
  const initialLinks = JSON.stringify(g.links);
  for (let d = 0; d <= s.len; d += 5) {
    s.d = d;
    const center = samplePath(s.waypoints, d);
    assert.ok(supported(g, center), `Squad center over water at (${center.x}, ${center.y})`);
    for (let i = 0; i < s.n; i++) {
      const p = troopPosition(s, i, s.n);
      for (const [dx, dy] of [[0, 0], [TROOP_FOOT_RADIUS, 0], [-TROOP_FOOT_RADIUS, 0], [0, TROOP_FOOT_RADIUS], [0, -TROOP_FOOT_RADIUS]]) {
        const foot = { x: p.x + dx, y: p.y + dy };
        assert.ok(supported(g, foot), `Soldier ${i} leaves ground/deck at (${foot.x.toFixed(1)}, ${foot.y.toFixed(1)}), d=${d}, route=${route.map((b) => b.id)}`);
        pointsChecked++;
      }
    }
  }
  assert.equal(JSON.stringify(g.links), initialLinks, "Navigation must not create extra bridges or draw on grass");
  const end = samplePath(s.waypoints, s.len);
  assert.ok(Math.hypot(end.x - target.x, end.y - target.y) < 1e-6);
}

const scenarios = [
  [[150, 300], [500, 300], [850, 300]],
  [[150, 150], [650, 150], [650, 480]],
  [[200, 480], [500, 130], [800, 450]],
  [[150, 300], [150, 400], [250, 400]],
  [[180, 350], [500, 180], [800, 400], [680, 530]],
];

for (const positions of scenarios) {
  const level: Level = { name: "path test", hint: "", ai: 0,
    b: positions.map(([x, y], index) => [x, y, index === 0 ? 1 : index === positions.length - 1 ? 2 : 0, "barracks", 10]) };
  const g = new Game(0, false, level);
  g.links = positions.slice(1).map((_, i) => [i, i + 1]);
  checkRoute(g, g.bs, 30);
  checkRoute(g, [...g.bs].reverse(), 30);
  assert.ok(buildMarchPath(g.bs, landscapeFor(g).islands, g.bs).length > g.bs.length);
}
console.log("PASS: straight, right-angle, diagonal, narrow-bank and multiple-bend routes stay on the actual deck or dry land.");

// A straight link across a third island also skirts its keep without leaving either bridge.
{
  const g = new Game(0);
  g.links = [[0, 2]];
  checkRoute(g, [g.bs[0], g.bs[2]]);
  const path = buildMarchPath([g.bs[0], g.bs[2]], landscapeFor(g).islands, g.bs);
  for (let d = 0; d < pathLength(path); d += 4) {
    const p = samplePath(path, d);
    assert.ok(Math.hypot(p.x - g.bs[1].x, p.y - g.bs[1].y) > 50);
  }
}
console.log("PASS: a long bridge connection crossing an intermediate island goes around its castle on land.");

for (let index = 0; index < LEVELS.length; index++) {
  const g = new Game(index);
  g.openRoads = true;
  const source = g.bs.find((b) => b.o === 1)!;
  for (const target of g.bs.filter((b) => b !== source)) {
    const route = g.findRoute(source, target);
    assert.ok(route);
    checkRoute(g, route, 3);
  }
}
console.log("PASS: every reachable destination in all 30 campaign stages has a supported marching path.");

for (let seed = 1; seed <= 10; seed++) {
  let state = seed;
  const originalRandom = Math.random;
  let level: Level;
  try {
    Math.random = () => ((state = Math.imul(state, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    level = createRandomLevel({ ...DEFAULT_RANDOM_MAP, normal: 30, fast: 5, heavy: 2, towers: 3, players: 4 });
  } finally { Math.random = originalRandom; }
  const g = new Game(LEVELS.length, false, level!);
  if (seed % 2 === 0) {
    g.roadRandom = () => ((state = Math.imul(state, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    g.setRoadRules({ randomRoads: true });
  }
  g.openRoads = true;
  const source = g.bs[0];
  for (const target of g.bs.filter((b) => b !== source)) {
    const route = g.findRoute(source, target)!;
    assert.ok(route);
    checkRoute(g, route, 3);
  }
}
console.log(`PASS: ten dense, seeded random maps checked against rendered terrain; ${pointsChecked} foot-contact samples are supported.`);

// Previously movement compared the waypoint index to route.length and froze at a turn.
{
  const g = new Game(0);
  g.ai = () => {};
  g.bs[0].tr = 10;
  g.sendN(g.bs[0], g.bs[2], 10, g.findRoute(g.bs[0], g.bs[2]));
  const s = g.sq[0];
  assert.ok(s.waypoints.length > s.route.length + 2);
  for (let i = 0; i < 300; i++) {
    g.step(1 / 60);
    const expected = samplePath(s.waypoints, s.d);
    assert.ok(Math.hypot(s.x - expected.x, s.y - expected.y) < 1e-6);
  }
  assert.ok(s.x > g.bs[1].x, "Movement continues beyond the intermediate castle");
}
assert.equal(UNITS.fast.speed, 1.3);
assert.equal(CFG.range, 150);
console.log("PASS: simulation and visible soldiers use one sampler, including all detour points; existing speeds and range are unchanged.");