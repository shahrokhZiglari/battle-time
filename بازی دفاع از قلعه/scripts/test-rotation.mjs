// دکمهٔ چرخش ۹۰ درجه: هندسهٔ کادر، دقتِ لمس، جابه‌جایی، و ماندگاری
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

const ctx = await browser.newContext({ ...devices["Pixel 5"] });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push(e.message));

/** نقطهٔ صفحه برای یک قلعه، با در نظر گرفتنِ چرخش */
const screenPointFor = (castleIndex) => page.evaluate((idx) => {
  const g = window.__g;
  const st = document.querySelector("[data-rotation]");
  const r = Number(st.dataset.rotation);
  const rect = st.getBoundingClientRect();
  const { s, ox, oy } = g.view;
  const b = g.bs[idx];
  const px = ox + b.x * s;
  const py = oy + b.y * s;
  // اندازهٔ کادر در فضای صحنه (پیش از چرخش)
  const w = Number(st.dataset.stageW);
  const h = Number(st.dataset.stageH);
  const a = (r * Math.PI) / 2;
  const cx = rect.left + rect.width / 2 + (px - w / 2) * Math.cos(a) - (py - h / 2) * Math.sin(a);
  const cy = rect.top + rect.height / 2 + (px - w / 2) * Math.sin(a) + (py - h / 2) * Math.cos(a);
  return { x: cx, y: cy, owner: b.o };
}, castleIndex);

const geom = () => page.evaluate(() => {
  const st = document.querySelector("[data-rotation]");
  const cv = document.querySelector("canvas");
  const rect = st.getBoundingClientRect();
  return {
    rot: Number(st.dataset.rotation),
    stage: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.width), Math.round(rect.height)],
    canvas: [cv.clientWidth, cv.clientHeight],
    viewport: [window.innerWidth, window.innerHeight],
  };
});

await page.goto(url);
await page.waitForTimeout(800);

/* ---------- دکمه روی صفحهٔ منو هم هست ---------- */
const rotateBtn = page.getByRole("button", { name: "چرخش بازی" });
check("دکمهٔ چرخش در همان ابتدا وجود دارد", (await rotateBtn.count()) >= 1);
{
  const box = await rotateBtn.boundingBox();
  check("دکمهٔ چرخش کوچک و آیکن‌محور است (نه دکمهٔ بزرگِ برچسب‌دار)", box && box.width <= 56 && box.height <= 56,
    box ? `${Math.round(box.width)}×${Math.round(box.height)}` : "پیدا نشد");
  check("اندازهٔ لمس هنوز کافی است (≥۴۰px)", box && box.width >= 40 && box.height >= 40,
    box ? `${Math.round(box.width)}×${Math.round(box.height)}` : "پیدا نشد");
  const txt = (await rotateBtn.textContent()) || "";
  check("برچسبِ متنیِ «چرخش صفحه» از دکمه حذف شده و فقط علامت ⟳ مانده", /^\s*⟳\s*$/.test(txt), JSON.stringify(txt));
}

/* ---------- نقشه و چهار حالت ---------- */
// (در بازی فقط یک دکمهٔ چرخش هست: دکمهٔ بزرگِ پایین-چپ؛ نوارِ بالا دیگر دکمهٔ چرخش ندارد)
const bigBtn = () => page.getByRole("button", { name: "چرخش بازی" }).last();
await page.getByRole("button", { name: "نقشهٔ رندوم" }).click();
await page.waitForTimeout(350);
await page.getByRole("button", { name: "ساخت نقشه" }).click();
await page.waitForTimeout(1800);

const g0 = await geom();
check("بدون چرخش، بوم تمامِ صفحه است", g0.canvas[0] === g0.viewport[0] && g0.canvas[1] === g0.viewport[1],
  `${g0.canvas} vs ${g0.viewport}`);

