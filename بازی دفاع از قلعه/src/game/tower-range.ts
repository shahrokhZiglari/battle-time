import { CFG, COL, DEFAULT_HALO_SPIN, type Building, type Point } from "./config";
import type { Game } from "./engine";
import type { Context } from "./scene-geometry";

/**
 * برجِ خنثی هم از خودش دفاع می‌کند: هر لشکری (از هر بازیکنی) که به شعاعش برسد هدف است.
 * برجِ صاحب‌دار فقط لشکرِ دشمن را می‌زند.
 */
export function towerCanTarget(tower: Building, target: Point & { o: number; hp: number }) {
  if (tower.type !== "tower" || target.hp <= 0) return false;
  if (Math.hypot(target.x - tower.x, target.y - tower.y) >= CFG.range) return false;
  if (tower.o === 0) return target.o !== 0;
  return target.o !== tower.o;
}

/** The displayed radius is exactly the same circle used by towerCanTarget. */
export function drawTowerRanges(c: Context, g: Game, time = 0) {
  const scale = Math.max(.35, g.view.s);
  c.save();
  for (const b of g.bs) {
    if (b.type !== "tower") continue;
    const active = b.o !== 0;
    const focus = g.hover === b || g.sels.includes(b) || g.ptr?.draft.includes(b);
    const color = active ? COL[b.o] : "#d0d9cf";
    const pulse = 0.75 + 0.25 * Math.sin(time * 2.1 + b.id * 1.7);

    /* هالهٔ نورانی: درخششِ نرمِ داخل دایره که آرام نبض می‌زند */
    c.globalCompositeOperation = "lighter";
    const glow = c.createRadialGradient(b.x, b.y, CFG.range * .1, b.x, b.y, CFG.range * 1.06);
    glow.addColorStop(0, color + "00");
    glow.addColorStop(.62, color + (active ? "10" : "07"));
    glow.addColorStop(.88, color + (active ? "2c" : "16"));
    glow.addColorStop(1, color + "00");
    c.fillStyle = glow;
    c.beginPath(); c.arc(b.x, b.y, CFG.range * 1.06, 0, Math.PI * 2); c.fill();

    /* حلقهٔ بیرونیِ نرم: درخششِ هاله */
    c.strokeStyle = color + (active ? "38" : "1c");
    c.lineWidth = (focus ? 14 : 10) / scale;
    c.beginPath(); c.arc(b.x, b.y, CFG.range, 0, Math.PI * 2); c.stroke();

    /* خطِ روشنِ میانی */
    c.setLineDash(active ? [] : [5 / scale, 6 / scale]);
    c.strokeStyle = "rgba(4,26,30,.55)";
    c.lineWidth = (focus ? 5.5 : 4) / scale;
    c.beginPath(); c.arc(b.x, b.y, CFG.range, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = active ? color + "ff" : color + "b8";
    c.lineWidth = (focus ? 3 : 2) / scale;
    c.stroke();
    c.setLineDash([]);

    if (active) {
      /* نورهای چرخان روی حلقه */
      const sweepAngle = time * (g.haloSpin ?? DEFAULT_HALO_SPIN) + b.id;
      for (let k = 0; k < 3; k++) {
        const a0 = sweepAngle + (k / 3) * Math.PI * 2;
        const px = b.x + Math.cos(a0) * CFG.range, py = b.y + Math.sin(a0) * CFG.range;
        const spark = c.createRadialGradient(px, py, 0, px, py, 26 / scale);
        spark.addColorStop(0, "#ffffff" + (focus ? "aa" : "77"));
        spark.addColorStop(.35, color + "88");
        spark.addColorStop(1, color + "00");
        c.fillStyle = spark;
        c.beginPath(); c.arc(px, py, 26 / scale, 0, Math.PI * 2); c.fill();
      }
      c.fillStyle = color + (focus ? "1c" : "0e");
      c.beginPath(); c.arc(b.x, b.y, CFG.range, 0, Math.PI * 2); c.fill();
      /* تیک‌های درخشان با درخششِ همراه */
      c.strokeStyle = "#f0f5dfcc";
      c.lineWidth = (1.6 + pulse * 1.2) / scale;
      c.shadowColor = color;
      c.shadowBlur = 8 / scale;
      for (let k = 0; k < 12; k++) {
        const angle = k * Math.PI / 6;
        c.beginPath();
        c.moveTo(b.x + Math.cos(angle) * (CFG.range - 4 / scale), b.y + Math.sin(angle) * (CFG.range - 4 / scale));
        c.lineTo(b.x + Math.cos(angle) * (CFG.range + 2 / scale), b.y + Math.sin(angle) * (CFG.range + 2 / scale));
        c.stroke();
      }
      c.shadowBlur = 0;
    } else {
      /* برج خنثی: هالهٔ سردِ کم‌رنگ ولی خوانا — این برج هم شلیک می‌کند */
      c.setLineDash([6 / scale, 7 / scale]);
      c.strokeStyle = color + (pulse > .9 ? "5a" : "3a");
      c.lineWidth = (focus ? 3 : 2) / scale;
      c.beginPath(); c.arc(b.x, b.y, CFG.range * (0.97 + pulse * 0.02), 0, Math.PI * 2); c.stroke();
      c.setLineDash([]);
      /* چهار تیکِ هشدار */
      c.strokeStyle = "#eef2e6" + (pulse > .9 ? "88" : "55");
      c.lineWidth = 1.8 / scale;
      for (let k = 0; k < 4; k++) {
        const angle = k * Math.PI / 2 + Math.PI / 4;
        c.beginPath();
        c.moveTo(b.x + Math.cos(angle) * (CFG.range - 5 / scale), b.y + Math.sin(angle) * (CFG.range - 5 / scale));
        c.lineTo(b.x + Math.cos(angle) * (CFG.range + 1 / scale), b.y + Math.sin(angle) * (CFG.range + 1 / scale));
        c.stroke();
      }
    }
    c.globalCompositeOperation = "source-over";
  }
  c.restore();
}
