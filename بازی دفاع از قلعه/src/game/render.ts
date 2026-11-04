import { BUILDING_LABELS, Building, COL, DK, fa, Squad, TROOP_TYPES, UNITS } from "./config";
import { Game, Preview } from "./engine";
import { unitCount } from "./troops";
import { drawScenery, drawTerrain, drawWater, landscapeFor } from "./terrain";
import { drawStructure, troopPosition } from "./structures";
import { polygon, ring, tint } from "./scene-geometry";
import { drawTowerRanges } from "./tower-range";
import { buildMarchPath, pathLength, samplePath } from "./navigation";

const F_BODY = "'Vazirmatn',Tahoma,sans-serif";

type C = CanvasRenderingContext2D;

function rr(c: C, a: number, b: number, w: number, h: number, r: number) {
  c.beginPath();
  if (c.roundRect) c.roundRect(a, b, w, h, r);
  else c.rect(a, b, w, h);
}


function drawB(c: C, g: Game, b: Building, T: number) {
  const X = b.x;
  const Y = b.y;
  const isSel = g.sels.includes(b);
  const isDraft = !!g.ptr && g.ptr.draft.includes(b);
  const isTarget = g.preview?.target === b;

  if (isSel || isDraft || g.hover === b) {
    const color = isSel || isDraft ? "#d8ffe8" : "#e2e4ce";
    c.fillStyle = "rgba(201,255,217,.10)";
    c.strokeStyle = color;
    c.lineWidth = isSel || isDraft ? 2.7 : 1.2;
    c.beginPath(); c.ellipse(X, Y + 10, 48, 24, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.strokeStyle = color + "55";
    c.lineWidth = 1;
    c.beginPath(); c.ellipse(X, Y + 10, 55 + Math.sin(T * 3) * 2, 28, 0, 0, Math.PI * 2); c.stroke();
  }
  drawStructure(c, b, T, isSel || isDraft || g.hover === b);

  if (b.hit > 0) {
    c.strokeStyle = `rgba(255,90,80,${b.hit * 0.9})`;
    c.lineWidth = 5;
    c.beginPath();
    c.arc(X, Y, 46 + (1 - b.hit) * 16, 0, 7);
    c.stroke();
  }
  if (b.fl > 0) {
    c.fillStyle = `rgba(255,255,255,${b.fl * 0.65})`;
    c.beginPath();
    c.arc(X, Y, 50, 0, 7);
    c.fill();
  }

  if (isTarget && g.preview?.sources.length) drawTargetMark(c, g.preview, T, dashAlpha(g));

}

function drawBuildingLabel(c: C, g: Game, b: Building) {
  const X = b.x, Y = b.y;
  const col = COL[b.o], dk = DK[b.o];
  const isSel = g.sels.includes(b);
  const excess = b.o && b.tr > g.baseCap;
  const badgeColor = excess ? "#ac3943" : b.o ? dk : "#567577";
  c.fillStyle = "rgba(4,25,30,.3)";
  rr(c, X - 25 + 3, Y + 33, 50, 31, 5); c.fill();
  c.fillStyle = "#cfdbc4";
  rr(c, X - 26, Y + 28, 52, 32, 5); c.fill();
  c.fillStyle = badgeColor;
  rr(c, X - 23, Y + 30, 46, 27, 3); c.fill();
  c.font = "900 19px " + F_BODY;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.lineWidth = 2.5;
  c.strokeStyle = "#153739";
  c.strokeText(fa(b.tr), X, Y + 44);
  c.fillStyle = "#f5f7e8";
  c.fillText(fa(b.tr), X, Y + 44);
  c.fillStyle = "#d1dbc1";
  rr(c, X - 28, Y + 22, 56, 8, 3); c.fill();
  c.fillStyle = "#193735";
  rr(c, X - 26, Y + 24, 52, 4, 1); c.fill();
  c.fillStyle = excess ? "#f7a281" : col;
  c.fillRect(X - 26, Y + 24, 52 * Math.min(1, b.tr / b.cap), 4);

  if (isSel || g.hover === b) {
    c.font = "bold 10px " + F_BODY;
    c.textAlign = "center";
    c.fillStyle = "#e9ecd3";
    c.strokeStyle = "#223d39";
    c.lineWidth = 3;
    const name = BUILDING_LABELS[b.type] + " / " + fa(b.cap);
    c.strokeText(name, X, Y + 72); c.fillText(name, X, Y + 72);
    if (isSel) {
      const composition = TROOP_TYPES.filter((type) => b.army[type] > 0)
        .map((type) => UNITS[type].label + " " + fa(unitCount(b.army[type], type))).join(" / ");
      c.font = "9px " + F_BODY;
      c.strokeText(composition, X, Y + 86); c.fillText(composition, X, Y + 86);
    }
  }
}

function drawTargetMark(c: C, pv: Preview, T: number, alpha = 1) {
  const t = pv.target;
  const attack = pv.mode === "attack";
  const col = attack ? "#ff6b5f" : "#5ee39a";
  const pulse = 1 + Math.sin(T * 8) * 0.06;
  // نقطه‌چینِ حلقه هم مثلِ مسیر، طبقِ تنظیمات محو می‌شود
  const ring = withAlpha(col, alpha);
  c.save();
  c.translate(t.x, t.y);
  c.scale(pulse, pulse);
  c.strokeStyle = ring;
  c.lineWidth = 4;
  c.setLineDash([16, 10]);
  c.lineDashOffset = T * 40;
  c.beginPath();
  c.arc(0, 0, 62, 0, 7);
  c.stroke();
  c.setLineDash([]);
  c.lineWidth = 3;
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2 + Math.PI / 4;
    c.beginPath();
    c.moveTo(Math.cos(a) * 68, Math.sin(a) * 68);
    c.lineTo(Math.cos(a) * 80, Math.sin(a) * 80);
    c.stroke();
  }
  c.restore();

  /* badge */
  if (attack || pv.mode === "reinforce") {
    const txt1 = "اعزام " + fa(pv.total) + " نفر";
    const txt2 = attack
      ? "توان " + fa(Math.round(pv.power * 10) / 10) + " / دفاع " + fa(Math.round(pv.need * 10) / 10)
      : "توان " + fa(Math.round(pv.power * 10) / 10) + " / دوبار کلیک";
    c.font = "900 15px " + F_BODY;
    const w = Math.max(c.measureText(txt1).width, c.measureText(txt2).width) + 46;
    const bx = t.x - w / 2;
    const by = t.y - 128;
    c.fillStyle = "rgba(4,18,25,.9)";
    rr(c, bx, by, w, 42, 10);
    c.fill();
    c.strokeStyle = pv.ok || pv.mode === "reinforce" ? "#5ee39a" : "#ff8a7a";
    c.lineWidth = 2;
    rr(c, bx, by, w, 42, 10);
    c.stroke();
    c.textAlign = "right";
    c.textBaseline = "middle";
    c.fillStyle = "#fff";
    c.fillText(txt1, bx + w - 34, by + 13);
    c.fillStyle = "rgba(255,255,255,.62)";
    c.font = "12px " + F_BODY;
    c.fillText(txt2, bx + w - 34, by + 30);
    c.font = "18px " + F_BODY;
    c.textAlign = "center";
    const good = pv.mode === "reinforce" ? pv.total > 0 : pv.ok;
    c.fillStyle = good ? "#5ee39a" : "#ff8a7a";
    c.fillText(pv.blocked ? "⚠" : good ? "✓" : "✕", bx + 18, by + 21);
    if (pv.blocked) {
      c.font = "10px " + F_BODY;
      c.fillStyle = "#ffd166";
      c.textAlign = "center";
      c.fillText(fa(pv.blocked) + " مسیر بسته", t.x, by + 52);
    }
  }
}