/* فقط دو حالت: عادی ⇄ ۹۰ درجه (۱۸۰/۲۷۰ حذف شده‌اند) */
for (const [i, expected] of [1, 0, 1, 0].entries()) {
  await bigBtn().click();
  await page.waitForTimeout(600);
  const g = await geom();
  check(`ضربهٔ ${i + 1}: چرخش ${expected * 90}° اعمال شد`, g.rot === expected, `rot=${g.rot}`);
  check(`ضربهٔ ${i + 1}: بازی هیچ‌وقت وارونه (۱۸۰/۲۷۰) نمی‌شود`, g.rot === 0 || g.rot === 1, `rot=${g.rot}`);
  const fill = Math.abs(g.stage[2] - g0.viewport[0]) < 2 && Math.abs(g.stage[3] - g0.viewport[1]) < 2;
  check(`ضربهٔ ${i + 1}: کادر دقیقاً صفحه را پر می‌کند`, fill, `stage=${g.stage}`);
  const swapped = expected === 1;
  const cw = swapped ? g0.viewport[1] : g0.viewport[0];
  const ch = swapped ? g0.viewport[0] : g0.viewport[1];
  check(`ضربهٔ ${i + 1}: اندازهٔ بوم متناسب عوض شد`, g.canvas[0] === cw && g.canvas[1] === ch,
    `${g.canvas} انتظار ${[cw, ch]}`);
}

/* ---------- دقتِ لمس پس از چرخش ۹۰ ---------- */
await bigBtn().click(); // 90
await page.waitForTimeout(700);
{
  const target = await page.evaluate(() => {
    const g = window.__g;
    // فقط قلعهٔ خودی قابلِ انتخاب است
    const idx = g.bs.findIndex((b) => b.o === 1);
    g.sels = [];
    g.sel = null;
    g.ptr = null;
    return { idx, owner: g.bs[idx].o };
  });
  const pt = await screenPointFor(target.idx);
  check("نقطهٔ لمس داخلِ صفحه است", pt.x > 0 && pt.y > 0 && pt.x < 393 && pt.y < 727,
    `${Math.round(pt.x)},${Math.round(pt.y)}`);
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    sels: window.__g.sels.map((b) => b.id),
    draft: window.__g.ptr?.draft.map((b) => b.id) ?? [],
    hover: window.__g.hover?.id ?? null,
  }));
  check("لمس پس از چرخش، همان قلعهٔ دیده‌شده را انتخاب می‌کند",
    after.sels.includes(target.idx) || after.draft.includes(target.idx),
    `هدف=${target.idx} انتخاب=${JSON.stringify(after)}`);
}

/* ---------- جابه‌جایی با کشیدن، پس از چرخش ---------- */
{
  await page.evaluate(() => { const g = window.__g; g.zoomAt(0.45, 180, 360, g.canvasW ?? 727, g.canvasH ?? 393); });
  await page.waitForTimeout(300);
  // مهم: صفر کردنِ جابه‌جایی باید پیش از انتخابِ نقطه باشد؛ وگرنه نقطه‌ای که در
  // وضعیتِ قبلی «زمینِ خالی» بود، بعد از صفر شدنِ pan ممکن است روی قلعه بیفتد و
  // کشیدن، به‌جای جابه‌جایی، انتخاب حساب شود (خطای آزمون، نه بازی).
  await page.evaluate(() => { window.__g.panX = 0; window.__g.panY = 0; });
  await page.waitForTimeout(200);
  // یک نقطهٔ خالی روی صفحه پیدا کن (نگاشتِ معکوس + بررسیِ buildingAt)
  const empty = await page.evaluate(() => {
    const g = window.__g;
    const st = document.querySelector("[data-rotation]");
    const r = Number(st.dataset.rotation);
    const rect = st.getBoundingClientRect();
    const w = Number(st.dataset.stageW), h = Number(st.dataset.stageH);
    const a = (r * Math.PI) / 2;
    for (let sy = 120; sy < h - 120; sy += 20) {
      for (let sx = 120; sx < w - 120; sx += 20) {
        const wx = (sx - g.view.ox) / g.view.s;
        const wy = (sy - g.view.oy) / g.view.s;
        if (g.buildingAt(wx, wy)) continue;
        const cx = rect.left + rect.width / 2 + (sx - w / 2) * Math.cos(a) - (sy - h / 2) * Math.sin(a);
        const cy = rect.top + rect.height / 2 + (sx - w / 2) * Math.sin(a) + (sy - h / 2) * Math.cos(a);
        if (cx > 80 && cy > 80 && cx < window.innerWidth - 80 && cy < window.innerHeight - 80) return { x: cx, y: cy };
      }
    }
    return null;
  });
  check("نقطهٔ زمینِ خالی برای آزمونِ جابه‌جایی پیدا شد", !!empty);
  if (empty) {
    const before = await page.evaluate(() => ({ x: window.__g.panX, y: window.__g.panY }));
    await page.mouse.move(empty.x, empty.y);
    await page.mouse.down();
    await page.mouse.move(empty.x + 90, empty.y, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ x: window.__g.panX, y: window.__g.panY }));
    const moved = Math.hypot(after.x - before.x, after.y - before.y);
    check("کشیدن روی زمین، نقشه را جابه‌جا می‌کند", moved > 20, `Δ=${moved.toFixed(1)}`);
    // در چرخشِ ۹۰ درجه، کشیدنِ افقیِ انگشت باید نقشه را روی محورِ دیگری ببرد
    check("جابه‌جایی دقیقاً در راستای انگشت است (نه ۹۰ درجه کج)", Math.abs(after.y - before.y) > Math.abs(after.x - before.x),
      `Δx=${(after.x - before.x).toFixed(1)} Δy=${(after.y - before.y).toFixed(1)}`);
  }
}

