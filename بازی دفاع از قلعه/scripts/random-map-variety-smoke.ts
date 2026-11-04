/* آزمون: نقشهٔ رندوم باید هر بار واقعاً متفاوت ساخته شود —
   چیدمان، اندازهٔ جهان و پالت رنگی نباید همیشه یکی باشد. */
import assert from "node:assert/strict";
import { LEVELS, THEME_COUNT } from "../src/game/config";
import { Game } from "../src/game/engine";
import { createRandomLevel, DEFAULT_RANDOM_MAP } from "../src/game/map";
import { landscapeFor } from "../src/game/terrain";
import { setSound } from "../src/game/sound";

setSound(false);

const signature = (level: ReturnType<typeof createRandomLevel>) =>
  level.b.map(([x, y, o, t]) => `${x.toFixed(1)},${y.toFixed(1)},${o},${t}`).join("|");

const maps = Array.from({ length: 12 }, () => createRandomLevel(DEFAULT_RANDOM_MAP));
const signatures = new Set(maps.map(signature));
assert.ok(signatures.size >= 10, `12 نقشهٔ رندوم باید تقریباً همه متفاوت باشند (${signatures.size} تکراری نیست)`);

const sizes = new Set(maps.map((m) => `${m.worldWidth}x${m.worldHeight}`));
assert.ok(sizes.size >= 3, `اندازهٔ جهان نقشه‌ها باید متنوع باشد (${sizes.size} اندازهٔ مختلف)`);

const themes = new Set(maps.map((m) => m.theme));
assert.ok(themes.size >= 2, `پالت رنگی نقشه‌های رندوم باید دست‌کم دو حالت داشته باشد (${themes.size})`);
assert.ok(maps.every((m) => (m.theme ?? 0) >= 0 && (m.theme ?? 0) < THEME_COUNT), "پالت در محدودهٔ معتبر است");

const hints = new Set(maps.map((m) => m.hint));
assert.ok(hints.size >= 3, `الگوهای چیدمان باید متنوع باشند (${hints.size} توصیف مختلف)`);

// هر نقشه‌ای که ساخته می‌شود باید از نظر بازی سالم باشد
let hillsSeen = 0;
let roadsSeen = 0;
for (const map of maps) {
  for (let i = 0; i < map.b.length; i++) {
    for (let j = i + 1; j < map.b.length; j++) {
      const a = map.b[i], b = map.b[j];
      assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) > 75, "Castle locations shouldn't overlap");
    }
  }
  for (const tower of map.b.filter((b) => b[3] === "tower")) {
    const distance = Math.hypot((tower[0] - map.worldWidth! / 2) / map.worldWidth!, (tower[1] - map.worldHeight! / 2) / map.worldHeight!);
    assert.ok(distance < .24, "The requested towers are placed in the central part of the map.");
  }
  const g = new Game(LEVELS.length, false, map);
  assert.equal(g.links.length, g.bs.length - 1, "Large maps use a clean spanning road network rather than crossing shortcuts.");
  assert.ok(g.findRoute(g.bs[0], g.bs[g.bs.length - 1]) !== null, "نقشه باید پیوسته باشد");
  const scene = landscapeFor(g);
  assert.equal(scene.islands.length, map.b.length);
  assert.ok(scene.theme.ground.length > 0);
  // پستی و بلندی (تپه‌ها) و راه‌های خاکی باید در نقشه‌ها دیده شوند
  hillsSeen += scene.hills.length > 0 ? 1 : 0;
  roadsSeen += scene.roads.length > 0 ? 1 : 0;
}
assert.ok(hillsSeen > 0, "دست‌کم برخی نقشه‌ها باید تپهٔ پستی‌بلندی داشته باشند");
assert.ok(roadsSeen > 0, "دست‌کم برخی نقشه‌ها باید راهِ خاکیِ روی جزیره داشته باشند");

console.log("PASS: random maps differ in layout, world size and palette; all stay connected and playable.");
