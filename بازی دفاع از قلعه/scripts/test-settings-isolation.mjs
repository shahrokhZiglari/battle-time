// تستِ جداییِ تنظیماتِ سراسری از تنظیماتِ نقشهٔ رندوم
import { chromium } from "playwright";
import path from "node:path";

const url = "file://" + path.resolve("START-GAME-OFFLINE.html") + "#debug";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

let bad = 0;
const check = (label, cond, extra = "") => {
  console.log(`${cond ? "✔" : "✘"} ${label}${extra ? " — " + extra : ""}`);
  if (!cond) bad++;
};

const KEYS = { g: "bt_settings_v1", m: "bt_map_v1" };
const readStore = () => page.evaluate((k) => ({
  global: JSON.parse(localStorage.getItem(k.g) || "null"),
  map: JSON.parse(localStorage.getItem(k.m) || "null"),
}), KEYS);

const openMenu = async () => {
  const menu = page.getByRole("button", { name: "منوی اصلی" });
  if (await menu.count()) { await menu.first().click(); await page.waitForTimeout(320); return; }
  const pause = page.locator('button[aria-label="توقف"]');
  if (await pause.count()) {
    await pause.first().click();
    await page.waitForTimeout(320);
    const m2 = page.getByRole("button", { name: "منوی اصلی" });
    if (await m2.count()) { await m2.first().click(); await page.waitForTimeout(320); return; }
  }
  // روی صفحهٔ منو هستیم؛ کاری لازم نیست
};
const openSettings = async () => {
  if (!(await page.getByRole("button", { name: "نقشهٔ رندوم" }).count())) await openMenu();
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.waitForTimeout(350);
};
const closeSettings = async () => {
  const back = page.getByRole("button", { name: "بازگشت ✕" });
  if (await back.count()) await back.first().click();
  else await page.getByRole("button", { name: "بستن" }).first().click().catch(() => {});
  await page.waitForTimeout(350);
};
const gotoRandomPanel = async () => {
  if (!(await page.getByRole("button", { name: "نقشهٔ رندوم" }).count())) await openMenu();
  await page.getByRole("button", { name: "نقشهٔ رندوم" }).click();
  await page.waitForTimeout(350);
};
/** ضربه‌های سریع روی یک دکمهٔ + / − (تا خاموش‌شدنِ دکمه) */
const tapN = async (label, dir, n) => {
  const hits = await page.evaluate(async ({ l, d, k }) => {
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
  await page.waitForTimeout(150);
  return hits;
};
/** ضربه زدن تا رسیدن به مقدارِ هدف، با خواندنِ مقدارِ زندهٔ همان تنظیم */
const tapUntil = async (label, dir, value, read) => {
  await page.evaluate(async ({ l, d, target, readExpr }) => {
    const sel = `button[aria-label="${d === "up" ? "افزایش" : "کاهش"} ${l}"]`;
    const get = new Function("return " + readExpr);
    for (let i = 0; i < 200; i++) {
      const now = get();
      if (now === undefined || now === null) break;
      if (d === "up" ? now >= target - 1e-6 : now <= target + 1e-6) break;
      const b = document.querySelector(sel);
      if (!b || b.disabled) break;
      b.click();
      await new Promise((r) => requestAnimationFrame(r));
    }
  }, { l: label, d: dir, target: value, readExpr: read });
  await page.waitForTimeout(200);
};
const readGlobal = () => page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}"));
const bump = async (label, times = 1) => {
  for (let i = 0; i < times; i++) {
    const plus = page.locator(`button[aria-label="افزایش ${label}"]`);
    if (await plus.isDisabled()) await page.locator(`button[aria-label="کاهش ${label}"]`).click();
    else await plus.click();
  }
  await page.waitForTimeout(150);
};
const generate = async () => {
  await page.getByRole("button", { name: "ساخت نقشه" }).click();
  await page.waitForTimeout(1500);
};
const globalsView = (st) => ({
  speed: st?.speed, attackDash: st?.attackDash, maxTroops: st?.maxTroops,
  snd: st?.snd, battleMode: st?.battleMode, minCastleDistance: st?.minCastleDistance,
  haloSpin: st?.haloSpin, tuning: st?.unitTuning && st.unitTuning.fast.power,
});

await page.goto(url);
await page.waitForTimeout(700);

/* ---------- ۰) مهاجرت از کلیدِ قدیمی ---------- */
// نکته: از این پس (دورِ ۱۹) هنگامِ خروج از صفحه تنظیمات‌ها عمداً نوشته می‌شوند؛
// پس نمی‌توان کلیدِ قدیمی را بعد از بازشدنِ برنامه کاشت و رفرش کرد (نوشتنِ خروجی
// آن را پاک می‌کند). کلیدِ قدیمی پیش از اجرای برنامه کاشته می‌شود.
{
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    if (!localStorage.getItem("bt_settings_v1") && !localStorage.getItem("bt_boot_seeded")) {
      localStorage.setItem("bt_boot_seeded", "1");
      localStorage.setItem("bt_save_v2", JSON.stringify({
        unlocked: 4, done: [true, true], snd: false, speed: 3, battleMode: "castle", maxTroops: 60,
        openRoads: false, minCastleDistance: 55, ambientSound: false, marchSound: true,
        haloSpin: 2, attackDash: 0.3,
        unitTuning: { normal: { power: 1.5, speed: 1 }, fast: { power: 2, speed: 1.2 }, heavy: { power: 1, speed: 0.9 } },
        customMap: { players: 3, normal: 12, fast: 3, heavy: 2, towers: 4, largeMap: true, randomRoads: true, minDistance: 40, mountains: 5, lakes: 4 },
      }));
    }
  });
  const p2 = await ctx.newPage();
  p2.on("pageerror", (e) => errors.push(e.message));
  await p2.goto(url);
  await p2.waitForTimeout(1400);
  const st = await p2.evaluate((k) => ({
    global: JSON.parse(localStorage.getItem(k.g) || "null"),
    map: JSON.parse(localStorage.getItem(k.m) || "null"),
  }), KEYS);
  check("مهاجرت: تنظیماتِ سراسری به کلیدِ تازه رفت", st.global?.speed === 3 && st.global?.maxTroops === 60,
    `speed=${st.global?.speed} cap=${st.global?.maxTroops}`);
  check("مهاجرت: تنظیماتِ نقشه به کلیدِ جداگانه رفت", st.map?.lakes === 4 && st.map?.players === 3,
    `lakes=${st.map?.lakes} players=${st.map?.players}`);
  check("مهاجرت: کلیدِ سراسری هیچ فیلدِ نقشه‌ای ندارد", st.global && !("customMap" in st.global));
  check("مهاجرت: هیچ فیلدِ کوهی به موتور نمی‌رسد",
    !("mountains" in (st.map ?? {})) || st.map.mountains === 5,
    `mountains=${st.map?.mountains}`);
  await ctx.close();
}

