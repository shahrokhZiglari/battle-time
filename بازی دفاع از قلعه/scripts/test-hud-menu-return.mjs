// نوارِ بالای صفحه: یک دکمهٔ خروج از نبرد، و برگشتی که همیشه نبرد را زنده برمی‌گردانَد
//
// چیزی که سنجیده می‌شود:
//   • نوارِ بالا فقط یک دکمه دارد (توقف) و روی گوشیِ باریک هم کامل دیده می‌شود.
//   • منو/مراحل/تنظیمات از پنلِ توقف باز می‌شوند و پنل همیشه «ادامهٔ نبرد» دارد.
//   • وسطِ نبرد، «منو» نبرد را دور نمی‌ریزد: فقط متوقف می‌کند و همان بازی
//     (همان قلعه‌ها، همان نیروها، همان شمارهٔ نقشه) سرِ جایش می‌مانَد.
//   • در منو، «بازگشت به بازی ▸» بالای همهٔ کارها و در دید است و نبرد را از
//     همان لحظه ادامه می‌دهد (ساعت جلو می‌رود، paused=false).
//   • مسیرِ توقف → مراحل → «بازگشت به بازی ▸» هم همان نبرد را زنده می‌کند.
//   • مسیرِ منو → فهرست مراحل → بازگشت، به منو برمی‌گردد (نه پرت شدن به نبرد)
//     و از همان‌جا می‌توان نبرد را ادامه داد.
//   • همین‌ها روی گوشیِ لمسی (Pixel 5) هم برقرار است.
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

const state = (page) =>
  page.evaluate(() => {
    const g = window.__g;
    const txt = document.body.innerText;
    return {
      hasG: !!g,
      demo: g?.demo ?? null,
      paused: g?.paused ?? null,
      t: g ? g.t : null,
      i: g?.i ?? null,
      mark: g?.__testMark ?? null,
      castles: g ? g.bs.length : null,
      owners: g ? g.bs.map((b) => b.o).join("") : null,
      troops: g ? g.bs.map((b) => Math.round(b.tr)).join(",") : null,
      screen: document.querySelector("[data-build]")?.getAttribute("data-screen") ?? null,
      menuOpen: !!document.querySelector('[data-testid="resume-battle"]'),
    };
  });

const resumeBtn = (page) => page.getByRole("button", { name: /بازگشت به بازی/ });

/** شروعِ یک نبردِ واقعی از منو */
const startBattle = async (page) => {
  await page.getByRole("button", { name: "شروع مرحله‌ای" }).click();
  await page.waitForTimeout(350);
  const lv = page.getByRole("button", { name: "۱", exact: true });
  if (await lv.count()) await lv.first().click();
  await page.waitForTimeout(1500);
};

const settle = async (page, ms = 700) => page.waitForTimeout(ms);

/** نشانه‌گذاریِ نبردِ در جریان: اگر بازی از نو ساخته شود، این نشانه از بین می‌رود */
const markBattle = (page) => page.evaluate(() => { window.__g.__testMark = "A"; });

