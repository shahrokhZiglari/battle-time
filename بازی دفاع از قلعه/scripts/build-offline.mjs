import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Script } from "node:vm";

const sourcePath = resolve("dist/index.html");
const html = await readFile(sourcePath, "utf8");

const scriptPattern = /<script type="module" crossorigin>([\s\S]*?)<\/script>/;
const match = html.match(scriptPattern);

if (!match) {
  throw new Error("The inlined module script was not found in dist/index.html");
}

const appScript = match[1];

if (/\bimport\.meta\b|(^|[;\n])\s*(?:import|export)\s/m.test(appScript)) {
  throw new Error("The generated bundle still contains module-only syntax");
}

// Validate the extracted classic script before publishing. React's bundle contains the
// literal string "</body>", so syntax must be checked before inserting HTML wrappers.
new Script(appScript, { filename: "castle-offline-app.js" });

const diagnostics = `
<script>
(function () {
  var failures = [];
  function text(value) {
    try { return String(value && (value.message || value.reason || value)); }
    catch (_) { return "خطای ناشناخته"; }
  }
  window.addEventListener("error", function (event) { failures.push(text(event.error || event.message)); });
  window.addEventListener("unhandledrejection", function (event) { failures.push(text(event.reason)); });
  window.setTimeout(function () {
    var root = document.getElementById("root");
    if (!root || !root.querySelector(".fallback")) return;
    var detail = failures.length ? failures.join(" | ") : "مرورگر اجازه اجرای جاوااسکریپت محلی را نداده یا بسیار قدیمی است.";
    root.innerHTML = '<div class="fallback"><h1>بازی اجرا نشد</h1>' +
      '<p>این فایل کاملاً آفلاین است. آن را با Chrome، Edge یا Firefox جدید باز کنید.</p>' +
      '<p class="tag">جزئیات:</p><code style="direction:ltr;text-align:left;white-space:pre-wrap">' +
      detail.replace(/[&<>]/g, function (ch) { return ({"&":"&amp;","<":"&lt;",">":"&gt;"})[ch]; }) +
      '</code></div>';
  }, 1800);
})();
</script>`;

// A classic inline script is more reliable than type="module" under file://,
// especially in embedded browsers and older WebViews. It is placed after #root.
let offlineHtml = html.replace(scriptPattern, "");
const bodyEnd = /<\/body>\s*<\/html>\s*$/i;
if (!bodyEnd.test(offlineHtml)) throw new Error("The HTML document closing tags were not found");
// Use a replacement callback: React's minified bundle contains `$'` sequences,
// which String.replace would otherwise interpret as replacement tokens.
offlineHtml = offlineHtml.replace(bodyEnd, () => `${diagnostics}\n<script>\n${appScript}\n</script>\n</body>\n</html>`);

const generatedScripts = [...offlineHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)];
if (generatedScripts.length !== 2) throw new Error("Expected diagnostic and application scripts in the standalone document");
new Script(generatedScripts[1][1], { filename: "castle-offline-final.js" });

offlineHtml = offlineHtml.replace(
  /<p>\s*این فایل، نسخهٔ <b>سورسِ توسعه<\/b>[\s\S]*?<\/code>/,
  `<p>بازی آفلاین در حال بارگذاری است...</p>
        <p>اگر این پیام باقی ماند، فایل را با نسخهٔ جدید Chrome، Edge یا Firefox باز کنید.</p>`,
);

await writeFile(sourcePath, offlineHtml, "utf8");
await copyFile(sourcePath, resolve("dist/castle-game-offline.html"));
await copyFile(sourcePath, resolve("START-GAME-OFFLINE.html"));
await mkdir("public/downloads", { recursive: true });
await mkdir("dist/downloads", { recursive: true });
await copyFile(sourcePath, "public/downloads/castle-offline.html");
await copyFile(sourcePath, "dist/downloads/castle-offline.html");

console.log("Offline files created:");
console.log("  START-GAME-OFFLINE.html");
console.log("  dist/index.html");
console.log("  dist/castle-game-offline.html");

// Keep the real Blazor download synchronized with every production build.
await import("./package-blazor.mjs");