/* آزمون مسیر رسم با context ساختگی — نباید هیچ خطایی پرتاب شود */
import { Game } from "../src/game/engine";
import { render } from "../src/game/render";
import { LEVELS } from "../src/game/config";
import { createRandomLevel, DEFAULT_RANDOM_MAP } from "../src/game/map";

const grad = { addColorStop: () => {} };
const target: Record<string, unknown> = {
  canvas: { width: 1280, height: 800 },
  measureText: () => ({ width: 42 }),
  createLinearGradient: () => grad,
  createRadialGradient: () => grad,
  roundRect: () => {},
  setTransform: () => {},
};
const ctx = new Proxy(target, {
  get: (t, k: string) => (k in t ? t[k] : () => {}),
  set: (t, k: string, v) => ((t[k] = v), true),
}) as unknown as CanvasRenderingContext2D;

let fails = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    console.log("✔ " + name);
  } catch (e) {
    fails++;
    console.log("✘ " + name + " — " + (e as Error).message);
  }
};

for (let li = 0; li < LEVELS.length; li++) {
  const g = new Game(li);
  check("مرحله " + (li + 1) + ": رسم پایه", () => render(ctx, g, 1.2, 1280, 800, 2));

  check("مرحله " + (li + 1) + ": رسم در حالت کشیدن", () => {
    const own = g.bs.filter((b) => b.o === 1);
    const foe = g.bs.find((b) => b.o !== 1)!;
    g.down(1, own[0].x, own[0].y, false);
    for (let k = 1; k <= 12; k++) g.move(1, own[0].x + ((foe.x - own[0].x) * k) / 12, own[0].y + ((foe.y - own[0].y) * k) / 12);
    render(ctx, g, 3.4, 1280, 800, 2);
    g.up(1, foe.x, foe.y);
    render(ctx, g, 3.6, 1280, 800, 2);
  });

  check("مرحله " + (li + 1) + ": رسم پس از ۶۰ ثانیه نبرد", () => {
    g.onToast = () => {};
    g.onFinish = () => {};
    for (let k = 0; k < 3600; k++) g.step(1 / 60);
    g.sels = g.bs.filter((b) => b.o === 1);
    const foe = g.bs.find((b) => b.o === 2) || g.bs[0];
    g.hover = foe;
    g.preview = g.computePreview();
    render(ctx, g, 61.5, 1440, 700, 1.5);
  });
}

check("رسم بدون بازی (منو پیش از آماده‌سازی)", () => render(ctx, null, 0.5, 900, 500, 1));
check("دمو", () => {
  const d = new Game(2, true);
  d.onDemoReset = () => {};
  for (let k = 0; k < 4000; k++) d.step(1 / 60);
  render(ctx, d, 40, 1024, 640, 2);
});
check("اندازه‌های مختلف صفحه", () => {
  const g = new Game(0);
  for (const [w, h] of [
    [360, 640],
    [768, 1024],
    [1920, 1080],
    [2560, 1080],
  ])
    render(ctx, g, 2, w, h, 2);
});

check("رسم نقشهٔ سه بازیکنه با ۴۰ قلعه و برج", () => {
  const level = createRandomLevel(DEFAULT_RANDOM_MAP);
  const g = new Game(LEVELS.length, false, level);
  for (let k = 0; k < 180; k++) g.step(1 / 60);
  g.sels = g.bs.filter((b) => b.o === 1);
  const target = g.bs.find((b) => b.o > 1)!;
  g.hover = target;
  g.preview = g.computePreview();
  render(ctx, g, 3, 1440, 900, 2);
  const fitScale = g.view.s;
  g.zoomBy(0.4);
  g.panBy(80, -45);
  render(ctx, g, 4, 1440, 900, 2);
  if (!(g.view.s > fitScale && g.view.ox !== (1440 - g.worldWidth * g.view.s) / 2)) throw new Error("zoom and pan camera was not applied");
});

check("رسم افکت جدید فتح در مراحل مختلف پیشرفت (۰٪ تا ۱۰۰٪)", () => {
  const g = new Game(0);
  const src = g.bs.find((b) => b.o === 1)!;
  const dst = g.bs.find((b) => b.o !== 1)!;
  src.army.normal = 30;
  dst.army = { normal: 2, fast: 0, heavy: 0 };
  g.sendN(src, dst, 25, [src, dst]);
  g.arrive(g.sq.shift()!);
  if (!g.fx.some((f) => f.k === "capture")) throw new Error("capture effect was not emitted");
  for (let step = 0; step <= 10; step++) {
    render(ctx, g, 1 + step * 0.1, 1280, 800, 2);
    g.step(0.1);
  }
});

console.log(fails ? `\n${fails} خطا در رسم` : "\nمسیر رسم سالم ✔");
process.exit(fails ? 1 : 0);
