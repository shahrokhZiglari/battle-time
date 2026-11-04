// طبیعت در دورِ ۱۹: هیچ کوهی نیست و تنظیم‌های طبیعت همه با + / − کار می‌کنند
//
// سنجش‌ها:
//   • سقفِ خلیج/کشتی/قایق بالا رفته و شمارنده‌ها همان‌جا در حافظه می‌مانند
//   • نقشه با همان تعدادِ خواسته‌شده ساخته می‌شود و هیچ کوهی ندارد
//   • «فاصلهٔ قلعه‌ها» یک گام‌شمارِ + / − است (نه اسلایدر)، اثرِ زنده دارد و می‌ماند
import { chromium, devices } from "playwright";
import path from "node:path";

const url = "file://" + path.resolve("START-GAME-OFFLINE.html") + "#debug";
const browser = await chromium.launch();
let bad = 0;
const check = (label, cond, extra = "") => {
  console.log(`${cond ? "✔" : "✘"} ${label}${extra ? " — " + extra : ""}`);
  if (!cond) bad++;
};
const errors = [];

const val = (page, label) => page.evaluate((l) => {
  const btn = document.querySelector(`button[aria-label="افزایش ${l}"]`);
  return Number(btn?.previousElementSibling?.textContent?.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
}, label);

/** n ضربهٔ سریع روی دکمهٔ + یا −، تمام داخلِ خود صفحه و متوقف‌شدن روی دکمهٔ غیرفعال */
const tapMany = (page, label, dir, n) => page.evaluate(async ({ l, d, k }) => {
  const sel = `button[aria-label="${d === "up" ? "افزایش" : "کاهش"} ${l}"]`;
  for (let i = 0; i < k; i++) {
    const b = document.querySelector(sel);
    if (!b || b.disabled) break;
    b.click();
    await new Promise((r) => requestAnimationFrame(r));
  }
  return document.querySelector(sel)?.disabled ?? null;
}, { l: label, d: dir, k: n });

/* ================== دسکتاپ ================== */
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForTimeout(800);

  /* --- سقفِ تعداد و نبودِ کوه --- */
  await page.getByRole("button", { name: "نقشهٔ رندوم" }).click();
  await page.waitForTimeout(400);

  check("هیچ شمارندهٔ کوهی در پنل نیست", (await page.locator('button[aria-label*="کوه"]').count()) === 0);
  check("در پنلِ نقشه هم اسلایدری نمانده", (await page.locator('input[type="range"]').count()) === 0);

  const l0 = await val(page, "خلیج در ساحل");
  await tapMany(page, "خلیج در ساحل", "up", 10 - l0);
  const l10 = await val(page, "خلیج در ساحل");
  check("تعداد خلیج به ۱۰ می‌رسد (بالاتر از سقفِ قدیمیِ ۶)", l10 === 10, `${l0} → ${l10}`);

  const tapCapL = await tapMany(page, "خلیج در ساحل", "up", 40);
  const capL = await val(page, "خلیج در ساحل");
  check("خلیج تا سقف (۱۶) می‌رود و بیشتر نمی‌شود", capL === 16 && tapCapL === true, String(capL));

  const s0 = await val(page, "کشتی در دریا");
  await tapMany(page, "کشتی در دریا", "up", 30);
  const capS = await val(page, "کشتی در دریا");
  check("کشتی تا سقف (۱۲) می‌رود", capS === 12, `${s0} → ${capS}`);

  const b0 = await val(page, "قایق در دریا");
  await tapMany(page, "قایق در دریا", "up", 30);
  const capB = await val(page, "قایق در دریا");
  check("قایق تا سقف (۱۶) می‌رود", capB === 16, `${b0} → ${capB}`);

  await tapMany(page, "خلیج در ساحل", "down", capL - 10);
  await tapMany(page, "کشتی در دریا", "down", capS - 8);
  await tapMany(page, "قایق در دریا", "down", capB - 6);

  const stored1 = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_map_v1") || "{}"));
  check("مقدارها همان‌جا در ذخیره‌گاه ماندند",
    stored1.lakes === 10 && stored1.ships === 8 && stored1.boats === 6,
    `lakes=${stored1.lakes} ships=${stored1.ships} boats=${stored1.boats}`);
  check("هیچ فیلدِ کوهی در ذخیره‌گاه نیست", !("mountains" in stored1));

  await page.getByRole("button", { name: "ساخت نقشه" }).click();
  await page.waitForTimeout(2200);
  const built = await page.evaluate(() => ({
    peaks: "peaks" in (window.__g.land ?? {}),
    mountains: "mountains" in window.__g.L,
    scale: "mountainScale" in window.__g,
    lakes: window.__g.L.lakes,
    ships: window.__g.L.ships,
    boats: window.__g.L.boats,
    demo: window.__g.demo,
  }));
  check("نقشه هیچ کوهی ندارد (نه در زمین، نه در سطح)",
    built.peaks === false && built.mountains === false && built.scale === false,
    `peaks=${built.peaks} mountains=${built.mountains} scale=${built.scale}`);
  check("نقشه با ۱۰ خلیج ساخته شد", built.lakes === 10, `lakes=${built.lakes}`);
  check("نقشه با ۸ کشتی و ۶ قایق ساخته شد", built.ships === 8 && built.boats === 6,
    `ships=${built.ships} boats=${built.boats}`);
  check("نقشه واقعاً در حالِ بازی است", built.demo === false);

  /* --- تنظیمِ فاصلهٔ قلعه‌ها با + / − --- */
  await page.evaluate(() => (window.__g.__mark = "A"));
  const markBefore = await page.evaluate(() => ({ mark: window.__g.__mark, owners: window.__g.bs.map((b) => b.o).join("") }));

  await page.locator('button[aria-label="توقف"]').click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.waitForTimeout(500);

  check("در تنظیمات اسلایدری نیست", (await page.locator('input[type="range"]').count()) === 0);
  const distPlus = page.locator('button[aria-label="افزایش حداقل فاصلهٔ دو قلعهٔ همسایه"]');
  const distMinus = page.locator('button[aria-label="کاهش حداقل فاصلهٔ دو قلعهٔ همسایه"]');
  check("دکمه‌های + و − فاصلهٔ قلعه‌ها هستند", (await distPlus.count()) === 1 && (await distMinus.count()) === 1);

  const dist0 = await page.evaluate(() => window.__g.minCastleDistance ?? JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").minCastleDistance);
  await tapMany(page, "حداقل فاصلهٔ دو قلعهٔ همسایه", "up", 3);
  const dist1 = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").minCastleDistance);
  check("هر ضربه ۵ متر اضافه می‌کند", dist1 === dist0 + 15, `${dist0} → ${dist1}`);

  const tapDistCap = await tapMany(page, "حداقل فاصلهٔ دو قلعهٔ همسایه", "up", 40);
  const distCap = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").minCastleDistance);
  check("فاصله تا سقف (۱۲۰) می‌رود و دکمه خاموش می‌شود", distCap === 120 && tapDistCap === true, String(distCap));

  await tapMany(page, "حداقل فاصلهٔ دو قلعهٔ همسایه", "down", 4);
  const distBack = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").minCastleDistance);
  check("با − هم برمی‌گردد", distBack === 100, String(distBack));

  /* --- برگشت به همان نبرد --- */
  await page.getByRole("button", { name: /بازگشت به بازی|ذخیره/ }).last().click();
  await page.waitForTimeout(900);
  const markAfter = await page.evaluate(() => ({ mark: window.__g.__mark, owners: window.__g.bs.map((b) => b.o).join(""), paused: window.__g.paused }));
  check("تنظیم‌های طبیعت نبرد را ریست نکردند", markAfter.mark === "A" && markAfter.owners === markBefore.owners);
  check("بازی بعد از آن زنده است", markAfter.paused === false);

  /* --- ماندگاری پس از رفرش --- */
  await page.reload();
  await page.waitForTimeout(1200);
  const afterReload = await page.evaluate(() => ({
    lakes: JSON.parse(localStorage.getItem("bt_map_v1") || "{}").lakes,
    ships: JSON.parse(localStorage.getItem("bt_map_v1") || "{}").ships,
    boats: JSON.parse(localStorage.getItem("bt_map_v1") || "{}").boats,
    dist: JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").minCastleDistance,
    peaks: "peaks" in (window.__g.land ?? {}),
  }));
  check("خلیجِ ۱۰ پس از رفرش می‌ماند", afterReload.lakes === 10, String(afterReload.lakes));
  check("شناورهای نقشه هم پس از رفرش در ذخیره‌گاه مانده‌اند", afterReload.ships === 8 && afterReload.boats === 6,
    `ships=${afterReload.ships} boats=${afterReload.boats}`);
  check("فاصلهٔ ۱۰۰ متری قلعه‌ها پس از رفرش می‌ماند", afterReload.dist === 100, String(afterReload.dist));
  check("بازیِ نمایشی هم بدونِ کوه ساخته شد", afterReload.peaks === false);

  check("هیچ خطای اجرایی نبود", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/* ================== گوشی ================== */
{
  const ctx = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "نقشهٔ رندوم" }).click();
  await page.waitForTimeout(400);
  const before = await val(page, "خلیج در ساحل");
  await tapMany(page, "خلیج در ساحل", "up", 3);
  const v = await val(page, "خلیج در ساحل");
  check("گوشی: سه ضربهٔ + خلیج سه واحد اضافه کرد", v === Math.min(16, before + 3), `${before} → ${v}`);
  check("گوشی: خطای اجرایی نداشت", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

await browser.close();
console.log(bad === 0
  ? "\nPASS: طبیعت بدونِ کوه است و سقف‌ها و فاصلهٔ قلعه‌ها با + / − کار می‌کنند و می‌مانند."
  : `\nFAIL: ${bad} بررسی ناموفق`);
process.exit(bad === 0 ? 0 : 1);
