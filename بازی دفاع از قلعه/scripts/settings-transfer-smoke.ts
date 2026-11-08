// آزمونِ خروجی و ورودیِ مشترکِ تنظیمات بین نسخهٔ وب، فایل آفلاین و Blazor
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mem = new Map<string, string>();
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
  clear: () => mem.clear(),
  key: (i: number) => [...mem.keys()][i] ?? null,
  get length() { return mem.size; },
} as Storage;

const saveMod = await import("../src/game/save");
const blazorMod = await import("./blazor-battle");
const { SettingsPanel, RandomMapPanel, PausePanel } = await import("../src/components/Panels");

/* ۰) پیش‌فرض‌های تازه در وب و Blazor دقیقاً یکسان‌اند */
{
  mem.clear();
  const freshWeb = saveMod.loadSave();
  assert.deepEqual(freshWeb.unitTuning.normal, { power: 1, speed: 0.9 });
  assert.deepEqual(freshWeb.unitTuning.fast, { power: 1, speed: 1.3 });
  assert.deepEqual(freshWeb.unitTuning.heavy, { power: 1.5, speed: 0.7 });
  assert.equal(freshWeb.haloSpin, 0.1);
  assert.equal(freshWeb.attackDash, 0.3);
  assert.equal(freshWeb.minCastleDistance, 0);
  assert.equal(freshWeb.customMap.minDistance, 0);
  assert.equal(freshWeb.volumes.capture, 0.1);
  assert.equal(freshWeb.volumes.select, 1);
  assert.equal("randomRoads" in freshWeb.customMap, false);

  const blazorDefaults = JSON.parse(blazorMod.exportPortableSettings(null));
  assert.deepEqual(blazorDefaults.units.normal, { power: 1, speed: 0.9 });
  assert.deepEqual(blazorDefaults.units.fast, { power: 1, speed: 1.3 });
  assert.deepEqual(blazorDefaults.units.heavy, { power: 1.5, speed: 0.7 });
  assert.equal(blazorDefaults.visuals.haloSpin, 0.1);
  assert.equal(blazorDefaults.visuals.attackDash, 0.3);
  assert.equal(blazorDefaults.gameplay.minCastleDistance, 0);
  assert.equal(blazorDefaults.randomMap.minDistance, 0);
  assert.equal(blazorDefaults.sound.volumes.capture, 0.1);
  assert.equal("randomRoads" in blazorDefaults.randomMap, false);
}
console.log("PASS: Default unit speeds/powers, capture=10%, distance=0m, haloSpin=0.1 and attackDash=30% match across Web & Blazor.");

/* ۱) رفت‌وبرگشتِ کامل در نسخهٔ وب + حفظِ پیشرفتِ مراحل */
{
  mem.clear();
  const source = saveMod.loadSave();
  source.unlocked = 14;
  source.done = [true, true, true, false, true];
  source.snd = false;
  source.ambientSound = false;
  source.marchSound = true;
  source.speed = 3;
  source.battleMode = "castle";
  source.maxTroops = 80;
  source.openRoads = false;
  source.minCastleDistance = 65;
  source.haloSpin = 2.15;
  source.attackDash = 0.45;
  source.volumes.shot = 0.35;
  source.volumes.ambient = 0.15;
  source.unitTuning.normal = { power: 1.4, speed: 1.2 };
  source.unitTuning.fast = { power: 1.1, speed: 2.1 };
  source.unitTuning.heavy = { power: 3.2, speed: 0.85 };
  source.customMap = {
    players: 4,
    normal: 18,
    fast: 6,
    heavy: 4,
    towers: 5,
    lakes: 7,
    ships: 5,
    boats: 9,
    largeMap: false,
    minDistance: 50,
  };

  const exported = saveMod.exportSettingsJson(source);
  const parsedJson = JSON.parse(exported);
  assert.equal(parsedJson.format, "battle-time-settings");
  assert.equal(parsedJson.version, 1);
  assert.equal("unlocked" in parsedJson, false, "campaign progress is not leaked as a global override");

  // بازیکنِ مقصد در مرحلهٔ ۲۲ است؛ وارد کردنِ تنظیمات نباید پیشرفتِ او را پاک کند
  const target = { ...saveMod.loadSave(), unlocked: 22, done: Array(21).fill(true) };
  const imported = saveMod.importSettingsJson(exported, target);
  assert.equal(imported.ok, true);
  if (imported.ok) {
    assert.equal(imported.save.unlocked, 22, "target unlocked level preserved");
    assert.equal(imported.save.done.filter(Boolean).length, 21, "target completed levels preserved");
    assert.equal(imported.save.snd, false);
    assert.equal(imported.save.ambientSound, false);
    assert.equal(imported.save.marchSound, true);
    assert.equal(imported.save.speed, 3);
    assert.equal(imported.save.battleMode, "castle");
    assert.equal(imported.save.maxTroops, 80);
    assert.equal(imported.save.openRoads, false);
    assert.equal(imported.save.minCastleDistance, 65);
    assert.equal(imported.save.haloSpin, 2.15);
    assert.equal(imported.save.attackDash, 0.45);
    assert.equal(imported.save.volumes.shot, 0.35);
    assert.equal(imported.save.volumes.ambient, 0.15);
    assert.deepEqual(imported.save.unitTuning.heavy, { power: 3.2, speed: 0.85 });
    assert.deepEqual(imported.save.customMap, source.customMap);
  }
}
console.log("PASS: Web portable export/import round-trips all settings while preserving progress.");

