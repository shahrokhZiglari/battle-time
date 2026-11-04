// Clicking one of your own castles must add it to the selection (browser check).
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { resolve } from "node:path";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

const toLatin = (s) => s.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d));
const counter = () => page.locator("#castle-selection").innerText()
  .then((t) => Number(toLatin((t.match(/[۰-۹0-9]+/) || ["0"])[0])));

try {
  await page.goto("file://" + resolve("START-GAME-OFFLINE.html"), { waitUntil: "load" });
  await page.getByRole("button", { name: "شروع مرحله‌ای", exact: true }).click();
  await page.getByTitle("توقف (Space)").waitFor();
  assert.equal(await counter(), 0, "nothing is selected at the start");

  // The first campaign stage places your castle at 150,300 on a 1000x600 field.
  const box = await page.locator("canvas").boundingBox();
  const scale = Math.min(box.width / 1000, box.height / 600) * .94;
  const ox = (box.width - 1000 * scale) / 2;
  const oy = (box.height - 600 * scale) / 2 + box.height * .03;
  const castle = { x: box.x + ox + 150 * scale, y: box.y + oy + 300 * scale };

  await page.mouse.click(castle.x, castle.y);
  await page.waitForTimeout(300);
  assert.equal(await counter(), 1, "one click selects one castle");
  console.log("PASS: a click on your own castle selects it and the HUD counter shows 1.");

  await page.mouse.click(castle.x, castle.y);
  await page.waitForTimeout(300);
  assert.equal(await counter(), 1, "clicking it again keeps the selection");
  console.log("PASS: clicking the same castle again does not reduce the selection.");

  assert.deepEqual(errors, []);
  console.log("PASS: no browser errors.");
} finally {
  await browser.close();
}
