/* آزمون: در شروع مپ رندوم، قلعه‌های چپ‌ترین و راست‌ترین باید بتوانند با هم بجنگند
   یعنی نیروها بتوانند از کنار قلعه‌های دشمن/خنثی بگذرند. */
import assert from "node:assert/strict";
import { Game } from "../src/game/engine";
import { LEVELS } from "../src/game/config";
import { createRandomLevel, DEFAULT_RANDOM_MAP } from "../src/game/map";
import { setSound } from "../src/game/sound";

setSound(false);

function leftmostRightmost(g: Game) {
  let left = g.bs[0], right = g.bs[0];
  for (const b of g.bs) {
    if (b.x < left.x) left = b;
    if (b.x > right.x) right = b;
  }
  return { left, right };
}

// 1) در مپ رندومِ سه‌نفره (پیش‌فرض)، شروع نبرد باید چپ‌ترین و راست‌ترین را به هم وصل کند.
{
  for (let seed = 0; seed < 20; seed++) {
    const g = new Game(LEVELS.length, false, createRandomLevel(DEFAULT_RANDOM_MAP));
    const { left, right } = leftmostRightmost(g);
    const route = g.findRoute(left, right);
    assert.ok(route !== null, `seed ${seed}: no route from leftmost to rightmost at game start`);
    // و بازگشت هم باید برقرار باشد (نبرد دوطرفه)
    assert.ok(g.findRoute(right, left) !== null, `seed ${seed}: return path missing`);
  }
  console.log("PASS: at random-game start the leftmost and rightmost castles can attack each other.");
}

// 2) حتی اگر قلعه‌های میانی مال دشمن باشند، مسیر باید باز بماند.
{
  const g = new Game(LEVELS.length, false, createRandomLevel(DEFAULT_RANDOM_MAP));
  const { left, right } = leftmostRightmost(g);
  // تمام قلعه‌های میانی را دشمن می‌کنیم تا هیچ زنجیره‌ای از قلعه‌های دوست باقی نماند
  for (const b of g.bs) if (b !== left && b !== right && b.o === 1) b.o = 2;
  assert.ok(g.findRoute(left, right) !== null, "crossing hostile castles must still be possible");
  console.log("PASS: a path can run past enemy castles without owning them.");
}

// 3) رفتار پیش‌فرض قابل تغییر است: با openRoads = false دیگر چنین مسیری مجاز نیست.
//    نکته: قلعه‌های خنثی (مالک ۰) طبق قواعد بازی قابل عبورند، پس برای آزمونِ
//    «قانونِ سخت‌گیرانه» باید همهٔ قلعه‌های میانی دشمن شوند، نه فقط قلعه‌های خودی.
{
  let checked = 0;
  for (let seed = 0; seed < 12; seed++) {
    const g = new Game(LEVELS.length, false, createRandomLevel(DEFAULT_RANDOM_MAP));
    g.setRoadRules({ openRoads: false });
    const { left, right } = leftmostRightmost(g);
    // قلعه‌های انتهایی باید خودی باشند تا مسیر از پایه معنا داشته باشد
    left.o = 1;
    right.o = 1;
    for (const b of g.bs) if (b !== left && b !== right) b.o = 2;
    assert.equal(g.findRoute(left, right), null, `seed ${seed}: turning open passage off must restore the strict rule`);
    checked++;
  }
  assert.ok(checked > 0);
  console.log("PASS: the strict own-every-intermediate-castle rule still works when toggled off.");
}

console.log("All random-map reachability tests passed.");
