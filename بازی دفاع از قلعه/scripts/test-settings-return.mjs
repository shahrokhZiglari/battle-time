// تنظیمات در میانهٔ نبردِ نقشهٔ رندوم: تغییر بده، «ذخیره» بزن، بازی باید همان‌جا ادامه یابد
//
// این آزمون دقیقاً همان چیزی را می‌سنجد که کاربر گزارش کرده بود:
//   «در حالتِ نقشهٔ رندوم، پنلِ تنظیمات را باز می‌کنم و چیزی را عوض می‌کنم؛
//    بعد دکمهٔ بازگشت به بازی کار نمی‌کند.»
//
// پس علاوه بر «پنل بسته شد»، این‌ها هم بررسی می‌شوند:
//   • بازی بعد از بازگشت واقعاً زنده است (ساعتِ نبرد جلو می‌رود و paused=false)
//   • وضعیتِ نبرد (قلعه‌ها، نیروها، لشکرها، شمارهٔ نقشه) دست‌نخورده مانده
//   • تنظیمِ عوض‌شده هم روی موتور و هم در حافظه اعمال و نگه داشته شده
//   • مسیرهای دیگرِ بازگشت (دکمهٔ هدر، Escape، اسکریم) هم همان‌طور کار می‌کنند
//   • اگر نبرد همان لحظه تمام شده باشد، بازی یخ‌زده رها نمی‌شود
//   • روی گوشی (لمسی) هم همین‌طور است
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
      over: g?.over ?? null,
      t: g ? g.t : null,
      i: g?.i ?? null,
      owners: g ? g.bs.map((b) => b.o).join("") : null,
      troops: g ? g.bs.map((b) => Math.round(b.tr)).join(",") : null,
      squads: g ? g.sq.length : 0,
      settings: txt.includes("نسخهٔ ۱۹"),
      pause: txt.includes("میدان نبرد متوقف شد"),
      menu: txt.includes("نبرد قلعه‌ها") && !txt.includes("میدان نبرد متوقف شد"),
      attackDash: g?.attackDash ?? null,
    };
  });

const zoomToBattle = (page) => page.evaluate(() => { if (window.__g) window.__g.zoomAt(0.3, 200, 300, 1200, 800); });

async function openSettings(page) {
  await page.locator('button[aria-label="توقف"]').first().click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "تنظیمات" }).click();
  await page.waitForTimeout(400);
}

async function changeTransparency(page) {
  // دورِ ۱۹: هیچ اسلایدری نیست — کاشی‌های ۰٫۸، ۰٫۵، ۰٫۲ شفافیت را پله‌پله کم می‌کنند
  const tile = page.locator('button[aria-label="کاهش شفافیت نقطه‌چین مسیر حمله"]');
  await tile.scrollIntoViewIfNeeded();
  for (let i = 0; i < 5; i++) await tile.click({ delay: 5 });
  await page.waitForTimeout(250);
}

async function changeSounds(page) {
  // دورِ ۱۸: روشن/خاموشِ دو لایهٔ صوتی با کلیدهای فشردهٔ کنارِ سرِ کارتِ صدا
  const chips = page.locator(
    'button[aria-label^="صدای طبیعتِ آرام‌بخش"], button[aria-label^="صدای حرکت لشکر"]',
  );
  await chips.nth(0).click();
  await page.waitForTimeout(150);
  await chips.nth(1).click();
  await page.waitForTimeout(250);
}

