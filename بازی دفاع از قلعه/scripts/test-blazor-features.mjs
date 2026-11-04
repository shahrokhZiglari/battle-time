// New settings in the Blazor Server build: road rules, nature sounds and wheel zoom.
import { chromium } from "playwright";
import assert from "node:assert/strict";

const base = process.env.CASTLE_TEST_URL || "http://127.0.0.1:5099";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

try {
  await page.goto(base + "/games/castle");
  await page.getByRole("button", { name: "تنظیمات", exact: true }).click();
  await page.getByText("صداهای طبیعی", { exact: true }).waitFor();
  await page.getByText("راه‌های نقشه", { exact: true }).waitFor();
  console.log("PASS: Blazor shows the nature-sound and road sections.");

  await page.getByLabel("همهٔ قلعه‌ها به هم دسترسی داشته باشند").check();
  await page.getByLabel("راه‌ها کاملاً رندوم باشند").check();
  await page.getByLabel("صدای طبیعتِ آرام‌بخش در پس‌زمینه").uncheck();
  await page.getByLabel("صدای حرکت لشکر هنگام حمله").uncheck();
  await page.locator("#cg-road").fill("75");
  await page.getByRole("button", { name: "ذخیره و اعمال", exact: true }).click();
  await page.waitForTimeout(600);

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("castle_blazor9_settings_v2")));
  assert.equal(stored.openRoads, true);
  const storedMap = await page.evaluate(() => JSON.parse(localStorage.getItem("castle_blazor9_map_v1")));
  assert.equal(storedMap.randomRoads, true, "random-road flag is stored with the map settings");
  assert.equal(stored.ambientSound, false);
  assert.equal(stored.marchSound, false);
  assert.equal(stored.minCastleDistance, 75);
  console.log("PASS: C# stored the road rules and sound switches.");

  // the zoom controls live on the large random map
  await page.getByRole("button", { name: /نقشهٔ رندوم/ }).first().click();
  await page.getByText("نقشهٔ رندوم", { exact: true }).first().waitFor();
  await page.getByRole("button", { name: "توقف", exact: true }).waitFor();

  const plus = page.getByRole("button", { name: "بزرگ‌نمایی", exact: true });
  const minus = page.getByRole("button", { name: "کوچک‌نمایی", exact: true });
  const box = await plus.boundingBox();
  assert.ok(box.width <= 32 && box.height <= 32, `Blazor zoom buttons are small (${box.width}x${box.height})`);
  const zoomValue = page.locator(".cg-zoom-value");
  await plus.click();
  await page.waitForTimeout(1200);
  const toNumber = (value) => Number(value.replace(/[^۰-۹0-9]/g, "").replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  assert.equal(toNumber(await zoomValue.innerText()), 115, "the + button zooms in");
  await page.getByRole("button", { name: "کوچک‌نمایی", exact: true }).click();
  await page.waitForTimeout(1200);
  assert.equal(toNumber(await zoomValue.innerText()), 100, "the - button zooms out");
  console.log("PASS: Blazor zoom buttons are compact and zoom in and out.");
  console.log("PASS: Blazor zoom buttons are compact and zoom in.");

  const canvas = await page.locator("canvas").boundingBox();
  await page.mouse.move(canvas.x + canvas.width / 2, canvas.y + canvas.height / 2);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(500);
  const wheelText = await zoomValue.innerText();
  const wheelNumber = toNumber(wheelText);
  assert.ok(wheelNumber > 100, `wheel zoom did not work in Blazor (${wheelText})`);
  console.log(`PASS: the mouse wheel zooms the Blazor battlefield (${wheelText}).`);

  assert.deepEqual(errors, []);
  console.log("PASS: no browser errors.");
} finally {
  await browser.close();
}
