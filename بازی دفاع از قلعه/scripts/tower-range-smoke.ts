import assert from "node:assert/strict";
import { CFG, COL, type Owner } from "../src/game/config";
import { Game } from "../src/game/engine";
import { drawTowerRanges, towerCanTarget } from "../src/game/tower-range";

for (const owner of [0, 1, 2, 3, 4] as Owner[]) {
  const g = new Game(0);
  const tower = g.bs[1];
  tower.type = "tower";
  tower.o = owner;
  g.view.s = .5;
  g.hover = null;
  g.sels = [];
  const arcs: number[][] = [];
  const colors: unknown[] = [];
  const dashes: number[][] = [];
  const ctx = new Proxy<Record<string, unknown>>({
    arc: (...args: number[]) => arcs.push(args),
    setLineDash: (value: number[]) => dashes.push(value),
    createRadialGradient: () => ({ addColorStop: () => {} }),
  }, {
    get: (target, name: string) => name in target ? target[name] : () => {},
    set: (target, name: string, value) => { target[name] = value; if (name === "strokeStyle" || name === "fillStyle") colors.push(value); return true; },
  }) as unknown as CanvasRenderingContext2D;
  drawTowerRanges(ctx, g);
  // هالهٔ نورانی چند حلقه می‌کشد؛ دایرهٔ اصلیِ بُرد باید دقیقاً همان شعاعِ واقعی باشد.
  assert.ok(arcs.some((args) => args[0] === tower.x && args[1] === tower.y && args[2] === CFG.range),
    "The real 150-unit range circle is drawn without any selection or mouse hover");
  assert.ok(arcs.every((args) => args[2] <= CFG.range * 1.06 + .01), "Glow layers stay around the true range");
  if (owner === 0) assert.ok(dashes.some((dash) => dash.length > 0), "Neutral towers show an inactive dashed boundary");
  else assert.ok(colors.includes(COL[owner] + "ff"), "Owned range boundary glows in its faction color");

  const foe = owner === 1 ? 2 : 1;
  // برج خنثی هر لشکر رهگذر را هدف می‌گیرد؛ برج صاحب‌دار فقط دشمن را.
  assert.equal(towerCanTarget(tower, { x: tower.x + CFG.range - .01, y: tower.y, o: foe, hp: 1 }), true);
  assert.equal(towerCanTarget(tower, { x: tower.x + CFG.range + .01, y: tower.y, o: foe, hp: 1 }), false);
  assert.equal(towerCanTarget(tower, { x: tower.x, y: tower.y, o: owner, hp: 1 }), false);
  assert.equal(towerCanTarget(tower, { x: tower.x, y: tower.y, o: foe, hp: 0 }), false);
}

/* برجِ خنثی باید به لشکرِ عبوری شلیک کند و آسیب بزند */
{
  const g = new Game(0);
  const tower = g.bs[1];
  tower.type = "tower";
  tower.o = 0;
  tower.tr = 0;
  const target = g.bs[0];
  target.tr = 20;
  // لشکری از بازیکن ۱ بساز و در بردِ برج قرار بده
  const near = { x: tower.x + 60, y: tower.y };
  g.sq = [{
    o: 1, from: target, to: tower, route: [target, tower],
    waypoints: [near, { x: near.x + 1, y: near.y }],
    unit: "normal", hp: 6, n: 6, x: near.x, y: near.y, d: 0, len: 1,
    sp: 0, id: 1, ang: 0,
  } as never];
  const before = g.sq[0].hp;
  g.step(1.05);
  assert.ok(g.sq[0].hp < before, `neutral tower must damage passing squads (${before} → ${g.sq[0].hp})`);
}

/* سرعتِ چرخشِ نورها از تنظیمات خوانده می‌شود */
{
  const g = new Game(0);
  const tower = g.bs[1];
  tower.type = "tower";
  tower.o = 1;
  g.view.s = .5;
  const draw = (spin: number, time: number) => {
    g.haloSpin = spin;
    const arcs: number[][] = [];
    const ctx = new Proxy<Record<string, unknown>>({
      arc: (...args: number[]) => arcs.push(args),
      createRadialGradient: () => ({ addColorStop: () => {} }),
    }, {
      get: (target, name: string) => name in target ? target[name] : () => {},
      set: (target, name: string, value) => { target[name] = value; return true; },
    }) as unknown as CanvasRenderingContext2D;
    drawTowerRanges(ctx, g, time);
    // نخستین جرقهٔ چرخان: مرکزِ آرکِ کوچکِ درخشش
    return arcs.find((a) => a[2] < CFG.range - 1) ?? arcs[0];
  };
  const still = draw(0, 3.7);
  const fast = draw(2.4, 3.7);
  assert.notDeepEqual(still, fast, "halo spin setting changes the rotating lights' positions");
}
console.log("PASS: every tower shows its real 150-unit range without hover; neutral towers now defend themselves.");
