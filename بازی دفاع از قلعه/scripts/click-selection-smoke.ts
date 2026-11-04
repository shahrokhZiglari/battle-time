/* آزمون دقیق رفتار «هر کلیک یک قلعه به انتخاب‌ها اضافه می‌کند» */
import assert from "node:assert/strict";
import { Game } from "../src/game/engine";
import { setSound } from "../src/game/sound";

setSound(false);

const click = (g: Game, index: number) => {
  const b = g.bs[index];
  g.down(index, b.x, b.y, false);
  g.up(index, b.x, b.y);
};

// 1) پنج کلیک پشت‌سرهم روی پنج قلعهٔ متفاوت، تعداد انتخاب باید پنج شود.
{
  const g = new Game(4);
  g.bs.forEach((b) => { b.o = 1; b.tr = 30; });
  const own = g.bs.slice(0, 5);
  own.forEach((_, i) => click(g, i));
  assert.equal(g.sels.length, 5, "each click adds one castle");
  assert.deepEqual(g.sels, own, "all clicked castles are selected");
  console.log("PASS: five clicks on five castles select exactly five castles.");
}

// 2) کلیک تکراری روی همان قلعه، تعداد را کم نمی‌کند.
{
  const g = new Game(4);
  g.bs.forEach((b) => { b.o = 1; });
  click(g, 0);
  click(g, 0);
  click(g, 0);
  assert.equal(g.sels.length, 1, "repeated clicks on one castle keep it selected");
  console.log("PASS: repeated clicks on the same castle never remove it from the selection.");
}

// 3) ترکیب کلیک و کشیدن: هر دو با هم جمع می‌شوند.
{
  const g = new Game(4);
  g.bs.forEach((b) => { b.o = 1; });
  click(g, 0);
  const A = g.bs[1], B = g.bs[2];
  g.down(1, A.x, A.y, false);
  for (let k = 1; k <= 10; k++) g.move(1, A.x + ((B.x - A.x) * k) / 10, A.y + ((B.y - A.y) * k) / 10);
  g.up(1, B.x, B.y);
  // the click chose castle 0; the drag starts on A and sweeps across B, so every
  // castle touched by the drag joins the same selection
  assert.ok(g.sels.includes(g.bs[0]), "the castle chosen by the click stays selected");
  assert.ok(g.sels.includes(g.bs[1]) && g.sels.includes(g.bs[2]), "the dragged castles are selected");
  assert.equal(g.sels.length, new Set(g.sels).size, "no castle is duplicated");
  console.log(`PASS: dragging adds to the castles already chosen by clicks (${g.sels.length} castles).`);
}

// 4) کلیک روی قلعهٔ دشمن، انتخاب را تغییر نمی‌دهد و حمله می‌کند.
{
  const g = new Game(4);
  g.bs.forEach((b, i) => { b.o = i === 0 ? 1 : 2; });
  click(g, 0);
  const foe = g.bs.find((b) => b.o === 2)!;
  const before = g.sels.length;
  g.down(1, foe.x, foe.y, false);
  g.up(1, foe.x, foe.y);
  assert.equal(g.sels.length, 0, "an attack clears the selection for a fresh order");
  assert.ok(before === 1);
  assert.ok(g.sq.length > 0, "the attack was dispatched");
  console.log("PASS: clicking an enemy castle attacks instead of changing the selection.");
}

// 5) انتخاب‌ها هرگز از تعداد کل قلعه‌های خودی بیشتر نمی‌شوند.
{
  const g = new Game(4);
  g.bs.forEach((b) => { b.o = 1; });
  for (let i = 0; i < g.bs.length * 3; i++) click(g, i % g.bs.length);
  assert.equal(g.sels.length, g.bs.length, "the selection holds every own castle once");
  console.log("PASS: clicking repeatedly never duplicates a castle in the selection.");
}

console.log("All click-selection regression tests passed.");
