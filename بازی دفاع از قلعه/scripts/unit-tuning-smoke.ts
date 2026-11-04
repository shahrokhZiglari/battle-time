import assert from "node:assert/strict";
import {
  applyUnitTuning,
  CFG,
  DEFAULT_UNIT_TUNING,
  normalizeHaloSpin,
  normalizeUnitTuning,
  UNITS,
  UNIT_LIMITS,
} from "../src/game/config";
import { Game } from "../src/game/engine";

/* ۱) مقادیر نامعتبر به پیش‌فرض برمی‌گردند و خارج از بازه محدود می‌شوند */
{
  const fixed = normalizeUnitTuning({
    normal: { power: 99, speed: -5 },
    fast: { power: Number.NaN, speed: 1.25 },
    heavy: { power: 3.5, speed: 1.8 },
  });
  assert.equal(fixed.normal.power, UNIT_LIMITS.power[1], "too-large power is clamped to the maximum");
  assert.equal(fixed.normal.speed, UNIT_LIMITS.speed[0], "too-small speed is clamped to the minimum");
  assert.equal(fixed.fast.power, DEFAULT_UNIT_TUNING.fast.power, "NaN falls back to the default");
  assert.equal(fixed.fast.speed, 1.25);
  assert.equal(fixed.heavy.power, 3.5);
  assert.equal(fixed.heavy.speed, 1.8);
  assert.deepEqual(normalizeUnitTuning(null), DEFAULT_UNIT_TUNING, "empty settings keep the defaults");
}

/* ۲) اعمال تنظیمات روی جدولِ زندهٔ UNITS و روی سرعتِ لشکر اثر می‌گذارد */
{
  const g = new Game(0);
  g.bs[0].o = 1;
  g.bs[0].tr = 40;
  g.bs[1].o = 2;
  g.bs[1].tr = 40;
  g.pct = 100;
  applyUnitTuning({ heavy: { power: 4, speed: 2.5 } });
  assert.equal(UNITS.heavy.power, 4);
  assert.equal(UNITS.heavy.speed, 2.5);
  const route = g.findRoute(g.bs[0], g.bs[1])!;
  assert.ok(route, "a route exists for the tuning test");
  g.bs[0].army = { normal: 0, fast: 0, heavy: 8 };
  g.sendN(g.bs[0], g.bs[1], 4, route);
  const squad = g.sq.find((s) => s.unit === "heavy")!;
  assert.ok(squad, "heavy squad was dispatched");
  assert.equal(squad.sp, CFG.speed * 2.5, "march speed follows the tuned value");
  // قدرتِ هر سرباز سنگین حالا ۴ است: ۸ نیرو = دو سرباز
  assert.equal(Math.round(squad.hp), 8);
}

/* ۳) بازگرداندن به پیش‌فرض */
{
  applyUnitTuning(DEFAULT_UNIT_TUNING);
  assert.equal(UNITS.heavy.power, 2);
  assert.equal(UNITS.heavy.speed, Math.round((2 / 3) * 100) / 100);
  assert.equal(UNITS.normal.power, 1);
}

/* ۴) سرعتِ چرخشِ نورها */
{
  assert.equal(normalizeHaloSpin(undefined), 1.35);
  assert.equal(normalizeHaloSpin(0), 0, "zero freezes the lights");
  assert.equal(normalizeHaloSpin(9), 3, "spin is capped at 3");
  assert.equal(normalizeHaloSpin(-2), 0);
  const g = new Game(0);
  assert.equal(g.haloSpin, 1.35, "the game starts with the default spin");
}

console.log("PASS: troop power/speed and halo spin are configurable, clamped and applied to the live game.");
