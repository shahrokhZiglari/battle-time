import { COL, type Building, type Squad } from "./config";
import { block, crystal, polygon, prism, ring, shadow, tint, type Context } from "./scene-geometry";
import { samplePath, type WalkPose } from "./navigation";
import { TROOP_LANE_SPACING } from "./bridge-geometry";

function banner(c: Context, x: number, y: number, color: string, time: number, seed: number) {
  c.lineWidth = 2;
  c.strokeStyle = "#5a6965";
  c.beginPath(); c.moveTo(x, y + 3); c.lineTo(x, y - 24); c.stroke();
  const wave = Math.sin(time * 3.6 + seed) * 2.3;
  polygon(c, [{ x, y: y - 24 }, { x: x + 18, y: y - 22 + wave }, { x: x + 14, y: y - 16 + wave }, { x: x + 18, y: y - 11 + wave }, { x, y: y - 13 }], color);
  c.strokeStyle = "rgba(255,255,255,.42)";
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(x + 1, y - 23); c.lineTo(x + 17, y - 21 + wave); c.stroke();
}

function doorway(c: Context, x: number, y: number, width: number, height: number, trim: string) {
  c.fillStyle = trim;
  c.beginPath(); c.roundRect(x - width / 2 - 3, y - height - 3, width + 6, height + 3, [width / 2 + 2, width / 2 + 2, 0, 0]); c.fill();
  c.fillStyle = "#283f45";
  c.beginPath(); c.roundRect(x - width / 2, y - height, width, height, [width / 2, width / 2, 0, 0]); c.fill();
  c.strokeStyle = "#687c77"; c.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    c.beginPath(); c.moveTo(x - width / 2 + width * i / 4, y - height + 5); c.lineTo(x - width / 2 + width * i / 4, y); c.stroke();
  }
  c.fillStyle = "#c4cdb7"; c.fillRect(x - width / 2 - 2, y, width + 4, 3);
}

function slits(c: Context, x: number, y: number, width: number) {
  c.fillStyle = "#344b4f";
  c.fillRect(x - width, y, 3, 10);
  c.fillRect(x + width - 3, y - 2, 3, 10);
  c.fillStyle = "#eadba4";
  c.fillRect(x - width, y, 1, 7);
  c.fillRect(x + width - 3, y - 2, 1, 7);
}

function stoneBody(c: Context, x: number, y: number, rx: number, height: number) {
  prism(c, ring(x, y, rx + 3, rx * .5 + 2), 7, "#879b95", "#bac9b8");
  const top = prism(c, ring(x, y - 3, rx, rx * .53), height, "#bbcbc0", "#e2e3c7");
  c.strokeStyle = "rgba(79,108,106,.28)"; c.lineWidth = 1;
  for (let z = 13; z < height; z += 14) {
    c.beginPath(); c.moveTo(x - rx * .92, y - z); c.lineTo(x, y + rx * .48 - z); c.lineTo(x + rx * .92, y - z); c.stroke();
  }
  return top;
}

function battlements(c: Context, x: number, y: number, rx: number, color: string) {
  prism(c, ring(x, y, rx, rx * .52), 13, color);
  polygon(c, ring(x, y - 13, rx - 6, (rx - 6) * .5), tint(color, -68));
  const positions = ring(x, y - 13, rx - 3, (rx - 3) * .52, 8);
  positions.sort((a, b) => a.y - b.y);
  for (const p of positions) prism(c, ring(p.x, p.y, 6, 3.7, 4, Math.PI / 4), 9, color, tint(color, 48));
}

function dome(c: Context, x: number, y: number, rx: number, color: string) {
  const bottom = ring(x, y, rx, rx * .48, 10);
  const belt = ring(x, y - 17, rx * .78, rx * .36, 10);
  const crown = { x: x - 4, y: y - 35 };
  for (let i = 0; i < bottom.length; i++) {
    const j = (i + 1) % bottom.length;
    if (bottom[j].x >= bottom[i].x) continue;
    polygon(c, [belt[i], belt[j], bottom[j]], tint(color, -8 + (i % 3) * 11));
    polygon(c, [belt[i], bottom[j], bottom[i]], tint(color, -28 + (i % 2) * 15));
  }
  for (let i = 0; i < belt.length; i++) polygon(c, [belt[i], belt[(i + 1) % belt.length], crown], tint(color, i > 4 ? 35 : i < 2 ? -3 : 18));
  prism(c, ring(crown.x, crown.y + 1, 6, 3, 6), 4, "#cdd5bc");
}