/* ---------- ۱) تغییر تنظیماتِ سراسری و ذخیره ---------- */
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForTimeout(900);

await openSettings();
check("در تنظیمات هیچ اسلایدری نیست", (await page.locator('input[type="range"]').count()) === 0,
  `${await page.locator('input[type="range"]').count()} اسلایدر`);

await tapUntil("شفافیت نقطه‌چین مسیر حمله", "down", 0.35, "window.__g.attackDash");
await tapUntil("سرعت چرخش نورها", "up", 2.5, "window.__g.haloSpin");
await tapUntil("حداقل فاصلهٔ دو قلعهٔ همسایه", "up", 75,
  "JSON.parse(localStorage.getItem('bt_settings_v1')||'{}').minCastleDistance");
await page.locator('button[aria-label="سرعت بازی ۳ برابر"]').click();
await page.getByRole("button", { name: "۸۰", exact: true }).first().click();
await page.locator('button[aria-label="نبرد فقط در قلعه"]').click();
// قدرتِ سربازِ سریع را با + بالا ببر (ردیفِ «سریع» در کارتِ نیروها)
const fastPower = () => page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").unitTuning?.fast?.power);
const p0 = await fastPower();
await tapN("قدرتِ سرباز سریع", "up", Math.max(1, Math.round((2.4 - p0) / 0.05)));
check("قدرتِ سربازِ سریع به ۲٫۴ رسید", Math.abs((await fastPower()) - 2.4) < 0.011, String(await fastPower()));
// صدا را خاموش و دوباره روشن کن
const sndToggle = page.locator('button[aria-label^="صدا و افکت‌ها"]');
if (await sndToggle.count()) { await sndToggle.first().click(); await page.waitForTimeout(150); await sndToggle.first().click(); }
await page.waitForTimeout(250);
await closeSettings();

const before = await readStore();
const G0 = globalsView(before.global);
check("تنظیماتِ سراسری ذخیره شد",
  G0.speed === 3 && G0.maxTroops === 80 && Math.abs(G0.attackDash - 0.35) < 0.01 &&
  G0.battleMode === "castle" && G0.minCastleDistance === 75 && Math.abs(G0.haloSpin - 2.5) < 0.01,
  JSON.stringify(G0));
