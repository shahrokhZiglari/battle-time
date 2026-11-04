import assert from "node:assert/strict";
import { CFG, type BType, type Owner, TROOP_TYPES, UNITS } from "../src/game/config";
import { Game } from "../src/game/engine";
import { addUnit, armyCount, armyPower, createArmy, emptyArmy, producedUnit, selectArmy, takeArmy, unitCount } from "../src/game/troops";
import { setSound } from "../src/game/sound";

setSound(false);
const near = (actual: number, expected: number) => assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} != ${expected}`);

function game() {
  const g = new Game(0);
  g.ai = () => {};
  return g;
}

for (const type of ["barracks", "speed", "heavy", "tower"] as BType[]) {
  const g = game();
  const source = g.bs[0];
  source.type = type;
  source.tr = 0;
  g.step(CFG.spawn[type]);
  const unit = producedUnit(type);
  if (type === "tower") assert.equal(source.tr, 0, "Towers must not spawn");
  else assert.equal(source.tr, 1);
  near(source.army[unit], type === "tower" ? 0 : UNITS[unit].power);
  if (type !== "tower") {
    assert.ok(g.sendN(source, g.bs[1], 1));
    const squad = g.sq[0];
    assert.equal(squad.unit, unit);
    near(squad.sp, CFG.speed * UNITS[unit].speed);
    near(squad.hp, UNITS[unit].power);
  }
  console.log(`PASS: ${type} produces ${unit} with exact configured power and movement speed.`);
}
assert.equal(UNITS.fast.power, UNITS.normal.power);
assert.equal(UNITS.fast.speed / UNITS.normal.speed, 1.5);
assert.equal(UNITS.heavy.power / UNITS.normal.power, 2);
near(UNITS.heavy.speed / UNITS.normal.speed, 2 / 3);

// Actual movement distance, not merely a configuration value.
{
  const distances: Record<string, number> = {};
  for (const unit of TROOP_TYPES) {
    const g = game();
    const source = g.bs[0];
    source.army = createArmy(unit, 5);
    g.sendN(source, g.bs[2], 5, [source, g.bs[2]]);
    g.step(.5);
    distances[unit] = g.sq[0].d;
  }
  near(distances.fast, distances.normal * 1.5);
  near(distances.heavy, distances.normal * 2 / 3);
  console.log("PASS: fast travels 1.5x as far and heavy travels two-thirds as far in equal game time.");
}

// Passing through a differently typed castle cannot transform reinforcements.
for (const unit of TROOP_TYPES) {
  const g = game();
  const source = g.bs[0];
  const destination = g.bs[1];
  const target = g.bs[2];
  destination.o = 1;
  destination.type = unit === "heavy" ? "speed" : "heavy";
  destination.tr = 0;
  source.army = createArmy(unit, 8);
  g.sendN(source, destination, 8);
  const arriving = g.sq.shift()!;
  g.arrive(arriving);
  assert.equal(destination.tr, 8);
  assert.equal(unitCount(destination.army[unit], unit), 8);
  g.sendN(destination, target, 8, [destination, target]);
  assert.equal(g.sq.length, 1);
  assert.equal(g.sq[0].unit, unit);
  near(g.sq[0].sp, CFG.speed * UNITS[unit].speed);
  near(g.sq[0].hp, 8 * UNITS[unit].power);
}
console.log("PASS: every troop type retains its power and speed after friendly transfer and re-dispatch.");

{
  const g = game();
  const source = g.bs[0], destination = g.bs[1];
  source.army = createArmy("fast", 20);
  destination.type = "heavy";
  destination.tr = 3;
  g.sendN(source, destination, 20);
  g.arrive(g.sq.shift()!);
  assert.equal(destination.o, 1);
  assert.equal(destination.army.fast, 14);
  assert.equal(destination.army.heavy, 0);
  g.step(CFG.spawn.heavy);
  assert.equal(destination.army.fast, 14);
  assert.equal(destination.army.heavy, 2);
  assert.equal(destination.tr, 15);
  g.sendN(destination, g.bs[2], 15, [destination, g.bs[2]]);
  assert.equal(g.sq.length, 2);
  near(g.sq.find((s) => s.unit === "fast")!.sp, CFG.speed * 1.5);
  near(g.sq.find((s) => s.unit === "heavy")!.sp, CFG.speed * 2 / 3);
  console.log("PASS: capture survivors keep their type while the new castle produces its own troop type.");
}

{
  const g = game();
  const source = g.bs[0];
  source.army = emptyArmy();
  for (const unit of TROOP_TYPES) addUnit(source.army, unit, 10);
  g.pct = 50;
  assert.equal(g.amountOf(source), 15);
  assert.equal(g.dispatchPower(source), 20);
  g.sendN(source, g.bs[1], g.amountOf(source));
  assert.equal(g.sq.length, 3);
  assert.equal(source.tr, 15);
  assert.equal(g.sq.reduce((n, s) => n + s.n, 0), 15);
  assert.equal(g.sq.reduce((n, s) => n + s.hp, 0), 20);
  for (const unit of TROOP_TYPES) assert.equal(g.sq.find((s) => s.unit === unit)!.n, 5);
  console.log("PASS: a mixed garrison dispatches proportional groups with independent movement speeds.");
}

// A heavy attacker has twice the battle power against a normal garrison.
for (const owner of [1, 2] as Owner[]) {
  const g = game();
  const source = g.bs.find((b) => b.o === owner)!;
  const destination = g.bs.find((b) => b.o !== owner && b.o !== 0)!;
  source.army = createArmy("heavy", 6);
  destination.army = createArmy("normal", 10);
  g.sendN(source, destination, 6, [source, destination]);
  g.arrive(g.sq.shift()!);
  assert.equal(destination.o, owner);
  assert.equal(destination.tr, 1);
  assert.equal(destination.army.heavy, 2);
  assert.equal(destination.army.normal, 0);
}
console.log("PASS: six heavy soldiers defeat ten normal defenders, leaving one heavy survivor for either team.");

{
  const g = game();
  const source = g.bs[0], destination = g.bs[2];
  source.army = createArmy("normal", 5);
  destination.army = createArmy("heavy", 5);
  g.sendN(source, destination, 5, [source, destination]);
  g.arrive(g.sq.shift()!);
  assert.equal(destination.o, 2);
  assert.equal(destination.tr, 3);
  near(destination.army.heavy, 5);
  g.sendN(destination, source, 3, [destination, source]);
  assert.equal(g.sq[0].unit, "heavy");
  assert.equal(g.sq[0].n, 3);
  near(g.sq[0].hp, 5);
  console.log("PASS: heavy defenders use double power, and partial damage survives re-dispatch without healing.");
}

// Count and strength must be distinct in the attack preview.
{
  const g = game();
  const source = g.bs[0];
  source.army = createArmy("heavy", 12);
  const target = g.bs[1];
  target.tr = 10;
  g.pct = 50;
  g.sels = [source];
  g.hover = target;
  const preview = g.computePreview()!;
  assert.equal(preview.total, 6);
  assert.equal(preview.power, 12);
  assert.equal(preview.need, 10);
  assert.equal(preview.ok, true);
  console.log("PASS: attack preview compares six heavy soldiers' power of 12 against defence of 10.");
}

function fieldBattle(fieldCombat: boolean) {
  const g = game();
  g.fieldCombat = fieldCombat;
  const left = g.bs[0], right = g.bs[2];
  left.army = createArmy("heavy", 6);
  right.army = createArmy("normal", 10);
  g.sendN(left, right, 6, [left, right]);
  g.sendN(right, left, 10, [right, left]);
  for (const s of g.sq) { s.d = s.len / 2; s.sp = 0; }
  g.step(.001);
  return g;
}
{
  const g = fieldBattle(true);
  assert.equal(g.sq.length, 1);
  assert.equal(g.sq[0].unit, "heavy");
  assert.equal(g.sq[0].n, 1);
  assert.equal(g.sq[0].hp, 2);
  const noField = fieldBattle(false);
  assert.equal(noField.sq.length, 2);
  assert.equal(noField.sq.find((s) => s.unit === "heavy")!.n, 6);
  console.log("PASS: heavy power applies in field combat, and disabling field combat still works.");
}

{
  const g = game();
  const neutral = g.bs[1];
  neutral.o = 2;
  neutral.type = "tower";
  neutral.tr = 0;
  const source = g.bs[0];
  source.army = createArmy("heavy", 1);
  g.sendN(source, g.bs[2], 1, [source, g.bs[2]]);
  const squad = g.sq[0];
  squad.d = squad.len / 2;
  squad.sp = 0;
  squad.x = neutral.x;
  squad.y = neutral.y;
  g.step(1);
  assert.equal(squad.hp, 1);
  assert.equal(squad.n, 1);
  g.step(1);
  assert.equal(squad.hp, 0);
  assert.equal(g.sq.length, 0);
  console.log("PASS: a healthy heavy soldier requires two one-point tower shots.");
}

{
  const g = game();
  const castle = g.bs[0];
  castle.type = "heavy";
  castle.tr = 50;
  assert.equal(castle.tr, 50);
  assert.equal(g.count(1), 50);
  assert.equal(g.power(1), 100);
  g.step(30);
  assert.equal(castle.tr, 50);
  assert.equal(g.power(1), 100);
  addUnit(castle.army, "heavy", 10);
  assert.equal(castle.tr, 60);
  g.step(1);
  assert.equal(castle.tr, 59);
  assert.equal(castle.army.heavy, 118);
  console.log("PASS: 50 heavy soldiers have power 100 but still respect a 50-person cap; overflow removes one person.");
}

// Exhaustive small mixed armies, including wounded troops: no duplication or type conversion.
for (let normal = 0; normal <= 4; normal++) {
  for (let fast = 0; fast <= 4; fast++) {
    for (let heavy = 0; heavy <= 4; heavy++) {
      const roster = { normal: normal ? normal - .25 : 0, fast, heavy: heavy ? heavy * 2 - .5 : 0 };
      const total = armyCount(roster);
      for (let n = 0; n <= total; n++) {
        const army = { ...roster };
        const selected = selectArmy(army, n);
        const taken = takeArmy(army, n);
        assert.equal(armyCount(selected), n);
        assert.equal(armyCount(taken), n);
        assert.equal(armyCount(army), total - n);
        near(armyPower(army) + armyPower(taken), armyPower(roster));
        for (const type of TROOP_TYPES) {
          assert.ok(army[type] >= 0 && taken[type] >= 0);
          near(army[type] + taken[type], roster[type]);
        }
      }
    }
  }
}
console.log("PASS: proportional dispatch preserves headcount, damage and troop identity across all mixed-roster cases.");
console.log("All troop-type regression tests passed.");