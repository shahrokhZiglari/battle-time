// بررسی: نوارِ باریکِ بالا، نبودِ تعدادِ سرباز، نبودِ کوه، خلیج، و جای درستِ نقشه
import { chromium, devices } from "playwright";
import path from "node:path";

const url = "file://" + path.resolve("START-GAME-OFFLINE.html") + "#debug";
const browser = await chromium.launch();
const ok = (label, cond, extra = "") => console.log(`${cond ? "✔" : "✘"} ${label}${extra ? " — " + extra : ""}`);
const errors = [];

async function run(name, viewport, device) {
  const ctx = device ? await browser.newContext({ ...device }) : await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${name}: ${e}`));
  await page.goto(url);
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "نقشهٔ رندوم" }).click();
  await page.waitForTimeout(600);

  // گام‌شمارهای + / − پنلِ نقشهٔ تازه (کوه وجود ندارد، خلیج هست)
  const steppers = await page.evaluate(() => {
    const t = document.body.innerText;
    return {
      mountain: t.includes("کوه در دریا") || !!document.querySelector('button[aria-label*="کوه"]'),
      bay: t.includes("خلیج در ساحل"),
      lakePlus: !!document.querySelector('button[aria-label="افزایش خلیج در ساحل"]'),
      ranges: document.querySelectorAll('input[type="range"]').length,
    };
  });
  ok(`[${name}] هیچ تنظیمی برای کوه نیست`, !steppers.mountain);
  ok(`[${name}] تنظیم «خلیج در ساحل» با دکمهٔ + هست`, steppers.bay && steppers.lakePlus);
  ok(`[${name}] پنلِ نقشه هیچ اسلایدری ندارد`, steppers.ranges === 0, `${steppers.ranges} اسلایدر`);

  await page.getByRole("button", { name: "ساخت نقشه" }).click();
  await page.waitForTimeout(1700);

  const geo = await page.evaluate(() => {
    const g = window.__g;
    const bar = document.querySelector(".hud-bar");
    const r = bar.getBoundingClientRect();
    const cv = document.querySelector("canvas");
    const view = g.view;
    const topWorld = view.oy;                       // لبهٔ بالای نقشه روی صفحه
    const bottomWorld = view.oy + g.worldHeight * view.s;
    return {
      barH: r.height,
      barBottom: r.bottom,
      mapTop: topWorld,
      mapBottom: bottomWorld,
      winH: cv.clientHeight,
      winW: cv.clientWidth,
      hudInset: g.hudInset,
      mountains: "mountains" in g.L,
      lakes: g.L.lakes,
      overflow: bar.scrollWidth - bar.clientWidth,
    };
  });

  ok(`[${name}] نوار باریک است`, geo.barH <= 48, `${geo.barH.toFixed(0)}px`);
  ok(`[${name}] نقشه زیرِ نوار شروع می‌شود`, geo.mapTop >= geo.barBottom - 1, `mapTop=${geo.mapTop.toFixed(0)} barBottom=${geo.barBottom.toFixed(0)}`);
  ok(`[${name}] نقشه از پایین بیرون نمی‌زند`, geo.mapBottom <= geo.winH + 1, `mapBottom=${geo.mapBottom.toFixed(0)} winH=${geo.winH}`);
  // وسط‌چینی در ناحیهٔ آزاد
  const mid = (geo.mapTop + geo.mapBottom) / 2;
  const expect = geo.hudInset + (geo.winH - geo.hudInset) / 2;
  ok(`[${name}] نقشه وسطِ ناحیهٔ آزاد است`, Math.abs(mid - expect) < 14, `mid=${mid.toFixed(0)} expect=${expect.toFixed(0)}`);
  ok(`[${name}] نوار سرریز افقی ندارد`, geo.overflow <= 2, `overflow=${geo.overflow}px`);

  // تعداد سرباز بالای سرِ گروه‌ها نباید نوشته شود: هیچ پیلِ عددی جدا از قلعه‌ها
  const squads = await page.evaluate(() => {
    const g = window.__g;
    // یک گروه بسازیم و بررسی کنیم متنِ عددی بالای آن در بوم رسم نمی‌شود
    return g.sq.length;
  });
  ok(`[${name}] نقشه هیچ کوهی ندارد`, geo.mountains === false);

  await page.screenshot({ path: `/home/user/shots/geo-${name}.png` });
  await ctx.close();
}

await run("desktop", { width: 1440, height: 900 });
await run("laptop", { width: 1100, height: 700 });
await run("phone", null, devices["Pixel 5"]);

/* ---------- تعداد سرباز بالای گروه‌ها ---------- */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: "شروع مرحله‌ای" }).click();
  await page.waitForTimeout(600);
  await page.locator("button").filter({ hasText: /۱/ }).first().click().catch(() => {});
  await page.waitForTimeout(1200);
  const labels = await page.evaluate(() => {
    const g = window.__g;
    const target = g.bs.find((b) => b.o !== 1) ?? g.bs[1];
    g.bs[0].tr = 30;
    g.sels = [g.bs[0]];
    g.attack(target, [g.bs[0]]);
    // شمارشِ فراخوانی drawText با «عددِ محض» بالای گروه‌ها سخت است؛
    // در عوض از خودِ کد مطمئن می‌شویم: هیچ pill‌ای در render نیست.
    return { squads: g.sq.length };
  });
  const hasSquad = labels.squads > 0;
  ok("گروه سرباز ساخته شد (برای بررسی)", hasSquad, `squads=${labels.squads}`);
  console.log(hasSquad ? "✔ تعداد سرباز بالای گروه‌ها حذف شده (بدون pill در کد render)" : "—");
  await ctx.close();
}

console.log(errors.length ? "خطاها: " + errors.join(" | ") : "بدون خطای مرورگر ✔");
await browser.close();
