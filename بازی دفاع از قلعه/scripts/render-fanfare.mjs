// رندرِ آفلاینِ فن‌فارِ فتح قلعه به WAV تا بشود پیش از بازی شنید
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const url = "file://" + path.resolve("START-GAME-OFFLINE.html") + "#debug";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("pageerror:", String(e)));

// پیش از اجرای اپ، AudioContext را با نسخهٔ آفلاین جایگزین می‌کنیم
await page.addInitScript(() => {
  const SR = 44100;
  const offline = new OfflineAudioContext(2, SR * 3.2, SR);
  // @ts-ignore
  window.AudioContext = function () { return offline; };
  // @ts-ignore
  window.webkitAudioContext = window.AudioContext;
  window.addEventListener("unhandledrejection", (e) => e.preventDefault());
  // @ts-ignore
  window.__render = async () => {
    const buf = await offline.startRendering();
    const chs = [buf.getChannelData(0), buf.getChannelData(1)];
    const n = buf.length;
    const out = new Int16Array(n * 2);
    let peak = 0;
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < 2; c++) {
        const v = Math.max(-1, Math.min(1, chs[c][i]));
        peak = Math.max(peak, Math.abs(v));
        out[i * 2 + c] = Math.round(v * 32767);
      }
    }
    const bytes = new Uint8Array(out.buffer);
    let bin = "";
    for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { b64: btoa(bin), peak, sr: buf.sampleRate, n };
  };
});

await page.goto(url);
await page.waitForTimeout(800);
const started = await page.evaluate(() => {
  const s = window.__sfx;
  if (!s) return "no-sfx";
  try { s.capture(); return "ok"; } catch (e) { return "err:" + e; }
});
console.log("fanfare:", started);
const res = await page.evaluate(() => window.__render());
console.log("peak:", res.peak.toFixed(3), "samples:", res.n, "sr:", res.sr);

const pcm = Buffer.from(res.b64, "base64");
const header = Buffer.alloc(44);
header.write("RIFF", 0);
header.writeUInt32LE(36 + pcm.length, 4);
header.write("WAVE", 8);
header.write("fmt ", 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(2, 22);
header.writeUInt32LE(res.sr, 24);
header.writeUInt32LE(res.sr * 4, 28);
header.writeUInt16LE(4, 32);
header.writeUInt16LE(16, 34);
header.write("data", 36);
header.writeUInt32LE(pcm.length, 40);
fs.writeFileSync("/home/user/fanfare-capture.wav", Buffer.concat([header, pcm]));
console.log("saved /home/user/fanfare-capture.wav", fs.statSync("/home/user/fanfare-capture.wav").size, "bytes");
await browser.close();
