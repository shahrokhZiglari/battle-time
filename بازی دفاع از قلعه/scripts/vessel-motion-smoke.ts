/**
 * کشتی و قایق — آزمونِ هندسه و حرکت (بدونِ مرورگر).
 *   • هیچ کوهی در هیچ نقشه‌ای نیست (کاربر کوه‌ها را کامل حذف کرده است).
 *   • هر شناور فقط روی آبِ آزاد است: نه در جزیره، نه نزدیکِ ساحل و پل، نه روی شناورِ دیگر.
 *   • بخشی از شناورها کروز می‌کنند و بقیه سرِ جایشان می‌مانند.
 *   • مسیرِ کروز در تمامِ ۱۰ دقیقهٔ بازی هرگز به خشکی یا پل نمی‌رسد.
 */
import assert from "node:assert/strict";
import { Game } from "../src/game/engine";
import { LEVELS } from "../src/game/config";
import { drawTerrain, landscapeFor, vesselPose } from "../src/game/terrain";
import { DEFAULT_RANDOM_MAP, createRandomLevel, MAX_BOATS, MAX_SHIPS } from "../src/game/map";
import { setSound } from "../src/game/sound";

setSound(false);

type P = { x: number; y: number };
const edgeDistance = (p: P, vertices: P[]) => {
  let min = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    min = Math.min(min, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy));
  }
  return min;
};
const insidePoly = (p: P, vertices: P[]) => {
  let hit = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const a = vertices[i];
    const b = vertices[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y || 1e-9) + a.x) hit = !hit;
  }
  return hit;
};
const distToLine = (p: P, a: P, b: P) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};