/* ================= سربازها ================= */
function drawTrooper(c: C, s: Squad, X: number, Y: number, T: number, seed: number, angle: number) {
  const heavy = s.unit === "heavy";
  const fast = s.unit === "fast";
  const pace = UNITS[s.unit].speed;
  const bob = Math.sin(T * 12 * pace + seed) * (heavy ? .8 : 1.4);
  const col = COL[s.o];
  const dir = Math.cos(angle) < 0 ? -1 : 1;
  const heightScale = heavy ? .85 : .72;
  c.fillStyle = "rgba(4,29,33,.25)";
  c.beginPath(); c.ellipse(X + 1, Y, heavy ? 6 : 5, 2.4, 0, 0, Math.PI * 2); c.fill();
  c.save();
  // Y is the contact point on the deck, not the middle of the soldier sprite.
  c.translate(X, Y - 12 * heightScale);
  c.scale(dir * (heavy ? .82 : .67), heightScale);
  const step = Math.sin(T * 13 * pace + seed) * 2.5;
  c.strokeStyle = "#35494d"; c.lineWidth = 3;
  c.beginPath(); c.moveTo(-3, 4 + bob); c.lineTo(-3 + step, 12); c.moveTo(3, 4 + bob); c.lineTo(3 - step, 12); c.stroke();
  polygon(c, [{ x: -8, y: -7 + bob }, { x: 5, y: -9 + bob }, { x: 9, y: 5 + bob }, { x: 1, y: 10 + bob }, { x: -8, y: 5 + bob }], col);
  polygon(c, [{ x: 2, y: -8 + bob }, { x: 7, y: -5 + bob }, { x: 9, y: 5 + bob }, { x: 1, y: 10 + bob }], tint(col, -40));
  c.fillStyle = "#efd5a4"; c.fillRect(-5, -16 + bob, 10, 9);
  polygon(c, ring(0, -18 + bob, 9, 6, 6), tint(col, 28));
  polygon(c, [{ x: -8, y: -18 + bob }, { x: 0, y: -14 + bob }, { x: 8, y: -18 + bob }, { x: 7, y: -11 + bob }, { x: -7, y: -11 + bob }], tint(col, -20));
  c.fillStyle = "#294044"; c.fillRect(1, -11 + bob, 5, 1.5);
  c.strokeStyle = "#a3afa1"; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(11, 10); c.lineTo(11, -28 + bob); c.stroke();
  polygon(c, [{ x: 8, y: -25 + bob }, { x: 11, y: -33 + bob }, { x: 14, y: -25 + bob }], "#dce4ce");
  if (heavy) {
    polygon(c, [{ x: -12, y: -7 + bob }, { x: -1, y: -7 + bob }, { x: -1, y: 6 + bob }, { x: -7, y: 11 + bob }, { x: -13, y: 5 + bob }], "#bdcbb7", "#506b69");
    polygon(c, [{ x: -11, y: -4 + bob }, { x: -4, y: -4 + bob }, { x: -4, y: 4 + bob }, { x: -7, y: 7 + bob }, { x: -11, y: 3 + bob }], col);
    c.fillStyle = "#b1c1b1"; c.fillRect(-1, -24 + bob, 3, 14);
  } else if (fast) {
    polygon(c, [{ x: -5, y: -21 + bob }, { x: -13, y: -30 + bob }, { x: -8, y: -17 + bob }], "#e0f4e6");
  }
  c.restore();
}

