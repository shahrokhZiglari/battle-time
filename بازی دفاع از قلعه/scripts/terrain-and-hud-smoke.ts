import assert from "node:assert/strict";
import { Game } from "../src/game/engine";
import { landscapeFor } from "../src/game/terrain";
import { createRandomLevel, MAX_LAKES, normalizeRandomMap, validateRandomMap } from "../src/game/map";
import { fitView } from "../src/game/render";
import { CFG } from "../src/game/config";

/* ---------- ۱) خلیج از تنظیمات به نقشه می‌رسد ---------- */
{
  const settings = normalizeRandomMap({ lakes: 3 });
  assert.equal(settings.lakes, 3);
  const level = createRandomLevel({ ...settings, players: 2, normal: 6 });
  assert.equal(level.lakes, 3, "the bay count reaches the level");
  const g = new Game(0, true, level);
  const land = landscapeFor(g);
  assert.equal(land.islands.length, g.bs.length);
}

/* ---------- ۲) هیچ کوهی روی هیچ نقشه‌ای ساخته نمی‌شود ---------- */
{
  const g = new Game(0, true, createRandomLevel(normalizeRandomMap({ players: 2, normal: 7, lakes: 6 })));
  const land = landscapeFor(g);
  // کوه به‌کلی از بازی حذف شده: نه در فیلدِ landscape، نه در قالبِ نقشه
  assert.equal("peaks" in land, false, "landscape carries no mountain data at all");
  assert.equal("mountains" in g.L, false, "levels no longer carry a mountain count");
  assert.equal("mountainScale" in g, false, "the engine has no mountain-size setting");
}

/* ---------- ۳) صفر یعنی هیچ خلیج ---------- */
{
  const level = createRandomLevel(normalizeRandomMap({ players: 2, normal: 6, lakes: 0 }));
  const g = new Game(0, true, level);
  const land = landscapeFor(g);
  assert.ok(land.islands.every((island) => island.points.length <= 13), "without lakes no island gains a bay arc");

  // کلینگِ ورونوی خودش چند رأس اضافه/کم می‌کند، پس مقایسهٔ آماری می‌گیریم:
  // با lakes > 0 باید به‌طور محسوس رأسِ بیشتری (خلیج) ساخته شود.
  const avgVerts = (lakes: number) => {
    let total = 0, maps = 0;
    for (let run = 0; run < 6; run++) {
      const lvl = createRandomLevel(normalizeRandomMap({ players: 2, normal: 6, lakes }));
      const gg = new Game(0, true, lvl);
      const land2 = landscapeFor(gg);
      total += land2.islands.reduce((sum, island) => sum + island.points.length, 0) / land2.islands.length;
      maps++;
    }
    return total / maps;
  };
  const noBays = avgVerts(0);
  const manyBays = avgVerts(6);
  assert.ok(manyBays > noBays + 0.8, `lakes carve bays (${noBays.toFixed(2)} → ${manyBays.toFixed(2)} vertices/island)`);

  // با خلیجِ زیاد، جزیره‌ای با کمانِ خلیج (۱۵ رأس یا بیشتر) باید پیدا شود
  let carved = 0;
  for (let run = 0; run < 8 && !carved; run++) {
    const lvl = createRandomLevel(normalizeRandomMap({ players: 2, normal: 8, towers: 1, lakes: 5 }));
    const gg = new Game(0, true, lvl);
    carved = landscapeFor(gg).islands.filter((island) => island.points.length >= 15).length;
  }
  assert.ok(carved > 0, "an island shore is carved into a bay when lakes are requested");
}

/* ---------- ۵) اعتبارسنجیِ محدودهٔ خلیج ---------- */
{
  assert.ok(validateRandomMap({ players: 2, normal: 5, fast: 0, heavy: 0, towers: 0, largeMap: true, minDistance: 30, randomRoads: false, lakes: MAX_LAKES + 1 }));
  assert.equal(normalizeRandomMap({ lakes: -3 }).lakes, 0);
  assert.equal(normalizeRandomMap({ lakes: 99 }).lakes, MAX_LAKES);
}

/* ---------- ۶) نوارِ بالا: نقشه زیرش نمی‌رود ---------- */
{
  const g = new Game(0, false);
  g.hudInset = 44;
  const W = 1280, H = 800;
  const view = fitView(g, W, H);
  const top = view.oy;
  const bottom = view.oy + g.worldHeight * view.s;
  // بالای نقشه پایین‌تر از نوار است و نقشه کامل داخل صفحه می‌ماند
  assert.ok(top >= 44 - 0.01, `the map starts below the top bar (top=${top.toFixed(1)})`);
  assert.ok(bottom <= H + 0.01, `the map never overflows the bottom (bottom=${bottom.toFixed(1)})`);
  // در ناحیهٔ آزاد (زیر نوار) وسط‌چین است
  const mapCenter = (top + bottom) / 2;
  assert.ok(Math.abs(mapCenter - (44 + (H - 44) / 2)) < 1, "the map is centred in the area below the bar");

  // بدونِ نوار (دمو) کلِ صفحه استفاده می‌شود
  const demo = new Game(0, true);
  demo.hudInset = 44;
  const demoView = fitView(demo, W, H);
  assert.ok(demoView.oy < view.oy, "the demo map uses the whole screen");
}

/* ---------- ۷) بزرگ‌نمایی و جابجایی هم همان ناحیه را رعایت می‌کنند ---------- */
{
  const g = new Game(0, false);
  g.hudInset = 44;
  g.zoom = 2;
  g.panY = 5000;
  g.clampPan(1280, 800);
  const { s, areaH } = { s: Math.min(1280 / g.worldWidth, (800 - 44) / g.worldHeight) * 0.94 * g.zoom, areaH: 800 - 44 };
  const maxY = Math.max(0, (g.worldHeight * s - areaH) / 2);
  assert.ok(Math.abs(g.panY - maxY) < 0.01, "pan is clamped against the free area, not the whole window");
  assert.ok(CFG.range > 0);
}

console.log("PASS: there are no mountains anywhere, bays stay configurable, and the map fits below the slim top bar.");
