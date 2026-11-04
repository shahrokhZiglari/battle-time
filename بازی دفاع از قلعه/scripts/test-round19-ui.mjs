// دورِ ۱۹ — چهار خواستهٔ کاربر روی رابطِ واقعی، در یک آزمون:
//   ۱) تنظیمات با هر تغییر ذخیره می‌شود و با «نسخهٔ تازهٔ بازی» هم از دست نمی‌رود
//   ۲) هیچ اسلایدری نمانده: همه‌چیز دکمهٔ + و − است، فونت یک پله بزرگ‌تر،
//      هیچ متنی بریده/پنهان/روی‌هم‌افتاده نیست و پنل در گوشی اسکرول نمی‌خواهد
//   ۳) هیچ کوهی در هیچ نقشه‌ای نیست (نه داده، نه گرافیک، نه تنظیم)
//   ۴) کشتی‌ها ظاهرِ خودشان را دارند؛ بخشی آرام روی آب حرکت می‌کنند و
//      بخشی سرِ جایشان می‌مانند — بدونِ افتِ فریم
import { chromium, devices } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const url = "file://" + path.resolve("START-GAME-OFFLINE.html") + "#debug";
const browser = await chromium.launch();
let bad = 0;
const check = (label, cond, extra = "") => {
  console.log(`${cond ? "✔" : "✘"} ${label}${extra ? " — " + extra : ""}`);
  if (!cond) bad++;
};
const errors = [];

/* ---------------- تنظیمات روی صفحه ---------------- */
const measurePanel = (page) => page.evaluate(() => {
  const plates = [...document.querySelectorAll(".plate")].filter((el) => el.textContent?.includes("تنظیمات"));
  const panel = plates.pop();
  if (!panel) return null;
  const rect = panel.getBoundingClientRect();
  const overflowX = panel.scrollWidth - panel.clientWidth;
  const overflowY = panel.scrollHeight - panel.clientHeight;
  const clipped = [];
  const tiny = [];
  const overlaps = [];
  for (const el of panel.querySelectorAll("*")) {
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    if (el.children.length === 0 && (el.textContent || "").trim()) {
      // متنِ بریده: محتوا از جعبه بزرگ‌تر است و overflow پنهانش می‌کند
      if ((el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1) &&
          cs.overflow !== "visible" && cs.textOverflow !== "ellipsis") {
        clipped.push((el.textContent || "").trim().slice(0, 20));
      }
      const size = parseFloat(cs.fontSize);
      if (size < 11) tiny.push(`${(el.textContent || "").trim().slice(0, 14)}=${size}px`);
    }
  }
  // هم‌پوشانیِ عمودیِ دو ردیفِ کنارِ‌هم
  const rows = [...panel.querySelectorAll("button")].map((b) => b.getBoundingClientRect());
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ix > 3 && iy > 3) overlaps.push(`${Math.round(ix)}x${Math.round(iy)}`);
    }
  }
  return {
    overflowX,
    overflowY,
    top: Math.round(rect.top),
    bottom: Math.round(rect.bottom),
    vh: innerHeight,
    clipped: clipped.slice(0, 6),
    tiny: tiny.slice(0, 6),
    overlaps: overlaps.slice(0, 5),
    sliders: panel.querySelectorAll('input[type="range"]').length,
    steps: panel.querySelectorAll('button[aria-label^="کاهش "], button[aria-label^="افزایش "]').length,
  };
});