export function drawStructure(c: Context, b: Building, time: number, focused: boolean) {
  const X = b.x, Y = b.y;
  const color = COL[b.o];
  c.save();
  const footprint = ring(X, Y + 8, b.type === "heavy" ? 43 : 36, 18, 8);
  polygon(c, [{ x: X - 25, y: Y + 6 }, { x: X + 39, y: Y + 2 }, { x: X + 76, y: Y + 38 }, { x: X + 18, y: Y + 37 }], "rgba(12,35,36,.2)");
  shadow(c, X + 2, Y + 12, 43, 18, .16);
  prism(c, footprint, 5, "#718c82", "#adb99b");

  if (b.type === "barracks") {
    // A round stone keep with a colored crenellated crown and two small gate turrets.
    stoneBody(c, X, Y + 4, 26, 49);
    battlements(c, X, Y - 45, 31, color);
    slits(c, X, Y - 24, 17);
    for (const side of [-1, 1]) {
      const x = X + side * 30;
      stoneBody(c, x, Y + 12, 10, 28);
      battlements(c, x, Y - 16, 12, color);
    }
    doorway(c, X + 2, Y + 19, 14, 23, "#8da49c");
    banner(c, X - 8, Y - 70, color, time, b.id);
  } else if (b.type === "speed") {
    stoneBody(c, X, Y + 5, 25, 37);
    prism(c, ring(X, Y - 32, 29, 15), 5, color);
    crystal(c, X, Y - 36, 43, 48, color);
    // Swept stone ribs give the fast keep a distinct narrow silhouette.
    for (const side of [-1, 1]) {
      polygon(c, [
        { x: X + side * 27, y: Y + 8 }, { x: X + side * 32, y: Y - 10 },
        { x: X + side * 23, y: Y - 36 }, { x: X + side * 18, y: Y - 29 },
        { x: X + side * 23, y: Y - 7 }, { x: X + side * 18, y: Y + 10 },
      ], side === -1 ? "#e5e4cb" : "#8fa8a1");
    }
    doorway(c, X, Y + 18, 13, 20, "#92aba3");
    c.strokeStyle = tint(color, 65); c.lineWidth = 2;
    c.beginPath(); c.moveTo(X - 14, Y - 43); c.lineTo(X - 3, Y - 65); c.stroke();
  } else if (b.type === "heavy") {
    for (const side of [-1, 1]) block(c, X + side * 31, Y + 5, 13, 12, 32, "#8fa59b");
    stoneBody(c, X, Y + 6, 31, 44);
    prism(c, ring(X, Y - 38, 33, 16.5, 10), 8, color);
    dome(c, X, Y - 46, 34, color);
    slits(c, X, Y - 20, 20);
    // Gold diamond-shaped reinforcement on the dome's lower edge.
    for (const side of [-1, 0, 1]) {
      const x = X + side * 14;
      polygon(c, [{ x, y: Y - 36 }, { x: x + 4, y: Y - 31 }, { x, y: Y - 25 }, { x: x - 4, y: Y - 31 }], "#e4cf8f");
    }
    doorway(c, X, Y + 23, 18, 26, "#8b9d92");
  } else {
    // One defensive tower type: a crystal held in a faceted stone cradle.
    prism(c, ring(X, Y + 11, 34, 18), 11, "#72938d", "#afc4b4");
    prism(c, ring(X, Y - 2, 26, 14), 24, "#bacbbe");
    prism(c, ring(X, Y - 27, 31, 16), 8, color);
    for (const side of [-1, 1]) {
      polygon(c, [{ x: X + side * 24, y: Y - 32 }, { x: X + side * 29, y: Y - 60 }, { x: X + side * 19, y: Y - 51 }, { x: X + side * 16, y: Y - 34 }], side === -1 ? "#dfebd6" : "#8baca4");
    }
    const bob = Math.sin(time * 2.2 + b.id) * 2;
    {
      // هالهٔ نورانی دور کریستال برج — هم در برج متصرف‌شده و هم در برج خالی می‌درخشد
      const pulse = 0.5 + 0.5 * Math.sin(time * 2.4 + b.id);
      const radius = 44 + pulse * 9;
      const glow = c.createRadialGradient(X, Y - 57, 2, X, Y - 57, radius);
      if (b.o) {
        glow.addColorStop(0, color + "90");
        glow.addColorStop(.22, color + "55");
        glow.addColorStop(.6, color + (pulse > .5 ? "2c" : "22"));
        glow.addColorStop(1, color + "00");
      } else {
        glow.addColorStop(0, "#e2eef07a");
        glow.addColorStop(.35, "#b7cdca3d");
        glow.addColorStop(1, "#b7cdca00");
      }
      c.save();
      c.globalCompositeOperation = "lighter";
      c.fillStyle = glow;
      c.beginPath(); c.arc(X, Y - 57, radius, 0, Math.PI * 2); c.fill();
      const ringCol = b.o ? color : "#d0dde0";
      c.strokeStyle = ringCol + (pulse > .5 ? "4d" : "30");
      c.lineWidth = 1.8;
      c.beginPath(); c.arc(X, Y - 57, 34 + pulse * 5, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    crystal(c, X, Y - 38 + bob, 28, 53, b.o ? color : "#9db9b8");
    doorway(c, X, Y + 12, 10, 15, "#83a29a");
    if (b.o && focused) {
      c.strokeStyle = color + "90"; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(X, Y + 9, 45 + Math.sin(time * 2) * 2, 22, 0, 0, Math.PI * 2); c.stroke();
    }
  }
  c.restore();
}

export function troopPosition(s: Pick<Squad, "x" | "y" | "ang" | "d" | "route" | "waypoints">, index: number, count: number): WalkPose {
  const path = s.waypoints.length > 1 ? s.waypoints : s.route;
  const narrow = s.waypoints.some((point) => (point.laneWidth ?? TROOP_LANE_SPACING) < TROOP_LANE_SPACING);
  const columns = narrow ? 1 : Math.min(3, Math.ceil(Math.sqrt(count)));
  const row = Math.floor(index / columns);
  const lane = index % columns - (Math.min(columns, count - row * columns) - 1) / 2;
  const travelled = Math.max(0, s.d - row * 13 - 3);
  const pose = samplePath(path, travelled);
  const offset = lane * pose.laneWidth * Math.min(1, travelled / 30);
  return {
    ...pose,
    x: pose.x - Math.sin(pose.angle) * offset,
    y: pose.y + Math.cos(pose.angle) * offset,
  };
}