/* ===================== ۱) دسکتاپ: مسیرِ اصلی ===================== */
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(url);
  await page.waitForTimeout(800);

  const build = await page.evaluate(() => document.querySelector("[data-build]")?.getAttribute("data-build"));
  check("شناسهٔ ساخت روی صفحه هست", build === "۱۹", String(build));

  // --- ساختِ نقشهٔ رندوم ---
  await page.getByRole("button", { name: "نقشهٔ رندوم" }).click();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "ساخت نقشه" }).click();
  await page.waitForTimeout(1600);
  await zoomToBattle(page);
  await page.waitForTimeout(600);

  const live = await state(page);
  check("نقشهٔ رندوم ساخته شد و نبرد در جریان است", live.hasG && !live.demo && !live.paused && !live.over);

  // --- باز کردنِ تنظیماتِ وسطِ نبرد ---
  await openSettings(page);
  const opened = await state(page);
  check("پنلِ تنظیمات در میانهٔ نبرد باز می‌شود", opened.settings);
  const tA = opened.t;
  await page.waitForTimeout(1000);
  const tB = (await state(page)).t;
  check("تا وقتی تنظیمات باز است، نبرد متوقف می‌ماند", Math.abs(tB - tA) < 0.02, `${tA.toFixed(2)} → ${tB.toFixed(2)}`);

  // --- تغییرِ شفافیت و صدا ---
  await changeTransparency(page);
  const afterDash = await state(page);
  check("تغییرِ شفافیت، وضعیتِ نبرد را دست نمی‌زند",
    afterDash.owners === opened.owners && afterDash.troops === opened.troops && afterDash.squads === opened.squads,
    `owners=${afterDash.owners}`);

  await changeSounds(page);
  const afterSound = await state(page);
  check("تغییرِ صدا وضعیتِ نبرد را دست نمی‌زند",
    afterSound.owners === opened.owners && afterSound.troops === opened.troops && afterSound.squads === opened.squads);

  const dashValue = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").attackDash);
  const sndValue = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").snd);
  check("شفافیتِ جدید ذخیره شد", Math.abs(Number(dashValue) - 0.75) < 1e-6, String(dashValue));
  check("وضعیتِ صدا در حافظه ثبت شد", typeof sndValue === "boolean", String(sndValue));

  // --- خودِ دکمهٔ بازگشت: برچسبِ صریح و همیشه در دسترس ---
  {
    const btns = page.getByRole("button", { name: /بازگشت به بازی/ });
    check("در وسطِ نبرد، دکمهٔ پایانِ پنل «بازگشت به بازی» نام دارد", (await btns.count()) >= 1);
    const bar = page.locator("div.sticky").last();
    const box = await bar.boundingBox();
    const vp = page.viewportSize();
    check("نوارِ دکمه‌ها بدونِ اسکرول در دید است (هدر پنجره)",
      !!box && box.y + box.height <= vp.height + 1 && box.y >= 0,
      box ? `y=${Math.round(box.y)} h=${Math.round(box.height)} vh=${vp.height}` : "ندارد");
  }

  // --- دکمهٔ «ذخیره» = بازگشت به بازی ---
  await page.getByRole("button", { name: /بازگشت به بازی|ذخیره/ }).last().click();
  await page.waitForTimeout(600);
  const back = await state(page);
  check("دکمهٔ بازگشت، پنلِ تنظیمات را می‌بندد", !back.settings);
  check("بعد از بازگشت، دوباره در خودِ بازی هستیم (نه منو، نه توقف)", !back.menu && !back.pause);
  check("بازی توقف‌زده رها نمی‌شود", back.paused === false, `paused=${back.paused}`);
  const tC = back.t;
  await page.waitForTimeout(1200);
  const tD = (await state(page)).t;
  check("بازی بعد از بازگشت واقعاً جلو می‌رود", tD > tC + 0.4, `${tC.toFixed(2)} → ${tD.toFixed(2)}`);
  check("وضعیتِ نبرد بعد از بازگشت همان است",
    back.owners === opened.owners && back.i === opened.i,
    `owners ${opened.owners} → ${back.owners}`);
  check("شفافیتِ تازه روی موتورِ بازی اعمال شده", typeof back.attackDash === "number" && Math.abs(back.attackDash - dashValue) < 1e-6,
    `engine=${back.attackDash} saved=${dashValue}`);

  // --- بارِ دوم: تغییرِ دیگری و بازگشت با دکمهٔ هدر ---
  await openSettings(page);
  await page.getByRole("button", { name: /نبرد فقط در قلعه/ }).click();
  await page.waitForTimeout(250);
  const before2 = await state(page);
  await page.getByRole("button", { name: "بازگشت ✕" }).click();
  await page.waitForTimeout(600);
  const after2 = await state(page);
  check("دکمهٔ «بازگشت ✕» هدر هم بازی را از سر می‌گیرد",
    !after2.settings && after2.paused === false && after2.i === before2.i,
    `paused=${after2.paused} i=${after2.i}`);

  // --- بارِ سوم: بستن با Escape ---
  await openSettings(page);
  await page.locator('button[aria-label="افزایش شفافیت نقطه‌چین مسیر حمله"]').click({ delay: 5 });
  await page.waitForTimeout(200);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  const after3 = await state(page);
  check("Escape هم تنظیمات را می‌بندد و بازی را برمی‌گرداند", !after3.settings && after3.paused === false);

  // --- بارِ چهارم: نبردی که همان لحظه تمام می‌شود ---
  await openSettings(page);
  await page.evaluate(() => { window.__g.over = true; });
  await page.getByRole("button", { name: /بازگشت به بازی|ذخیره/ }).last().click();
  await page.waitForTimeout(700);
  const overCase = await state(page);
  check("اگر نبرد همان حین تمام شده باشد، بازی یخ‌زده رها نمی‌شود", overCase.paused === false, `paused=${overCase.paused}`);

  // --- اصلِ تغییرناپذیر: اگر صفحهٔ بازی دیده شود، نبرد نباید یخ‌زده بماند ---
  {
    // همان کاری که مسیرِ معیوبِ قبلی می‌کرد: برگشتن به صفحهٔ بازی بدونِ برداشتنِ توقف
    await page.evaluate(() => { window.__g.paused = true; });
    await openSettings(page);
    await page.getByRole("button", { name: /بازگشت به بازی|ذخیره/ }).last().click();
    await page.waitForTimeout(500);
    const w = await page.evaluate(() => window.__g.paused);
    check("نگهبانِ وضعیت: بعد از بازگشت، نبرد هرگز در حالتِ توقف نمی‌مانَد", w === false, `paused=${w}`);
  }

  // --- مسیرِ چهارم: کلیک بیرونِ پنل (روی پردهٔ تیره) ---
  {
    await openSettings(page);
    await changeTransparency(page);
    await page.mouse.click(20, 20); // بیرونِ کارتِ پنل
    await page.waitForTimeout(600);
    const s2 = await state(page);
    const tA2 = s2.t;
    await page.waitForTimeout(900);
    const tB2 = (await state(page)).t;
    check("کلیک بیرونِ پنل هم تنظیمات را می‌بندد و نبرد را از سر می‌گیرد",
      !s2.settings && s2.paused === false && tB2 > tA2, `${tA2.toFixed(2)} → ${tB2.toFixed(2)}`);
  }

  // --- ماندگاری پس از رفرش ---
  const savedDash = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").attackDash);
  await page.reload();
  await page.waitForTimeout(900);
  const reloaded = await page.evaluate(() => ({
    dash: JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").attackDash,
    battle: JSON.parse(localStorage.getItem("bt_settings_v1") || "{}").battleMode,
  }));
  check("تنظیمات بعد از رفرش حفظ می‌شوند",
    Math.abs(reloaded.dash - savedDash) < 1e-6 && reloaded.battle === "castle",
    JSON.stringify(reloaded));


  await ctx.close();
}

