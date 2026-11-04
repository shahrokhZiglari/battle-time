// آزمونِ لایهٔ ذخیره‌سازیِ نسخهٔ بلازور: جداییِ تنظیماتِ سراسری از تنظیماتِ نقشهٔ رندوم
import assert from "node:assert/strict";
import { loadSettings, saveSettings, saveGlobalSettings, saveMapSettings } from "./blazor-battle";

/* ---------- localStorage تقلبی ---------- */
const store = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
} as Storage;

const GLOBAL_KEY = "castle_blazor9_settings_v2";
const MAP_KEY = "castle_blazor9_map_v1";
const LEGACY_KEY = "castle_blazor9_settings_v1";

const baseSettings = {
  unlockedLevel: 1, completedLevels: [], soundEnabled: true, speedMultiplier: 1,
  battleMode: 0 as const, maxTroopsCap: 50, openRoads: true, minCastleDistance: 30,
  randomRoads: false, ambientSound: true, marchSound: true,
  customMap: { players: 3, normal: 10, fast: 2, heavy: 1, towers: 2, largeMap: true, randomRoads: false, minDistance: 30, lakes: 2 },
};

/* ۱) مهاجرت از کلیدِ قدیمی */
store.clear();
store.set(LEGACY_KEY, JSON.stringify({ ...baseSettings, maxTroopsCap: 60, minCastleDistance: 75, customMap: { ...baseSettings.customMap, lakes: 5 } }));
const migrated = loadSettings();
assert.ok(migrated, "legacy settings should load");
assert.equal(migrated!.maxTroopsCap, 60, "global value migrated");
assert.equal(migrated!.customMap.lakes, 5, "map value migrated");
const g1 = JSON.parse(store.get(GLOBAL_KEY)!);
const m1 = JSON.parse(store.get(MAP_KEY)!);
assert.equal("customMap" in g1, false, "global store must not contain map settings");
assert.equal(m1.lakes, 5, "map store holds the map settings");
console.log("PASS: legacy settings split into two independent stores.");

/* ۲) نوشتنِ تنظیماتِ نقشه، تنظیماتِ سراسری را دست نمی‌زند */
const globalBefore = store.get(GLOBAL_KEY);
saveMapSettings({ ...baseSettings.customMap, lakes: 7 });
assert.equal(store.get(GLOBAL_KEY), globalBefore, "map write must not touch the global store");
assert.equal(JSON.parse(store.get(MAP_KEY)!).lakes, 7);
const merged = loadSettings()!;
assert.equal(merged.customMap.lakes, 7, "map change is visible after reload");
assert.equal(merged.maxTroopsCap, 60, "global value survived the map write");
console.log("PASS: saving map settings never rewrites global settings.");

/* ۳) نوشتنِ تنظیماتِ سراسری، تنظیماتِ نقشه را دست نمی‌زند */
const mapBefore = store.get(MAP_KEY);
saveGlobalSettings({ ...merged, speedMultiplier: 3, minCastleDistance: 15 } as never);
assert.equal(store.get(MAP_KEY), mapBefore, "global write must not touch the map store");
const merged2 = loadSettings()!;
assert.equal(merged2.speedMultiplier, 3);
assert.equal(merged2.customMap.lakes, 7, "map value survived the global write");
console.log("PASS: saving global settings never rewrites map settings.");

/* ۴) ذخیرهٔ کامل هر دو بخش را هم‌زمان و درست می‌نویسد */
saveSettings({ ...merged2, maxTroopsCap: 80, customMap: { ...merged2.customMap, lakes: 6 } } as never);
const merged3 = loadSettings()!;
assert.equal(merged3.maxTroopsCap, 80);
assert.equal(merged3.customMap.lakes, 6);
console.log("PASS: a full save keeps both stores in sync.");

/* ۵) تنظیماتِ سراسریِ ذخیره‌شده با تولیدِ نقشهٔ تازه بازنویسی نمی‌شود (چند بار پشتِ‌سرِهم) */
const snapshot = store.get(GLOBAL_KEY);
for (let i = 0; i < 5; i++) saveMapSettings({ ...merged3.customMap, lakes: (i % 8) + 1 });
assert.equal(store.get(GLOBAL_KEY), snapshot, "repeated map saves must leave globals untouched");
console.log("PASS: repeated random-map saves never revert global settings.");
