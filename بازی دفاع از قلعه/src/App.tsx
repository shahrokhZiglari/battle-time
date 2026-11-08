import { useCallback, useEffect, useRef, useState } from "react";
import Hud, { HudData } from "./components/Hud";
import { EndPanel, HelpPanel, LevelsPanel, MenuPanel, PausePanel, RandomMapPanel, SettingsPanel } from "./components/Panels";
import { RotateFab } from "./components/RotateControl";
import { PanelBoundary } from "./components/PanelBoundary";
import { applyUnitTuning, COL, LEVELS, fa } from "./game/config";
import { Game } from "./game/engine";
import { render } from "./game/render";
import { loadSave, persist, persistChanges, Save } from "./game/save";
import { landscapeFor, vesselPose } from "./game/terrain";
import { setNatureLayers, setSfxVolumes, setSound, sfx } from "./game/sound";
import { createRandomLevel, validateRandomMap, PX_PER_METER, type RandomMapSettings } from "./game/map";
import { loadRotation, saveRotation, stageSize, stageStyle, stepRotation, toStagePoint, type Rotation } from "./game/view";

type Screen = "menu" | "levels" | "help" | "game" | "pause" | "settings" | "randomMap" | "end";

/** فقط یک‌بار راهنمای چرخش را نشان بده */
const HINT_KEY = "bt_rot_hint_v1";

/** شناسهٔ ساخت — برای اینکه کاربر و آزمون‌ها بتوانند نسخهٔ در حالِ اجرا را ببینند */
export const BUILD = "۱۹";

const emptyHud: HudData = {
  num: 1,
  name: LEVELS[0].name,
  custom: false,
  largeMap: false,
  zoom: 1,
  factions: [],
  selCount: 0,
  selTroops: 0,
  pct: 60,
  time: 0,
};

