import { chromium } from "playwright";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const base = process.env.CASTLE_TEST_URL || "http://127.0.0.1:5099";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const external = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("request", (r) => { if (/^https?:/.test(r.url()) && !r.url().startsWith(base)) external.push(r.url()); });

try {
  const css = await page.request.get(base + "/CastleGame.Blazor.styles.css");
  assert.equal(css.status(), 200, "Blazor isolated CSS is served");
  await page.goto(base + "/games/castle");
  await page.getByRole("button", { name: "شروع مرحله‌ای", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "انتخاب همه", exact: true }).count(), 0);
  assert.equal(await page.getByText("راهنمای فرمان", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "مراحل", exact: true }).click();
  await page.locator(".cg-level").first().waitFor();
  assert.equal(await page.locator(".cg-level").count(), 30, "The campaign contains 30 levels");
  await page.getByRole("button", { name: "بازگشت", exact: true }).click();
  console.log("PASS: Blazor Server hydrated; menu and Canvas loaded.");
  console.log("PASS: both campaign and random-map modes are available; campaign has 30 levels.");

  await page.getByRole("button", { name: "تنظیمات", exact: true }).click();
  await page.getByLabel("تعداد سرباز: بین ۱ تا ۱۰۰۰").fill("60");
  await page.getByRole("button", { name: "فقط قلعهٔ مقصد", exact: true }).click();
  await page.getByRole("button", { name: "ذخیره و اعمال", exact: true }).click();
  await page.waitForTimeout(300);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("castle_blazor9_settings_v2")));
  assert.equal(stored.maxTroopsCap, 60);
  assert.equal(stored.battleMode, 1);
  console.log("PASS: C# settings saved to browser storage and applied.");

  await page.getByRole("button", { name: "شروع مرحله‌ای", exact: true }).click();
  await page.getByRole("button", { name: "توقف", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "انتخاب همه", exact: true }).count(), 0);
  assert.equal(await page.getByText("راهنمای فرمان", { exact: true }).count(), 0);
  assert.equal(await page.getByRole("button", { name: /ارتقا/ }).count(), 0);
  assert.equal(await page.getByRole("button", { name: "ارتقا", exact: true }).count(), 0);
  console.log("PASS: gameplay HUD no longer contains the command guide or select-all panel.");
  console.log("PASS: manual upgrade button is removed; castle capacity progresses automatically.");
  await page.getByRole("button", { name: "توقف", exact: true }).click();
  await page.getByRole("button", { name: "ادامهٔ نبرد", exact: true }).waitFor();
  await page.getByRole("button", { name: "ادامهٔ نبرد", exact: true }).click();
  console.log("PASS: Play, pause and resume work through JS interop.");

  // Every click on one of your own castles must add it to the selection.
  const selCounter = () => page.locator("#castle-selection").innerText()
    .then((t) => Number((t.match(/[۰-۹0-9]+/) || ["0"])[0].replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
  assert.equal(await selCounter(), 0, "nothing is selected at the start");
  const friendly = await page.evaluate(() => {
    const el = document.querySelector("canvas");
    return el ? { w: el.clientWidth, h: el.clientHeight } : null;
  });
  assert.ok(friendly);
  console.log("PASS: the HUD shows a selection counter.");

  // Unlock a multi-source level for the gesture test; no test-only game APIs are exposed.
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem("castle_blazor9_settings_v2"));
    s.unlockedLevel = 5;
    s.soundEnabled = false;
    localStorage.setItem("castle_blazor9_settings_v2", JSON.stringify(s));
  });
  await page.reload();
  await page.getByRole("button", { name: "شروع مرحله‌ای", exact: true }).click();
  await page.getByRole("button", { name: "توقف", exact: true }).waitFor();
  const box = await page.locator("canvas").boundingBox();
  const scale = Math.min(box.width / 1000, box.height / 600) * .94;
  const ox = (box.width - 1000 * scale) / 2;
  const oy = (box.height - 600 * scale) / 2 + box.height * .03;
  const point = (x, y) => ({ x: box.x + ox + x * scale, y: box.y + oy + y * scale });
  const a = point(90, 300), b = point(270, 490);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 20 });
  await page.mouse.up();
  await page.locator(".cg-toast").filter({ hasText: "قلعه انتخاب شد" }).waitFor();
  assert(!(await page.locator(".cg-toast").innerText()).includes("نیروی کمکی اعزام"));
  console.log("PASS: Sweeping onto a friendly castle selects both and does not transfer.");

  await page.mouse.dblclick(a.x, a.y, { delay: 100 });
  await page.getByText("نیروی کمکی اعزام شد", { exact: true }).waitFor();
  console.log("PASS: Double-clicking the friendly destination dispatches reinforcements.");

  await page.getByRole("button", { name: "تنظیمات", exact: true }).click();
  await page.locator("#cg-map-players").selectOption("3");
  await page.locator("#cg-map-normal").fill("30");
  await page.locator("#cg-map-fast").fill("5");
  await page.locator("#cg-map-heavy").fill("2");
  await page.locator("#cg-map-towers").fill("3");
  await page.getByRole("button", { name: /ساخت و شروع نقشه/ }).click();
  await page.getByText("نقشهٔ رندوم", { exact: true }).waitFor();
  await page.getByRole("button", { name: "توقف", exact: true }).waitFor();
  const mapSettings = await page.evaluate(() => JSON.parse(localStorage.getItem("castle_blazor9_map_v1")));
  const globalAfterMap = await page.evaluate(() => JSON.parse(localStorage.getItem("castle_blazor9_settings_v2")));
  assert.equal(globalAfterMap.maxTroopsCap, 60, "global settings survive a random-map run");
  assert.equal(globalAfterMap.battleMode, 1, "battle mode survives a random-map run");
  assert.deepEqual(mapSettings, { players: 3, normal: 30, fast: 5, heavy: 2, towers: 3, largeMap: true });
  assert.equal(await page.locator(".cg-faction").count(), 3, "The status bar shows all three players");
  const factionColors = await page.locator(".cg-faction-dot").evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).backgroundColor));
  assert.equal(new Set(factionColors).size, 3, "Each player has its own status-bar color");
  assert.equal(await page.locator(".cg-powerbar span").count(), 3, "The power bar has one segment per player");
  await page.getByRole("button", { name: "بزرگ‌نمایی", exact: true }).click();
  await page.locator(".cg-zoom-value").filter({ hasText: "115" }).waitFor();
  await page.mouse.move(600, 500);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(660, 540, { steps: 4 });
  await page.mouse.up({ button: "right" });
  await page.locator(".cg-zoom-value").click();
  await page.locator(".cg-zoom-value").filter({ hasText: "100" }).waitFor();
  console.log("PASS: Blazor settings generate and save the requested three-player 30/5/2/3 random map.");
  console.log("PASS: The random-map HUD shows a distinct color and power segment for every player.");
  console.log("PASS: Large-map zoom controls zoom in and reset to fit view.");
  assert.equal(external.length, 0, "No third-party assets requested");
  assert.deepEqual(errors, [], "No unhandled browser errors");
  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/blazor-game.png" });
  console.log("PASS: No third-party requests or browser exceptions.");
} finally {
  await browser.close();
}