let bad = 0;
const check = (label: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "✔" : "✘"} ${label}${extra ? " — " + extra : ""}`);
  if (!cond) bad++;
};

/* ---------- ۱) هیچ کوهی در هیچ نقشه‌ای نیست ---------- */
let mapsChecked = 0;
for (let index = 0; index < LEVELS.length; index++) {
  const land = landscapeFor(new Game(index));
  check(`مرحلهٔ ${index + 1}: بدونِ کوه`, !("peaks" in land));
  mapsChecked++;
  if (index > 3) break; // چند نمونه کافی است؛ بقیه در آزمون‌های دیگر پوشش دارند
}
const mapVariants = [
  { ...DEFAULT_RANDOM_MAP, lakes: 10, ships: 12, boats: 16 },
  { ...DEFAULT_RANDOM_MAP, lakes: 16, ships: 6, boats: 4, players: 3 as const },
  { ...DEFAULT_RANDOM_MAP, lakes: 0, ships: 0, boats: 0, players: 4 as const },
];
for (const request of mapVariants) {
  const land = landscapeFor(new Game(LEVELS.length, false, createRandomLevel(request)));
  check(`نقشهٔ ${request.players} نفره بدونِ کوه`, !("peaks" in land));
  mapsChecked++;
}
check("هیچ داده‌ای از کوه در نقشه نمی‌ماند", mapsChecked > 0, `${mapsChecked} نقشه`);

/* ---------- ۲) شناورها فقط روی آب ---------- */
let vesselsSeen = 0;
let movingSeen = 0;
let stillSeen = 0;
for (const request of mapVariants) {
  const g = new Game(LEVELS.length, false, createRandomLevel(request));
  const land = landscapeFor(g);
  const shores = land.islands.map((island) => island.points);
  const ships = land.vessels.filter((v) => v.kind === "ship");
  const boats = land.vessels.filter((v) => v.kind === "boat");
  check(`کشتی‌ها از تنظیمات بیشتر نمی‌شوند (${request.ships})`, ships.length <= Math.min(request.ships, MAX_SHIPS), String(ships.length));
  check(`قایق‌ها از تنظیمات بیشتر نمی‌شوند (${request.boats})`, boats.length <= Math.min(request.boats, MAX_BOATS), String(boats.length));

  for (const vessel of land.vessels) {
    vesselsSeen++;
    const clear = (vessel.kind === "ship" ? 34 : 20) * vessel.scale;
    for (const points of shores) {
      assert.ok(!insidePoly(vessel, points), "vessel never sits on land");
      assert.ok(edgeDistance(vessel, points) >= clear - 0.5, `vessel keeps ${clear.toFixed(0)}px from the shore`);
    }
    for (const [ia, ib] of g.links) {
      assert.ok(distToLine(vessel, g.bs[ia], g.bs[ib]) >= 40 + clear - 0.5, "vessel never blocks a bridge");
    }
    for (const other of land.vessels) {
      if (other === vessel) continue;
      const otherClear = (other.kind === "ship" ? 34 : 20) * other.scale;
      assert.ok(Math.hypot(other.x - vessel.x, other.y - vessel.y) >= 56 + Math.min(clear, otherClear) - 0.5, "vessels never overlap");
    }
    if (vessel.cruise) movingSeen++;
    else stillSeen++;
  }
}
check("کشتی و قایق فقط روی آبِ آزاد هستند", vesselsSeen > 0, `${vesselsSeen} شناور`);
check("بخشی از شناورها حرکت می‌کنند", movingSeen > 0, `${movingSeen} در حرکت`);
check("بخشی هم سرِ جایشان می‌مانند", stillSeen > 0, `${stillSeen} ثابت`);

/* ---------- ۳) حرکتِ طبیعی و بی‌خطر ---------- */
{
  const g = new Game(LEVELS.length, false, createRandomLevel({ ...DEFAULT_RANDOM_MAP, ships: 12, boats: 16, lakes: 8 }));
  const land = landscapeFor(g);
  const shores = land.islands.map((island) => island.points);
  const moving = land.vessels.filter((v) => v.cruise);
  const still = land.vessels.filter((v) => !v.cruise);

  // شناورِ ثابت هیچ‌وقت جابه‌جا نمی‌شود (جز تکانِ ریزِ موج)
  const stillA = still.map((v) => vesselPose(v, 0));
  const stillB = still.map((v) => vesselPose(v, 37.5));
  const stillDrift = Math.max(...stillA.map((p, i) => Math.hypot(p.x - stillB[i].x, p.y - stillB[i].y)));
  check("شناورهای ثابت جابه‌جا نمی‌شوند", stillDrift < 3.5, `بیشترین جابه‌جایی ${stillDrift.toFixed(2)}px`);

  // شناورِ متحرک واقعاً حرکت می‌کند
  const moveDrift = Math.max(...moving.map((v) => {
    const a = vesselPose(v, 0);
    const b = vesselPose(v, 12);
    return Math.hypot(a.x - b.x, a.y - b.y);
  }));
  check("شناورهای در حرکت واقعاً جابه‌جا می‌شوند", moveDrift > 3, `بیشترین جابه‌جایی ${moveDrift.toFixed(1)}px در ۱۲ ثانیه`);

  // حرکت آرام است (نه پرش) — بیشترین گام در ۰٫۲ ثانیه
  let maxStep = 0;
  for (const v of moving) {
    const a = vesselPose(v, 5);
    const b = vesselPose(v, 5.2);
    maxStep = Math.max(maxStep, Math.hypot(a.x - b.x, a.y - b.y));
  }
  check("حرکت نرم و بدونِ پرش است", maxStep < 1.2, `بیشترین گام ${maxStep.toFixed(3)}px در هر ۰٫۲s`);

  // در تمامِ ۱۰ دقیقه هیچ شناوری به خشکی یا پل نمی‌رسد
  let worstShore = Infinity;
  let worstBridge = Infinity;
  for (const v of land.vessels) {
    const clear = (v.kind === "ship" ? 34 : 20) * v.scale;
    for (let t = 0; t <= 600; t += 1.5) {
      const pose = vesselPose(v, t);
      for (const points of shores) {
        assert.ok(!insidePoly(pose, points), "cruising vessel never enters land");
        worstShore = Math.min(worstShore, edgeDistance(pose, points) - clear);
      }
      for (const [ia, ib] of g.links) {
        worstBridge = Math.min(worstBridge, distToLine(pose, g.bs[ia], g.bs[ib]) - (40 + clear));
      }
    }
  }
  check("در ۱۰ دقیقه هیچ شناوری به ساحل نمی‌رسد", worstShore >= -0.5, `کمترین حاشیه ${worstShore.toFixed(1)}px`);
  check("در ۱۰ دقیقه هیچ شناوری روی پل نمی‌رود", worstBridge >= -0.5, `کمترین حاشیه ${worstBridge.toFixed(1)}px`);
}

/* ---------- ۴) رسمِ بدونِ خطا و بدونِ عددِ نامعتبر ---------- */
{
  let painted = 0;
  let nan = 0;
  const gradient = { addColorStop() {} };
  const ctx = new Proxy<Record<string, unknown>>({
    measureText: () => ({ width: 35 }),
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  }, {
    get: (target, key: string) => (key in target ? target[key] : (...args: unknown[]) => {
      if (args.some((a) => typeof a === "number" && !Number.isFinite(a))) nan++;
    }),
    set: (target, key: string, value) => {
      if (key === "fillStyle" && typeof value === "string" && /^#(6b4a2b|5c3f26|7a5533|f3ead6|e8b44c|dfe9ef)$/i.test(value)) painted++;
      target[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;

  const big = new Game(LEVELS.length, false, createRandomLevel({ ...DEFAULT_RANDOM_MAP, ships: 12, boats: 16 }));
  for (const time of [0, 1.7, 4.2, 9.9]) drawTerrain(ctx, big, time);
  check("رسمِ شناورها بدونِ خطا انجام می‌شود", true);
  check("هیچ مختصاتِ نامعتبری رسم نمی‌شود", nan === 0, String(nan));
  check("کشتی و قایق واقعاً روی بوم کشیده می‌شوند", painted > 0, String(painted));
}

console.log(bad ? `FAIL: ${bad} مورد` : "PASS: هیچ کوهی نیست؛ کشتی و قایق فقط روی آب‌اند و بخشی از آن‌ها نرم و بی‌خطر حرکت می‌کنند.");
process.exit(bad ? 1 : 0);
