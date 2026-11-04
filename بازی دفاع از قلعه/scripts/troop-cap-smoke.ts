import assert from "node:assert/strict";
import { Game } from "../src/game/engine";
import { CFG, type BType, type Owner } from "../src/game/config";
import { setSound } from "../src/game/sound";

setSound(false);

function simulate(g: Game, seconds: number) {
  for (let i = 0; i < seconds * 60; i++) g.step(1 / 60);
}

function controlledGame() {
  const g = new Game(0);
  g.ai = () => {};
  g.setMaxTroops(50);
  return g;
}

// Each owned castle starts at 20 and advances every 5 seconds while it remains full.
for (const owner of [1, 2] as Owner[]) {
  for (const type of ["barracks", "tower", "speed", "heavy"] as BType[]) {
    const g = controlledGame();
    const b = g.bs.find((castle) => castle.o === owner)!;
    b.type = type;
    b.tr = 20;
    assert.equal(b.cap, 20);
    simulate(g, 5.1);
    assert.equal(b.cap, 30, `Owner ${owner}, ${type} advances from 20 to 30 after 5 seconds.`);
    assert.equal(b.tr, 20, "Automatic capacity growth doesn't grant troops instantly.");
    b.tr = 30;
    b.capTimer = 0;
    simulate(g, 5.1);
    assert.equal(b.cap, 40);
    b.tr = 40;
    b.capTimer = 0;
    simulate(g, 5.1);
    assert.equal(b.cap, 50);
    b.tr = 50;
    simulate(g, 120);
    assert.equal(b.tr, 50, "Production stops at the configured final limit.");
    assert.equal(b.cap, 50);
    console.log(`PASS: owner ${owner}, ${type}, capacity progresses 20 -> 30 -> 40 -> 50 automatically.`);
  }
}

// A capacity hold must be uninterrupted: dropping below the current tier resets its timer.
{
  const g = controlledGame();
  const castle = g.bs[0];
  castle.type = "barracks";
  castle.pt = 0;
  castle.tr = 20;
  simulate(g, 3);
  assert.ok(Math.abs(castle.capTimer - 3) < .01);
  castle.tr = 19;
  simulate(g, 1.1);
  assert.equal(castle.tr, 20, "Castles refill the lost troop");
  assert.ok(castle.capTimer < .1, "The timer restarts after a castle drops below cap.");
  simulate(g, 4.9);
  assert.equal(castle.cap, 20);
  simulate(g, .2);
  assert.equal(castle.cap, 30);
  console.log("PASS: the five-second capacity timer resets after the castle drops below its current cap.");
}

// The actual enemy AI's capacity progresses automatically while a strong neutral blocks attacks.
{
  const g = new Game(0);
  g.setMaxTroops(50);
  g.bs[1].tr = 1000;
  const enemy = g.bs[2];
  enemy.tr = 20;
  for (let i = 0; i < 65 * 60; i++) {
    g.step(1 / 60);
    assert.ok(enemy.tr <= 50, `AI produced ${enemy.tr} troops with a cap of 50`);
  }
  assert.equal(enemy.cap, 50, "The AI castle automatically reaches the configured capacity after filling each tier.");
  assert.equal(enemy.lvl, 4);
  assert.ok(enemy.tr >= 40 && enemy.tr <= 50);
  console.log("PASS: real enemy AI advances its castle capacity automatically through all tiers.");
}

// Changing the final limit preserves a lower tier and overflow troops decay only above the final limit.
{
  const g = controlledGame();
  for (const b of g.bs) {
    b.lvl = 3;
    b.cap = 100;
    if (b.o) b.tr = 60;
  }
  g.setMaxTroops(50);
  assert.ok(g.bs.every((b) => b.cap === (b.o === 0 ? CFG.neutralCap : 50)));
  assert.ok(g.bs.filter((b) => b.o).every((b) => b.tr === 60));
  simulate(g, 1);
  assert.ok(g.bs.filter((b) => b.o).every((b) => b.tr === 59));
  simulate(g, 9);
  assert.ok(g.bs.filter((b) => b.o).every((b) => b.tr === 50));
  simulate(g, 3);
  assert.ok(g.bs.filter((b) => b.o).every((b) => b.tr === 50));
  console.log("PASS: old 100-cap castles normalize to 50; overflow decays equally for both teams.");

  g.setMaxTroops(80);
  assert.ok(g.bs.every((b) => b.cap === (b.o === 0 ? CFG.neutralCap : 50)));
  simulate(g, 5.1);
  assert.ok(g.bs.filter((b) => b.o).every((b) => b.cap === 60));
  console.log("PASS: increasing the final cap preserves current tiers; a full 50-cap castle advances to 60 after 5 seconds.");
}

// Reinforcements may temporarily exceed 50, preserving the user's one-per-second overflow rule.
for (const owner of [1, 2] as Owner[]) {
  const g = controlledGame();
  const source = g.bs.find((b) => b.o === owner)!;
  const destination = g.bs[1];
  destination.o = owner;
  g.setMaxTroops(50);
  destination.lvl = 1;
  destination.cap = 20;
  destination.capTimer = 0;
  destination.tr = 40;
  source.tr = 20;
  assert.ok(g.sendN(source, destination, 20, g.findRoute(source, destination)));
  g.sq[0].d = g.sq[0].len;
  g.step(0);
  assert.equal(destination.tr, 60);
  assert.equal(destination.cap, 20);
  simulate(g, 1);
  assert.equal(destination.tr, 59);
  simulate(g, 9.2);
  assert.equal(destination.tr, 50);
  assert.equal(destination.cap, 40, "Holding the transferred troops advances two full capacity tiers in ten seconds.");
  console.log(`PASS: owner ${owner} reinforcements reach 60 temporarily and decay back to 50.`);
}

// Capturing an enemy castle starts the owned castle at its 20-capacity stage.
{
  const g = controlledGame();
  const from = g.bs[0];
  const to = g.bs[2];
  to.lvl = 4;
  to.cap = 100;
  to.tr = 1;
  from.tr = 50;
  assert.ok(g.sendN(from, to, 10, [from, to]));
  g.arrive(g.sq[0]);
  assert.equal(to.o, 1);
  assert.equal(to.lvl, 1);
  assert.equal(to.cap, 20);
  assert.equal(to.capTimer, 0);
  console.log("PASS: captures reset to the 20-capacity stage without inheriting prior capacity progress.");
}

console.log("All automatic-capacity regression tests passed.");