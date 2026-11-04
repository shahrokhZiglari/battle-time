import { build } from "esbuild";
import { mkdir, readdir, readFile, writeFile, copyFile, access, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve, relative, join } from "node:path";

await mkdir("blazor/wwwroot/قلعه", { recursive: true });
await mkdir("public/downloads", { recursive: true });
// Remove the previous generated filenames so the download only contains castle.js.
await Promise.all([
  rm("blazor/wwwroot/js/battle.js", { force: true }),
  rm("blazor/wwwroot/قلعه/battle.js", { force: true }),
]);

await build({
  entryPoints: ["scripts/blazor-battle.ts"],
  outfile: "blazor/wwwroot/قلعه/castle.js",
  bundle: true,
  format: "esm",
  target: "es2020",
  legalComments: "none",
  charset: "utf8",
  banner: { js: "// Castle game for Blazor Server .NET 9. No CDN or React runtime.\n// Low-poly 2.5D islands, stone bridges, faceted keeps and individual soldiers.\n// Shared gameplay engine with 30 campaign stages and customizable random maps." },
});

const config = await build({ entryPoints: ["src/game/config.ts"], bundle: true, format: "esm", write: false, platform: "node" });
const { LEVELS } = await import(`data:text/javascript;base64,${Buffer.from(config.outputFiles[0].text).toString("base64")}`);
const quote = (value) => JSON.stringify(value);
await writeFile("blazor/بازیها/قلعه/CastleLevelsData.cs", `// Generated from the same 30 campaign levels as the browser game.\nnamespace CastleGameFeature;\n\npublic static class CastleLevelsData\n{\n    public static IReadOnlyList<CastleLevelInfo> All { get; } = new CastleLevelInfo[]\n    {\n${LEVELS.map((level, index) => `        new(${index}, ${quote(level.name)}, ${quote(level.hint)}),`).join("\n")}\n    };\n}\n`, "utf8");

async function filesIn(path) {
  const result = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    if (["bin", "obj", ".vs", ".git"].includes(entry.name)) continue;
    const full = join(path, entry.name);
    if (entry.isDirectory()) result.push(...await filesIn(full));
    else result.push(relative("blazor", full));
  }
  return result;
}

const files = (await filesIn("blazor")).sort();
const archive = resolve("public/downloads/castle-blazor-net9.zip");
// ZipFile sets the UTF-8 filename flag, so Persian paths survive Windows extraction.
execFileSync("python3", ["-c", `
import sys, zipfile
with zipfile.ZipFile(sys.argv[1], 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for name in sys.argv[2:]:
        archive.write(name, name)
`, archive, ...files], { cwd: "blazor" });
const manifest = {
  name: "Castle Game - Blazor Server .NET 9",
  download: "/downloads/castle-blazor-net9.zip",
  files,
  bytes: (await readFile(archive)).length,
  entryPage: "بازیها/قلعه/CastleGamePage.razor",
  staticScript: "wwwroot/قلعه/castle.js",
  route: "/games/castle",
};
await writeFile("public/downloads/castle-blazor-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
try {
  await access("dist");
  await mkdir("dist/downloads", { recursive: true });
  await copyFile(archive, "dist/downloads/castle-blazor-net9.zip");
  await copyFile("public/downloads/castle-blazor-manifest.json", "dist/downloads/castle-blazor-manifest.json");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
console.log(`Blazor archive: ${archive} (${files.length} files, ${manifest.bytes} bytes)`);