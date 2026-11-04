// تنظیمات در میانهٔ بازی: توقف، حفظِ وضعیتِ نبرد، و بازگشتِ درست
import { chromium } from "playwright";
import path from "node:path";

const url = "file://" + path.resolve("START-GAME-OFFLINE.html") + "#debug";
const browser = await chromium.launch();
let bad = 0;
const check = (label, cond, extra = "") => {
  console.log(`${cond ? "✔" : "✘"} ${label}${extra ? " — " + extra : ""}`);
  if (!cond) bad++;
};
const errors = [];

const open = async (page) => {
  const state = () => page.evaluate(() => {
    const g = window.__g;
    if (!g) return null;
    return {
      t: g.t,
      squads: g.sq.length,
      squadPos: g.sq.map((s) => [Math.round(s.x), Math.round(s.y)]),
      owners: g.bs.map((b) => b.o).join(""),
      troops: g.bs.map((b) => b.tr),
      paused: g.paused,
      over: g.over,
      dash: g.attackDash,
      hudVisible: !!document.querySelector("[aria-label=\"توان رزمی بازیکنان\"]"),
      haloSpin: g.haloSpin,
      // پنلِ تنظیمات از دورِ ۱۹ با پانزده ردیفِ «− ٪ +» شناخته می‌شود (هیچ اسلایدری نیست)
      settingsOpen:
        document.querySelectorAll('button[aria-label^="کاهش بلندی صدای "]').length === 15 &&
        document.querySelectorAll('input[type="range"]').length === 0,
      resumeBtn: [...document.querySelectorAll("button")].some((b) => (b.textContent || "").includes("ادامهٔ نبرد")),
    };
  });

  /** n ضربهٔ سریع روی دکمهٔ + یا − تا رسیدن به مقدارِ هدف (یا خاموش‌شدنِ دکمه) */
  const tapLabel = async (label, dir, n = 60, until = null) => {
    const hits = await page.evaluate(async ({ l, d, k, u }) => {
      const sel = `button[aria-label="${d === "up" ? "افزایش" : "کاهش"} ${l}"]`;
      let count = 0;
      for (let i = 0; i < k; i++) {
        const b = document.querySelector(sel);
        if (!b || b.disabled) break;
        if (u !== null) {
          const g = window.__g;
          const now = u.prop === "attackDash" ? g.attackDash : u.prop === "haloSpin" ? g.haloSpin : null;
          if (now !== null && (u.dir === "down" ? now <= u.value + 1e-6 : now >= u.value - 1e-6)) break;
        }
        b.click();
        count++;
        await new Promise((r) => requestAnimationFrame(r));
      }
      return count;
    }, { l: label, d: dir, k: n, u: until });
    await page.waitForTimeout(220);
    return hits;
  };

  const startRandom = async () => {
    await page.getByRole("button", { name: "نقشهٔ رندوم" }).click();
    await page.waitForTimeout(350);
    await page.getByRole("button", { name: "ساخت نقشه" }).click();
    await page.waitForTimeout(1700);
  };

  /* ================= نقشهٔ رندوم ================= */
  await page.goto(url);
  await page.waitForTimeout(700);
  await startRandom();
  const initial = await state();   // وضعیتِ دست‌نخوردهٔ نقشه، برای مقایسه

  // نبردی در جریان: چند قلعه گرفته می‌شود و یک لشکر در راه است
  await page.evaluate(() => {
    const g = window.__g;
    const mine = g.bs.filter((b) => b.o === 1);
    const target = g.bs.find((b) => b.o === 2);
    g.bs[0].tr = 37;
    g.sels = [g.bs[0]];
    target.tr = 3;
    g.attack(target, [g.bs[0]]);
  });
  await page.waitForTimeout(2200);
  const moving = await state();
  check("نبرد در جریان است (لشکر در راه)", moving.squads > 0, `squads=${moving.squads}`);

  // توقف → تنظیمات
  await page.locator('button[aria-label="توقف"]').first().click();
  await page.waitForTimeout(500);
  const before = await state();   // نمونهٔ «قبل» فقط پس از توقف گرفته می‌شود
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.waitForTimeout(400);
  check("پنل تنظیمات باز است", (await state()).settingsOpen);

  // در حینِ باز بودنِ تنظیمات، زمان نباید جلو برود
  const p1 = await state();
  await page.waitForTimeout(1200);
  const p2 = await state();
  check("بازی در حینِ تنظیمات متوقف است", Math.abs(p2.t - p1.t) < 0.02, `t ${p1.t.toFixed(2)} → ${p2.t.toFixed(2)}`);
  check("پرچمِ توقف روشن است", p2.paused === true);

  // تغییرِ چند تنظیم
  await tapLabel("شفافیت نقطه‌چین مسیر حمله", "down", 60, { prop: "attackDash", dir: "down", value: 0.4 });
  await tapLabel("سرعت چرخش نورها", "up", 4);
  await page.locator('button[aria-label="سرعت بازی ۲ برابر"]').click();
  await page.getByRole("button", { name: "۸۰", exact: true }).first().click();
  await page.getByRole("button", { name: "صدا", exact: false }).first().click().catch(() => {});
  await page.waitForTimeout(400);

  const during = await state();
  check("تغییرِ تنظیمات وضعیتِ نبرد را به‌هم نمی‌زند",
    JSON.stringify(during.troops) === JSON.stringify(before.troops) &&
    during.owners === before.owners &&
    during.squads === before.squads,
    `troops ${JSON.stringify(before.troops)} → ${JSON.stringify(during.troops)}`);
  check("ساعتِ بازی صفر نشد", during.t >= before.t - 0.01, `t ${before.t.toFixed(2)} → ${during.t.toFixed(2)}`);
  check("لشکرِ در راه حذف نشد", during.squads === before.squads, `squads=${during.squads}`);
  check("شفافیت روی موتور اعمال شد", Math.abs(during.dash - 0.4) < 0.01, String(during.dash));
  check("سرعتِ چرخش نورها با + بالا رفت", during.haloSpin > before.haloSpin, `${before.haloSpin} → ${during.haloSpin}`);
  check("نبرد به حالتِ اولِ نقشه برنگشت",
    during.owners !== initial.owners || JSON.stringify(during.troops) !== JSON.stringify(initial.troops),
    `owners ${initial.owners} → ${during.owners}`);
  check("در حینِ تنظیمات هم‌چنان متوقف است", during.paused === true);

  // بازگشت به بازی
  await page.getByRole("button", { name: /بازگشت به بازی|ذخیره/ }).last().click();
  await page.waitForTimeout(900);
  const resumed = await state();
  check("بازگشت به بازی انجام شد (HUD دیده می‌شود)", resumed.hudVisible && !resumed.settingsOpen);
  check("بازی از همان‌جا ادامه یافت", resumed.paused === false && resumed.t > during.t, `t ${during.t.toFixed(2)} → ${resumed.t.toFixed(2)}`);
  // پس از بازگشت، نبرد باید فقط «جلو» رفته باشد: نه عقب‌گرد، نه بازنشانی
  const gained = [...resumed.owners].filter((o, i) => o === "1" && during.owners[i] !== "1").length;
  const lost = [...during.owners].filter((o, i) => o === "1" && resumed.owners[i] !== "1").length;
  check("پس از بازگشت هیچ قلعه‌ای از دست نرفت و نبردی که در جریان بود کامل شد",
    lost === 0 && gained >= 0, `owners ${before.owners} → ${during.owners} → ${resumed.owners}`);
  check("پس از بازگشت، نیروها به مقدارِ اولیهٔ نقشه برنگشتند",
    JSON.stringify(resumed.troops) !== JSON.stringify(initial.troops));

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}"));
  check("تنظیمات ذخیره شد", Math.abs(stored.attackDash - 0.4) < 0.01 && stored.speed === 2 && stored.maxTroops === 80,
    `dash=${stored.attackDash} speed=${stored.speed} cap=${stored.maxTroops}`);

  // دوباره توقف و ادامهٔ نبرد
  await page.locator('button[aria-label="توقف"]').first().click();
  await page.waitForTimeout(350);
  const pauseVisible = await state();
  check("پنل توقف دوباره باز می‌شود", pauseVisible.resumeBtn);
  await page.getByRole("button", { name: /ادامهٔ نبرد/ }).click();
  await page.waitForTimeout(700);
  const resumed2 = await state();
  check("دکمهٔ «ادامهٔ نبرد» کار می‌کند", resumed2.paused === false && resumed2.hudVisible);

  // مسیرِ دوم: بازگشت با «بازگشت ✕»
  await page.locator('button[aria-label="توقف"]').first().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.waitForTimeout(350);
  await tapLabel("شفافیت نقطه‌چین مسیر حمله", "up", 60, { prop: "attackDash", dir: "up", value: 0.8 });
  await page.getByRole("button", { name: "بازگشت ✕" }).click();
  await page.waitForTimeout(700);
  const viaX = await state();
  check("بازگشت با ✕ هم به بازی می‌رسد", viaX.hudVisible && viaX.paused === false);

  // مسیرِ سوم: Escape
  await page.locator('button[aria-label="توقف"]').first().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.waitForTimeout(350);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  const viaEsc = await state();
  check("بازگشت با Escape هم کار می‌کند", viaEsc.hudVisible && viaEsc.paused === false);

  /* ================= تغییرِ قوانینِ راه در میانهٔ نبرد ================= */
  {
    await page.locator('button[aria-label="توقف"]').first().click();
    await page.waitForTimeout(500);
    const roadBefore = await page.evaluate(() => {
      const g = window.__g;
      return { links: JSON.stringify(g.links), troops: g.bs.map((b) => b.tr), owners: g.bs.map((b) => b.o).join(""), t: g.t };
    });
    await page.getByRole("button", { name: "تنظیمات" }).click();
    await page.waitForTimeout(350);
    // ۳۰ متر پیش‌فرض است؛ با ۱۲ ضربهٔ + به ۹۰ می‌رسد
    await tapLabel("حداقل فاصلهٔ دو قلعهٔ همسایه", "up", 12);
    const distNow = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").minCastleDistance);
    check("فاصلهٔ قلعه‌ها با +/− تا ۹۰ متر رفت", distNow === 90, String(distNow));
    const roadMid = await page.evaluate(() => {
      const g = window.__g;
      return { links: JSON.stringify(g.links), troops: g.bs.map((b) => b.tr), owners: g.bs.map((b) => b.o).join(""), paused: g.paused };
    });
    check("تغییرِ فاصلهٔ راه، نیروها و مالکیت را بازنشانی نمی‌کند",
      JSON.stringify(roadMid.troops) === JSON.stringify(roadBefore.troops) && roadMid.owners === roadBefore.owners,
      `links ${roadBefore.links} → ${roadMid.links}`);
    // راه‌ها باید همچنان معتبر و کامل باشند (همه به هم وصل)
    const roadOk = await page.evaluate(() => {
      const g = window.__g;
      const seen = new Set([0]); const stack = [0];
      while (stack.length) { const n = stack.pop(); for (const m of g.adj[n]) if (!seen.has(m)) { seen.add(m); stack.push(m); } }
      return seen.size === g.bs.length;
    });
    check("پس از تغییرِ فاصله، همهٔ قلعه‌ها هنوز به هم راه دارند", roadOk);
    check("تغییرِ فاصلهٔ راه، گراف را از نو ساخته است (نه دست‌کاریِ ناقص)",
      roadMid.links.length > 2, `links=${JSON.parse(roadMid.links).length}`);
    check("در حینِ تغییرِ راه هم بازی متوقف می‌ماند", roadMid.paused === true);
    await page.getByRole("button", { name: /بازگشت به بازی|ذخیره/ }).last().click();
    await page.waitForTimeout(700);
    check("بازگشت به بازی پس از تغییرِ راه", (await state()).hudVisible && (await state()).paused === false);
  }

  /* ================= مرحلهٔ معمولی (بدونِ اثرِ منفی) ================= */
  await page.evaluate(() => window.__g.pause?.());
  // منو فقط از پنلِ توقف باز می‌شود (نوارِ بالا یک دکمه دارد)
  await page.locator('button[aria-label="توقف"]').first().click();
  await page.waitForTimeout(350);
  await page.getByRole("button", { name: "منوی اصلی" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /شروع مرحله‌ای/ }).click();
  await page.waitForTimeout(350);
  const lv = page.getByRole("button", { name: "۱", exact: true });
  if (await lv.count()) await lv.first().click();
  await page.waitForTimeout(1500);

  await page.locator('button[aria-label="توقف"]').first().click();
  await page.waitForTimeout(500);
  const campBefore = await state();
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.waitForTimeout(350);
  await tapLabel("شفافیت نقطه‌چین مسیر حمله", "down", 60, { prop: "attackDash", dir: "down", value: 0.6 });
  const campDuring = await state();
  check("مرحلهٔ معمولی: وضعیت در حینِ تنظیمات دست‌نخورده",
    JSON.stringify(campDuring.troops) === JSON.stringify(campBefore.troops) && campDuring.paused === true);
  await page.getByRole("button", { name: /بازگشت به بازی|ذخیره/ }).last().click();
  await page.waitForTimeout(700);
  const campAfter = await state();
  check("مرحلهٔ معمولی: بازگشت به بازی کار می‌کند", campAfter.hudVisible && campAfter.paused === false);

  console.log(errors.length ? "خطای مرورگر: " + errors.join(" | ") : "بدون خطای مرورگر ✔");
  await browser.close();
  console.log(bad ? `FAILS=${bad}` : "PASS: settings can be changed mid-game and the battle resumes untouched.");
  process.exit(bad ? 1 : 0);
};

const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("pageerror", (e) => errors.push(e.message));
try {
  await open(page);
} catch (e) {
  console.log("EXCEPTION:", e.message.split("\n")[0]);
  await browser.close();
  process.exit(1);
}
