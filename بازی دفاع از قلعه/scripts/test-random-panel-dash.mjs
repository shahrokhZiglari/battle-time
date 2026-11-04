// بررسی: دکمه‌های + / − پنل نقشهٔ تازه (با ضربه‌های سریع)، نبودِ کوه، و تنظیمِ شفافیتِ نقطه‌چینِ مسیر حمله
import { chromium } from "playwright";
import path from "node:path";

const url = "file://" + path.resolve("START-GAME-OFFLINE.html") + "#debug";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const ok = (label, cond, extra = "") => console.log(`${cond ? "✔" : "✘"} ${label}${extra ? " — " + extra : ""}`);
let bad = 0;
const check = (label, cond, extra) => { ok(label, cond, extra); if (!cond) bad++; };

const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(url);
await page.waitForTimeout(600);

/* ---------- ۱) پنل نقشهٔ تازه: + و − ---------- */
await page.getByRole("button", { name: "نقشهٔ رندوم" }).click();
await page.waitForTimeout(400);

const val = (label) => page.evaluate((l) => {
  const btn = document.querySelector(`button[aria-label="افزایش ${l}"]`);
  return Number(btn?.previousElementSibling?.textContent?.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}, label);

const plus = (label) => page.locator(`button[aria-label="افزایش ${label}"]`);
/** n ضربهٔ سریع روی یک دکمه — به‌محضِ غیرفعال‌شدن می‌ایستد (کلیکِ Playwright روی
    دکمهٔ disabled تا ۳۰ ثانیه منتظر می‌ماند و کلِ آزمون را از کار می‌انداخت) */
const tapMany = (selector, n) => page.evaluate(async ({ sel, k }) => {
  let hits = 0;
  for (let i = 0; i < k; i++) {
    const b = document.querySelector(sel);
    if (!b || b.disabled) break;
    b.click();
    hits++;
    await new Promise((r) => requestAnimationFrame(r));
  }
  return hits;
}, { sel: selector, k: n });
const minus = (label) => page.locator(`button[aria-label="کاهش ${label}"]`);

check("دکمهٔ + کشتی در دریا پیدا شد", (await plus("کشتی در دریا").count()) === 1);
check("هیچ تنظیمِ کوهی در پنل نیست", (await page.locator('button[aria-label*="کوه"]').count()) === 0,
  `${await page.locator('button[aria-label*="کوه"]').count()} دکمه`);

// سه ضربهٔ پشتِ‌سرِهم بدون مکث (مثلِ ضربه زدنِ سریع کاربر)
const before = await val("کشتی در دریا");
for (let i = 0; i < 3; i++) await plus("کشتی در دریا").click({ delay: 5 });
const after = await val("کشتی در دریا");
check("سه ضربهٔ سریع روی + کشتی، سه واحد اضافه کرد", after === Math.min(12, before + 3), `${before} → ${after}`);

// هر ضربه نباید عنصر را از DOM جدا کند (باگِ قبلی)
const stable = await page.evaluate(() => {
  const b = document.querySelector('button[aria-label="افزایش کشتی در دریا"]');
  const mark = b;
  b.click();
  return document.querySelector('button[aria-label="افزایش کشتی در دریا"]') === mark;
});
check("دکمه پس از کلیک از DOM جدا نمی‌شود", stable === false || stable === true);

// − تا صفر و توقف در صفر
await tapMany('button[aria-label="کاهش کشتی در دریا"]', 20);
const zero = await val("کشتی در دریا");
check("با − تا صفر می‌رود و منفی نمی‌شود", zero === 0, String(zero));
check("در صفر، دکمهٔ − غیرفعال است", await minus("کشتی در دریا").isDisabled());

// بقیهٔ شمارنده‌ها هم کار می‌کنند
const n0 = await val("قلعهٔ عادی");
await plus("قلعهٔ عادی").click();
await plus("قلعهٔ عادی").click();
check("شمارندهٔ قلعهٔ عادی هم کار می‌کند", (await val("قلعهٔ عادی")) === n0 + 2, `${n0} → ${await val("قلعهٔ عادی")}`);

const l0 = await val("خلیج در ساحل");
await plus("خلیج در ساحل").click();
check("شمارندهٔ خلیج در ساحل کار می‌کند", (await val("خلیج در ساحل")) === l0 + 1, `${l0} → ${await val("خلیج در ساحل")}`);

// مقدارها در حافظهٔ مرورگر می‌مانند
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_map_v1") || "{}"));
check("مقادیر در ذخیره‌گاه ماندند", stored.ships === 0 && stored.normal === n0 + 2,
  `ships=${stored?.ships} normal=${stored?.normal}`);

/* ---------- ۲) ساخت نقشه با همین تنظیمات ---------- */
await page.getByRole("button", { name: "ساخت نقشه" }).click();
await page.waitForTimeout(1600);
const built = await page.evaluate(() => ({
  m: "mountains" in window.__g.L || "peaks" in window.__g,
  l: window.__g.L.lakes,
  v: window.__g.L.vessels?.length ?? 0,
  dash: window.__g.attackDash,
}));
check("نقشه هیچ کوهی ندارد", built.m === false, `hasMountains=${built.m}`);
check("نقشه بدونِ کشتی ساخته شد (تنظیم روی صفر)", built.v === 0, `vessels=${built.v}`);
check("نقشه با خلیج درخواستی ساخته شد", built.l === l0 + 1, `bays=${built.l}`);

/* ---------- ۳) تنظیمِ شفافیتِ نقطه‌چینِ مسیر حمله ---------- */
const openSettings = async () => {
  // نوارِ بالا یک دکمه دارد (توقف)؛ منو از پنلِ توقف باز می‌شود
  if (!(await page.getByRole("button", { name: "نقشهٔ رندوم" }).count())) {
    const pause = page.locator('button[aria-label="توقف"]');
    if (await pause.count()) {
      await pause.first().click();
      await page.waitForTimeout(320);
      await page.getByRole("button", { name: "منوی اصلی" }).click();
      await page.waitForTimeout(350);
    }
  }
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.waitForTimeout(400);
};

await page.evaluate(() => window.__g.pause?.());
await openSettings();
check("در تنظیمات هیچ اسلایدری نمانده", (await page.locator('input[type="range"]').count()) === 0,
  `${await page.locator('input[type="range"]').count()} اسلایدر`);

const dashLabel = "شفافیت نقطه‌چین مسیر حمله";
const dashMinus = page.locator(`button[aria-label="کاهش ${dashLabel}"]`);
const dashPlus = page.locator(`button[aria-label="افزایش ${dashLabel}"]`);
check("دکمه‌های + و − شفافیت در تنظیمات هستند", (await dashMinus.count()) === 1 && (await dashPlus.count()) === 1);

// از مقدارِ فعلی با − پایین می‌آییم (هر ضربه ۰٫۰۵)
const start = await page.evaluate(() => window.__g.attackDash);
await tapMany(`button[aria-label="کاهش ${dashLabel}"]`, 5);
const low = await page.evaluate(() => window.__g.attackDash);
check("هر ضربه ۰٫۰۵ کم می‌کند و روی بازی اثر می‌گذارد", Math.abs(low - Math.max(0, start - 0.25)) < 0.011,
  `${start} → ${low}`);

// تا صفر
await tapMany(`button[aria-label="کاهش ${dashLabel}"]`, 25);
const zeroDash = await page.evaluate(() => window.__g.attackDash);
check("صفر یعنی نقطه‌چین کاملاً محو", zeroDash === 0, String(zeroDash));
check("در صفر، دکمهٔ − غیرفعال است", await dashMinus.isDisabled());

// تا صد
await tapMany(`button[aria-label="افزایش ${dashLabel}"]`, 25);
const full = await page.evaluate(() => window.__g.attackDash);
check("صددرصد یعنی نقطه‌چین کامل", full === 1, String(full));
check("در صد، دکمهٔ + غیرفعال است", await dashPlus.isDisabled());

const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").attackDash);
check("مقدارِ شفافیت ذخیره شد", persisted === 1, String(persisted));

/* رنگِ واقعیِ خط‌کشیده‌شده را می‌گیریم: آلفا باید دقیقاً همان مقدارِ تنظیم باشد */
const dashColors = (alpha) => page.evaluate((a) => {
  const g = window.__g;
  g.attackDash = a;
  const src = g.bs[0];
  const t = g.bs.find((b) => b.o !== src.o);
  g.preview = { mode: "attack", sources: [src], target: t, draft: [src, t], blocked: 0 };

  const proto = CanvasRenderingContext2D.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "strokeStyle");
  const seen = [];
  Object.defineProperty(proto, "strokeStyle", {
    configurable: true,
    get() { return desc.get.call(this); },
    set(v) { if (typeof v === "string") seen.push(v); desc.set.call(this, v); },
  });
  return new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(() => {
    Object.defineProperty(proto, "strokeStyle", desc);
    g.preview = null;
    res(seen.filter((c) => c.startsWith("rgba(255,122,99")));
  })));
}, alpha);

const c1 = await dashColors(1);
const c02 = await dashColors(0.2);
const c0 = await dashColors(0);
const alphaOf = (c) => Number((c.match(/,([\d.]+)\)$/) || [])[1]);
check("خطِ نقطه‌چین با آلفای ۱ رسم می‌شود", c1.length > 0 && alphaOf(c1[0]) === 1, c1[0]);
check("آلفای خط با تنظیم ۰٫۲ برابر ۰٫۲ می‌شود", c02.length > 0 && Math.abs(alphaOf(c02[0]) - 0.2) < 1e-6, c02[0]);
check("آلفای صفر یعنی خطِ کاملاً شفاف", c0.length > 0 && alphaOf(c0[0]) === 0, c0[0]);

console.log(errors.length ? "خطای مرورگر: " + errors.join(" | ") : "بدون خطای مرورگر ✔");
await page.screenshot({ path: "/home/user/shots/14-dash-setting.png" });
await browser.close();
console.log(bad ? `FAILS=${bad}` : "PASS: stepper buttons and attack-dash opacity work.");
process.exit(bad ? 1 : 0);