/* ================= لایه تعامل ================= */
function arrows(c: C, g: Game, T: number) {
  const pv = g.preview;
  if (!pv || (!pv.sources.length && pv.mode === "select")) return;
  const t = pv.target;
  const col = pv.mode === "attack" ? "#ff7a63" : "#63e7a4";
  for (const s of pv.sources) {
    const route = g.findRoute(s, t);
    if (!route) continue;
    const points = buildMarchPath(route, landscapeFor(g).islands, g.bs);
    const a = dashAlpha(g);
    c.strokeStyle = `rgba(4,18,25,${0.35 * a})`;
    c.lineWidth = 5;
    c.beginPath();
    points.forEach((point, i) => i ? c.lineTo(point.x, point.y) : c.moveTo(point.x, point.y));
    c.stroke();
    c.strokeStyle = withAlpha(col, a);
    c.lineWidth = 2.5;
    c.setLineDash([13, 9]);
    c.lineDashOffset = -T * 46;
    c.beginPath();
    points.forEach((point, i) => i ? c.lineTo(point.x, point.y) : c.moveTo(point.x, point.y));
    c.stroke();
    c.setLineDash([]);
    /* amount near source */
    const n = g.amountOf(s);
    const marker = samplePath(points, Math.min(90, pathLength(points) * .25));
    c.font = "900 13px " + F_BODY;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = "rgba(4,18,25,.85)";
    rr(c, marker.x - 16, marker.y - 27, 32, 20, 8);
    c.fill();
    c.fillStyle = col;
    c.fillText(fa(n), marker.x, marker.y - 16);
  }
  /* arrow head */
  if (pv.sources.length) {
    const s = pv.sources[0];
    const route = g.findRoute(s, t);
    if (!route) return;
    const points = buildMarchPath(route, landscapeFor(g).islands, g.bs);
    const head = samplePath(points, Math.max(0, pathLength(points) - 58));
    c.save();
    c.translate(head.x, head.y);
    c.rotate(head.angle);
    c.fillStyle = col;
    c.beginPath();
    c.moveTo(14, 0);
    c.lineTo(-8, 9);
    c.lineTo(-8, -9);
    c.closePath();
    c.fill();
    c.restore();
  }
}