/* ===================== ۲) گوشی: همان مسیر با لمس ===================== */
{
  const ctx = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

  await page.goto(url);
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: "نقشهٔ رندوم" }).tap();
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "ساخت نقشه" }).tap();
  await page.waitForTimeout(1800);
  const live = await state(page);
  check("[گوشی] نقشهٔ رندوم بالا آمد", live.hasG && !live.demo && !live.paused);

  await openSettings(page);
  const opened = await state(page);
  check("[گوشی] پنلِ تنظیمات باز است", opened.settings);
  await changeTransparency(page);
  await changeSounds(page);
  const mid = await state(page);
  check("[گوشی] تغییرِ تنظیمات، وضعیتِ نبرد را عوض نمی‌کند", mid.owners === opened.owners && mid.troops === opened.troops);

  const save = page.getByRole("button", { name: /بازگشت به بازی|ذخیره/ }).last();
  await save.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  const sb = await save.boundingBox();
  const onTop = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return el ? (el.textContent || "").trim().slice(0, 24) : null;
  }, { x: sb.x + sb.width / 2, y: sb.y + sb.height / 2 });
  check("[گوشی] دکمهٔ بازگشت با چیزی پوشانده نشده", /بازگشت به بازی|ذخیره/.test(onTop || ""), String(onTop));
  await save.tap();
  await page.waitForTimeout(700);
  const back = await state(page);
  check("[گوشی] بعد از «ذخیره» به بازی برمی‌گردیم", !back.settings && !back.pause && !back.menu);
  check("[گوشی] بازی توقف‌زده رها نمی‌شود", back.paused === false, `paused=${back.paused}`);
  const t1 = back.t;
  await page.waitForTimeout(1100);
  const t2 = (await state(page)).t;
  check("[گوشی] نبرد بعد از بازگشت جلو می‌رود", t2 > t1 + 0.4, `${t1.toFixed(2)} → ${t2.toFixed(2)}`);
  check("[گوشی] وضعیتِ نبرد دست‌نخورده مانده", back.owners === opened.owners);

  // چرخیده هم باید کار کند
  await page.locator('[data-testid="rotate-fab"]').tap();
  await page.waitForTimeout(600);
  await openSettings(page);
  await changeTransparency(page);
  await page.getByRole("button", { name: /بازگشت به بازی|ذخیره/ }).last().tap();
  await page.waitForTimeout(700);
  const rotBack = await state(page);
  check("[گوشی/چرخیده] بازگشت از تنظیمات در حالتِ چرخیده هم کار می‌کند",
    !rotBack.settings && rotBack.paused === false);
  await page.screenshot({ path: "/home/user/shots/30-settings-return-phone.png" });
  await ctx.close();
}

console.log(errors.length ? "خطای مرورگر: " + errors.slice(0, 3).join(" | ") : "بدون خطای مرورگر ✔");
await browser.close();
console.log(bad ? `FAILS=${bad}` : "PASS: settings can be changed mid-battle in Random Map mode and the game always resumes untouched.");
process.exit(bad ? 1 : 0);