/* ================== ۱) دسکتاپ ================== */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await settle(page, 900);

  await startBattle(page);
  await markBattle(page);

  /* --- نوارِ فرمان‌ها: فقط یک دکمه (توقف) --- */
  const pauseBtn = page.locator('button[aria-label="توقف"]');
  check("دکمهٔ توقف هست", (await pauseBtn.count()) === 1);
  check("دکمهٔ «منو» از نوارِ بالا حذف شده", (await page.locator('button[aria-label="منو"]').count()) === 0);
  check("دکمهٔ «مراحل» هم در نوار نیست", (await page.locator('button[aria-label="مراحل"]').count()) === 0);
  {
    // دکمه‌های «خروج از نبرد» در نوار باید فقط یکی باشد: توقف.
    // (صدا و چرخش، کلیدهای تنظیمی‌اند و شمرده نمی‌شوند.)
    const exits = await page.locator(".hud-bar button").evaluateAll((els) =>
      els.map((el) => el.getAttribute("aria-label") || (el.textContent || "").trim())
         .filter((name) => !/٪/.test(name) && !["−", "+", "صدا", "چرخش بازی"].includes(name)));
    check("نوار تنها یک دکمهٔ خروج دارد (توقف)", exits.length === 1 && exits[0] === "توقف", JSON.stringify(exits));
    check("دکمهٔ صدا از نوار برداشته شده", (await page.locator('.hud-bar button[aria-label="صدا"]').count()) === 0);
    check("دکمهٔ چرخش هم از نوار برداشته شده", (await page.locator('.hud-bar button[aria-label="چرخش بازی"]').count()) === 0);
  }

  /* --- ثبتِ وضعیتِ نبرد، بعد رفتن به منو --- */
  await settle(page, 1200);
  const before = await state(page);
  await pauseBtn.click();
  await settle(page, 400);
  /* --- پنلِ توقف: ادامه همیشه هست، منو هم از همین‌جا --- */
  {
    const resume = page.getByRole("button", { name: /ادامهٔ نبرد/ });
    const box = await resume.boundingBox();
    check("پنلِ توقف دکمهٔ «ادامهٔ نبرد» دارد و در دید است", (await resume.count()) === 1 &&
      box && box.y >= 0 && box.y + box.height <= 800, box ? `y=${Math.round(box.y)}` : "پیدا نشد");
    const pausedNow = await state(page);
    check("تا وقتی پنلِ توقف باز است ساعت نمی‌گذرد", pausedNow.paused === true);
    // جای تازهٔ صدا و چرخش: داخلِ همین پنل
    check("دکمهٔ صدا داخلِ پنلِ توقف هست", (await page.getByRole("button", { name: "صدا" }).count()) === 1);
    check("ردیفِ چرخش هم داخلِ پنلِ توقف هست", (await page.getByRole("button", { name: "چرخش صفحه" }).count()) === 1);
  }
  await page.getByRole("button", { name: "منوی اصلی" }).click();
  await settle(page, 400);
  const inMenu = await state(page);

  check("با کلیک روی منو، منو باز می‌شود", inMenu.screen === "menu", `screen=${inMenu.screen}`);
  check("نبرد دور ریخته نشد (همان بازی، نه نمایشی)", inMenu.hasG && inMenu.demo === false && inMenu.i === before.i,
    `demo=${inMenu.demo} i=${inMenu.i}`);
  check("نبرد در منو متوقف است", inMenu.paused === true);
  check("قلعه‌ها و نیروها دست‌نخورده", inMenu.owners === before.owners && inMenu.troops === before.troops);
  check("در منو کادرِ «نبردِ متوقف‌شده» حذف شده و فقط دکمهٔ گوشه مانده",
    inMenu.menuOpen === true && !(await page.evaluate(() => document.body.innerText.includes("نبردِ متوقف‌شده"))));
  /* --- دکمهٔ همیشگیِ برگشت، گوشهٔ پایین-راست، بدونِ اسکرول --- */
  {
    const pill = page.getByTestId("resume-battle");
    check("در منو یک دکمهٔ چسبیدهٔ «بازگشت به بازی» هست", (await pill.count()) === 1);
    const box = await pill.boundingBox();
    const inView = box && box.y >= 0 && box.y + box.height <= 800 && box.x >= 0 && box.x + box.width <= 1280;
    check("این دکمه کامل داخلِ صفحه است (بدونِ اسکرول)", !!inView,
      box ? `x=${Math.round(box.x)} y=${Math.round(box.y)}` : "پیدا نشد");
    const rotBox = await page.getByTestId("rotate-fab").boundingBox().catch(() => null);
    const overlap = rotBox && box ? !(box.x + box.width < rotBox.x || rotBox.x + rotBox.width < box.x) : false;
    check("با دکمهٔ چرخش (گوشهٔ چپ) قاطی نمی‌شود", !overlap);
  }

  const frozen = await state(page);
  await settle(page, 800);
  const frozen2 = await state(page);
  check("تا وقتی منو باز است ساعتِ نبرد نمی‌گذرد", Math.abs(frozen2.t - frozen.t) < 0.12,
    `${frozen.t.toFixed(2)} → ${frozen2.t.toFixed(2)}`);

  {
    const btn = resumeBtn(page).first();
    const box = await btn.boundingBox();
    const inView = box && box.y >= 0 && box.y + box.height <= 800;
    check("«بازگشت به بازی» تنها یک دکمه در منو است و داخلِ صفحه", (await resumeBtn(page).count()) === 1 && !!inView,
      box ? `y=${Math.round(box.y)} h=${Math.round(box.height)}` : "پیدا نشد");
    check("برچسبِ دکمهٔ شروع با نبردِ در جریان روشن است", (await page.getByRole("button", { name: "شروع مرحله‌ای تازه" }).count()) === 1);
    await btn.click();
    await settle(page, 900);
  }
  const back = await state(page);
  check("بازگشت به بازی از منو: دوباره در نبرد", back.screen === "game", `screen=${back.screen}`);
  check("نبرد زنده است (paused=false)", back.paused === false);
  check("همان نبرد ادامه یافت (بازی از نو ساخته نشد)", back.mark === "A" && back.i === before.i && back.castles === before.castles,
    `mark=${back.mark} i=${back.i} castles=${back.castles}`);
  check("ساعتِ نبرد از همان لحظه جلو رفت", back.t > inMenu.t + 0.2, `${inMenu.t.toFixed(2)} → ${back.t.toFixed(2)}`);

  /* --- مسیرِ توقف → مراحل → بازگشت به بازی --- */
  const mid = await state(page);
  await pauseBtn.click();
  await settle(page, 500);
  await page.getByRole("button", { name: "مراحل", exact: true }).click();
  await settle(page, 500);
  const lvBack = page.getByRole("button", { name: /بازگشت به بازی/ });
  check("در فهرستِ مراحلِ وسطِ نبرد، دکمه «بازگشت به بازی ▸» است", (await lvBack.count()) >= 1,
    `count=${await lvBack.count()}`);
  {
    const box = await lvBack.first().boundingBox();
    check("دکمهٔ بازگشتِ فهرستِ مراحل داخلِ صفحه است", box && box.y >= 0 && box.y + box.height <= 800,
      box ? `y=${Math.round(box.y)}` : "پیدا نشد");
  }
  await lvBack.first().click();
  await settle(page, 900);
  const afterLevels = await state(page);
  check("مراحل → بازگشت: دوباره در نبرد", afterLevels.screen === "game");
  check("مراحل → بازگشت: نبرد زنده و همان بازی",
    afterLevels.paused === false && afterLevels.mark === "A" && afterLevels.i === mid.i && afterLevels.t > mid.t);

  /* --- مسیرِ منو → فهرست مراحل → بازگشت، باید به منو برگردد --- */
  await pauseBtn.click();
  await settle(page, 350);
  await page.getByRole("button", { name: "منوی اصلی" }).click();
  await settle(page, 400);
  await page.getByRole("button", { name: "فهرست مراحل" }).click();
  await settle(page, 400);
  const plainBack = page.getByRole("button", { name: /^بازگشت ✕$/ });
  check("فهرستی که از منو باز شده، «بازگشت ✕» دارد", (await plainBack.count()) === 1);
  await plainBack.first().click();
  await settle(page, 400);
  const backToMenu = await state(page);
  check("منو → مراحل → بازگشت: به منو برگشت (نبرد گم نشد)", backToMenu.screen === "menu" && backToMenu.demo === false);
  // با دکمهٔ چسبیدهٔ گوشه برگرد (مسیرِ مستقل از کارتِ متن)
  await page.getByTestId("resume-battle").click();
  await settle(page, 800);
  {
    const fromPill = await state(page);
    check("دکمهٔ چسبیدهٔ گوشه هم دقیقاً همان نبرد را ادامه می‌دهد",
      fromPill.screen === "game" && fromPill.paused === false && fromPill.mark === "A");
  }
  // دوباره به منو، این بار از دکمهٔ کارتِ متن برمی‌گردیم
  await pauseBtn.click();
  await settle(page, 350);
  await page.getByRole("button", { name: "منوی اصلی" }).click();
  await settle(page, 400);
  await resumeBtn(page).first().click();
  await settle(page, 800);
  const resumed2 = await state(page);
  check("و از منو با یک ضربه دوباره در همان نبرد", resumed2.screen === "game" && resumed2.paused === false &&
    resumed2.mark === "A");

  check("هیچ خطای اجرایی در صفحه رخ نداد", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

/* ================== ۲) گوشیِ لمسی ================== */
{
  const ctx = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await settle(page, 900);
  await startBattle(page);
  await markBattle(page);

  const bar = page.locator(".hud-bar");
  const pauseBtn = page.locator('button[aria-label="توقف"]');
  {
    const b = await pauseBtn.boundingBox();
    const barBox = await bar.boundingBox();
    const inside = b && barBox && b.x >= barBox.x - 1 && b.x + b.width <= barBox.x + barBox.width + 1;
    check("روی گوشی، تک‌دکمهٔ نوار کامل داخلِ نوار دیده می‌شود", !!inside,
      b ? `btn=${Math.round(b.x)}..${Math.round(b.x + b.width)} bar=${Math.round(barBox.x)}..${Math.round(barBox.x + barBox.width)}` : "پیدا نشد");
    check("دکمه به‌اندازهٔ لمس است", b && b.width >= 28 && b.height >= 28,
      b ? `${Math.round(b.width)}×${Math.round(b.height)}` : "-");
    {
      // روی گوشی هیچ دکمهٔ دیگری دیده نمی‌شود: نه منو، نه مراحل، نه صدا/چرخش
      const visible = await page.locator(".hud-bar button").evaluateAll((els) =>
        els.filter((el) => el.getBoundingClientRect().width > 0)
           .map((el) => el.getAttribute("aria-label") || (el.textContent || "").trim())
           .filter((name) => !/٪/.test(name) && !["−", "+"].includes(name)));
      check("روی گوشی در نوار فقط و فقط دکمهٔ توقف دیده می‌شود", visible.length === 1 && visible[0] === "توقف",
        JSON.stringify(visible));
    }
  }

  await settle(page, 1000);
  const before = await state(page);
  await pauseBtn.tap();
  await settle(page, 400);
  await page.getByRole("button", { name: /ادامهٔ نبرد/ }).isVisible();
  await page.getByRole("button", { name: "منوی اصلی" }).tap();
  await settle(page, 400);
  const inMenu = await state(page);
  check("گوشی: منو نبرد را نگه می‌دارد", inMenu.screen === "menu" && inMenu.demo === false && inMenu.paused === true);

  {
    // روی گوشی کارتِ داخلِ متن ممکن است زیرِ لبه بمانَد؛ دکمهٔ گوشه همیشه در دید است
    const pill = page.getByTestId("resume-battle");
    const box = await pill.boundingBox();
    const vp = page.viewportSize();
    const inView = box && box.y >= 0 && box.y + box.height <= vp.height && box.x >= 0 && box.x + box.width <= vp.width;
    check("گوشی: دکمهٔ چسبیدهٔ «بازگشت به بازی» کامل در صفحه است", !!inView,
      box ? `x=${Math.round(box.x)}..${Math.round(box.x + box.width)} y=${Math.round(box.y)}..${Math.round(box.y + box.height)} vp=${vp.width}×${vp.height}` : "پیدا نشد");
    const rotBox = await page.getByTestId("rotate-fab").boundingBox().catch(() => null);
    check("گوشی: با دکمهٔ چرخش هم‌پوشانی ندارد", !!rotBox && !!box ? box.x > rotBox.x + rotBox.width : false);
  }
  const btn = resumeBtn(page).first();
  {
    const vp = page.viewportSize();
    const box = await btn.boundingBox();
    check("گوشی: در منو فقط یک دکمهٔ بازگشت به بازی هست (کادر حذف شده)",
      (await resumeBtn(page).count()) === 1 && !(await page.evaluate(() => document.body.innerText.includes("نبردِ متوقف‌شده"))),
      box ? `y=${Math.round(box.y)} vp=${vp.height}` : "پیدا نشد");
  }
  await btn.tap();
  await settle(page, 900);
  const after = await state(page);
  check("گوشی: بازگشت به بازی، همان نبرد را ادامه داد",
    after.screen === "game" && after.paused === false && after.mark === "A" && after.i === before.i && after.castles === before.castles);
  check("گوشی: ساعتِ نبرد جلو رفت", after.t > inMenu.t + 0.2, `${inMenu.t.toFixed(2)} → ${after.t.toFixed(2)}`);

  check("گوشی: خطای اجرایی نداشت", errors.length === 0, errors.join(" | "));
  await ctx.close();
}

await browser.close();
console.log(bad === 0
  ? "\nPASS: نوارِ بالا یک دکمهٔ خروج دارد و هر مسیری که به منو/پنل می‌رود، نبرد را زنده برمی‌گردانَد."
  : `\nFAIL: ${bad} بررسی ناموفق`);
process.exit(bad === 0 ? 0 : 1);