/* ---------- ماندگاری پس از بارگذاریِ مجدد ---------- */
await page.reload();
await page.waitForTimeout(900);
{
  const g = await geom();
  check("چرخش پس از رفرش به یاد می‌ماند", g.rot === 1, `rot=${g.rot}`);
  const label = await page.getByRole("button", { name: "چرخش بازی" }).getAttribute("title");
  check("راهنمای دکمه (title) درجهٔ فعلی را نشان می‌دهد", /۹۰/.test(label || ""), label?.trim());
}

/* ---------- بازگشت به صفر ---------- */
await page.getByRole("button", { name: "چرخش بازی" }).first().click();
await page.waitForTimeout(500);
{
  const g = await geom();
  check("با یک ضربهٔ دیگر به حالتِ بدونِ چرخش برمی‌گردد", g.rot === 0, `rot=${g.rot}`);
  check("در حالتِ صفر، بوم دوباره تمامِ صفحه است", g.canvas[0] === g.viewport[0] && g.canvas[1] === g.viewport[1]);
}

/* ---------- در حالتِ چرخیده هم بازی ادامه دارد ---------- */
await page.getByRole("button", { name: "چرخش بازی" }).first().click();
await page.waitForTimeout(600);
{
  const t1 = await page.evaluate(() => window.__g.t);
  await page.waitForTimeout(1200);
  const t2 = await page.evaluate(() => window.__g.t);
  check("پس از چرخش، ساعتِ بازی جلو می‌رود (بازی زنده است)", t2 > t1 + 0.5, `${t1.toFixed(2)} → ${t2.toFixed(2)}`);
}

/* ---------- نوارِ بالا دیگر دکمهٔ چرخش ندارد؛ ردیفِ پنلِ توقف می‌چرخانَد ---------- */
{
  // پیش‌نیاز: یک نبردِ واقعی (بعد از رفرش، بازیِ نمایشی در جریان است و نوارِ بالا ندارد)
  if (!(await page.locator("button[aria-label=\"توقف\"]").count())) {
    await page.getByRole("button", { name: /شروع مرحله‌ای/ }).click();
    await page.waitForTimeout(400);
    const lv = page.getByRole("button", { name: "۱", exact: true });
    if (await lv.count()) await lv.first().click();
    await page.waitForTimeout(1600);
  }
  check("نوارِ بالای نبرد دیده می‌شود", (await page.locator(".hud-bar").count()) === 1);

  const hudRotate = await page.locator('.hud-bar button[aria-label="چرخش بازی"]').count();
  check("دکمهٔ چرخش از نوارِ بالا برداشته شده (نوار فقط یک دکمه دارد)", hudRotate === 0, `count=${hudRotate}`);

  const before = await page.evaluate(() => Number(document.querySelector("[data-rotation]").dataset.rotation));
  await page.locator("button[aria-label=\"توقف\"]").first().click();
  await page.waitForTimeout(600);
  const row = page.getByRole("button", { name: "چرخش صفحه" }).first();
  check("ردیفِ چرخش در پنلِ توقف هست", (await row.count()) === 1);
  await row.click();
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => Number(document.querySelector("[data-rotation]").dataset.rotation));
  check("ردیفِ چرخشِ پنلِ توقف هم بازی را می‌چرخاند", after === (before === 0 ? 1 : 0), `${before} → ${after}`);

  await page.getByRole("button", { name: /ادامهٔ نبرد/ }).click();
  await page.waitForTimeout(800);
  const live = await page.evaluate(() => ({ p: window.__g.paused, t: window.__g.t, demo: window.__g.demo }));
  check("بعد از چرخش از پنل، «ادامهٔ نبرد» نبرد را زنده برمی‌گردانَد", live.p === false && live.demo === false);
  // به حالتِ بدونِ چرخش برگرد تا بررسی‌های بعدی مثل قبل باشند
  if (after !== 0) {
    for (let i = 0; i < (4 - after) % 4; i++) {
      await page.getByRole("button", { name: "چرخش بازی" }).first().click();
      await page.waitForTimeout(400);
    }
  }
}