/* ---------------- ۱ و ۲: پنلِ تنظیمات در چهار اندازه ---------------- */
const sizes = [
  { name: "phone-393", viewport: { width: 393, height: 727 } },
  { name: "phone-360", viewport: { width: 360, height: 640 } },
  { name: "tablet-412", viewport: { width: 412, height: 915 } },
  { name: "desktop", viewport: { width: 1366, height: 900 } },
];
for (const size of sizes) {
  const ctx = await browser.newContext({ viewport: size.viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${size.name}: ${e.message}`));
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "تنظیمات" }).first().click();
  await page.waitForTimeout(400);
  const m = await measurePanel(page);
  check(`[${size.name}] پنلِ تنظیمات باز شد`, !!m);
  if (m) {
    check(`[${size.name}] هیچ اسلایدری نمانده`, m.sliders === 0, `${m.sliders} اسلایدر`);
    check(`[${size.name}] ۱۵ ردیفِ صدا با دکمهٔ + و − هست`, m.steps >= 30, `${m.steps} دکمهٔ گام`);
    check(`[${size.name}] هیچ متنی بریده نشده`, m.clipped.length === 0, m.clipped.join(" | "));
    check(`[${size.name}] هیچ متنی کوچک‌تر از ۱۱ پیکسل نیست`, m.tiny.length === 0, m.tiny.join(" | "));
    check(`[${size.name}] هیچ دکمه‌ای روی دکمهٔ دیگر نیفتاده`, m.overlaps.length === 0, m.overlaps.join(" | "));
    check(`[${size.name}] سرریزِ افقی ندارد`, m.overflowX <= 1, `${m.overflowX}px`);
    check(`[${size.name}] بدونِ اسکرول جا می‌شود و کامل دیده می‌شود`,
      m.overflowY <= 1 && m.top >= -1 && m.bottom <= m.vh + 1,
      `overflowY=${m.overflowY} top=${m.top} bottom=${m.bottom} vh=${m.vh}`);
  }
  // فونتِ یک پله بزرگ‌تر: نامِ تنظیم‌ها ۱۱٫۵ و مقدارها ۱۲ پیکسل (دورِ ۱۸: ۱۰ و ۱۱)
  const fonts = await page.evaluate(() => {
    const panel = [...document.querySelectorAll(".plate")].filter((el) => el.textContent?.includes("تنظیمات")).pop();
    const label = [...panel.querySelectorAll("span")].find((el) => el.textContent?.trim() === "طبیعت");
    const value = [...panel.querySelectorAll("span")].find((el) => /٪$/.test(el.textContent?.trim() || ""));
    return { label: label ? parseFloat(getComputedStyle(label).fontSize) : 0, value: value ? parseFloat(getComputedStyle(value).fontSize) : 0 };
  });
  check(`[${size.name}] فونتِ برچسب‌ها یک پله بزرگ‌تر از دورِ ۱۸ است`, fonts.label >= 12, `${fonts.label}px`);
  check(`[${size.name}] فونتِ مقدارها هم بزرگ‌تر شده`, fonts.value >= 12, `${fonts.value}px`);
  await page.screenshot({ path: `/home/user/shots/r19-settings-${size.name}.png` });
  await ctx.close();
}

/* ---------------- ۱: ماندگاری در «نسخهٔ تازهٔ بازی» ---------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 727 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`persist: ${e.message}`));
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "تنظیمات" }).first().click();
  await page.waitForTimeout(400);

  // چند تنظیم را با + و − عوض کن
  const tap = (label, dir, n) => page.evaluate(async ({ l, d, k }) => {
    const sel = `button[aria-label="${d === "up" ? "افزایش" : "کاهش"} ${l}"]`;
    let c = 0;
    for (let i = 0; i < k; i++) {
      const b = document.querySelector(sel);
      if (!b || b.disabled) break;
      b.click(); c++;
      await new Promise((r) => requestAnimationFrame(r));
    }
    return c;
  }, { l: label, d: dir, k: n });

  await tap("بلندی صدای طبیعت", "down", 4);
  await tap("بلندی صدای فتح", "down", 2);
  await tap("سرعت چرخش نورها", "up", 2);
  await tap("شفافیت نقطه‌چین مسیر حمله", "down", 3);
  await page.locator('button[aria-label="سرعت بازی ۳ برابر"]').click();
  await page.waitForTimeout(350);

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}"));
  check("هر تغییر همان‌جا ذخیره شد",
    Math.abs((saved.volumes?.ambient ?? 1) - 0.8) < 0.011 && Math.abs((saved.volumes?.capture ?? 1) - 0.9) < 0.011 &&
    saved.speed === 3 && Math.abs(saved.attackDash - 0.85) < 0.011,
    `ambient=${saved.volumes?.ambient} capture=${saved.volumes?.capture} speed=${saved.speed} dash=${saved.attackDash}`);

  // «نسخهٔ تازهٔ بازی»: همان فایل، اما در پوشه‌ای دیگر با آدرس دیگر.
  // فیلدِ یک نسخهٔ آیندهٔ بازی هم پیش از اجرای برنامه کاشته می‌شود تا مطمئن
  // شویم نوشتنِ تنظیمات آن را دور نمی‌ریزد.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "castle-v19-"));
  const copy = path.join(dir, "START-GAME-OFFLINE.html");
  fs.copyFileSync(path.resolve("START-GAME-OFFLINE.html"), copy);
  // همان context تا حافظهٔ مرورگر (localStorage) مشترک بماند
  const page2 = await ctx.newPage();
  await page2.addInitScript(() => {
    const raw = localStorage.getItem("bt_settings_v1");
    if (!raw) return;
    try {
      const rec = JSON.parse(raw);
      if (!rec.fromFutureVersion) {
        rec.fromFutureVersion = { theme: "night", zoom: 1.4 };
        localStorage.setItem("bt_settings_v1", JSON.stringify(rec));
      }
    } catch { /* رکوردِ خراب را دست نمی‌زنیم */ }
  });
  page2.on("pageerror", (e) => errors.push(`update: ${e.message}`));
  await page.close();            // خروج از نسخهٔ قدیم (تنظیماتش نوشته می‌شود)
  await page2.waitForTimeout(200);
  await page2.goto("file://" + copy + "#debug");
  await page2.waitForTimeout(1200);

  const afterUpdate = await page2.evaluate(() => ({
    stored: JSON.parse(localStorage.getItem("bt_settings_v1") || "{}"),
    dash: window.__g?.attackDash,
    halo: window.__g?.haloSpin,
  }));
  afterUpdate.speed = afterUpdate.stored.speed;
  check("بعد از نسخهٔ تازه: بلندیِ صداها مانده",
    Math.abs((afterUpdate.stored.volumes?.ambient ?? 1) - 0.8) < 0.011 &&
    Math.abs((afterUpdate.stored.volumes?.capture ?? 1) - 0.9) < 0.011,
    `ambient=${afterUpdate.stored.volumes?.ambient} capture=${afterUpdate.stored.volumes?.capture}`);
  check("بعد از نسخهٔ تازه: شفافیت و سرعتِ چرخش مانده",
    Math.abs(afterUpdate.dash - 0.85) < 0.011 && Math.abs(afterUpdate.halo - 1.45) < 0.011,
    `dash=${afterUpdate.dash} halo=${afterUpdate.halo}`);
  check("بعد از نسخهٔ تازه: سرعتِ بازی مانده", afterUpdate.speed === 3, String(afterUpdate.speed));
  check("فیلدِ نسخهٔ آیندهٔ بازی پاک نشده", afterUpdate.stored.fromFutureVersion?.theme === "night",
    JSON.stringify(afterUpdate.stored.fromFutureVersion));

  // رکوردِ خراب: باید از پشتیبان برگردد و نسخهٔ خراب هم گم نشود
  await page2.evaluate(() => {
    localStorage.setItem("bt_settings_v1", "{ این یک رکوردِ خراب است");
    location.reload();
  });
  await page2.waitForTimeout(1400);
  const recovered = await page2.evaluate(() => ({
    stored: JSON.parse(localStorage.getItem("bt_settings_v1") || "{}"),
    broken: !!localStorage.getItem("bt_settings_v1.recovered"),
    dash: window.__g?.attackDash,
  }));
  check("رکوردِ خراب از پشتیبان بازیابی شد", recovered.stored.speed === 3 && Math.abs(recovered.dash - 0.85) < 0.011,
    `speed=${recovered.stored.speed} dash=${recovered.dash}`);
  check("نسخهٔ خراب برای بررسی نگه داشته شد", recovered.broken === true);
  await ctx.close();
}

/* ---------------- ۳ و ۴: کوه‌ها و کشتی‌ها ---------------- */
{
  const ctx = await browser.newContext({ viewport: { width: 393, height: 727 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`world: ${e.message}`));
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(800);

  // یک نقشهٔ رندوم با کشتی و قایقِ فراوان
  await page.getByRole("button", { name: "نقشهٔ رندوم" }).click();
  await page.waitForTimeout(350);
  await page.evaluate(async () => {
    for (const label of ["کشتی در دریا", "قایق در دریا"]) {
      const sel = `button[aria-label="افزایش ${label}"]`;
      for (let i = 0; i < 30; i++) {
        const b = document.querySelector(sel);
        if (!b || b.disabled) break;
        b.click();
        await new Promise((r) => requestAnimationFrame(r));
      }
    }
  });
  await page.getByRole("button", { name: "ساخت نقشه" }).click();
  await page.waitForTimeout(1800);

  const world = await page.evaluate(() => {
    const g = window.__g;
    const land = window.__land();
    return {
      keys: Object.keys(land),
      peaks: "peaks" in land,
      mountains: "mountains" in g.L,
      scale: "mountainScale" in g,
      vessels: land.vessels.length,
      ships: land.vessels.filter((v) => v.kind === "ship").length,
      boats: land.vessels.filter((v) => v.kind === "boat").length,
      cruising: land.vessels.filter((v) => v.cruise).length,
      still: land.vessels.filter((v) => !v.cruise).length,
      pos: land.vessels.map((v) => [Math.round(v.x), Math.round(v.y)]),
    };
  });
  check("زمین هیچ فیلدِ کوهی ندارد", world.peaks === false, world.keys.join(","));
  check("سطح (Level) هم هیچ کوهی ندارد", world.mountains === false && world.scale === false);
  check("نقشه کشتی و قایق دارد", world.ships > 0 && world.boats > 0, `ships=${world.ships} boats=${world.boats}`);
  check("بخشی از شناورها حرکت‌کننده و بخشی ساکن‌اند", world.cruising > 0 && world.still > 0,
    `cruising=${world.cruising} still=${world.still}`);

  // حرکتِ واقعی: جای شناورها در دو لحظهٔ ۵٫۲ ثانیه‌ای مقایسه می‌شود
  const motion = await page.evaluate(() => {
    const at = (t) => window.__vesselsAt(t);
    const a = at(100);
    const b = at(105.2);
    return a.map((v, i) => ({ cruise: v.cruise, d: Math.hypot(b[i].x - v.x, b[i].y - v.y) }));
  });
  const movingCount = motion.filter((v) => v.cruise && v.d > 3).length;
  const stillCount = motion.filter((v) => !v.cruise && v.d < 12).length;
  const movingMax = Math.max(...motion.map((v) => v.d));
  check("شناورهای حرکت‌کننده در ۵ ثانیه واقعاً جابه‌جا می‌شوند", movingCount > 0,
    `${movingCount} شناور، بیشترین ${movingMax.toFixed(1)}px`);
  check("شناورهای ساکن سرِ جایشان می‌مانند (فقط تکانِ موج)", stillCount > 0, `${stillCount} شناور`);
  check("جابه‌جایی نرم است (بدونِ پرش)", movingMax < 60, `${movingMax.toFixed(1)}px در ۵ ثانیه`);
  // و روی بومِ واقعی هم هیچ خطایی رخ نمی‌دهد
  await page.waitForTimeout(1200);

  // فریم‌ریت: انیمیشن نباید بازی را کند کند
  const fps = await page.evaluate(() => new Promise((res) => {
    const t = [];
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      t.push(now - last);
      last = now;
      if (t.length < 90) requestAnimationFrame(tick);
      else res(1000 / (t.slice(10).reduce((a, b) => a + b, 0) / (t.length - 10)));
    };
    requestAnimationFrame(tick);
  }));
  check("با شناورهای متحرک، بازی روان می‌ماند", fps >= 45, `${fps.toFixed(1)} فریم بر ثانیه`);

  // عددهای نامعتبر در بوم نمی‌رود
  const badArgs = await page.evaluate(() => new Promise((res) => {
    const proto = CanvasRenderingContext2D.prototype;
    const names = ["moveTo", "lineTo", "arc", "translate", "rotate", "fillRect", "drawImage"];
    const orig = {};
    let bad = 0;
    for (const n of names) {
      orig[n] = proto[n];
      proto[n] = function (...args) {
        if (args.some((a) => typeof a === "number" && !Number.isFinite(a))) bad++;
        return orig[n].apply(this, args);
      };
    }
    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (const n of names) proto[n] = orig[n];
      res(bad);
    }));
  }));
  check("هیچ عددِ نامعتبری به بوم نمی‌رسد", badArgs === 0, `${badArgs} فراخوانی`);
  await page.screenshot({ path: "/home/user/shots/r19-sea.png" });
  await ctx.close();
}

await browser.close();
if (errors.length) console.log("خطاهای مرورگر: " + errors.join(" | "));
console.log(bad === 0
  ? "\nPASS: دورِ ۱۹ — تنظیماتِ گامی و ماندگار، بدونِ کوه، با کشتی‌های متحرک."
  : `\nFAIL: ${bad} بررسی ناموفق`);
process.exit(bad === 0 ? 0 : 1);
