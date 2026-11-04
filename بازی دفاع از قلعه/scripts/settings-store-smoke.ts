// آزمونِ انبارِ تنظیمات: جداییِ کاملِ تنظیماتِ سراسری از تنظیماتِ نقشهٔ رندوم
import assert from "node:assert/strict";

/* ---------- localStorage تقلبی با شمارشِ نوشتن‌ها ---------- */
const data = new Map<string, string>();
const writes: string[] = [];
const fakeStorage = {
  getItem: (k: string) => (data.has(k) ? (data.get(k) as string) : null),
  setItem: (k: string, v: string) => { data.set(k, String(v)); writes.push(k); },
  removeItem: (k: string) => void data.delete(k),
  clear: () => data.clear(),
  key: (i: number) => [...data.keys()][i] ?? null,
  get length() { return data.size; },
};
(globalThis as unknown as { localStorage: Storage }).localStorage = fakeStorage as Storage;

const save = await import("../src/game/save");
const mapMod = await import("../src/game/map");

const GLOBAL_KEY = "bt_settings_v1";
const MAP_KEY = "bt_map_v1";
const GLOBAL_BAK = "bt_settings_v1.bak";
const MAP_BAK = "bt_map_v1.bak";
/** فقط همان کلید عوض شده و در پایان هم همان نوشته می‌شود (نسخهٔ قبلی در .bak) */
const onlyWrote = (key: string, bak: string, what: string) => {
  const last = writes[writes.length - 1];
  assert.equal(last, key, `${what}: last write should be ${key}, got ${writes.join(",")}`);
  for (const w of writes) assert.ok(w === key || w === bak, `${what}: unexpected write ${w}`);
};
const LEGACY_KEY = "bt_save_v2";

/* ۱) پیش‌فرض‌ها وقتی چیزی ذخیره نشده */
data.clear();
{
  const s = save.loadSave();
  assert.equal(s.speed, 1);
  assert.equal(s.maxTroops, 50);
  assert.equal(s.customMap.lakes, mapMod.DEFAULT_RANDOM_MAP.lakes);
  assert.ok(data.has(GLOBAL_KEY) && data.has(MAP_KEY), "both stores are seeded");
  assert.equal("customMap" in JSON.parse(data.get(GLOBAL_KEY)!), false, "global store has no map fields");
}
console.log("PASS: defaults land in two separate stores.");

/* ۲) مهاجرت از رکوردِ قدیمی */
data.clear();
data.set(LEGACY_KEY, JSON.stringify({
  unlocked: 6, done: [true, true, false, true], snd: false, speed: 3, battleMode: "castle",
  maxTroops: 100, openRoads: false, minCastleDistance: 90, ambientSound: false, marchSound: false,
  haloSpin: 0, attackDash: 0.1,
  unitTuning: { normal: { power: 2, speed: 1.1 }, fast: { power: 1.2, speed: 1.5 }, heavy: { power: 3, speed: 0.7 } },
  customMap: { players: 4, normal: 20, fast: 4, heavy: 3, towers: 5, largeMap: false, randomRoads: true, minDistance: 45, lakes: 6 },
}));
{
  const s = save.loadSave();
  assert.equal(s.unlocked, 6, "unlocked migrated");
  assert.deepEqual(s.done.slice(0, 4), [true, true, false, true], "level progress migrated");
  assert.equal(s.battleMode, "castle");
  assert.equal(s.maxTroops, 100);
  assert.equal(s.minCastleDistance, 90);
  assert.equal(s.snd, false);
  assert.equal(s.haloSpin, 0);
  assert.equal(s.unitTuning.heavy.power, 3);
  assert.equal(s.customMap.lakes, 6, "map settings migrated");
  assert.equal(s.customMap.players, 4);
  const g = JSON.parse(data.get(GLOBAL_KEY)!);
  assert.equal("customMap" in g, false, "migrated global store stays clean");
}
console.log("PASS: legacy record migrates into two clean stores.");

