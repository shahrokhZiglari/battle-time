// Wheel zoom, small zoom buttons, and the new settings sections.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { resolve } from "node:path";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

try {
  await page.goto("file://" + resolve("START-GAME-OFFLINE.html"), { waitUntil: "load" });
  // open settings from the main menu first
  await page.getByRole("button", { name: "تنظیمات", exact: true }).click();

  // بخش‌های تنظیمات (دورِ ۱۹: کارتِ «صدا و افکت‌ها» و کلیدهای روشن/خاموشِ گویا)
  await page.getByText("صدا و افکت‌ها", { exact: true }).waitFor();
  const nature = page.locator('button[aria-label^="صدای طبیعتِ آرام‌بخش"]');
  const march = page.locator('button[aria-label^="صدای حرکت لشکر"]');
  assert.equal(await nature.count(), 1, "nature toggle exists");
  assert.equal(await march.count(), 1, "march toggle exists");
  // خاموش‌کردنِ هر دو کلید (از حالتِ روشن)
  if ((await nature.getAttribute("aria-pressed")) === "true") await nature.click();
  if ((await march.getAttribute("aria-pressed")) === "true") await march.click();
  // «فاصلهٔ قلعه‌ها» با دکمه‌های + و −
  const distPlus = page.locator('button[aria-label="افزایش حداقل فاصلهٔ دو قلعهٔ همسایه"]');
  for (let i = 0; i < 9; i++) await distPlus.click();
  await page.getByRole("button", { name: "بازگشت ✕", exact: true }).click();
  await page.waitForTimeout(400);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("bt_settings_v1")));
  assert.equal(stored.ambientSound, false);
  assert.equal(stored.marchSound, false);
  assert.equal(stored.minCastleDistance, 75);

  console.log("PASS: the settings are stored and applied.");

  // now start a random map so the zoom controls are on screen
  await page.getByRole("button", { name: "نقشهٔ رندوم", exact: true }).click();
  await page.getByRole("button", { name: "ساخت نقشه" }).waitFor();
  await page.getByRole("button", { name: "ساخت نقشه" }).click();
  await page.waitForTimeout(1800);

  // zoom buttons are compact and work
  const plus = page.getByRole("button", { name: "بزرگ‌نمایی", exact: true });
  const minus = page.getByRole("button", { name: "کوچک‌نمایی", exact: true });
  assert.equal(await plus.count(), 1);
  assert.equal(await minus.count(), 1);
  const box = await plus.boundingBox();
  assert.ok(box.width <= 32 && box.height <= 32, `zoom buttons are small (${box.width}x${box.height})`);
  console.log("PASS: the zoom +/- buttons are compact.");

  const zoomValue = page.getByTitle("بازنشانی زوم");
  await plus.click();
  await zoomValue.filter({ hasText: "۱۱۵" }).waitFor();
  console.log("PASS: the + button zooms in.");
  await minus.click();
  await zoomValue.filter({ hasText: "۱۰۰" }).waitFor();
  console.log("PASS: the - button zooms out.");

  // mouse wheel zooms the map
  const canvas = await page.locator("canvas").boundingBox();
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(400);
  const zoomText = await zoomValue.innerText();
  const zoomNumber = Number(zoomText.replace(/[^۰-۹]/g, "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  assert.ok(zoomNumber > 100, `wheel zoom did not work (${zoomText})`);
  console.log(`PASS: the mouse wheel zooms the map (${zoomText}).`);

  await zoomValue.click();
  await zoomValue.filter({ hasText: "۱۰۰" }).waitFor();
  console.log("PASS: the reset button returns to the fit view.");

  assert.deepEqual(errors, []);
  console.log("PASS: no browser errors.");
} finally {
  await browser.close();
}
