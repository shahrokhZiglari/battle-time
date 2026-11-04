import assert from "node:assert/strict";
import { CFG, LEVELS, type BType, type Owner } from "../src/game/config";
import { Game } from "../src/game/engine";
import { setSound } from "../src/game/sound";

setSound(false);

function controlledGame(level = 0) {
  const game = new Game(level);
  game.ai = () => {};
  return game;
}

function simulate(game: Game, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) game.step(1 / 60);
}

for (let i = 0; i < LEVELS.length; i++) {
  const game = controlledGame(i);
  for (const b of game.bs.filter((b) => b.o === 0)) {
    assert.equal(b.cap, 10);
    assert.ok(b.tr <= 10, "Neutral starting garrisons must respect their own cap");
  }
}
console.log("PASS: neutral starting garrisons and capacity are at most 10 in all five levels.");

for (const type of ["barracks", "tower", "speed", "heavy"] as BType[]) {
  const game = controlledGame();
  const neutral = game.bs[1];
  neutral.type = type;
  neutral.tr = 8;
  const rate = Math.max(1, CFG.spawn[type]);

  if (type === "tower") {
    simulate(game, 120);
    assert.equal(neutral.tr, 8, "Towers must never spawn troops");
    assert.equal(CFG.spawn.tower, 0);
  } else {
    game.step(rate / 2);
    assert.equal(neutral.tr, 8);
    game.step(rate / 2);
    assert.equal(neutral.tr, 9, "Neutral production follows the building's normal interval");
    game.step(rate);
    assert.equal(neutral.tr, 10);
    simulate(game, 120);
    assert.equal(neutral.tr, 10, "Neutral production must stop at 10");
  }
  assert.equal(neutral.o, 0);
  // برجِ خنثی حالا از خودش دفاع می‌کند (به لشکرِ رهگذر شلیک می‌کند) ولی سرباز تولید نمی‌کند.
  assert.ok(CFG.neutralShotDamage > 0, "Neutral towers defend themselves with a weaker shot");
  console.log(`PASS: neutral ${type} ${type === "tower" ? "never produces" : "grows from 8 to 9 to 10, then stops"}.`);
}

{
  const game = controlledGame();
  const neutral = game.bs[1];
  for (const cap of [1, 5, 30, 50, 80, 1000]) {
    game.setMaxTroops(cap);
    assert.equal(neutral.cap, 10);
    for (const b of game.bs.filter((b) => b.o !== 0)) assert.equal(b.cap, Math.min(CFG.capStart, cap));
  }
  console.log("PASS: changing team capacity never changes the independent neutral cap.");
}

{
  const game = controlledGame();
  const neutral = game.bs[1];
  const source = game.bs[0];
  assert.ok(game.sendN(source, neutral, 3, game.findRoute(source, neutral)));
  game.arrive(game.sq.shift()!);
  assert.equal(neutral.o, 0);
  assert.equal(neutral.tr, 5);
  simulate(game, 12);
  assert.equal(neutral.tr, 10);
  console.log("PASS: a neutral castle replenishes losses after a repelled attack up to 10.");
}

for (const owner of [1, 2] as Owner[]) {
  const game = controlledGame();
  game.setMaxTroops(50);
  const neutral = game.bs[1];
  const source = game.bs.find((b) => b.o === owner)!;
  source.tr = 50;
  assert.ok(game.sendN(source, neutral, 20, game.findRoute(source, neutral)));
  game.arrive(game.sq.shift()!);
  assert.equal(neutral.o, owner);
  assert.equal(neutral.cap, 20, "A newly captured castle starts at the first team capacity tier.");
  simulate(game, 120);
  assert.equal(neutral.tr, 50);
  assert.equal(neutral.cap, 50);
  console.log(`PASS: captured by team ${owner}, the castle switches from neutral cap 10 to configured cap 50.`);
}

{
  const game = controlledGame();
  const neutral = game.bs[1];
  const source = game.bs[0];
  neutral.type = "tower";
  neutral.tr = 0;
  assert.ok(game.sendN(source, game.bs[2], 5, [source, game.bs[2]]));
  const squad = game.sq[0];
  squad.d = squad.len / 2;
  squad.sp = 0;
  game.step(1.1);
  assert.ok(Math.hypot(squad.x - neutral.x, squad.y - neutral.y) < CFG.range);
  assert.equal(squad.n, 5);
  assert.equal(neutral.tt, 0);
  assert.equal(neutral.capTimer, 0, "Neutral towers don't use the team's automatic capacity progression.");
  console.log("PASS: neutral towers never produce troops; they now defend themselves with a weaker shot.");
}

console.log("All neutral growth regression tests passed.");