/* ---------- دکمه‌های پنل‌ها پوشانده نمی‌شوند ---------- */
{
  // به منو برگرد (در این مرحله بعد از رفرش، بازیِ نمایشی در جریان است)
  // نوارِ بالا یک دکمه دارد؛ اگر در نبرد هستیم، مسیرِ منو از پنلِ توقف است.
  if (!(await page.getByRole("button", { name: "نقشهٔ رندوم" }).count())) {
    const pauseBtn = page.locator('button[aria-label="توقف"]');
    if (await pauseBtn.count()) {
      await pauseBtn.first().click();
      await page.waitForTimeout(320);
      const toMenu = page.getByRole("button", { name: "منوی اصلی" });
      if (await toMenu.count()) await toMenu.first().click();
    }
  }
  await page.waitForTimeout(500);
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "نقشهٔ رندوم" }).click();
  await page.waitForTimeout(400);
  const btn = page.getByRole("button", { name: "ساخت نقشه" });
  await btn.scrollIntoViewIfNeeded();
  await page.waitForTimeout(200);
  const box = await btn.boundingBox();
  const topEl = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return el ? (el.textContent || "").trim().slice(0, 20) : null;
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  check("دکمهٔ «ساخت نقشه» توسط دکمهٔ چرخش پوشانده نشده",
    (topEl || "").includes("ساخت نقشه") || topEl === null, String(topEl));
  check("دکمهٔ شناورِ چرخش روی پنل پنهان است",
    (await page.getByRole("button", { name: "چرخش بازی" }).count()) <= 1);
  await page.getByRole("button", { name: "ساخت نقشه" }).click();
  await page.waitForTimeout(1500);
}


/* ---------- دکمهٔ چرخش داخلِ کادرِ بازی است و با آن می‌چرخد ---------- */
{
  // الان روی نقشهٔ رندومِ تازه‌ایم
  await page.evaluate(() => { localStorage.removeItem("bt_view_v1"); });
  // صفر کردنِ چرخش: تا وقتی داده-چرخش صفر نشد، ضربه بزن
  for (let i = 0; i < 4; i++) {
    const r = await page.evaluate(() => Number(document.querySelector("[data-rotation]").dataset.rotation));
    if (r === 0) break;
    await page.getByRole("button", { name: "چرخش بازی" }).last().click();
    await page.waitForTimeout(350);
  }
  const fab = page.locator('[data-testid="rotate-fab"]');
  const b0 = await fab.boundingBox();
  check("دکمهٔ شناورِ چرخش مربعِ کوچک است (فقط علامت، بدونِ متن)",
    b0 && Math.abs(b0.width - b0.height) <= 1 && b0.width <= 56,
    b0 ? `${Math.round(b0.width)}×${Math.round(b0.height)}` : "ندارد");
  await page.getByRole("button", { name: "چرخش بازی" }).last().click();
  await page.waitForTimeout(600);
  const b1 = await fab.boundingBox();
  check("دکمه همچنان مربع و کامل در صفحه است حتی در حالتِ چرخیده",
    b1 && Math.abs(b1.width - b1.height) <= 1 && b1.width <= 56,
    b1 ? `${Math.round(b1.width)}×${Math.round(b1.height)}` : "ندارد");
  const inside = await page.evaluate(() => {
    const st = document.querySelector("[data-rotation]");
    const f = document.querySelector('[data-testid="rotate-fab"]');
    return !!st && !!f && st.contains(f);
  });
  check("دکمهٔ چرخش فرزندِ همان کادرِ چرخیده است (پس در حالتِ افقی صاف می‌مانَد)", inside);
  // در هر چهار حالت، دکمه کامل داخلِ صفحه دیده می‌شود
  let allIn = true;
  let detail = "";
  for (let k = 0; k < 4; k++) {
    const r = await page.evaluate(() => Number(document.querySelector("[data-rotation]").dataset.rotation));
    const bb = await fab.boundingBox();
    const ok = bb && bb.x >= 0 && bb.y >= 0 && bb.x + bb.width <= 393 && bb.y + bb.height <= 727;
    if (!ok) { allIn = false; detail = `rot=${r} box=${bb && [Math.round(bb.x), Math.round(bb.y), Math.round(bb.width), Math.round(bb.height)]}`; }
    await page.getByRole("button", { name: "چرخش بازی" }).last().click();
    await page.waitForTimeout(350);
  }
  check("در هر چهار جهت، دکمهٔ چرخش کامل داخلِ صفحه است", allIn, detail);
}

