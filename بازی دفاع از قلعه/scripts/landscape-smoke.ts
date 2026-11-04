import assert from "node:assert/strict";
import { Game } from "../src/game/engine";
import { LEVELS } from "../src/game/config";
import { landscapeFor } from "../src/game/terrain";
import { render } from "../src/game/render";
import { troopPosition } from "../src/game/structures";
import { createRandomLevel, DEFAULT_RANDOM_MAP } from "../src/game/map";
import { setSound } from "../src/game/sound";

setSound(false);

for (let index = 0; index < LEVELS.length; index++) {
  const g = new Game(index);
  const scene = landscapeFor(g);
  assert.equal(scene.islands.length, g.bs.length);
  for (const island of scene.islands) {
    assert.ok(island.points.length >= 3, `Level ${index + 1} has a valid platform polygon`);
    assert.ok(island.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
    assert.ok(island.depth >= 15 && island.depth <= 70, `Level ${index + 1} island height is in the varied range`);
  }
  assert.equal(landscapeFor(g), scene, "Static geometry is cached rather than rebuilt every frame");
  g.bs[0].o = 2;
  assert.equal(landscapeFor(g), scene, "Capturing a castle never changes the terrain geometry");
  g.build();
  assert.notEqual(landscapeFor(g), scene, "Restarting a game invalidates its old geometry cache");
}
console.log("PASS: every campaign stage has valid, cached low-poly islands.");

for (const players of [2, 3, 4]) {
  const request = { ...DEFAULT_RANDOM_MAP, players };
  const g = new Game(LEVELS.length, false, createRandomLevel(request));
  const scene = landscapeFor(g);
  const expected = request.normal + request.fast + request.heavy + request.towers;
  assert.equal(scene.islands.length, expected);
  assert.equal(g.bs.length, expected);
  for (const prop of scene.scenery) {
    assert.ok(Number.isFinite(prop.x) && Number.isFinite(prop.y));
    assert.ok(prop.scale > 0);
  }
}
console.log("PASS: random maps support all factions and preserve the exact requested counts.");

let drawnTroops = 0;
const gradient = { addColorStop() {} };
const ctx = new Proxy<Record<string, unknown>>({
  measureText: () => ({ width: 35 }),
  createLinearGradient: () => gradient,
  createRadialGradient: () => gradient,
}, {
  get: (target, key: string) => key in target ? target[key] : () => {},
  set: (target, key: string, value) => {
    if (key === "strokeStyle" && value === "#a3afa1") drawnTroops++;
    target[key] = value;
    return true;
  },
}) as unknown as CanvasRenderingContext2D;

for (const count of [1, 10, 25, 50]) {
  const g = new Game(0);
  g.bs[0].tr = count;
  g.sendN(g.bs[0], g.bs[2], count, [g.bs[0], g.bs[1], g.bs[2]]);
  const squad = g.sq[0];
  squad.d = 200;
  const previousTroops = g.count(1);
  drawnTroops = 0;
  render(ctx, g, 1, 1440, 960, 2);
  assert.equal(drawnTroops, count, `Dispatch ${count} renders ${count} individual soldiers`);
  assert.equal(g.count(1), previousTroops, "Rendering cannot alter combat state");
  const a = g.bs[0];
  const screenX = a.x * g.view.s + g.view.ox;
  const screenY = a.y * g.view.s + g.view.oy;
  assert.equal(g.buildingAt((screenX - g.view.ox) / g.view.s, (screenY - g.view.oy) / g.view.s)?.id, a.id);
  assert.equal(g.buildingAt(a.x, a.y - 65)?.id, a.id, "The tall visible part of a keep is also clickable");
}
console.log("PASS: full troop counts render individually; terrain does not move gameplay hit targets.");

{
  const g = new Game(0);
  g.bs[0].tr = 10;
  g.bs[1].x = g.bs[0].x;
  g.bs[1].y = g.bs[0].y + 100;
  g.bs[2].x = g.bs[0].x + 100;
  g.bs[2].y = g.bs[0].y + 100;
  g.sendN(g.bs[0], g.bs[2], 10, [g.bs[0], g.bs[1], g.bs[2]]);
  const s = g.sq[0];
  const node = g.bs[1];
  let minDist = Infinity;
  for (let d = 0; d <= s.len; d += 4) {
    s.d = d;
    const p = troopPosition(s, 0, 10);
    minDist = Math.min(minDist, Math.hypot(p.x - node.x, p.y - node.y));
  }
  // The troops must pass beside the intermediate castle, never through its centre.
  assert.ok(minDist > 40, `troops cut through the castle centre (closest ${minDist.toFixed(1)}px)`);
}
console.log("PASS: marching troops bend around an intermediate castle instead of cutting through its centre.");

{
  const g = new Game(LEVELS.length, false, createRandomLevel(DEFAULT_RANDOM_MAP));
  g.zoomBy(.5);
  g.panBy(45, -30);
  render(ctx, g, 1, 1440, 960, 2);
  const b = g.bs[0];
  const sx = b.x * g.view.s + g.view.ox, sy = b.y * g.view.s + g.view.oy;
  assert.equal(g.buildingAt((sx - g.view.ox) / g.view.s, (sy - g.view.oy) / g.view.s)?.id, b.id);
}
console.log("PASS: camera zoom and pan retain exact inverse pointer coordinates in the dimensional map.");