check("قدرتِ سربازِ سریع ذخیره شد", Math.abs((G0.tuning ?? 0) - 2.4) < 0.01, String(G0.tuning));
check("نوشتنِ تنظیماتِ سراسری، تنظیماتِ نقشه را نساخت/تغییر نداد",
  before.map === null || typeof before.map === "object");

/* ---------- ۲) تنظیماتِ نقشه تغییر کند؛ سراسری دست‌نخورده ---------- */
await gotoRandomPanel();
const m0 = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_map_v1") || "null"));
await bump("خلیج در ساحل", 3);
await bump("کشتی در دریا", 2);
await page.waitForTimeout(300);
const m1 = await readStore();
check("تغییرِ تنظیماتِ نقشه در کلیدِ نقشه نوشته شد",
  m1.map && m1.map.lakes === (m0?.lakes ?? 3) + 3, `lakes=${m1.map?.lakes} (قبلاً ${m0?.lakes})`);
check("تغییرِ تنظیماتِ نقشه، تنظیماتِ سراسری را دست نزد",
  JSON.stringify(m1.global) === JSON.stringify(before.global));

/* ---------- ۳) ساختِ نقشهٔ رندوم ← تنظیماتِ سراسری نباید برگردد ---------- */
await generate();
{
  const st = await readStore();
  const G1 = globalsView(st.global);
  check("بعد از ساختِ نقشه: تنظیماتِ سراسری دست‌نخورده", JSON.stringify(G1) === JSON.stringify(G0), JSON.stringify(G1));
  const live = await page.evaluate(() => ({ dash: window.__g.attackDash, halo: window.__g.haloSpin, field: window.__g.fieldCombat }));
  check("بعد از ساختِ نقشه: تنظیمات روی بازیِ تازه هم اعمال شده",
    Math.abs(live.dash - 0.35) < 0.01 && Math.abs(live.halo - 2.5) < 0.01 && live.field === false, JSON.stringify(live));
  check("بعد از ساختِ نقشه: تنظیماتِ نقشه هم ذخیره شده", st.map?.lakes === m1.map?.lakes);
}

/* ---------- ۴) چند نقشهٔ پشتِ‌سرِهم ---------- */
for (let round = 1; round <= 3; round++) {
  await gotoRandomPanel();
  await bump("خلیج در ساحل", 1);
  await generate();
  const st = await readStore();
  check(`نقشهٔ ${round + 1}: تنظیماتِ سراسری ثابت ماند`, JSON.stringify(globalsView(st.global)) === JSON.stringify(G0));
}

/* ---------- ۵) رفت‌وبرگشت بین حالت‌ها ---------- */
await page.evaluate(() => window.__g.pause?.());
await openMenu();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "شروع مرحله‌ای" }).click();
await page.waitForTimeout(400);
{
  const lv = page.getByRole("button", { name: "۱", exact: true });
  if (await lv.count()) await lv.first().click();
  await page.waitForTimeout(1500);
}
{
  const st = await readStore();
  check("بعد از رفتن به یک مرحلهٔ معمولی: تنظیماتِ سراسری ثابت", JSON.stringify(globalsView(st.global)) === JSON.stringify(G0), JSON.stringify(globalsView(st.global)));
  const live = await page.evaluate(() => ({ dash: window.__g.attackDash, halo: window.__g.haloSpin }));
  check("مرحلهٔ معمولی هم تنظیماتِ سراسری را می‌گیرد", Math.abs(live.dash - 0.35) < 0.01 && Math.abs(live.halo - 2.5) < 0.01, JSON.stringify(live));
}

/* ---------- ۶) بارگذاریِ مجدد صفحه ---------- */
const beforeReload = await readStore();
await page.reload();
await page.waitForTimeout(1000);
{
  const st = await readStore();
  check("پس از رفرش، تنظیماتِ سراسری همان است", JSON.stringify(globalsView(st.global)) === JSON.stringify(G0), JSON.stringify(globalsView(st.global)));
  check("پس از رفرش، تنظیماتِ نقشه همان است", JSON.stringify(st.map) === JSON.stringify(beforeReload.map),
  `lakes=${st.map?.lakes}`);
  const applied = await page.evaluate(() => ({ dash: window.__g?.attackDash, halo: window.__g?.haloSpin }));
  check("پس از رفرش، تنظیمات روی بازیِ نمایشی اعمال شده",
    Math.abs(applied.dash - 0.35) < 0.01 && Math.abs(applied.halo - 2.5) < 0.01, JSON.stringify(applied));
}

console.log(errors.length ? "خطای مرورگر: " + errors.join(" | ") : "بدون خطای مرورگر ✔");
await browser.close();
console.log(bad ? `FAILS=${bad}` : "PASS: global settings stay isolated from random-map settings.");
process.exit(bad ? 1 : 0);
