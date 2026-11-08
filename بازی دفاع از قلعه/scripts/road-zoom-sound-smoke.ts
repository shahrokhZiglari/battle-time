/* آزمون قوانین راه‌ها، زوم و صداها با مدل جدید: فاصلهٔ همسایگان به متر + راه‌های رندوم در مپ رندوم */
import assert from "node:assert/strict";
import { Game } from "../src/game/engine";
import { LEVELS, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP } from "../src/game/config";
import { createRandomLevel, DEFAULT_RANDOM_MAP, PX_PER_METER, type RandomMapSettings } from "../src/game/map";
import { loadSave } from "../src/game/save";
import { setSound } from "../src/game/sound";

setSound(false);

// 1) حداقل فاصلهٔ همسایگان (متر) روی طول پل‌ها اثر دارد.
{
  const g = new Game(1);
  g.setRoadRules({ minRoadLength: 30 * PX_PER_METER }); // ۳۰ متر
  for (const [a, b] of g.links) {
    const d = Math.hypot(g.bs[a].x - g.bs[b].x, g.bs[a].y - g.bs[b].y);
    assert.ok(d >= 30 * PX_PER_METER || g.adj[a].length === 1 || g.adj[b].length === 1, `road of ${d.toFixed(0)}px is shorter than 30m`);
  }
  console.log(`PASS: a 30m minimum keeps every non-essential road at least ${30 * PX_PER_METER}px apart.`);
}

// 2) با دسترسی آزاد، گذر از کنار قلعه‌ها پل اضافه نمی‌سازد.
{
  const closed = new Game(1);
  closed.setRoadRules({ openRoads: false });
  const open = new Game(1);
  open.setRoadRules({ openRoads: true });
  assert.equal(open.links.length, closed.links.length, "open passage must not add bridges");
  console.log("PASS: open passage adds no extra bridges.");
}

// 3) شبکهٔ استاندارد راه‌ها همیشه پیوسته است و همهٔ قلعه‌ها را به هم می‌رساند.
{
  const g = new Game(1);
  g.setRoadRules({ minRoadLength: 10 * PX_PER_METER });
  const seen = new Set<number>();
  const walk = (n: number) => { seen.add(n); for (const m of g.adj[n]) if (!seen.has(m)) walk(m); };
  walk(0);
  assert.equal(seen.size, g.bs.length, "roads reach every castle");
  console.log("PASS: standard roads connect every castle cleanly with 10m default spacing.");
}

// 4) زوم روی نقطهٔ لنگر و بازنشانی.
{
  const g = new Game(0);
  const W = 1440, H = 900;
  g.zoom = 1;
  g.view = { s: 1, ox: 0, oy: 0 };
  const before = { x: 700, y: 400 };
  g.zoomAt(0.4, before.x, before.y, W, H);
  const after = { x: g.view.ox + before.x * g.view.s, y: g.view.oy + before.y * g.view.s };
  assert.ok(Math.abs(after.x - before.x) < 2);
  assert.ok(Math.abs(after.y - before.y) < 2);
  for (let i = 0; i < 30; i++) g.zoomBy(0.2);
  assert.ok(Math.abs(g.zoom - MAX_ZOOM) < 1e-9);
  g.zoomBy(0);
  assert.equal(g.zoom, 1, "reset returns to 100%");
  // ۳ مرحله زوم‌اوت عقب‌تر از ۱۰۰٪: ۸۵٪ -> ۷۰٪ -> ۵۵٪
  g.zoomBy(-ZOOM_STEP);
  assert.equal(g.zoom, 0.85);
  g.zoomBy(-ZOOM_STEP);
  assert.equal(g.zoom, 0.7);
  g.zoomBy(-ZOOM_STEP);
  assert.equal(g.zoom, MIN_ZOOM);
  for (let i = 0; i < 10; i++) g.zoomBy(-ZOOM_STEP);
  assert.ok(Math.abs(g.zoom - MIN_ZOOM) < 1e-9, "clamps at 3 zoom-out steps (55%)");
  g.zoomBy(0);
  assert.equal(g.zoom, 1, "reset returns to fit");
  console.log("PASS: zoom allows 3 steps of zoom-out (down to 55%), anchors cursor, and resets to 100%.");
}

// 5) تنظیمات ذخیره‌شده: فاصله پیش‌فرض ۱۰ متر و حذف گزینهٔ راه‌های رندوم.
{
  const save = loadSave();
  assert.equal(typeof save.minCastleDistance, "number");
  assert.ok(save.minCastleDistance >= 0 && save.minCastleDistance <= 120);
  assert.equal(typeof save.openRoads, "boolean");
  assert.equal("randomRoads" in save.customMap, false, "randomRoads option is removed");
  assert.equal(typeof save.customMap.minDistance, "number");
  console.log("PASS: minCastleDistance is in meters and randomRoads option is removed.");
}

// 6) مپ رندوم با فاصلهٔ همسایگان بزرگتر، قلعه‌های پرتراکم‌تری می‌سازد.
{
  const close: RandomMapSettings = { ...DEFAULT_RANDOM_MAP, minDistance: 10 };
  const far: RandomMapSettings = { ...DEFAULT_RANDOM_MAP, minDistance: 90 };
  const gClose = new Game(LEVELS.length, false, createRandomLevel(close));
  const gFar = new Game(LEVELS.length, false, createRandomLevel(far));
  const nearest = (g: Game) =>
    Math.min(...g.bs.flatMap((x, i) => g.bs.filter((_, j) => j !== i).map((y) => Math.hypot(x.x - y.x, x.y - y.y))));
  assert.ok(nearest(gFar) > nearest(gClose), "a larger minimum distance spreads castles further apart");
  console.log(`PASS: minimum distance spreads neighbours apart (${nearest(gClose).toFixed(0)}px vs ${nearest(gFar).toFixed(0)}px).`);
}

console.log("All road, zoom and sound regression tests passed.");