/* ۲) تبادلِ دوطرفه بین وب/آفلاین و Blazor Server */
{
  mem.clear();
  const webSave = saveMod.loadSave();
  webSave.speed = 2;
  webSave.battleMode = "castle";
  webSave.maxTroops = 100;
  webSave.unitTuning.fast = { power: 1.75, speed: 2.25 };
  webSave.volumes.win = 0.55;
  webSave.customMap = { ...webSave.customMap, players: 4, normal: 12, lakes: 6, ships: 4, boats: 8 };

  const fromWeb = saveMod.exportSettingsJson(webSave);
  const blazorTarget = { unlockedLevel: 9, completedLevels: [0, 1, 2, 3] };
  const intoBlazor = blazorMod.importPortableSettings(fromWeb, blazorTarget);
  assert.equal(intoBlazor.ok, true);
  assert.ok(intoBlazor.settings);
  assert.equal(intoBlazor.settings!.unlockedLevel, 9, "Blazor unlockedLevel preserved");
  assert.deepEqual(intoBlazor.settings!.completedLevels, [0, 1, 2, 3], "Blazor completedLevels preserved");
  assert.equal(intoBlazor.settings!.speedMultiplier, 2);
  assert.equal(intoBlazor.settings!.battleMode, 1);
  assert.equal(intoBlazor.settings!.maxTroopsCap, 100);
  assert.equal(intoBlazor.settings!.troopTuning?.fastPower, 1.75);
  assert.equal(intoBlazor.settings!.troopTuning?.fastSpeed, 2.25);
  assert.equal(intoBlazor.settings!.volumes?.win, 0.55);
  assert.equal(intoBlazor.settings!.customMap.lakes, 6);

  // بررسیِ ماندگاریِ troopTuning پس از ذخیره و خواندنِ دوباره از localStorage در Blazor
  const reloadedBlazor = blazorMod.loadSettings()!;
  assert.equal(reloadedBlazor.troopTuning?.fastPower, 1.75, "Blazor troopTuning survives reload");
  assert.equal(reloadedBlazor.troopTuning?.fastSpeed, 2.25, "Blazor troopTuning speed survives reload");

  // تغییرِ سقف تولید به مقدارِ اختصاصیِ Blazor (مثلاً ۱۴۰) و انتقال به وب
  reloadedBlazor.maxTroopsCap = 140;
  const fromBlazor = blazorMod.exportPortableSettings(reloadedBlazor);
  const backIntoWeb = saveMod.importSettingsJson(fromBlazor, saveMod.loadSave());
  assert.equal(backIntoWeb.ok, true);
  if (backIntoWeb.ok) {
    assert.equal(backIntoWeb.save.maxTroops, 140, "Blazor custom cap transfers into Web");
    assert.equal(backIntoWeb.save.battleMode, "castle");
    assert.equal(backIntoWeb.save.unitTuning.fast.power, 1.75);
    assert.equal(backIntoWeb.save.volumes.win, 0.55);
  }
}
console.log("PASS: Web <-> Blazor bidirectional settings transfer works seamlessly.");