/* ۳) پیشرفتِ مراحل رفت‌وبرگشت دارد */
{
  const before = save.loadSave();
  const next = { ...before, done: [true, true, true], unlocked: 4 };
  save.persistChanges(before, next);
  const after = save.loadSave();
  assert.deepEqual(after.done.slice(0, 3), [true, true, true], "progress survives a reload");
  assert.equal(after.unlocked, 4);
}
console.log("PASS: level progress round-trips.");

/* ۴) تغییرِ تنظیماتِ نقشه فقط کلیدِ نقشه را می‌نویسد */
{
  const before = save.loadSave();
  writes.length = 0;
  const next = { ...before, customMap: { ...before.customMap, lakes: 7 } };
  save.persistChanges(before, next);
  onlyWrote(MAP_KEY, MAP_BAK, "map-only change");
  const after = save.loadSave();
  assert.equal(after.customMap.lakes, 7);
  assert.equal(after.speed, before.speed, "global untouched");
}
console.log("PASS: a map-only change writes only the map store.");

/* ۵) تغییرِ تنظیماتِ سراسری فقط کلیدِ سراسری را می‌نویسد */
{
  const before = save.loadSave();
  writes.length = 0;
  const next = { ...before, speed: 3, attackDash: 0.25, marchSound: false };
  save.persistChanges(before, next);
  onlyWrote(GLOBAL_KEY, GLOBAL_BAK, "global-only change");
  const after = save.loadSave();
  assert.equal(after.speed, 3);
  assert.equal(after.customMap.lakes, before.customMap.lakes, "map untouched");
}
console.log("PASS: a global-only change writes only the global store.");

/* ۶) تولیدِ چند نقشهٔ پی‌درپی، تنظیماتِ سراسری را ذخیره نمی‌کند */
{
  const before = save.loadSave();
  const globalBytes = data.get(GLOBAL_KEY);
  for (let i = 0; i < 25; i++) {
    const cur = save.loadSave();
    save.persistChanges(cur, { ...cur, customMap: { ...cur.customMap, lakes: i % 9 } });
  }
  assert.equal(data.get(GLOBAL_KEY), globalBytes, "globals must be byte-identical after many map saves");
  const after = save.loadSave();
  assert.equal(after.speed, before.speed);
  assert.equal(after.maxTroops, before.maxTroops);
}
console.log("PASS: 25 random-map saves leave the global store byte-identical.");

/* ۷) دادهٔ خراب یا قدیمی سیستم را نمی‌شکند */
{
  data.clear();
  data.set(GLOBAL_KEY, "{not json");
  data.set(MAP_KEY, "[]");
  const s = save.loadSave();
  assert.equal(s.speed, 1);
  assert.ok(s.customMap && typeof s.customMap.lakes === "number");
  assert.ok(Array.isArray(s.done));
}
console.log("PASS: corrupt storage falls back to safe defaults.");

/* ۸) فیلدهای ناشناختهٔ رکوردِ سراسری به انبار راه پیدا نمی‌کنند */
{
  data.clear();
  data.set(GLOBAL_KEY, JSON.stringify({ speed: 2, customMap: { lakes: 9 }, junk: 1 }));
  const s = save.loadSave();
  assert.equal(s.speed, 2);
  assert.equal(s.customMap.lakes, mapMod.DEFAULT_RANDOM_MAP.lakes, "stray map fields in the global store are ignored");
  const g = JSON.parse(data.get(GLOBAL_KEY)!);
  assert.equal("customMap" in g, false);
  // فیلدِ ناشناختهٔ نسخه‌های آینده حفظ می‌شود (تا با آپدیت از بین نرود)
  assert.equal("junk" in g, true);
}
console.log("PASS: stray fields never leak into the global store.");

console.log("PASS: the settings store keeps global and random-map settings fully isolated.");
