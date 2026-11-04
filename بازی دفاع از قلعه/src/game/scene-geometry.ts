export type Point = { x: number; y: number };
export type Context = CanvasRenderingContext2D;

export function noise(seed: number) {
  const n = Math.sin(seed * 127.1 + 31.7) * 43758.5453;
  return n - Math.floor(n);
}

export function tint(hex: string, amount: number) {
  const value = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.min(255, (value >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((value >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (value & 255) + amount));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}

export function polygon(c: Context, points: Point[], fill: string | CanvasGradient, stroke?: string) {
  if (points.length < 3) return;
  c.beginPath();
  c.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) c.lineTo(points[i].x, points[i].y);
  c.closePath();
  c.fillStyle = fill;
  c.fill();
  if (stroke) { c.strokeStyle = stroke; c.stroke(); }
}

export function ring(x: number, y: number, rx: number, ry: number, sides = 8, phase = Math.PI / 8): Point[] {
  return Array.from({ length: sides }, (_, i) => {
    const angle = phase + i / sides * Math.PI * 2;
    return { x: x + Math.cos(angle) * rx, y: y + Math.sin(angle) * ry };
  });
}

// A fixed oblique projection keeps the gameplay plane untouched while showing top and side faces.
export function prism(c: Context, base: Point[], height: number, color: string, roof = tint(color, 24)) {
  const top = base.map((p) => ({ x: p.x, y: p.y - height }));
  for (let i = 0; i < base.length; i++) {
    const j = (i + 1) % base.length;
    const dx = base[j].x - base[i].x;
    if (dx >= 0) continue;
    const dy = base[j].y - base[i].y;
    const light = -10 - 24 * dy / Math.max(1, Math.hypot(dx, dy));
    polygon(c, [top[i], top[j], base[j], base[i]], tint(color, light));
    c.strokeStyle = "rgba(9,24,28,.09)";
    c.lineWidth = .6;
    c.beginPath(); c.moveTo(top[j].x, top[j].y); c.lineTo(base[j].x, base[j].y); c.stroke();
  }
  polygon(c, top, roof);
  return top;
}

export function block(c: Context, x: number, y: number, w: number, d: number, h: number, color: string) {
  return prism(c, [
    { x: x + w / 2, y: y - d / 2 },
    { x: x + w / 2, y: y + d / 2 },
    { x: x - w / 2, y: y + d / 2 },
    { x: x - w / 2, y: y - d / 2 },
  ], h, color);
}

export function shadow(c: Context, x: number, y: number, rx: number, ry: number, alpha = .23) {
  c.fillStyle = `rgba(5,24,29,${alpha})`;
  c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); c.fill();
}

export function crystal(c: Context, x: number, y: number, width: number, height: number, color: string) {
  const apex = { x: x - width * .08, y: y - height };
  const left = { x: x - width * .53, y: y - height * .35 };
  const right = { x: x + width * .53, y: y - height * .35 };
  const middle = { x: x + width * .07, y: y - height * .22 };
  const foot = { x, y };
  polygon(c, [apex, left, middle], tint(color, 30));
  polygon(c, [apex, middle, right], tint(color, -20));
  polygon(c, [left, foot, middle], tint(color, -8));
  polygon(c, [middle, foot, right], tint(color, -49));
  c.strokeStyle = "rgba(255,255,255,.45)";
  c.lineWidth = 1;
  c.beginPath(); c.moveTo(apex.x, apex.y); c.lineTo(middle.x, middle.y); c.stroke();
}