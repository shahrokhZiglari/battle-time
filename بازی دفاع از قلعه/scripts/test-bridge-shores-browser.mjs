import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { chromium } from "playwright";

const source = `
import { Game } from './src/game/engine';
import { drawTerrain, landscapeFor } from './src/game/terrain';
import { pointInPolygon } from './src/game/bridge-geometry';
import { render } from './src/game/render';
import { setSound } from './src/game/sound';

setSound(false);

function edgeDistance(p, vertices) {
  let minimum = Infinity;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    minimum = Math.min(minimum, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy));
  }
  return minimum;
}

export function check(name, positions, links) {
  const level = { name, ai: 0, hint: '', b: positions.map(([x,y], i) => [x,y,i === 0 ? 1 : i === positions.length - 1 ? 2 : 0,'barracks',20]) };
  const g = new Game(0, false, level);
  g.links = links;
  // پایه: همان نقشه و همان راه‌ها، فقط بدونِ پل. (چمن و علفزار به‌عمد از
  // مسیرِ راه‌ها فاصله می‌گیرند، پس مقایسه با نقشهٔ بی‌راه غلط‌انداز است.)
  const baseline = new Game(0, false, level);
  baseline.links = links.map((pair) => [...pair]);
  landscapeFor(baseline).bridges.length = 0;
  const makeCanvas = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000; canvas.height = 600;
    const c = canvas.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#126d65'; c.fillRect(0,0,1000,600);
    return { canvas, c };
  };
  const current = makeCanvas(), empty = makeCanvas();
  drawTerrain(current.c, g, 0);
  drawTerrain(empty.c, baseline, 0);
  const pixels = current.c.getImageData(0,0,1000,600).data;
  const original = empty.c.getImageData(0,0,1000,600).data;
  const islands = landscapeFor(g).islands;
  let checkedGrass = 0, changedGrass = 0, bridgePixels = 0;
  for (let y = 1; y < 600; y += 2) {
    for (let x = 1; x < 1000; x += 2) {
      const p = { x:x+.5, y:y+.5 };
      const land = islands.find((island) => pointInPolygon(p, island.points));
      const index = (y * 1000 + x) * 4;
      const changed = Math.abs(pixels[index] - original[index]) + Math.abs(pixels[index+1] - original[index+1]) + Math.abs(pixels[index+2] - original[index+2]) > 3;
      if (land && edgeDistance(p, land.points) > 2) {
        checkedGrass++;
        if (changed) changedGrass++;
      } else if (!land && changed) bridgePixels++;
    }
  }
  const preview = document.createElement('canvas');
  preview.width = 1000; preview.height = 600;
  render(preview.getContext('2d'), g, 0, 1000, 600, 1);
  preview.dataset.name = name;
  document.body.appendChild(preview);
  return { name, checkedGrass, changedGrass, bridgePixels, spans: landscapeFor(g).bridges.length };
}
`;

const bundled = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: "js" }, bundle: true, format: "iife", globalName: "ShoreTest", write: false });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent('<style>body{margin:0;background:#126d65}canvas{display:block}</style>');
  await page.addScriptTag({ content: bundled.outputFiles[0].text });
  const results = await page.evaluate(() => [
    window.ShoreTest.check("horizontal", [[150,300],[500,300],[850,300]], [[0,1],[1,2]]),
    window.ShoreTest.check("diagonal", [[200,170],[800,430]], [[0,1]]),
    window.ShoreTest.check("vertical", [[500,130],[500,470]], [[0,1]]),
    window.ShoreTest.check("intermediate-island", [[130,280],[500,280],[870,280]], [[0,2]]),
  ]);
  for (const result of results) {
    assert.ok(result.checkedGrass > 500, "Enough grass pixels are sampled");
    assert.equal(result.changedGrass, 0, `${result.name}: bridges must not repaint grass`);
    assert.ok(result.bridgePixels > 100, `${result.name}: bridges must still be visible over the water gap`);
    console.log(`PASS: ${result.name}; ${result.checkedGrass} grass pixels unchanged, ${result.bridgePixels} bridge/water pixels visible.`);
  }
  assert.deepEqual(errors, []);
  await mkdir("artifacts", { recursive: true });
  await page.locator('canvas[data-name="horizontal"]').screenshot({ path: "artifacts/bridges-shore-horizontal.png" });
  await page.locator('canvas[data-name="diagonal"]').screenshot({ path: "artifacts/bridges-shore-diagonal.png" });
  console.log("PASS: live Canvas clipping preserves every sampled grass pixel on horizontal, diagonal and vertical banks.");
} finally {
  await browser.close();
}