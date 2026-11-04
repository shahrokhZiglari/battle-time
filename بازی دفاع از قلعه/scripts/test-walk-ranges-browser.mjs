import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const source = `
import { Game } from './src/game/engine';
import { render } from './src/game/render';
import { drawTerrain, landscapeFor } from './src/game/terrain';
import { drawTowerRanges } from './src/game/tower-range';
import { onBridgeDeck, pointInPolygon } from './src/game/bridge-geometry';
import { samplePath, pathLength } from './src/game/navigation';
import { setSound } from './src/game/sound';

setSound(false);

export function test() {
  const level = { name: 'Walking bridges', ai: 0, hint: '', b: [
    [140, 180, 1, 'barracks', 50],
    [510, 180, 2, 'tower', 20],
    [510, 470, 2, 'heavy', 20],
    [850, 470, 1, 'speed', 20],
  ] };
  const g = new Game(0, false, level);
  g.links = [[0,1],[1,2],[2,3]];
  g.sendN(g.bs[0], g.bs[3], 30, g.bs);
  g.sendN(g.bs[3], g.bs[0], 10, [...g.bs].reverse());
  const canvas = document.createElement('canvas');
  canvas.width = 1000; canvas.height = 600;
  canvas.style.width = '1000px'; canvas.style.height = '600px';
  document.body.appendChild(canvas);
  const c = canvas.getContext('2d', { willReadFrequently: true });
  const originalStroke = c.stroke.bind(c);
  const originalMove = c.moveTo.bind(c);
  const originalLine = c.lineTo.bind(c);
  let currentPath = [];
  let bootCount = 0;
  let invalid = [];
  const scene = landscapeFor(g);
  const onSurface = (p) => scene.islands.some(island => pointInPolygon(p, island.points)) || scene.bridges.some(span => onBridgeDeck(p, span));
  c.moveTo = (x,y) => { currentPath = []; originalMove(x,y); };
  c.lineTo = (x,y) => { currentPath.push({x,y}); originalLine(x,y); };
  c.stroke = (...args) => {
    if (c.strokeStyle === '#35494d') {
      const matrix = c.getTransform();
      // The last line endpoint in the leg stroke is a foot contact, in sprite-local coordinates.
      for (const p of currentPath) {
        if (p.y !== 12) continue;
        const screen = new DOMPoint(p.x,p.y).matrixTransform(matrix);
        const world = { x:(screen.x - g.view.ox)/g.view.s, y:(screen.y - g.view.oy)/g.view.s };
        bootCount++;
        if (!onSurface(world)) invalid.push(world);
      }
    }
    return originalStroke(...args);
  };
  for (const zoom of [1, 1.6, 2.5]) {
    g.zoom = zoom;
    g.panX = zoom === 1 ? 0 : 45;
    g.panY = zoom === 1 ? 0 : -20;
    for (let t = .05; t < 1; t += .025) {
      for (const s of g.sq) {
        s.d = s.len * t;
        const p = samplePath(s.waypoints, s.d);
        s.x = p.x; s.y = p.y; s.ang = p.angle;
      }
      render(c, g, t * 10, canvas.width, canvas.height, 1);
    }
  }
  g.zoom = 1; g.panX = 0; g.panY = 0;
  for (const s of g.sq) {
    s.d = s.len * .47;
    const p = samplePath(s.waypoints, s.d);
    s.x=p.x; s.y=p.y; s.ang=p.angle;
  }
  render(c, g, 1, 1000, 600, 1);

  const rangeCanvas = document.createElement('canvas'); rangeCanvas.width=1000;rangeCanvas.height=600;
  const rangeCtx = rangeCanvas.getContext('2d', {willReadFrequently:true});
  rangeCtx.fillStyle='#14645e';rangeCtx.fillRect(0,0,1000,600);
  drawTerrain(rangeCtx, g, 0);
  const before=rangeCtx.getImageData(0,0,1000,600).data;
  g.view.s=1; g.sels=[];g.hover=null;g.ptr=null;
  drawTowerRanges(rangeCtx,g);
  const after=rangeCtx.getImageData(0,0,1000,600).data;
  const tower=g.bs[1];
  let visibleBoundary=0;
  for(let k=0;k<72;k++){
    const angle=k/72*Math.PI*2;
    const x=Math.round(tower.x+Math.cos(angle)*150), y=Math.round(tower.y+Math.sin(angle)*150);
    const i=(y*1000+x)*4;
    if(Math.abs(after[i]-before[i])+Math.abs(after[i+1]-before[i+1])+Math.abs(after[i+2]-before[i+2])>15)visibleBoundary++;
  }
  return {bootCount,invalid:invalid.slice(0,5),visibleBoundary,waypoints:g.sq[0].waypoints.length,routeNodes:g.sq[0].route.length};
}
`;

const bundle = await build({ stdin: { contents: source, resolveDir: process.cwd(), loader: "js" }, bundle: true, format: "iife", globalName: "WalkTest", write: false });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setContent('<style>body{margin:0;background:#14645e}canvas{display:block}</style>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const result = await page.evaluate(() => window.WalkTest.test());
  assert.ok(result.bootCount > 3000, "Thousands of real, transformed boot positions were sampled");
  assert.deepEqual(result.invalid, [], "Drawn boots stay on rendered dry land or bridge deck, at every zoom");
  assert.ok(result.visibleBoundary >= 65, `The tower boundary must be visible without hover (${result.visibleBoundary}/72)`);
  assert.ok(result.waypoints > result.routeNodes);
  assert.deepEqual(errors, []);
  await mkdir("artifacts", { recursive: true });
  await page.locator("canvas").screenshot({ path: "artifacts/tower-ranges-and-bridges.png" });
  console.log(`PASS: ${result.bootCount} rendered boot contacts at three zoom levels stayed on land or bridge deck.`);
  console.log(`PASS: ${result.visibleBoundary}/72 sampled boundary points visibly show the tower's exact range without selection.`);
} finally { await browser.close(); }