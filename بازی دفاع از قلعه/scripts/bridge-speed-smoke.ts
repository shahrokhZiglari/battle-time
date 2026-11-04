/* آزمون: سرعت سرباز سریع، و اینکه سربازان روی خط پل بمانند نه بیرون آن. */
import assert from "node:assert/strict";
import { CFG, UNITS, type Owner } from "../src/game/config";
import { Game } from "../src/game/engine";
import { troopPosition } from "../src/game/structures";
import { setSound } from "../src/game/sound";

setSound(false);

// 1) سرعت سرباز سریع ۱٫۵ برابر عادی است، نه ۲ برابر.
{
  assert.equal(UNITS.fast.power, UNITS.normal.power, "fast power stays 1");
  assert.ok(Math.abs(UNITS.fast.speed - 1.5) < 1e-9, `fast speed is ${UNITS.fast.speed}`);
  assert.ok(Math.abs(UNITS.fast.speed / UNITS.normal.speed - 1.5) < 1e-9);
  assert.ok(Math.abs(UNITS.heavy.speed - 2 / 3) < 1e-9, "heavy speed is unchanged");
  console.log("PASS: fast soldiers move 1.5x the normal speed; heavy remains 2/3.");
}

// 2) مسافت واقعی طی‌شده در زمان برابر، ۱٫۵ برابر است.
{
  const travelled = (owner: Owner, type: "normal" | "fast") => {
    const g = new Game(0);
    g.ai = () => {};
    const source = g.bs.find((b) => b.o === owner)!;
    source.army = { normal: 0, fast: 0, heavy: 0 };
    source.army[type] = 5;
    g.sendN(source, g.bs[2], 5, [source, g.bs[2]]);
    const squad = g.sq[0];
    squad.sp = CFG.speed * UNITS[type].speed;
    g.step(0.5);
    return squad.d;
  };
  const normal = travelled(1, "normal");
  const fast = travelled(1, "fast");
  assert.ok(Math.abs(fast / normal - 1.5) < 0.02, `fast/normal = ${(fast / normal).toFixed(2)}`);
  console.log(`PASS: in equal time fast soldiers cover ${(fast / normal).toFixed(2)}x the normal distance.`);
}

// 3) عرض ستون سربازان از عرض پل بیشتر نمی‌شود.
{
  const g = new Game(0);
  g.bs[0].tr = 30;
  g.sendN(g.bs[0], g.bs[2], 30, [g.bs[0], g.bs[1], g.bs[2]]);
  const squad = g.sq[0];
  squad.d = 200;
  const points = Array.from({ length: squad.n }, (_, i) => troopPosition(squad, i, squad.n));
  // همه در نزدیکی خط مرکزی مسیر و داخل نیم‌عرض پل (۱۳ + کمی حاشیه برای شانه‌ها)
  const path = squad.waypoints;
  for (const p of points) {
    let nearest = Infinity;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      nearest = Math.min(nearest, Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)));
    }
    assert.ok(nearest <= 14, `a soldier is ${nearest.toFixed(1)}px off the bridge centre line`);
  }
  console.log("PASS: every soldier stays within the bridge width while marching.");
}

console.log("All bridge and speed tests passed.");
