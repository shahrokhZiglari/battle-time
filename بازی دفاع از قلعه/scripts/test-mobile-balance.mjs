// Mobile: the HUD (including the power-balance bar) must not block the battlefield.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

try {
  await page.goto("file://" + resolve("START-GAME-OFFLINE.html"), { waitUntil: "load" });
  await page.getByRole("button", { name: "شروع مرحله‌ای", exact: true }).click();
  await page.locator("canvas").waitFor();
  await page.waitForTimeout(2500);

  const canvas = await page.locator("canvas").boundingBox();
  // the whole top HUD stays slim enough to leave the battlefield open
  const hud = await page.evaluate(() => {
    const bar = document.querySelector(".pointer-events-none.absolute.inset-x-0.top-0, .cg-hud-top");
    return bar ? bar.getBoundingClientRect().height : -1;
  });
  assert.ok(hud >= 0 && hud < 260, `top HUD is unexpectedly tall on mobile: ${hud}px`);

  // taps anywhere in the lower/middle playfield must reach the canvas, not a HUD panel
  for (const fy of [0.35, 0.55, 0.75]) {
    const hit = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? el.tagName : null;
    }, [canvas.x + canvas.width * 0.5, canvas.y + canvas.height * fy]);
    assert.equal(hit, "CANVAS", `tap at ${fy * 100}% height should hit the canvas (hit ${hit})`);
  }

  await mkdir("artifacts", { recursive: true });
  await page.screenshot({ path: "artifacts/mobile-balance.png" });
  assert.deepEqual(errors, []);
  console.log(`PASS: on a phone the HUD is compact (${hud}px) and every playfield tap reaches the battlefield.`);
} finally {
  await browser.close();
}