/* ۳) سازگاری با JSON خامِ سی‌شارپ (PascalCase) و localStorage قدیمی */
{
  const csharpRaw = JSON.stringify({
    SoundEnabled: false,
    SpeedMultiplier: 3,
    BattleMode: 1,
    MaxTroopsCap: 75,
    OpenRoads: false,
    MinCastleDistance: 45,
    AmbientSound: false,
    MarchSound: true,
    TroopTuning: {
      NormalPower: 1.25, NormalSpeed: 1.1,
      FastPower: 1.5, FastSpeed: 1.9,
      HeavyPower: 2.75, HeavySpeed: 0.75,
    },
    HaloSpin: 0.5,
    AttackDash: 0.3,
    Volumes: { shot: 0.25, capture: 0.8 },
    CustomMap: { Players: 2, Normal: 10, Fast: 3, Heavy: 2, Towers: 2, Lakes: 4, Ships: 3, Boats: 5, LargeMap: true, MinDistance: 40, RandomRoads: true },
  });

  const res = saveMod.importSettingsJson("\uFEFF  " + csharpRaw + "\n");
  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.save.snd, false);
    assert.equal(res.save.speed, 3);
    assert.equal(res.save.battleMode, "castle");
    assert.equal(res.save.maxTroops, 75);
    assert.equal(res.save.unitTuning.heavy.power, 2.75);
    assert.equal(res.save.volumes.shot, 0.25);
    assert.equal(res.save.customMap.players, 2);
    assert.equal("randomRoads" in res.save.customMap, false, "legacy RandomRoads is cleanly ignored");
  }
}
console.log("PASS: Raw C# PascalCase JSON (even with UTF-8 BOM) imports cleanly.");

/* ۴) رد کردنِ ورودی‌های نامعتبر بدونِ دست‌زدن به تنظیماتِ فعلی */
{
  const current = saveMod.loadSave();
  for (const bad of [
    "",
    "   ",
    "{not valid json",
    "[1, 2, 3]",
    "{}",
    JSON.stringify({ unknownField: 42 }),
    JSON.stringify({ randomMap: { players: 4, normal: 1, fast: 0, heavy: 0, towers: 3 } }),
  ]) {
    const r = saveMod.importSettingsJson(bad, current);
    assert.equal(r.ok, false, `should reject: ${bad}`);
  }
}
console.log("PASS: Invalid or empty JSON payloads are safely rejected with clear Persian errors.");

/* ۵) رندرِ دکمهٔ خروجی/ورودی در پنلِ تنظیمات بدون خطا */
{
  mem.clear();
  const fresh = saveMod.loadSave();
  const html = renderToStaticMarkup(
    React.createElement(SettingsPanel, {
      save: fresh,
      onChange: () => {},
      onReset: () => {},
      onBack: () => {},
      fromGame: false,
    }),
  );
  assert.ok(html.includes("خروجی / ورودی"), "SettingsPanel renders the transfer button");
  assert.ok(html.includes("۱۰٪"), "SettingsPanel displays 10% capture default");
  assert.ok(html.includes("۰ م"), "SettingsPanel displays 0m castle distance default");

  const mapHtml = renderToStaticMarkup(
    React.createElement(RandomMapPanel, {
      save: fresh,
      onChange: () => {},
      onGenerate: () => {},
      onBack: () => {},
    }),
  );
  assert.equal(mapHtml.includes("راه‌های رندوم"), false, "randomRoads toggle is removed from RandomMapPanel");
  assert.ok(mapHtml.includes("۰ متر"), "RandomMapPanel displays 0m castle distance default");

  const pauseHtml = renderToStaticMarkup(
    React.createElement(PausePanel, {
      name: "نقشهٔ رندوم",
      onResume: () => {},
      onRestart: () => {},
      onNewRandomMap: () => {},
      onLevels: () => {},
      onSettings: () => {},
      onMenu: () => {},
      onRotate: () => {},
      rotation: 0,
      snd: true,
      onSnd: () => {},
    }),
  );
  assert.ok(pauseHtml.includes("ساخت نقشهٔ رندوم جدید"), "PausePanel includes the New Random Map button");
}
console.log("PASS: SettingsPanel, RandomMapPanel & PausePanel render updated defaults and New Random Map button.");