/** #rrggbb → rgba() با آلفای دلخواه */
function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${Math.max(0, Math.min(1, a))})`;
}

/** ضریبِ شفافیتِ نقطه‌چینِ مسیر حمله (از تنظیمات) */
const dashAlpha = (g: Game) => {
  const a = Number(g.attackDash);
  return Number.isFinite(a) ? Math.max(0, Math.min(1, a)) : 1;
};

/** رسم مسیر «کشیدن» به‌صورت یک رد نورانی که از روی قلعه‌ها عبور می‌کند */
function strokePath(c: C, pts: { x: number; y: number }[], width: number, color: string, dashOff = 0) {
  if (pts.length < 2) return;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.strokeStyle = color;
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
  if (dashOff) {
    c.setLineDash([3, 10]);
    c.lineDashOffset = dashOff;
    c.stroke();
    c.setLineDash([]);
  } else c.stroke();
}

function trail(c: C, g: Game, T: number) {
  const p = g.ptr;
  if (p && p.moved && p.trail.length > 1) {
    strokePath(c, p.trail, 16, "rgba(61,220,132,.12)");
    strokePath(c, p.trail, 8, "rgba(61,220,132,.28)");
    strokePath(c, p.trail, 3, "rgba(232,180,76,.95)", -T * 60);

    /* نشانگر در نوک رد، با جرقه */
    const tip = p.trail[p.trail.length - 1];
    c.fillStyle = "rgba(255,255,255,.9)";
    c.beginPath();
    c.arc(tip.x, tip.y, 6 + Math.sin(T * 16) * 1.5, 0, 7);
    c.fill();
    c.strokeStyle = "#e8b44c";
    c.lineWidth = 2;
    c.beginPath();
    c.arc(tip.x, tip.y, 10 + Math.sin(T * 16) * 1.5, 0, 7);
    c.stroke();

    const n = p.draft.length;
    if (n) {
      const txt = fa(n) + " قلعه انتخاب شد";
      c.font = "900 14px " + F_BODY;
      const tw = c.measureText(txt).width + 18;
      const bx = tip.x - tw / 2;
      const by = tip.y - 34;
      c.fillStyle = "rgba(4,18,25,.9)";
      rr(c, bx, by, tw, 22, 8);
      c.fill();
      c.strokeStyle = "rgba(61,220,132,.7)";
      c.lineWidth = 1.5;
      rr(c, bx, by, tw, 22, 8);
      c.stroke();
      c.fillStyle = "#9ff5c4";
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(txt, tip.x, by + 11);
    }
    return;
  }
  /* محوشدنِ رد پس از رها کردن */
  if (g.ghostTrail.length > 1) {
    const fade = 1 - g.ghostTrail[0].t / 0.5;
    c.globalAlpha = Math.max(0, fade);
    strokePath(c, g.ghostTrail, 8, "rgba(61,220,132,.4)");
    c.globalAlpha = 1;
  }
}

/* ================= جاشدنِ نقشه در کادرِ بازی ================= */

export interface Fitness {
  /** مقیاسِ جهانی → پیکسل */
  s: number;
  /** جابجاییِ افقی برای وسط‌چین کردن */
  ox: number;
  /** جابجاییِ عمودی برای وسط‌چین کردن (با احتسابِ نوارِ بالا) */
  oy: number;
  maxPanX: number;
  maxPanY: number;
  /** ارتفاعِ آزادِ بازی پس از کنار گذاشتنِ نوارِ بالا */
  areaH: number;
}

/**
 * هندسهٔ نمایش: نقشه در ناحیهٔ *زیرِ* نوارِ بالای صفحه جا می‌گیرد.
 * پیش از این، نقشه در تمامِ ارتفاعِ صفحه وسط‌چین می‌شد و نوارِ شناور بالای آن را می‌پوشاند.
 */
export function fitView(g: Game, W: number, H: number): Fitness {
  const top = g.demo ? 0 : Math.max(0, Math.min(H * 0.26, g.hudInset || 0));
  const areaH = Math.max(140, H - top);
  const pad = g.demo ? 1.02 : 0.94;
  const s = Math.min(W / g.worldWidth, areaH / g.worldHeight) * pad * g.zoom;
  return {
    s,
    ox: (W - g.worldWidth * s) / 2,
    oy: top + (areaH - g.worldHeight * s) / 2,
    maxPanX: Math.max(0, (g.worldWidth * s - W) / 2),
    maxPanY: Math.max(0, (g.worldHeight * s - areaH) / 2),
    areaH,
  };
}

/* ================= رسم کل ================= */
export function render(c: C, g: Game | null, T: number, W: number, H: number, dpr: number) {
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  drawWater(c, g, W, H, T);
  if (!g) return;

  // نوارِ بالای صفحه روی نقشه شناور است؛ ارتفاعش از فضای بازی کنار گذاشته می‌شود
  // تا بالای نقشه هرگز زیرِ رابط کاربری پنهان نشود.
  const view = fitView(g, W, H);
  const s = view.s;
  g.panX = Math.max(-view.maxPanX, Math.min(view.maxPanX, g.panX));
  g.panY = Math.max(-view.maxPanY, Math.min(view.maxPanY, g.panY));
  const finalOx = view.ox + g.panX;
  const finalOy = view.oy + g.panY;
  g.view = { s, ox: finalOx, oy: finalOy };

  const sh = g.shake * 7;
  const shx = sh ? (Math.random() - 0.5) * sh : 0;
  const shy = sh ? (Math.random() - 0.5) * sh : 0;
  c.setTransform(dpr * s, 0, 0, dpr * s, dpr * (finalOx + shx), dpr * (finalOy + shy));

  drawTerrain(c, g, T);
  drawTowerRanges(c, g, T);

  arrows(c, g, T);
  const drawables = [
    ...landscapeFor(g).scenery.map((item) => ({ y: item.y, draw: () => drawScenery(c, item, T) })),
    ...g.bs.map((b) => ({ y: b.y + 12, draw: () => drawB(c, g, b, T) })),
    ...g.sq.flatMap((squad) => Array.from({ length: squad.n }, (_, index) => {
      const p = troopPosition(squad, index, squad.n);
      return { y: p.y, draw: () => drawTrooper(c, squad, p.x, p.y, T, squad.id + index * .6, p.angle) };
    })),
  ];
  drawables.sort((a, b) => a.y - b.y).forEach((item) => item.draw());

  for (const f of g.fx) {
    const p = f.t / f.l;
    c.globalAlpha = Math.max(0, 1 - p);
    if (f.k === "txt") {
      c.font = "900 22px " + F_BODY;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.lineWidth = 4;
      c.strokeStyle = "rgba(0,0,0,.55)";
      c.strokeText(f.s || "", f.x, f.y - p * 36);
      c.fillStyle = f.c;
      c.fillText(f.s || "", f.x, f.y - p * 36);
    } else if (f.k === "burst") {
      const R = (f.r || 40) * (0.3 + p);
      c.strokeStyle = f.c;
      c.lineWidth = 4 * (1 - p) + 1;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * Math.PI * 2 + p * 1.4;
        c.beginPath();
        c.moveTo(f.x + Math.cos(a) * R * 0.35, f.y + Math.sin(a) * R * 0.35);
        c.lineTo(f.x + Math.cos(a) * R, f.y + Math.sin(a) * R);
        c.stroke();
      }
    } else {
      c.strokeStyle = f.c;
      c.lineWidth = 6 * (1 - p) + 1;
      c.beginPath();
      c.arc(f.x, f.y, 12 + p * (f.r || 62), 0, 7);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  for (const b of g.bs) drawBuildingLabel(c, g, b);
  // تعداد سربازها بالای گروه رسم نمی‌شود؛ خودِ سربازها گویا هستند.
  trail(c, g, T);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
}