/* ---------- چرخش از پنلِ توقف (دکمهٔ شناور آنجا پنهان است) ---------- */
{
  const pauseBtn = page.locator('button[aria-label="توقف"]');
  if (await pauseBtn.count()) {
    await pauseBtn.first().click();
    await page.waitForTimeout(450);
  }
  const row = page.getByRole("button", { name: "چرخش صفحه" });
  check("پنلِ توقف هم ردیفِ «چرخش صفحه» دارد", (await row.count()) === 1);
  check("روی پنلِ توقف، دکمهٔ شناور پنهان است", (await page.locator('[data-testid="rotate-fab"]').count()) === 0);
  if (await row.count()) {
    const before = await page.evaluate(() => Number(document.querySelector("[data-rotation]").dataset.rotation));
    await row.first().click();
    await page.waitForTimeout(450);
    const after = await page.evaluate(() => Number(document.querySelector("[data-rotation]").dataset.rotation));
    check("ردیفِ چرخشِ پنلِ توقف، بازی را می‌چرخاند", after === (before === 0 ? 1 : 0), `${before} → ${after}`);
  }
  await page.getByRole("button", { name: /ادامهٔ نبرد/ }).click();
  await page.waitForTimeout(500);
  const live = await page.evaluate(() => { const g = window.__g; return { paused: g.paused, t: g.t }; });
  await page.waitForTimeout(800);
  const t2 = await page.evaluate(() => window.__g.t);
  check("بعد از چرخش در پنلِ توقف، نبرد از همان‌جا ادامه پیدا می‌کند", !live.paused && t2 > live.t, `${live.t.toFixed(2)} → ${t2.toFixed(2)}`);
}

/* ---------- راهنمای یک‌بارهٔ گوشی ---------- */
{
  await page.evaluate(() => { localStorage.removeItem("bt_rot_hint_v1"); localStorage.setItem("bt_view_v1", "0"); });
  await page.reload();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: /شروع مرحله/ }).first().click();
  await page.waitForTimeout(700);
  const hint = page.locator("text=برای دیدِ افقی");
  check("بارِ اول، راهنمای «برای دیدِ افقی» کنارِ دکمه دیده می‌شود", (await hint.count()) === 1);
  await page.getByRole("button", { name: "چرخش بازی" }).last().click();
  await page.waitForTimeout(400);
  check("با اولین ضربه، راهنما کنار می‌رود", (await hint.count()) === 0);
  const flag = await page.evaluate(() => localStorage.getItem("bt_rot_hint_v1"));
  check("راهنما فقط یک‌بار نشان داده می‌شود", flag === "1");
}

/* ---------- چرخاندنِ فیزیکیِ گوشی: چرخشِ دوباره اتفاق نمی‌افتد ---------- */
{
  const rotBefore = await page.evaluate(() => Number(document.querySelector("[data-rotation]").dataset.rotation));
  await page.setViewportSize({ width: 727, height: 393 }); // کاربر گوشی را افقی می‌کند
  await page.waitForTimeout(700);
  const rotAfter = await page.evaluate(() => Number(document.querySelector("[data-rotation]").dataset.rotation));
  check("وقتی خودِ گوشی افقی شود، چرخشِ CSS خودکار صفر می‌شود (تصویر کج نمی‌مانَد)",
    rotBefore % 2 === 0 || rotAfter === 0, `${rotBefore} → ${rotAfter}`);
  await page.screenshot({ path: "/home/user/shots/26-landscape-native.png" });
}

console.log(errors.length ? "خطای مرورگر: " + errors.join(" | ") : "بدون خطای مرورگر ✔");
await page.screenshot({ path: "/home/user/shots/22-rotation-final.png" });
await browser.close();
console.log(bad ? `FAILS=${bad}` : "PASS: the rotate button turns the game 90° and every input still lines up.");
process.exit(bad ? 1 : 0);
