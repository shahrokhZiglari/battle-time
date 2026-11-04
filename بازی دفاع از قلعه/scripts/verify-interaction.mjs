// بررسی رفتاریِ درخواست‌های جدید در مرورگر واقعی (#debug)
import { chromium, devices } from "playwright";
import path from "node:path";

const url = "file://" + path.resolve("START-GAME-OFFLINE.html") + "#debug";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
const ok = (label, cond, extra = "") => console.log(`${cond ? "✔" : "✘"} ${label}${extra ? " — " + extra : ""}`);

await page.goto(url);
await page.waitForTimeout(700);

// شروع یک مرحله: دکمهٔ «بازی»/«شروع»/مرحلهٔ اول
// نقشهٔ رندوم = نقشهٔ بزرگ (برای آزمون جابجایی)
await page.getByRole("button", { name: "نقشهٔ رندوم" }).click();
await page.waitForTimeout(800);
const make = page.getByRole("button", { name: "ساخت نقشه" });
if (await make.count()) await make.click({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(1600);
// اگر به فهرست مراحل برگشتیم، مرحلهٔ اول را باز می‌کنیم
if (!(await page.evaluate(() => !!window.__g))) {
  await page.getByRole("button", { name: "شروع مرحله‌ای" }).click().catch(() => {});
  await page.waitForTimeout(600);
  const lv = page.locator("button").filter({ hasText: /۱/ }).first();
  if (await lv.count()) await lv.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(1400);
}
await page.waitForTimeout(800);

const state = () => page.evaluate(() => {
  const g = window.__g;
  return g ? { panX: g.panX, panY: g.panY, zoom: g.zoom, ptr: !!g.ptr, sels: g.sels.length, castles: g.bs.length, trail: g.ghostTrail.length } : null;
});
let s0 = await state();
if (!s0) { console.log("✘ بازی ساخته نشد"); process.exit(1); }
ok("بازی ساخته شد", s0.castles > 0, `قلعه‌ها=${s0.castles}`);

const cbox = await page.locator("canvas").first().boundingBox();
// موقعیت صفحه‌ای یک قلعه
// نخستین قلعه‌ای که کامل داخل قاب دیده می‌شود
const castleScreen = async () => page.evaluate(() => {
  const g = window.__g; const cv = document.querySelector("canvas"); const r = cv.getBoundingClientRect();
  for (const b of g.bs) {
    const x = r.left + g.view.ox + b.x * g.view.s;
    const y = r.top + g.view.oy + (b.y - 18) * g.view.s;
    if (x > r.left + 60 && x < r.right - 60 && y > r.top + 120 && y < r.bottom - 60) return { x, y };
  }
  return null;
});

const cursorNow = () => page.evaluate(() => document.querySelector("canvas")?.style.cursor);

// ۱) کرسر روی قلعه = کرسر انتخاب
const c0 = await castleScreen();
await page.mouse.move(c0.x, c0.y);
await page.waitForTimeout(120);
ok("کرسر روی قلعه «انتخاب» است", (await cursorNow()) === "pointer", await cursorNow());

// ۲) کرسر روی زمین خالی = کرسر جابجایی
await page.mouse.move(cbox.x + 12, cbox.y + cbox.height - 12);
await page.waitForTimeout(120);
ok("کرسر روی زمین «جابجایی» است", (await cursorNow()) === "grab", await cursorNow());

// ۳) کشیدن روی زمین خالی نقشه را جابجا می‌کند (و مسیر حمله رسم نمی‌شود)
// نخست کمی بزرگ‌نمایی می‌کنیم تا نقشه بزرگ‌تر از قاب شود و جابجایی معنا پیدا کند
await page.evaluate((c) => {
  const g = window.__g;
  g.zoomAt(0.9, c.x, c.y, c.w, c.h);
}, { x: cbox.width / 2, y: cbox.height / 2, w: cbox.width, h: cbox.height });
await page.waitForTimeout(300);
const before = await state();
await page.mouse.move(cbox.x + cbox.width * 0.5, cbox.y + cbox.height * 0.94);
await page.mouse.down();
await page.mouse.move(cbox.x + cbox.width * 0.5 + 120, cbox.y + cbox.height * 0.94 + 40, { steps: 15 });
await page.mouse.up();
await page.waitForTimeout(250);
const after = await state();
ok("کشیدن روی زمین، نقشه را جابجا کرد", Math.abs(after.panX - before.panX) > 5 || Math.abs(after.panY - before.panY) > 5,
   `Δx=${(after.panX - before.panX).toFixed(1)} Δy=${(after.panY - before.panY).toFixed(1)}`);
ok("کشیدن روی زمین، مسیر حمله رسم نکرد", after.trail === 0, `trail=${after.trail}`);

// ۳-ب) جابجایی نقشه نباید انتخاب فعلی را پاک کند
const selKept = await page.evaluate(() => {
  const g = window.__g; const b = g.bs[0]; g.sels = [b]; g.sel = b; return g.sels.length;
});
await page.mouse.move(cbox.x + cbox.width * 0.5, cbox.y + cbox.height * 0.9);
await page.mouse.down();
await page.mouse.move(cbox.x + cbox.width * 0.5 - 40, cbox.y + cbox.height * 0.9 - 30, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(150);
const selAfterPan = await page.evaluate(() => window.__g.sels.length);
ok("جابجایی نقشه انتخاب فعلی را حفظ می‌کند", selAfterPan === selKept, `sels=${selAfterPan}`);

// ۴) کشیدن از روی قلعه هنوز مسیر حمله/پیش‌نمایش می‌سازد
const c1 = await castleScreen();
await page.mouse.move(c1.x, c1.y);
await page.mouse.down();
await page.mouse.move(c1.x + 60, c1.y + 50, { steps: 8 });
const mid = await state();
await page.mouse.up();
ok("کشیدن از روی قلعه پیش‌نمایش/انتخاب می‌سازد", mid.ptr === true, `ptr=${mid.ptr}`);

// ۵) فرمان انتقال: انتخاب‌ها پس از انتقال خالی می‌شوند
const reinforce = await page.evaluate(() => {
  const g = window.__g;
  // دو قلعهٔ دیگر را موقتاً به بازیکن می‌دهیم تا مسیر انتقال کامل آزموده شود
  const pool = g.bs.filter((b) => b.o !== 1);
  const backup = pool.slice(0, 2).map((b) => [b, b.o]);
  backup.forEach(([b]) => { b.o = 1; });
  const own = g.bs.filter((b) => b.o === 1);
  if (own.length < 2) return { skipped: true };
  own.forEach((b) => { b.tr = 40; });
  g.sels = own.slice(0, 2); g.sel = g.sels[0];
  const target = own[own.length - 1];
  const sent = g.reinforce(target, own.slice(0, 2));
  const result = { sent, sels: g.sels.length, sel: g.sel === null };
  backup.forEach(([b, o]) => { b.o = o; }); // بازگرداندن مالکیت اصلی
  return result;
});
if (!reinforce.skipped) {
  ok("انتقال نیرو انجام شد", reinforce.sent > 0, `sent=${reinforce.sent}`);
  ok("پس از انتقال، قلعه‌ها از حالت انتخاب خارج شدند", reinforce.sels === 0 && reinforce.sel === true, `sels=${reinforce.sels}`);
}

// ۶) کادر توان رزمی: بازیکن بی‌قلعه حذف می‌شود
// کادر توان رزمی حالا یک نوارِ باریک در همان HUD است: هر بازیکن یک سگمنتِ رنگی
const rowsNow = () => page.evaluate(() =>
  document.querySelectorAll('[aria-label="توان رزمی بازیکنان"] span > span').length);
const rowsBefore = await rowsNow();
const factions = await page.evaluate(() => {
  const g = window.__g;
  const owners = [...new Set(g.bs.map((b) => b.o))].filter((o) => o !== 0);
  const victim = owners.find((o) => o !== 1);
  if (victim === undefined) return { skipped: true };
  const lost = g.bs.filter((b) => b.o === victim);
  lost.forEach((b) => { b.o = 1; });
  return new Promise((res) => setTimeout(() => {
    const rows = [...document.querySelectorAll('[aria-label="توان رزمی بازیکنان"] span > span')].map(() => "");
    lost.forEach((b) => { b.o = victim; });
    res({ victim, rows });
  }, 450));
});
if (!factions.skipped) {
  ok("پیش از حذف، هر دو طرف در کادر بودند", rowsBefore >= 2, `rows=${rowsBefore}`);
  ok("بازیکن بدون قلعه از کادر توان رزمی حذف شد", factions.rows.length === rowsBefore - 1, `segments=${factions.rows.length} (before ${rowsBefore})`);
}

// ۷) فن‌فار فتح قلعه بدون خطا اجرا می‌شود
const fanfare = await page.evaluate(async () => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.title === "صدا");
  if (btn && btn.textContent?.includes("🔇")) btn.click();
  const mod = window.__sfx;
  if (!mod) return "no-hook";
  try { mod.capture(); return "ok"; } catch (e) { return "err:" + e; }
});
console.log("صدای فتح:", fanfare);

// ۸) موبایل: کشیدن با انگشت روی زمین، نقشه را جابجا می‌کند
{
  const mobile = await browser.newContext({ ...devices["Pixel 5"] });
  const mp = await mobile.newPage();
  const merr = [];
  mp.on("pageerror", (e) => merr.push(String(e)));
  await mp.goto(url);
  await mp.waitForTimeout(700);
  await mp.getByRole("button", { name: "نقشهٔ رندوم" }).click().catch(() => {});
  await mp.waitForTimeout(700);
  await mp.getByRole("button", { name: "ساخت نقشه" }).click().catch(() => {});
  await mp.waitForTimeout(1500);
  const mb = await mp.locator("canvas").first().boundingBox();
  const st = () => mp.evaluate(() => ({ px: window.__g.panX, py: window.__g.panY, z: window.__g.zoom }));
  // زوم با دکمهٔ + تا نقشه بزرگ‌تر از قاب شود
  await mp.locator("button[title='بزرگ‌نمایی']").first().click().catch(() => {});
  await mp.waitForTimeout(500);
  const m0 = await st();
  // کشیدن با لمسِ واقعی (CDP) — شناسهٔ اشاره‌گر معتبر است
  const mcdp = await mobile.newCDPSession(mp);
  const tx = mb.x + mb.width * 0.5, ty = mb.y + mb.height * 0.88;
  await mcdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: tx, y: ty, id: 1 }] });
  await mp.waitForTimeout(60);
  for (let i = 1; i <= 8; i++) {
    await mcdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: tx + i * 9, y: ty + i * 5, id: 1 }] });
    await mp.waitForTimeout(20);
  }
  await mcdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await mp.waitForTimeout(250);
  const m1 = await st();
  ok("موبایل: لمس و کشیدن روی زمین نقشه را جابجا می‌کند", Math.abs(m1.px - m0.px) > 3 || Math.abs(m1.py - m0.py) > 3,
     `Δx=${(m1.px - m0.px).toFixed(1)} Δy=${(m1.py - m0.py).toFixed(1)}`);
  if (merr.length) console.log("خطای موبایل:", merr.join(" | "));
  await mobile.close();
}

console.log(errors.length ? "خطاها: " + errors.join(" | ") : "بدون خطای مرورگر ✔");
await page.screenshot({ path: "/home/user/shots/5-new.png" });
await browser.close();