function snapshot(g: Game | null): HudData {
  if (!g) return emptyHud;
  return {
    num: g.i >= LEVELS.length ? 0 : g.i + 1,
    name: g.L.name,
    custom: g.i >= LEVELS.length,
    largeMap: g.largeMap,
    zoom: g.zoom,
    // بازیکنی که همهٔ قلعه‌هایش را از دست داده از کادر توان رزمی حذف می‌شود.
    factions: g.participants
      .map((owner) => ({
        id: owner,
        name: owner === 1 ? "تو" : "بازیکن " + fa(owner),
        troops: g.count(owner),
        power: g.power(owner),
        castles: g.castles(owner),
        color: COL[owner],
      }))
      .filter((faction) => faction.castles > 0),
    selCount: g.sels.length,
    selTroops: g.sels.reduce((sum, b) => sum + g.amountOf(b), 0),
    pct: g.pct,
    time: g.t,
  };
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<Game | null>(null);
  const panRef = useRef<{ id: number; x: number; y: number; sx: number; sy: number } | null>(null);
  // ارتفاعِ نوارِ بالای صفحه تا نقشه زیرش نرود
  const hudInsetRef = useRef(48);
  const onHudHeight = useCallback((h: number) => { hudInsetRef.current = h; }, []);
  const speedRef = useRef(1);
  const toastId = useRef(0);

  /* ---------- چرخشِ نمایش (مخصوصِ گوشی) ---------- */
  const [rotation, setRotation] = useState<Rotation>(() => loadRotation());
  const rotationRef = useRef<Rotation>(rotation);
  rotationRef.current = rotation;
  const stageRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState(() => ({ w: typeof window === "undefined" ? 1280 : window.innerWidth, h: typeof window === "undefined" ? 800 : window.innerHeight }));
  const viewRef = useRef(view);
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const prev = viewRef.current;
      viewRef.current = { w, h };
      setView({ w, h });

      // گوشی‌های لمسی: اگر کاربر دستگاه را فیزیکی بچرخانَد و مرورگر هم صفحه را
      // بچرخانَد، چرخشِ CSS روی چرخشِ دستگاه سوار می‌شود و تصویر کج/وارونه
      // می‌مانَد. در این حالت چرخشِ نمایش را خودکار صفر می‌کنیم تا بازی همان‌طور
      // که هست، افقی و صاف پرِ صفحه شود.
      const coarse =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches &&
        window.matchMedia("(hover: none)").matches;
      const turnedToLandscape = prev.h > prev.w && w > h;
      if (coarse && turnedToLandscape && rotationRef.current % 2 === 1) {
        rotationRef.current = 0;
        saveRotation(0);
        setRotation(0);
      }
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  const rotateView = useCallback(() => {
    setRotHint(false);
    setRotation((r) => {
      const next = stepRotation(r);
      rotationRef.current = next;
      saveRotation(next);
      return next;
    });
  }, []);

  const [save, setSave] = useState<Save>(() => loadSave());
  const saveRef = useRef(save);
  saveRef.current = save;

  /**
   * تنها مسیرِ تغییرِ تنظیمات.
   * همیشه از تازه‌ترین وضعیت می‌خوانَد (نه از نسخهٔ بسته‌شده در closure) و
   * فقط بخشی را که واقعاً عوض شده در حافظه ذخیره می‌کند؛ پس نوشتنِ تنظیماتِ
   * نقشهٔ رندوم هرگز نمی‌تواند تنظیماتِ سراسری را بازنویسی یا بازگردانی کند.
   */
  const updateSave = useCallback((next: Partial<Save> | ((prev: Save) => Save)): Save => {
    const prev = saveRef.current;
    const value: Save = typeof next === "function" ? next(prev) : { ...prev, ...next };
    if (value === prev) return prev;
    saveRef.current = value;      // بلافاصله همگام می‌شود تا فراخوانیِ بعدی نسخهٔ کهنه نبیند
    persistChanges(prev, value);
    setSave(value);
    return value;
  }, []);

  /**
   * ماندگاریِ قطعیِ تنظیمات در لحظهٔ بستن/پنهان‌شدنِ صفحه.
   *
   * هر تغییر همان لحظه ذخیره می‌شود (persistChanges در updateSave)، ولی اگر
   * مرورگر پیش از پایانِ کار بسته شود یا برگه در پس‌زمینه منجمد شود، این
   * نوشتنِ نهایی تضمین می‌کند آخرین وضعیت روی دیسک باشد. کلیدها ثابت‌اند، پس
   * نسخهٔ تازهٔ بازی هم دقیقاً همین تنظیمات را می‌خواند.
   */
  useEffect(() => {
    const flush = () => {
      try {
        persist(saveRef.current);
      } catch {
        /* ignore */
      }
    };
    const onHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);

  /**
   * اعمالِ تنظیماتِ سراسری روی بازیِ در حال اجرا.
   *
   * این تابع هرگز وضعیتِ نبرد را بازنشانی نمی‌کند: نه قلعه/نیروها را، نه
   * لشکرهای در حرکت، نه تایمر را، نه وضعیتِ توقف را. فقط موتورِ رسم و
   * قوانینِ سبک به‌روز می‌شوند. (قبلاً setRoadRules همیشه build() می‌زد و
   * کلِ نبرد از صفر می‌شد.)
   */
  const applyGlobalToGame = useCallback((s: Save) => {
    const cur = gameRef.current;
    if (!cur) return;
    cur.fieldCombat = s.battleMode === "field";
    cur.haloSpin = s.haloSpin;
    cur.attackDash = s.attackDash;
    if (cur.baseCap !== s.maxTroops) cur.setMaxTroops(s.maxTroops);
    const minRoadLength = s.minCastleDistance * PX_PER_METER;
    // فقط اگر قوانینِ راه واقعاً عوض شده باشد، شبکهٔ راه بازسازی می‌شود
    if (cur.openRoads !== s.openRoads || cur.minRoadLength !== minRoadLength) {
      cur.setRoadRules({ openRoads: s.openRoads, minRoadLength });
    }
    setHud(snapshot(cur));
  }, []);
  const battleModeRef = useRef<Save["battleMode"]>(save.battleMode);
  const maxTroopsRef = useRef<number>(save.maxTroops);
  const [screen, setScreen] = useState<Screen>("menu");

  /* راهنمای یک‌بارهٔ گوشی: بارِ اولی که وارد نبرد می‌شود، کنارِ دکمهٔ چرخش
     یک حبابِ کوتاه نشان می‌دهیم تا دکمه پیدا شود؛ بعد از ۹ ثانیه یا با اولین
     ضربه محو می‌شود و دیگر تکرار نمی‌شود. */
  const [rotHint, setRotHint] = useState(false);
  useEffect(() => {
    if (screen !== "game") return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    if (window.innerWidth >= window.innerHeight) return;
    if (rotationRef.current !== 0) return;
    try {
      if (localStorage.getItem(HINT_KEY)) return;
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* ignore */
    }
    setRotHint(true);
    const t = window.setTimeout(() => setRotHint(false), 9000);
    return () => window.clearTimeout(t);
  }, [screen]);

  const screenRef = useRef<Screen>("menu");
  screenRef.current = screen;
  const [from, setFrom] = useState<"menu" | "game">("menu");
  const [hud, setHud] = useState<HudData>(emptyHud);
  const [toast, setToast] = useState<{ id: number; msg: string } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [result, setResult] = useState<{ win: boolean; p: number; e: number; pc: number } | null>(null);

  const toastIt = useCallback((msg: string) => {
    setToast({ id: ++toastId.current, msg });
  }, []);

  useEffect(() => {
    setSound(save.snd);
    setSfxVolumes(save.volumes);
    setNatureLayers(save.ambientSound, save.marchSound);
    speedRef.current = save.speed;
    battleModeRef.current = save.battleMode;
    maxTroopsRef.current = save.maxTroops;
    // همهٔ تغییرها از مسیرِ امن اعمال می‌شوند تا وضعیتِ نبرد بازنشانی نشود.
    applyGlobalToGame(save);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save.snd, save.volumes, save.speed, save.battleMode, save.maxTroops, save.ambientSound, save.marchSound, save.openRoads, save.minCastleDistance, save.haloSpin, save.attackDash]);

  /**
   * تا وقتی یک پنل روی بازی باز است، نبرد حتماً متوقف می‌ماند؛
   * حتی اگر مسیرِ دیگری (مثلِ پایانِ خودکارِ نبرد) بخواهد آن را از سر بگیرد.
   */
  useEffect(() => {
    if (from !== "game") return;
    const overlay = screen === "settings" || screen === "levels" || screen === "help" || screen === "randomMap";
    const g = gameRef.current;
    if (overlay && g && !g.demo) g.paused = true;
  }, [screen, from]);

  /**
   * نگهبانِ وضعیت (اصلِ تغییرناپذیر):
   *   «اگر صفحهٔ بازی دیده می‌شود، نبرد باید در حالِ اجرا باشد.»
   *
   * هر مسیری که کاربر را به صفحهٔ بازی برگردانَد — دکمهٔ بازگشتِ تنظیمات،
   * دکمهٔ هدر، Escape، کلیک بیرونِ پنل، یا هر مسیرِ آینده — همین‌جا توقف
   * برداشته می‌شود. پس دیگر ممکن نیست کاربر به بازی برگردد و زمین یخ‌زده
   * ببیند و فکر کند دکمه کار نمی‌کند.
   */
  useEffect(() => {
    if (screen !== "game") return;
    const g = gameRef.current;
    if (g && !g.demo && !g.over && g.paused) {
      g.paused = false;
      setHud(snapshot(g));
    }
  }, [screen]);

  /* ---------- ساخت بازی ---------- */
  const wire = useCallback(
    (g: Game) => {
      // قلابِ اشکال‌زدایی: فقط با #debug در آدرس فعال می‌شود
      if (typeof location !== "undefined" && location.hash.includes("debug")) {
        const w = window as unknown as {
          __g?: Game;
          __sfx?: typeof sfx;
          /** زمینِ محاسبه‌شده (جزیره‌ها، خلیج‌ها، کشتی‌ها) — فقط برای آزمون‌ها */
          __land?: () => ReturnType<typeof landscapeFor>;
          /** جای شناورها در یک لحظهٔ مشخص (برای آزمونِ حرکت) */
          __vesselsAt?: (time: number) => { x: number; y: number; kind: string; cruise: boolean }[];
        };
        w.__g = g;
        w.__sfx = sfx;
        w.__land = () => landscapeFor(g);
        w.__vesselsAt = (time: number) =>
          landscapeFor(g).vessels.map((v) => {
            const pose = vesselPose(v, time);
            return { x: pose.x, y: pose.y, kind: v.kind, cruise: v.cruise };
          });
      }
      g.fieldCombat = battleModeRef.current === "field";
      g.haloSpin = saveRef.current.haloSpin;
      g.attackDash = saveRef.current.attackDash;
      g.hudInset = hudInsetRef.current;
      g.setMaxTroops(maxTroopsRef.current);
      g.setRoadRules({
        openRoads: saveRef.current.openRoads,
        minRoadLength: saveRef.current.minCastleDistance * PX_PER_METER,
      });
      g.onToast = toastIt;
      g.onDemoReset = () => {
        const idx = Math.floor(Math.random() * LEVELS.length);
        const d = new Game(idx, true);
        wire(d);
        gameRef.current = d;
      };
      g.onFinish = (win) => {
        setResult({ win, p: g.count(1), e: g.opponentCount(), pc: g.castles(1) });
        if (win && g.i >= 0 && g.i < LEVELS.length) {
          updateSave((s) => {
            const done = [...s.done];
            done[g.i] = true;
            return { ...s, done, unlocked: Math.max(s.unlocked, Math.min(LEVELS.length, g.i + 2)) };
          });
        }
        window.setTimeout(() => {
          // اگر همان لحظه یک پنل باز است، مزاحمِ کاربر نشو؛ بعد از «بازگشت»
          // خودِ goBack نتیجه را نشان می‌دهد.
          const cur = screenRef.current;
          if (cur === "game" || cur === "pause") setScreen("end");
        }, 900);
      };
      return g;
    },
    [toastIt, updateSave],
  );

  const ensureDemo = useCallback(() => {
    if (gameRef.current?.demo) {
      gameRef.current.paused = false;
      return;
    }
    gameRef.current = wire(new Game(3, true));
  }, [wire]);
  const demoRef = useRef(ensureDemo);
  useEffect(() => {
    demoRef.current = ensureDemo;
  }, [ensureDemo]);

  const startLevel = useCallback(
    (i: number) => {
      const g = wire(new Game(i, false));
      gameRef.current = g;
      setResult(null);
      setHud(snapshot(g));
      setScreen("game");
      setBanner("مرحله " + fa(i + 1) + " · " + LEVELS[i].name);

      window.setTimeout(() => setBanner(null), 2400);
      sfx.start();
    },
    [wire],
  );

  const startCustomMap = useCallback((settings?: RandomMapSettings) => {
    // تنظیماتِ نقشه از تازه‌ترین وضعیت خوانده می‌شود، نه از نسخهٔ بسته‌شده در closure.
    const mapSettings = settings ?? saveRef.current.customMap;
    const error = validateRandomMap(mapSettings);
    if (error) {
      toastIt(error);
      return;
    }
    const level = createRandomLevel({ ...mapSettings, minDistance: saveRef.current.minCastleDistance });
    // فقط و فقط تنظیماتِ نقشه عوض می‌شود؛ تنظیماتِ سراسری دست‌نخورده می‌ماند.
    updateSave((prev) => ({ ...prev, customMap: mapSettings }));

    const g = wire(new Game(LEVELS.length, false, level));
    gameRef.current = g;
    applyGlobalToGame(saveRef.current);
    setResult(null);
    setHud(snapshot(g));
    setScreen("game");

    setBanner(`نقشهٔ رندوم · ${fa(mapSettings.players)} بازیکن`);
    window.setTimeout(() => setBanner(null), 2400);
    sfx.start();
  }, [applyGlobalToGame, toastIt, updateSave, wire]);

  const restartCurrentBattle = useCallback(() => {
    const cur = gameRef.current;
    if (!cur) return;
    if (cur.i < LEVELS.length) {
      startLevel(cur.i);
      return;
    }
    const g = wire(new Game(LEVELS.length, false, cur.L));
    gameRef.current = g;
    applyGlobalToGame(saveRef.current);
    setResult(null);
    setHud(snapshot(g));
    setScreen("game");
    setBanner("شروع دوباره · " + cur.L.name);
    window.setTimeout(() => setBanner(null), 2400);
    sfx.start();
  }, [applyGlobalToGame, startLevel, wire]);

  /* ---------- حلقهٔ رسم ---------- */
  useEffect(() => {
    demoRef.current();
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    let raf = 0;
    let last = 0;
    let acc = 0;
    const dprCap = 2;

    const resize = () => {
      const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
      const w = cv.clientWidth || window.innerWidth;
      const h = cv.clientHeight || window.innerHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    };
    resize();
    window.addEventListener("resize", resize);
    // Some embedded/offline browsers do not expose ResizeObserver.
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(cv);

    // React attaches onWheel passively, which blocks preventDefault; the wheel must
    // not scroll the page while it zooms the battlefield, so it is registered directly.
    const onWheel = (event: WheelEvent) => {
      const game = gameRef.current;
      if (!game || screenRef.current !== "game") return;
      event.preventDefault();
      const stage = stageRef.current ?? cv;
      const p = toStagePoint(event.clientX, event.clientY, rotationRef.current, stage.getBoundingClientRect());
      const step = event.deltaY > 0 ? -0.12 : 0.12;
      game.zoomAt(step, p.x, p.y, cv.clientWidth, cv.clientHeight);
      setHud(snapshot(game));
    };
    cv.addEventListener("wheel", onWheel, { passive: false });

    const loop = (ts: number) => {
      const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0);
      last = ts;
      const g = gameRef.current;
      if (g) g.hudInset = hudInsetRef.current;
      if (g && g.run && !g.paused && !g.over) g.step(dt * speedRef.current);
      else if (g && g.over) g.idle(dt * speedRef.current);
      const dpr = Math.min(dprCap, window.devicePixelRatio || 1);
      render(ctx, g, ts / 1000, cv.clientWidth, cv.clientHeight, dpr);

      acc += dt;
      if (acc > 0.09) {
        acc = 0;
        setHud(snapshot(g));
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      cv.removeEventListener("wheel", onWheel);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- اشاره‌گر ---------- */
  const toWorld = (cx: number, cy: number) => {
    const g = gameRef.current!;
    const stage = stageRef.current!;
    // چرخشِ صحنه در مختصاتِ لمس لحاظ می‌شود تا همان قلعه‌ای که دیده می‌شود انتخاب شود
    const p = toStagePoint(cx, cy, rotationRef.current, stage.getBoundingClientRect());
    const { s, ox, oy } = g.view;
    return { x: (p.x - ox) / s, y: (p.y - oy) / s };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || screen !== "game" || g.over || g.paused) return;
    const explicitPan = e.button === 1 || e.button === 2;
    if (e.pointerType === "mouse" && e.button !== 0 && !explicitPan) return;
    e.preventDefault();
    try { canvasRef.current!.setPointerCapture(e.pointerId); } catch { /* اشاره‌گر پیش از فشار رها شده */ }
    const p = toWorld(e.clientX, e.clientY);
    const overCastle = g.buildingAt(p.x, p.y);
    // کشیدن روی زمین خالی = جابجایی نقشه؛ ژست انتخاب/حمله فقط با فشار روی قلعه شروع می‌شود.
    if (explicitPan || !overCastle) {
      panRef.current = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY };
      canvasRef.current!.style.cursor = "grabbing";
      return;
    }
    g.down(e.pointerId, p.x, p.y, e.shiftKey);
  };

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || screen !== "game") return;
    const pan = panRef.current;
    if (pan && pan.id === e.pointerId) {
      const dxScreen = e.clientX - pan.x;
      const dyScreen = e.clientY - pan.y;
      pan.x = e.clientX;
      pan.y = e.clientY;
      // جابه‌جایی باید در راستای انگشت باشد؛ با صحنهٔ چرخیده، دلتا هم می‌چرخد.
      const a = (rotationRef.current * Math.PI) / 2;
      const dx = dxScreen * Math.cos(a) + dyScreen * Math.sin(a);
      const dy = -dxScreen * Math.sin(a) + dyScreen * Math.cos(a);
      g.panBy(dx, dy);
      const cv = canvasRef.current!;
      const fit = Math.min(cv.clientWidth / g.worldWidth, cv.clientHeight / g.worldHeight) * 0.94;
      const maxX = Math.max(0, (g.worldWidth * fit * g.zoom - cv.clientWidth) / 2);
      const maxY = Math.max(0, (g.worldHeight * fit * g.zoom - cv.clientHeight) / 2);
      g.panX = Math.max(-maxX, Math.min(maxX, g.panX));
      g.panY = Math.max(-maxY, Math.min(maxY, g.panY));
      return;
    }
    const p = toWorld(e.clientX, e.clientY);
    g.move(e.pointerId, p.x, p.y);
    const cv = canvasRef.current!;
    // روی قلعه = کرسر انتخاب؛ روی زمین = کرسر جابجایی نقشه
    if (g.ptr) cv.style.cursor = "grabbing";
    else if (g.hover) cv.style.cursor = "pointer";
    else cv.style.cursor = "grab";
  };

  const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gameRef.current;
    if (!g || screen !== "game") return;
    const pan = panRef.current;
    if (pan?.id === e.pointerId) {
      panRef.current = null;
      const p = toWorld(e.clientX, e.clientY);
      // کلیکِ بدون کشیدن روی زمین خالی = لغو انتخاب‌ها
      if (Math.hypot(e.clientX - pan.sx, e.clientY - pan.sy) < 6 && !g.buildingAt(p.x, p.y)) g.deselectAll();
      const cv = canvasRef.current!;
      const over = g.buildingAt(p.x, p.y);
      cv.style.cursor = over ? "pointer" : "grab";
      return;
    }
    const p = toWorld(e.clientX, e.clientY);
    g.up(e.pointerId, p.x, p.y);
    canvasRef.current!.style.cursor = g.hover ? "pointer" : "grab";
  };

  /* ---------- کیبورد ---------- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const g = gameRef.current;
      if (e.code === "Escape") {
        if (screen === "game") {
          if (g) g.paused = true;
          setScreen("pause");
        } else if (screen === "pause") {
          if (g) g.paused = false;
          setScreen("game");
        } else if (screen === "levels" || screen === "help" || screen === "settings" || screen === "randomMap") {
          goBack();
        } else if (screen === "end") {
          ensureDemo();
          setScreen("menu");
        }
        return;
      }
      if (screen !== "game" || !g) return;
      if (e.code === "Space") {
        e.preventDefault();
        g.paused = !g.paused;
        setScreen(g.paused ? "pause" : "game");
      } else if (e.code === "KeyA") {
        g.selectAll();
      } else if (e.code === "Digit1") g.pct = 20;
      else if (e.code === "Digit2") g.pct = 60;
      else if (e.code === "Digit3") g.pct = 80;
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, ensureDemo]);

  /**
   * بازگشت از هر پنل (تنظیمات/مراحل/راهنما/نقشهٔ رندوم) به همان‌جایی که بودیم.
   *
   * قاعدهٔ اصلی: تا وقتی یک نبردِ واقعی در جریان است، «بازگشت» همیشه به خودِ
   * نبرد برمی‌گردد و توقف را صریحاً برمی‌دارد — هرگز به منو پرت نمی‌شود و هرگز
   * بازی را در حالتِ توقف رها نمی‌کند. (قبلاً تصمیم به مقدارِ from و over وابسته
   * بود؛ اگر یکی از آن‌ها به‌هم می‌ریخت، کاربر با بازیِ یخ‌زده یا منوی اصلی
   * روبه‌رو می‌شد.)
   */
  const goBack = () => {
    const g = gameRef.current;
    const battle = !!g && !g.demo;
    if (battle && g) {
      // پنلی که از خودِ منو باز شده، به منو برمی‌گردد؛ منو خودش دکمهٔ
      // «بازگشت به بازی ▸» را نشان می‌دهد، پس نبرد نه گم می‌شود نه یخ می‌زند.
      if (from === "menu") {
        setScreen("menu");
        return;
      }
      g.paused = false;
      // اگر نبرد همان حین تمام شده، نتیجه را نشان بده نه زمینِ یخ‌زده
      setScreen(g.over && result ? "end" : "game");
      setHud(snapshot(g));
      return;
    }
    ensureDemo();
    setScreen("menu");
  };

  const openSub = (s: Screen, origin: "menu" | "game") => {
    setFrom(origin);
    const g = gameRef.current;
    if (origin === "game" && g) g.paused = true;
    setScreen(s);
  };

  /**
   * رفتن به منوی اصلی — بدونِ از دست دادنِ نبرد.
   *
   * اگر نبردی در جریان باشد، فقط متوقف می‌شود و همان بازی سرِ جایش می‌مانَد؛
   * منو بالای همهٔ دکمه‌ها «بازگشت به بازی ▸» را نشان می‌دهد و نبرد دقیقاً از
   * همان لحظه ادامه پیدا می‌کند. (قبلاً این دکمه نبرد را دور می‌ریخت و بازیِ
   * نمایشی می‌ساخت؛ کاربر فکر می‌کرد بازی‌اش را از دست داده.)
   */
  const toMenu = () => {
    const cur = gameRef.current;
    if (cur && !cur.demo && !cur.over) {
      cur.paused = true;
      setHud(snapshot(cur));
      setScreen("menu");
      return;
    }
    ensureDemo();
    setScreen("menu");
  };

  /** ادامهٔ همان نبردی که در منو متوقف شده */
  const resumeBattle = () => {
    const cur = gameRef.current;
    if (!cur || cur.demo) {
      ensureDemo();
      setScreen("menu");
      return;
    }
    cur.paused = false;
    setHud(snapshot(cur));
    setScreen("game");
  };

  /** نبردِ واقعی و ناتمامی که پشتِ منو منتظر است (یا null) */
  const pausedBattle = (() => {
    const cur = gameRef.current;
    if (!cur || cur.demo || cur.over) return null;
    return { name: cur.i >= LEVELS.length ? cur.L.name : "مرحلهٔ " + fa(cur.i + 1) + " · " + cur.L.name };
  })();

  const inGame = screen === "game" || screen === "pause" || screen === "end";
  const g = gameRef.current;

  const { w: stageW, h: stageH } = stageSize(rotation, view.w, view.h);

  return (
    <div className="fixed inset-0 overflow-hidden bg-abyss" data-build={BUILD} data-screen={screen} data-paused={String(!!gameRef.current?.paused)}>
      {/* کادرِ بازی؛ با دکمهٔ چرخش ۹۰ درجه می‌چرخد */}
      <div
        ref={stageRef}
        className="app-bg overflow-hidden"
        data-rotation={rotation}
        data-stage-w={Math.round(stageW)}
        data-stage-h={Math.round(stageH)}
        style={stageStyle(rotation, view.w, view.h)}
      >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none select-none"
        style={{ opacity: screen === "menu" ? 0.85 : 1 }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => { panRef.current = null; gameRef.current?.cancel(); }}
        onContextMenu={(e) => e.preventDefault()}
      />

      {/* vignette */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{ boxShadow: "inset 0 0 130px 12px rgba(2,22,26,.25)" }}
      />

      {/* ================= HUD ================= */}
      {inGame && g && !g.demo && (
        <Hud
          d={hud}
          onHeight={onHudHeight}
          onPct={(p) => {
            g.pct = p;
            g.preview = g.computePreview();
            setHud(snapshot(g));
            sfx.deselect();
          }}
          onPause={() => {
            g.paused = true;
            setScreen("pause");
          }}
          onZoom={(delta) => {
            const cv = canvasRef.current!;
            if (delta === 0) g.zoomBy(0);
            else g.zoomAt(delta, cv.clientWidth / 2, cv.clientHeight / 2, cv.clientWidth, cv.clientHeight);
            setHud(snapshot(g));
          }}
        />
      )}

      {/* ================= بنر مرحله ================= */}
      {banner && (
        <div className="pointer-events-none absolute inset-x-0 top-11 z-20 flex justify-center px-2 sm:top-12">
          <div
            className="anim-banner flex max-w-full items-center gap-2 rounded-full border px-3 py-1"
            style={{ borderColor: "rgba(232,180,76,.55)", background: "rgba(6,22,28,.88)", boxShadow: "0 4px 14px rgba(0,0,0,.35)" }}
          >
            <span className="truncate font-display text-[15px] leading-6 text-brass sm:text-[17px]">{banner}</span>
            <span className="hidden shrink-0 text-[10px] font-bold tracking-[0.2em] text-ash sm:inline">آمادهٔ نبرد شو</span>
          </div>
        </div>
      )}

      {/* ================= پیام ================= */}
      {toast && (
        <div key={toast.id} className="anim-toast pointer-events-none absolute bottom-4 left-1/2 z-30 sm:bottom-5">
          <div
            className="plate plate-tight whitespace-nowrap px-4 py-2 text-[13px] font-bold text-bone"
            style={{ borderColor: "rgba(232,180,76,.5)" }}
          >
            {toast.msg}
          </div>
        </div>
      )}

      {/* ================= صفحات ================= */}
      {screen === "menu" && (
        <MenuPanel
          save={save}
          battle={pausedBattle}
          onPlay={() => startLevel(Math.max(0, Math.min(LEVELS.length - 1, save.unlocked - 1)))}
          onRandomMap={() => setScreen("randomMap")}
          onLevels={() => openSub("levels", "menu")}
          onHelp={() => openSub("help", "menu")}
          onSettings={() => openSub("settings", "menu")}
        />
      )}
      {/* اگر رندرِ یکی از پنل‌ها خطا بدهد، کاربر با صفحهٔ مرده رها نمی‌شود */}
      <PanelBoundary onRecover={goBack}>
      {screen === "levels" && (
        <LevelsPanel save={save} onPick={startLevel} onBack={goBack} fromGame={from === "game"} />
      )}
      {screen === "help" && <HelpPanel onBack={goBack} fromGame={from === "game"} />}
      {screen === "randomMap" && (
        <RandomMapPanel
          save={save}
          onChange={(next) => updateSave(next)}
          onGenerate={startCustomMap}
          onBack={goBack}
        />
      )}
      {screen === "settings" && (
        <SettingsPanel
          save={save}
          onChange={(patch) => {
            const next = updateSave(patch);
            applyUnitTuning(next.unitTuning);
            applyGlobalToGame(next);
          }}
          onReset={() => {
            updateSave((prev) => ({ ...prev, unlocked: 1, done: [] }));
            toastIt("همهٔ پیشرفت‌ها پاک شد");
          }}
          onBack={goBack}
          fromGame={from === "game"}
        />
      )}
      </PanelBoundary>
      {screen === "pause" && g && (
        <PausePanel
          name={g.i >= LEVELS.length ? g.L.name : "مرحله " + fa(g.i + 1) + " · " + g.L.name}
          onResume={() => {
            g.paused = false;
            setScreen("game");
          }}
          onRestart={restartCurrentBattle}
          onNewRandomMap={() => startCustomMap(saveRef.current.customMap)}
          onLevels={() => openSub("levels", "game")}
          onSettings={() => openSub("settings", "game")}
          onMenu={toMenu}
          onRotate={rotateView}
          rotation={rotation}
          snd={save.snd}
          onSnd={() => updateSave((prev) => ({ ...prev, snd: !prev.snd }))}
        />
      )}
      {screen === "end" && g && result && (
        <EndPanel
          win={result.win}
          index={g.i}
          custom={g.i >= LEVELS.length}
          pCount={result.p}
          eCount={result.e}
          pCastles={result.pc}
          onNext={() => startLevel(Math.min(LEVELS.length - 1, g.i + 1))}
          onRestart={restartCurrentBattle}
          onNewRandomMap={() => startCustomMap(saveRef.current.customMap)}
          onLevels={() => openSub("levels", "game")}
        />
      )}

      {/* ================= دکمهٔ چرخش ۹۰ درجه =================
          داخلِ کادرِ بازی است تا با آن بچرخد؛ پس وقتی گوشی را افقی می‌گیرید
          نوشتهٔ دکمه هم صاف می‌مانَد. روی پنل‌ها پنهان می‌شود تا دکمه‌های پنل را
          نپوشاند (پنلِ توقف ردیفِ مخصوصِ خودش را دارد). */}
      {(screen === "game" || screen === "menu") && (
        <RotateFab rotation={rotation} onRotate={rotateView} hint={rotHint} />
      )}

      {/* ================= دکمهٔ همیشگیِ بازگشت به نبرد =================
          در منو، کارتِ «نبردِ متوقف‌شده» داخلِ متن است و روی گوشیِ کوچک ممکن
          است زیرِ لبه بمانَد. این دکمه گوشهٔ پایین-راستِ صفحه چسبیده است، پس
          هر وقت کاربری به منو رفت، یک ضربه او را به همان نبرد برمی‌گردانَد —
          بدونِ اسکرول و بدونِ گشتن. (گوشهٔ چپ را دکمهٔ چرخش گرفته است.) */}
      {screen === "menu" && pausedBattle && (
        <button
          type="button"
          onClick={resumeBattle}
          data-testid="resume-battle"
          aria-label="بازگشت به بازی"
          title={`ادامهٔ ${pausedBattle.name}`}
          className="absolute z-40 flex min-h-[52px] items-center gap-2 rounded-xl border-2 border-brass/70 bg-[#081f28]/95 px-3 py-2 text-bone shadow-[0_6px_20px_rgba(0,0,0,.6)] backdrop-blur-sm transition-all hover:border-brass hover:bg-[#081f28] active:scale-95"
          style={{
            right: "calc(10px + env(safe-area-inset-right, 0px))",
            bottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
            touchAction: "manipulation",
          }}
        >
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brass/25 text-[15px] leading-none text-brass">
            ▸
          </span>
          <span className="flex flex-col items-start leading-tight">
            <span className="font-display text-[13px] font-black">بازگشت به بازی</span>
            <span className="max-w-[40vw] truncate text-[10px] text-brass">{pausedBattle.name}</span>
          </span>
        </button>
      )}
      </div>
    </div>
  );
}
