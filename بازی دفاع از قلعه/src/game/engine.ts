import { Building, CFG, COL, defOf, Effect, fa, Level, LEVELS, Owner, Squad, TROOP_TYPES, UNITS } from "./config";
import { sfx } from "./sound";
import { playCaptureSound, setNatureSound } from "./nature-audio";
import { addUnit, armyCount, armyPower, createArmy, damageArmy, emptyArmy, producedUnit, selectArmy, takeArmy, unitCount } from "./troops";
import { landscapeFor } from "./terrain";
import { buildMarchPath, pathLength, samplePath } from "./navigation";
import { towerCanTarget } from "./tower-range";

export interface View {
  s: number;
  ox: number;
  oy: number;
}

interface Ptr {
  id: number;
  sx: number;
  sy: number;
  x: number;
  y: number;
  lx: number;
  ly: number;
  shift: boolean;
  moved: boolean;
  startB: Building | null;
  draft: Building[];
  trail: { x: number; y: number }[];
}

/** کوتاه‌ترین فاصلهٔ یک نقطه تا یک پاره‌خط (برای تشخیص عبور نشانگر از روی قلعه) */
function distToSeg(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

export interface Preview {
  target: Building;
  sources: Building[];
  total: number;
  power: number;
  need: number;
  ok: boolean;
  blocked: number;
  mode: "attack" | "reinforce" | "select";
}

export class Game {
  i: number;
  L: Level;
  bs: Building[] = [];
  /** Faction ids present at match start; retained in the HUD even after elimination. */
  participants: Owner[] = [];
  sq: Squad[] = [];
  fx: Effect[] = [];
  links: [number, number][] = [];
  adj: number[][] = [];
  t = 0;
  /** درصدِ اعزام (۲۰ / ۶۰ / ۸۰) */
  pct = 60;
  run = true;
  paused = false;
  over = false;
  demo = false;
  /** اگر خاموش باشد، گروه‌های دشمن در مسیر از کنار هم عبور می‌کنند. */
  fieldCombat = true;
  /** سقف نهایی تولید برای قلعه‌های دو تیم */
  baseCap = CFG.cap;
  /**
   * اگر روشن باشد، نیروها می‌توانند از کنار هر قلعه (خنثی یا دشمن) عبور کنند
   * تا به هدف برسند؛ پل‌های اضافه‌ای رسم نمی‌شود.
   */
  openRoads = true;
  /** حداقل فاصلهٔ پل بین دو قلعهٔ همسایه (پیکسل) */
  minRoadLength = 0;
  /** اگر روشن باشد، راه‌ها کاملاً رندوم انتخاب می‌شوند. */
  randomRoads = false;
  /** مولد اعداد تصادفیِ قابل‌کنترل، تا نقشهٔ رندوم بازتولیدپذیر بماند. */
  roadRandom: () => number = Math.random;
  /** تایمر کاهش هر ثانیه ۱ نیرو برای قلعه‌های فراتر از سقف */
  decayTimer = 0;
  shake = 0;
  sels: Building[] = [];
  sel: Building | null = null;
  ptr: Ptr | null = null;
  /** مسیر محوشوندهٔ کشیدن برای جلوهٔ بصری پس از رها کردن */
  ghostTrail: { x: number; y: number; t: number }[] = [];
  hover: Building | null = null;
  preview: Preview | null = null;
  view: View = { s: 1, ox: 0, oy: 0 };
  worldWidth = CFG.W;
  worldHeight = CFG.H;
  largeMap = false;
  /** سرعتِ چرخشِ نورهای دور برج (صفر = بی‌حرکت) */
  haloSpin = 1.35;
  /** شفافیتِ نقطه‌چینِ مسیر حمله (۰..۱) */
  attackDash = 1;
  /** مقیاسِ اندازهٔ کوه‌های دریایی (از تنظیماتِ سراسری) — فقط ظاهر */
  /** ارتفاعِ نوارِ بالای صفحه (پیکسل) که نقشه نباید زیرش برود */
  hudInset = 0;
  /** برج‌های خنثی از خودشان دفاع می‌کنند */
  neutralDefense = true;
  zoom = 1;
  panX = 0;
  panY = 0;
  aiT = [0, 2.5, 3, 3, 3];
  lastHoverId = -1;
  private lastAllyClick: { target: Building; sources: Building[]; at: number } | null = null;

  onToast: (m: string) => void = () => {};
  onFinish: (win: boolean) => void = () => {};
  onDemoReset: () => void = () => {};

  constructor(i: number, demo = false, levelOverride?: Level) {
    this.i = i;
    this.L = levelOverride ?? LEVELS[i] ?? LEVELS[0];
    this.demo = demo;
    this.build();
  }

  /* ================= ساخت مرحله ================= */
  build() {
    this.worldWidth = this.L.worldWidth ?? CFG.W;
    this.worldHeight = this.L.worldHeight ?? CFG.H;
    this.largeMap = this.L.largeMap ?? false;
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;
    this.bs = this.L.b.map((d, k): Building => ({
      id: k,
      x: d[0],
      y: d[1],
      o: d[2],
      type: d[3],
      army: createArmy(producedUnit(d[3]), d[2] === 0 ? Math.min(d[4], CFG.neutralCap) : d[4]),
      get tr(): number { return armyCount(this.army); },
      set tr(value: number) { this.army = createArmy(producedUnit(this.type), value); },
      cap: d[2] === 0 ? CFG.neutralCap : Math.min(CFG.capStart, this.baseCap),
      lvl: 1,
      capTimer: 0,
      pt: 0,
      tt: 0,
      fl: 0,
      hit: 0,
    }));
    this.participants = Array.from(new Set(this.bs.map((b) => b.o).filter((owner): owner is Exclude<Owner, 0> => owner !== 0))).sort();
    this.sq = [];
    this.fx = [];
    this.links = [];
    this.t = 0;
    this.sels = [];
    this.sel = null;
    this.ptr = null;
    this.ghostTrail = [];
    this.hover = null;
    this.preview = null;
    this.lastAllyClick = null;
    this.over = false;
    this.paused = false;
    this.run = true;
    const maxOwner = Math.max(2, ...this.bs.map((b) => b.o));
    this.aiT = Array.from({ length: maxOwner + 1 }, (_, owner) => owner === 1 ? 2.5 : owner >= 2 ? 3 : 0);
    this.decayTimer = 0;
    this.rebuildRoads();
  }

  /**
   * فقط شبکهٔ راه‌ها را از نو می‌سازد (بدونِ دست‌زدن به وضعیتِ نبرد).
   * build() پس از بازنشانیِ کامل هم همین را صدا می‌زند.
   */
  rebuildRoads() {
    this.links = [];
    this.adj = [];
    const bs = this.bs;
    if (!bs.length) return;
    const pairs: [number, number, number][] = [];
    for (let a = 0; a < bs.length; a++)
      for (let b = a + 1; b < bs.length; b++) pairs.push([a, b, Math.hypot(bs[a].x - bs[b].x, bs[a].y - bs[b].y)]);
    pairs.sort((p, q) => p[2] - q[2]);

    const u = bs.map((_, k) => k);
    const f = (n: number): number => (u[n] === n ? n : (u[n] = f(u[n])));
    const minLength = this.minRoadLength;
    // نقشه هرگز به گراف کامل تبدیل نمی‌شود؛ حداکثر یک درخت + چند پل کوتاه.
    const linkCap = Math.max(bs.length - 1, Math.round(bs.length * 1.35));
    for (const [a, b, d] of pairs) {
      if (d < minLength) continue;
      if (this.links.length >= linkCap) break;
      if (this.randomRoads) {
        // راه‌های رندوم: با شانس برابر؛ درخت اتصال در پایان تکمیل می‌شود.
        if (this.roadRandom() < 0.3 && this.links.length < linkCap) {
          this.links.push([a, b]);
          u[f(a)] = f(b);
        }
      } else if (f(a) !== f(b)) {
        u[f(a)] = f(b);
        this.links.push([a, b]);
      } else if (!this.largeMap && d < 300) {
        this.links.push([a, b]);
      }
    }
    this.adj = bs.map(() => []);
    this.links.forEach(([a, b]) => {
      this.adj[a].push(b);
      this.adj[b].push(a);
    });
    // هیچ قلعه‌ای بدون راه نمی‌ماند، حتی اگر حداکثر طول پل را باید نقض کرد.
    this.guaranteeConnectivity();
  }

  /**
   * تضمین می‌کند همهٔ قلعه‌ها در یک شبکهٔ پیوسته باشند: ابتدا قلعه‌های رهاشده به نزدیک‌ترین
   * قلعهٔ وصل‌شده وصل می‌شوند و اگر هنوز جزیرهٔ جدا باقی مانده بود، کوتاه‌ترین پلِ بینِ جزایر
   * ساخته می‌شود. این کار حتی حداکثر طول پل را نقض می‌کند، چون «نرسیدن به هیچ‌جا» بدتر از
   * یک پل بلند است.
   */
  private guaranteeConnectivity() {
    const bs = this.bs;
    const connected = (from: number, to: number) => {
      const seen = new Set<number>([from]);
      const walk = (n: number) => { for (const m of this.adj[n]) if (!seen.has(m)) { seen.add(m); walk(m); } };
      walk(from);
      return seen.has(to);
    };
    const add = (a: number, b: number) => {
      this.links.push([a, b]);
      this.adj[a].push(b);
      this.adj[b].push(a);
    };

    // قلعه‌های بی‌راه را به نزدیک‌ترین قلعهٔ وصل‌شده می‌چسبانیم.
    for (let a = 0; a < bs.length; a++) {
      if (this.adj[a].length) continue;
      let nearest = -1;
      let nearestD = Infinity;
      for (let b = 0; b < bs.length; b++) {
        if (b === a) continue;
        const d = Math.hypot(bs[a].x - bs[b].x, bs[a].y - bs[b].y);
        if (d < nearestD) { nearestD = d; nearest = b; }
      }
      if (nearest >= 0) add(a, nearest);
    }
    // اگر جزیرهٔ جدا مانده، کوتاه‌ترین فاصلهٔ بین دو جزیره را می‌سازیم.
    for (let guard = 0; guard < bs.length; guard++) {
      let bestA = -1, bestB = -1, bestD = Infinity;
      for (let a = 0; a < bs.length; a++)
        for (let b = a + 1; b < bs.length; b++) {
          if (connected(a, b)) continue;
          const d = Math.hypot(bs[a].x - bs[b].x, bs[a].y - bs[b].y);
          if (d < bestD) { bestD = d; bestA = a; bestB = b; }
        }
      if (bestA < 0) break;
      add(bestA, bestB);
    }
  }

  fxAdd(o: Partial<Effect> & { k: Effect["k"]; x: number; y: number; c: string }) {
    this.fx.push({ t: 0, l: 1, ...o } as Effect);
    if (this.fx.length > 90) this.fx.splice(0, this.fx.length - 90);
  }

  /** قوانین راه‌ها را اعمال می‌کند و در صورت نیاز نقشه را دوباره می‌سازد. */
  /**
   * تغییرِ قوانینِ راه در میانهٔ نبرد.
   * عمداً فقط گرافِ راه بازسازی می‌شود؛ قلعه‌ها، نیروها، لشکرهای در حرکت،
   * تایمرها و وضعیتِ برد/باخت دست‌نخورده می‌مانند. (پیش‌تر اینجا build() صدا
   * زده می‌شد و هر تغییرِ تنظیمات کلِ نبرد را از صفر می‌کرد.)
   */
  setRoadRules(options: { openRoads?: boolean; minRoadLength?: number; randomRoads?: boolean }) {
    const before = { openRoads: this.openRoads, minRoadLength: this.minRoadLength, randomRoads: this.randomRoads };
    if (options.openRoads !== undefined) this.openRoads = options.openRoads;
    if (options.minRoadLength !== undefined) this.minRoadLength = Math.max(0, Math.min(900, Math.floor(options.minRoadLength)));
    if (options.randomRoads !== undefined) this.randomRoads = options.randomRoads;
    const changed =
      before.openRoads !== this.openRoads ||
      before.minRoadLength !== this.minRoadLength ||
      before.randomRoads !== this.randomRoads;
    if (changed) this.rebuildRoads();
  }

  setMaxTroops(value: number) {
    const cap = Number.isFinite(value) ? Math.max(1, Math.min(1000, Math.floor(value))) : CFG.cap;
    this.baseCap = cap;
    // Changing the final limit doesn't skip the per-castle five-second capacity stages.
    for (const b of this.bs) {
      if (b.o === 0) {
        b.cap = CFG.neutralCap;
        b.lvl = 1;
        b.capTimer = 0;
        continue;
      }
      const start = Math.min(CFG.capStart, cap);
      const previous = b.cap;
      b.cap = Math.max(start, Math.min(b.cap, cap));
      b.lvl = 1 + Math.ceil((b.cap - start) / 10);
      if (b.cap !== previous) b.capTimer = 0;
    }
  }

  zoomBy(delta: number) {
    if (delta === 0) {
      this.zoom = 1;
      this.panX = 0;
      this.panY = 0;
    } else {
      this.zoom = Math.max(1, Math.min(3, this.zoom + delta));
    }
    this.preview = this.computePreview();
  }

  /**
   * زوم به سمت یک نقطهٔ مشخص روی صفحه، طوری که همان نقطه زیر نشانگر بماند.
   * مختصات صفحه‌ای و اندازهٔ پنجره لازم است.
   */
  zoomAt(delta: number, screenX: number, screenY: number, viewWidth: number, viewHeight: number) {
    const before = this.zoom;
    this.zoomBy(delta);
    if (this.zoom === before) return;
    const geo = this.fitGeometry(viewWidth, viewHeight);
    // نقطهٔ جهانی زیر نشانگر پیش و پس از زوم باید یکی بماند.
    const worldX = (screenX - this.view.ox) / this.view.s;
    const worldY = (screenY - this.view.oy) / this.view.s;
    this.panX += screenX - (this.view.ox + worldX * geo.s);
    this.panY += screenY - (this.view.oy + worldY * geo.s);
    this.clampPan(viewWidth, viewHeight);
  }

  /** هندسهٔ جاشدنِ نقشه در ناحیهٔ زیرِ نوارِ بالا (هم‌راستا با render.ts). */
  private fitGeometry(viewWidth: number, viewHeight: number) {
    const top = this.demo ? 0 : Math.max(0, Math.min(viewHeight * 0.26, this.hudInset || 0));
    const areaH = Math.max(140, viewHeight - top);
    const s = Math.min(viewWidth / this.worldWidth, areaH / this.worldHeight) * 0.94 * this.zoom;
    return { s, areaH };
  }

  /** دور نگه‌داشتن جابه‌جایی نقشه درون کادر پنجره */
  clampPan(viewWidth: number, viewHeight: number) {
    const { s, areaH } = this.fitGeometry(viewWidth, viewHeight);
    const maxX = Math.max(0, (this.worldWidth * s - viewWidth) / 2);
    const maxY = Math.max(0, (this.worldHeight * s - areaH) / 2);
    this.panX = Math.max(-maxX, Math.min(maxX, this.panX));
    this.panY = Math.max(-maxY, Math.min(maxY, this.panY));
  }

  panBy(dx: number, dy: number) {
    this.panX += dx;
    this.panY += dy;
  }

  /* ================= مسیر و اعزام ================= */
  findRoute(from: Building, to: Building): Building[] | null {
    const queue = [from.id];
    const prev = new Map<number, number | null>([[from.id, null]]);
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      if (id === to.id) break;
      for (const next of this.adj[id]) {
        if (prev.has(next)) continue;
        const castle = this.bs[next];
        // دسترسی آزاد: عبور از کنار قلعه‌های خنثی و دشمن هم مجاز است.
        if (!this.openRoads && next !== to.id && castle.o !== from.o) continue;
        prev.set(next, id);
        queue.push(next);
      }
    }
    if (!prev.has(to.id)) return null;
    const route: Building[] = [];
    let id: number | null = to.id;
    while (id !== null) {
      route.unshift(this.bs[id]);
      id = prev.get(id) ?? null;
    }
    return route;
  }

  sendN(from: Building, to: Building, n: number, route: Building[] | null = null): boolean {
    n = Math.min(Math.floor(n), from.tr);
    if (!Number.isFinite(n) || n < 1 || from === to) return false;
    route = route || [from, to];
    const dispatched = takeArmy(from.army, n);
    const waypoints = buildMarchPath(route, landscapeFor(this).islands, this.bs);
    const len = pathLength(waypoints);
    for (const unit of TROOP_TYPES) {
      if (dispatched[unit] <= 0) continue;
      const squad: Squad = {
        o: from.o, from, to, route, waypoints,
        unit,
        hp: dispatched[unit],
        get n(): number { return unitCount(this.hp, this.unit); },
        set n(value: number) { this.hp = Math.max(0, Math.floor(value)) * UNITS[this.unit].power; },
        x: from.x, y: from.y, d: 0, len,
        sp: CFG.speed * UNITS[unit].speed,
        id: Math.random() * 9,
        ang: 0,
      };
      this.sq.push(squad);
    }
    this.fxAdd({ k: "txt", x: from.x, y: from.y - 52, s: "-" + fa(n), c: "#ffffff" });
    if (from.o === 1) sfx.send();
    return true;
  }

  arrive(s: Squad) {
    const t = s.to;
    if (t.o === s.o) {
      t.army[s.unit] += s.hp;
      t.fl = Math.max(t.fl, 0.35);
      this.fxAdd({ k: "txt", x: t.x, y: t.y - 58, s: "+" + fa(s.n), c: COL[s.o] });
      return;
    }
    const m = defOf(t);
    const dv = armyPower(t.army) * m;
    t.hit = 1;
    this.fxAdd({ k: "ring", x: t.x, y: t.y, c: "#ffffff", l: 0.6 });
    this.shake = Math.min(1, this.shake + 0.35);
    if (s.hp > dv + 1e-8) {
      const prev = t.o;
      t.o = s.o;
      t.army = emptyArmy();
      t.army[s.unit] = s.hp - dv;
      t.pt = 0;
      t.fl = 1;
      t.lvl = 1;
      t.cap = Math.min(CFG.capStart, this.baseCap);
      t.capTimer = 0;
      this.fxAdd({ k: "ring", x: t.x, y: t.y, c: COL[s.o], l: 0.95, r: 90 });
      this.fxAdd({ k: "burst", x: t.x, y: t.y - 10, c: COL[s.o], l: 0.7 });
      if (s.o === 1) {
        this.onToast(prev === 0 ? "ساختمان تصرف شد!" : "ساختمان دشمن گرفته شد!");
        sfx.capture();
        playCaptureSound();
      } else if (prev === 1) {
        this.onToast("یک ساختمان را از دست دادی!");
        sfx.lose();
      }
    } else {
      const before = t.tr;
      damageArmy(t.army, s.hp / m);
      const lost = before - t.tr;
      this.fxAdd({ k: "txt", x: t.x, y: t.y - 58, s: lost ? "-" + fa(lost) : "آسیب", c: "#ffffff" });
      if (s.o === 1) this.onToast("حمله دفع شد؛ نیروی بیشتری بفرست");
      sfx.repel();
    }
  }

  /* ================= انتخاب کشیدنی ================= */
  buildingAt(x: number, y: number): Building | null {
    let best: Building | null = null;
    let bd = 1;
    for (const b of this.bs) {
      // Include the visible height of the oblique keep, not just its ground anchor.
      const d = Math.hypot((b.x - x) / 54, (b.y - 18 - y) / 76);
      if (d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  /** لغو کامل انتخاب‌ها (کلیک روی زمین خالی یا کلید Escape/B) */
  deselectAll() {
    this.sels = [];
    this.sel = null;
    this.lastAllyClick = null;
    this.preview = null;
  }

  /** نیروی قابل ارسال از یک قلعه با درصد فعلی */
  amountOf(b: Building) {
    return Math.floor((b.tr * this.pct) / 100);
  }

  dispatchPower(b: Building, amount = this.amountOf(b)) {
    return armyPower(selectArmy(b.army, amount));
  }

  computePreview(): Preview | null {
    const target = this.hover;
    if (!target) return null;
    const drafted = this.ptr && this.ptr.draft.length ? this.ptr.draft : this.sels;
    if (target.o === 1) {
      const others = drafted.filter((s) => s !== target && s.o === 1);
      if (!others.length) return { target, sources: [], total: 0, power: 0, need: 0, ok: true, blocked: 0, mode: "select" };
      let total = 0;
      let power = 0;
      let blocked = 0;
      const src: Building[] = [];
      for (const s of others) {
        const n = this.amountOf(s);
        if (n < 1) continue;
        if (!this.findRoute(s, target)) {
          blocked++;
          continue;
        }
        total += n;
        power += this.dispatchPower(s, n);
        src.push(s);
      }
      return { target, sources: src, total, power, need: 0, ok: total > 0, blocked, mode: "reinforce" };
    }
    if (!drafted.length) return { target, sources: [], total: 0, power: 0, need: armyPower(target.army) * defOf(target), ok: false, blocked: 0, mode: "attack" };
    let total = 0;
    let power = 0;
    let blocked = 0;
    const src: Building[] = [];
    for (const s of drafted) {
      if (s === target) continue;
      const n = this.amountOf(s);
      if (n < 1) continue;
      if (!this.findRoute(s, target)) {
        blocked++;
        continue;
      }
      total += n;
      power += this.dispatchPower(s, n);
      src.push(s);
    }
    const need = armyPower(target.army) * defOf(target);
    return { target, sources: src, total, power, need, ok: power > need + 1e-8, blocked, mode: "attack" };
  }

  down(id: number, wx: number, wy: number, shift: boolean) {
    if (this.over || this.paused) return;
    const b = this.buildingAt(wx, wy);
    const startAlly = b && b.o === 1 ? b : null;
    this.ptr = {
      id,
      sx: wx,
      sy: wy,
      x: wx,
      y: wy,
      lx: wx,
      ly: wy,
      shift,
      moved: false,
      startB: startAlly,
      draft: startAlly ? [startAlly] : [],
      trail: [{ x: wx, y: wy }],
    };
    this.ghostTrail = [];
    this.hover = b;
    this.lastHoverId = b ? b.id : -1;
    this.preview = this.computePreview();
  }

  /** هر قلعهٔ خودی که نشانگر هنگام کشیدن از رویش عبور کند، به انتخاب اضافه می‌شود */
  private sweepSelect(p: Ptr, x1: number, y1: number, x2: number, y2: number) {
    for (const b of this.bs) {
      if (b.o !== 1 || p.draft.includes(b)) continue;
      if (distToSeg(b.x / 46, (b.y - 18) / 66, x1 / 46, y1 / 66, x2 / 46, y2 / 66) <= 1) {
        p.draft.push(b);
        this.fxAdd({ k: "ring", x: b.x, y: b.y, c: "#3ddc84", l: 0.45, r: 60 });
        sfx.select();
      }
    }
  }

  move(id: number, wx: number, wy: number) {
    const p = this.ptr;
    if (p) {
      if (p.id !== id) return;
      if (!p.moved && Math.hypot(wx - p.sx, wy - p.sy) > 8) p.moved = true;
      if (p.moved) {
        this.sweepSelect(p, p.lx, p.ly, wx, wy);
        if (Math.hypot(wx - p.trail[p.trail.length - 1].x, wy - p.trail[p.trail.length - 1].y) > 5) {
          p.trail.push({ x: wx, y: wy });
          if (p.trail.length > 220) p.trail.shift();
        }
      }
      p.lx = wx;
      p.ly = wy;
      p.x = wx;
      p.y = wy;
    }
    const h = this.buildingAt(wx, wy);
    if ((h ? h.id : -1) !== this.lastHoverId) {
      this.lastHoverId = h ? h.id : -1;
      if (h && this.ptr) sfx.hover();
    }
    this.hover = h;
    this.preview = this.computePreview();
  }

  up(id: number, wx: number, wy: number) {
    const p = this.ptr;
    if (!p || p.id !== id) return;
    this.ptr = null;
    if (p.trail.length > 1) this.ghostTrail = p.trail.map((pt) => ({ ...pt, t: 0 }));
    if (this.over || this.paused) return;
    this.hover = this.buildingAt(wx, wy);
    this.move(id, wx, wy); // تازه‌سازی پیش‌نمایش
    const target = this.hover;
    const drafted = p.draft.length ? p.draft : this.sels;

    /* --- رها کردن روی قلعه هدف --- */
    if (target) {
      if (target.o === 1) {
        if (p.moved) {
          /* رها کردن پس از کشیدن فقط انتخاب را ثبت می‌کند؛ انتقال فقط با دوبار کلیک است. */
          this.lastAllyClick = null;
          // کشیدن هم قلعه‌های قبلی را نگه می‌دارد و قلعه‌های لمس‌شده را اضافه می‌کند.
          this.sels = Array.from(new Set([...this.sels, ...p.draft]));
          this.sel = this.sels[0] || null;
          if (this.sels.length) {
            sfx.select();
            this.onToast(fa(this.sels.length) + " قلعه انتخاب شد؛ برای انتقال روی مقصد دوبار کلیک کن");
          }
        } else {
          /* دوبار کلیک روی قلعه هم‌رنگ، انتخاب قبلی را به آن منتقل می‌کند. */
          const now = Date.now();
          const last = this.lastAllyClick;
          if (last && last.target === target && now - last.at <= 520 && last.sources.length) {
            // دومین کلیک روی همان قلعه: انتقال نیروی قلعه‌های انتخاب‌شده به این مقصد.
            this.lastAllyClick = null;
            this.reinforce(target, last.sources);
          } else {
            // کلیک اول: قلعهٔ کلیک‌شده به انتخاب‌ها اضافه می‌شود و منابع انتقال ثبت می‌شوند.
            const sources = this.sels.filter((s) => s !== target && s.o === target.o);
            this.lastAllyClick = { target, sources: [...sources], at: now };
            this.addToSelection(target);
            if (sources.length) this.onToast("برای انتقال نیرو، دوباره روی قلعهٔ هم‌تیمی کلیک کن");
          }
        }
      } else {
        this.lastAllyClick = null;
        this.attack(target, drafted);
      }
      this.preview = null;
      return;
    }

    /* --- رها کردن روی زمین خالی --- */
    if (p.moved) {
      this.sels = p.shift ? Array.from(new Set([...this.sels, ...p.draft])) : p.draft;
      this.sel = this.sels[0] || null;
      if (this.sels.length) {
        sfx.select();
        if (this.sels.length > 1) this.onToast(fa(this.sels.length) + " قلعه انتخاب شد — حالا روی هدف رها کن");
      }
    } else if (p.startB) {
      this.addToSelection(p.startB);
    } else {
      this.sels = [];
      this.sel = null;
    }
    this.preview = null;
  }

  /**
   * هر کلیک روی یک قلعهٔ خودی، آن قلعه را به انتخاب‌ها اضافه می‌کند.
   * کلیک دوباره روی همان قلعه آن را حذف نمی‌کند؛ شمار انتخاب‌ها هرگز کم نمی‌شود.
   * برای برداشتن یک قلعه از انتخاب، Shift+کلیک یا کلید B (لغو همه) استفاده می‌شود.
   */
  private addToSelection(target: Building) {
    if (!this.sels.includes(target)) {
      this.sels = [...this.sels, target];
      sfx.select();
    } else {
      sfx.deselect();
    }
    this.sel = this.sels[0] || null;
  }

  /** انتقال نیروی قلعه‌های هم‌رنگ به یک قلعهٔ مقصد */
  reinforce(target: Building, sources: Building[]): number {
    if (!target.o) return 0;
    const list = Array.from(new Set(sources)).filter((s) => s !== target && s.o === target.o);
    let sent = 0;
    let blocked = 0;
    let empty = 0;
    for (const source of list) {
      const n = this.amountOf(source);
      if (n < 1) {
        empty++;
        continue;
      }
      const route = this.findRoute(source, target);
      if (!route) {
        blocked++;
        this.fxAdd({ k: "txt", x: source.x, y: source.y - 60, s: "مسیر بسته", c: "#ffd166" });
        continue;
      }
      if (this.sendN(source, target, n, route)) sent++;
    }
    // مانند فرمان حمله، پس از فرمان انتقال هم قلعه‌ها از حالت انتخاب خارج می‌شوند.
    if (list.length) {
      this.sels = [];
      this.sel = null;
    } else if (!this.sels.includes(target)) {
      this.sels = [...this.sels, target];
      this.sel = this.sels[0] || null;
    }
    if (sent) {
      this.fxAdd({ k: "ring", x: target.x, y: target.y, c: COL[target.o], l: 0.75, r: 72 });
      this.onToast(sent > 1 ? fa(sent) + " گروه نیروی کمکی اعزام شدند" : "نیروی کمکی اعزام شد");
    } else if (blocked) this.onToast("مسیر بازی تا آن قلعه وجود ندارد");
    else if (empty) this.onToast("نیروی کافی برای انتقال وجود ندارد");
    else this.onToast("ابتدا قلعه‌های هم‌رنگ را انتخاب کن");
    return sent;
  }

  cancel() {
    this.ptr = null;
    this.preview = null;
  }

  /** حمله گروهی به یک قلعه هدف */
  attack(target: Building, sources: Building[]) {
    const list = sources.filter((s) => s.o === 1 && s !== target);
    if (!list.length) {
      this.onToast("ابتدا قلعه‌های سبز خودت را انتخاب کن");
      return;
    }
    let sent = 0;
    let blocked = 0;
    let empty = 0;
    for (const s of list) {
      const n = this.amountOf(s);
      if (n < 1) {
        empty++;
        continue;
      }
      const route = this.findRoute(s, target);
      if (!route) {
        blocked++;
        this.fxAdd({ k: "txt", x: s.x, y: s.y - 60, s: "مسیر بسته", c: "#ffd166" });
        continue;
      }
      if (this.sendN(s, target, n, route)) sent++;
    }
    this.sels = [];
    this.sel = null;
    if (sent) this.onToast(sent > 1 ? fa(sent) + " گروه به سمت هدف اعزام شدند" : "نیروها اعزام شدند");
    else if (blocked) this.onToast("مسیر بازی تا مقصد وجود ندارد؛ قلعه‌های میانی را بگیر");
    else if (empty) this.onToast("نیروی کافی نیست");
  }

  /** حمله به همه اهداف ممکن از انتخاب فعلی (میان‌بر کیبورد) */
  selectAll() {
    this.sels = this.bs.filter((b) => b.o === 1);
    this.sel = this.sels[0] || null;
    if (this.sels.length) {
      sfx.select();
      this.onToast("همه قلعه‌های تو انتخاب شدند");
    }
  }

  /* ================= هوش مصنوعی ================= */
  ai(dt: number, o: Owner) {
    this.aiT[o] -= dt;
    if (this.aiT[o] > 0) return;
    const base = o === 1 ? (this.demo ? this.L.ai * 0.8 : 0.5) : this.L.ai;
    const pc = this.bs.filter((b) => b.o === o).length;
    const ec = this.bs.filter((b) => b.o !== 0 && b.o !== o).length;
    const ag = Math.min(1, base + 0.12 * Math.max(0, pc - ec));
    this.aiT[o] = 2.8 - 1.7 * ag;

    const mine = this.bs.filter((b) => b.o === o);
    for (const b of mine) {
      const thr = this.sq.filter((s) => s.o !== o && s.to === b).reduce((a, s) => a + s.hp, 0);
      if (thr > armyPower(b.army) * defOf(b) * 0.8) {
        const h = this.adj[b.id]
          .map((k) => this.bs[k])
          .filter((n) => n.o === o && n.tr > 12)
          .sort((p, q) => q.tr - p.tr)[0];
        if (h) this.sendN(h, b, h.tr * 0.5, this.findRoute(h, b));
      }
    }

    let cmds = 0;
    for (const b of mine) {
      if (cmds >= 2) break;
      if (b.tr < 10) continue;
      const av = Math.floor(b.tr * (0.45 + 0.35 * ag));
      const availablePower = this.dispatchPower(b, av);
      let best: Building | null = null;
      let bsc = 1e9;
      let bn = 0;
      for (const k of this.adj[b.id]) {
        const t = this.bs[k];
        if (t.o === o) continue;
        const inc = this.sq.filter((s) => s.o === o && s.to === t).reduce((a, s) => a + s.hp, 0);
        const need = armyPower(t.army) * defOf(t) + 3 - inc;
        const sc = need - (t.o !== 0 ? ag * 10 : 0) - (t.type === "barracks" ? 4 : 0);
        if (availablePower > need && sc < bsc) {
          best = t;
          bsc = sc;
          bn = 1;
          while (bn < av && this.dispatchPower(b, bn) <= need + 3 + ag * 4) bn++;
        }
      }
      if (best) {
        const route = this.findRoute(b, best);
        if (route && this.sendN(b, best, Math.max(bn, 1), route)) cmds++;
      }
    }
  }

  /* ================= به‌روزرسانی ================= */
  step(dt: number) {
    this.t += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.4);

    // Towers target the same position that is drawn in this frame.
    for (const s of this.sq) {
      s.d = Math.min(s.len, s.d + s.sp * dt);
      const pose = samplePath(s.waypoints, s.d);
      s.x = pose.x;
      s.y = pose.y;
      s.ang = pose.angle;
    }

    /* قانون کاهش نیروهای مازاد: هر ۱ ثانیه، ۱ سرباز از قلعه‌هایی که فراتر از سقف نیرو دارند کسر می‌شود */
    this.decayTimer += dt;
    const shouldDecay = this.decayTimer >= 1.0;
    if (shouldDecay) {
      this.decayTimer -= 1.0;
      if (this.decayTimer >= 1.0) this.decayTimer = 0; // جلوگیری از انباشت در افت فریم شدید
    }

    for (const b of this.bs) {
      if (b.fl > 0) b.fl = Math.max(0, b.fl - dt * 1.5);
      if (b.hit > 0) b.hit = Math.max(0, b.hit - dt * 2.2);

      // اجرای کسر سرباز مازاد در قلعه‌ها
      if (shouldDecay && b.o && b.tr > this.baseCap) {
        takeArmy(b.army, 1);
        if (b.o === 1) {
          this.fxAdd({ k: "txt", x: b.x - 20, y: b.y - 46, s: "-۱ سرریز", c: "#ff8a80", l: 0.75 });
        }
      }

      // Team-owned castles automatically gain 10 capacity after five full seconds.
      if (b.o && b.cap < this.baseCap && b.tr >= b.cap) {
        b.capTimer += dt;
        while (b.capTimer >= CFG.capHold && b.cap < this.baseCap && b.tr >= b.cap) {
          b.capTimer -= CFG.capHold;
          b.cap = Math.min(this.baseCap, b.cap + CFG.capStep);
          b.lvl++;
          b.fl = 1;
          this.fxAdd({ k: "ring", x: b.x, y: b.y, c: "#e8b44c", l: 0.85 });
          this.fxAdd({ k: "txt", x: b.x, y: b.y - 72, s: "ظرفیت " + fa(b.cap), c: "#ffe6ab" });
          if (b.o === 1) {
            this.onToast("ظرفیت قلعه به " + fa(b.cap) + " نفر افزایش یافت");
            sfx.upgrade();
          }
        }
        if (b.tr < b.cap || b.cap >= this.baseCap) b.capTimer = 0;
      } else {
        b.capTimer = 0;
      }

      // towers have no reproduction (zad-o-valoud): only castles spawn troops
      if (b.type !== "tower") {
        b.pt += dt;
        const rate = CFG.spawn[b.type] / (1 + 0.25 * (b.lvl - 1));
        while (b.pt >= rate) {
          b.pt -= rate;
          if (b.tr < b.cap) {
            addUnit(b.army, producedUnit(b.type));
            if (b.o === 1 && Math.random() < 0.35)
              this.fxAdd({ k: "txt", x: b.x + 20, y: b.y - 46, s: "+۱", c: "#bbf7d0", l: 0.7 });
          }
        }
      } else {
        b.pt = 0;
      }
      const armed = b.type === "tower" && (b.o !== 0 || this.neutralDefense);
      if (armed) {
        b.tt += dt;
        if (b.tt >= CFG.shot) {
          const e = this.sq.find((s) => towerCanTarget(b, s));
          if (e) {
            b.tt = 0;
            // برجِ خنثی آسیبِ کمتری می‌زند ولی هر لشکری را که نزدیک شود می‌زند.
            const hit = b.o === 0 ? CFG.neutralShotDamage : 1;
            e.hp = Math.max(0, e.hp - hit);
            b.fl = Math.max(b.fl, 0.3);
            this.fxAdd({ k: "ring", x: e.x, y: e.y, c: "#fde047", l: 0.35 });
            this.fxAdd({ k: "txt", x: e.x, y: e.y - 26, s: "💥", c: "#fde047", l: 0.5 });
            if (b.o === 0 && e.o === 1) this.onToast("برج خنثی به نیروهایت شلیک کرد!");
            sfx.shot();
          }
        }
      }
    }

    if (this.fieldCombat) {
      for (let i = 0; i < this.sq.length; i++)
        for (let j = i + 1; j < this.sq.length; j++) {
          const a = this.sq[i];
          const b = this.sq[j];
          if (a.o !== b.o && a.n > 0 && b.n > 0 && Math.hypot(a.x - b.x, a.y - b.y) < 22) {
            const m = Math.min(a.hp, b.hp);
            a.hp = Math.max(0, a.hp - m);
            b.hp = Math.max(0, b.hp - m);
            this.fxAdd({ k: "ring", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, c: "#ffffff", l: 0.4 });
            this.fxAdd({ k: "burst", x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, c: "#ffd166", l: 0.45 });
            sfx.clash();
          }
        }
    }

    const arrived = this.sq.filter((s) => s.n > 0 && s.d >= s.len);
    this.sq = this.sq.filter((s) => s.n > 0 && s.d < s.len);
    arrived.forEach((s) => this.arrive(s));

    if (this.demo) {
      this.ai(dt, 2);
      this.ai(dt, 1);
    } else {
      for (let owner = 2; owner < this.aiT.length; owner++) {
        if (this.bs.some((b) => b.o === owner)) this.ai(dt, owner as Owner);
      }
    }

    // صدای حرکت لشکر وقتی گروهی در راه است پخش می‌شود.
    setNatureSound("march", this.sq.some((s) => s.n > 0));

    this.fx.forEach((f) => (f.t += dt));
    this.fx = this.fx.filter((f) => f.t < f.l);
    if (this.ghostTrail.length) {
      this.ghostTrail.forEach((p) => (p.t += dt));
      if (this.ghostTrail[0].t > 0.5) this.ghostTrail = [];
    }
    this.sels = this.sels.filter((b) => b.o === 1);
    this.sel = this.sels[0] || null;

    if (this.demo) {
      const pOwn = this.bs.some((b) => b.o === 1);
      const eOwn = this.bs.some((b) => b.o > 1);
      if ((!pOwn && !this.sq.some((q) => q.o === 1)) || (!eOwn && !this.sq.some((q) => q.o > 1))) this.onDemoReset();
      return;
    }

    const pOwn = this.bs.some((b) => b.o === 1);
    const eOwn = this.bs.some((b) => b.o > 1);
    if (!eOwn && !this.sq.some((q) => q.o > 1)) this.finish(true);
    else if (!pOwn && !this.sq.some((q) => q.o === 1)) this.finish(false);
  }

  /** پس از پایان بازی فقط افکت‌ها را پیش می‌برد (کاغذرنگی پیروزی) */
  idle(dt: number) {
    this.t += dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 2.4);
    this.fx.forEach((f) => (f.t += dt));
    this.fx = this.fx.filter((f) => f.t < f.l);
  }

  finish(win: boolean) {
    if (this.over) return;
    this.over = true;
    this.cancel();
    if (win) {
      sfx.win();
      for (let k = 0; k < 26; k++)
        this.fxAdd({
          k: "burst",
          x: 80 + Math.random() * Math.max(1, this.worldWidth - 160),
          y: 80 + Math.random() * Math.max(1, this.worldHeight - 160),
          c: ["#e8b44c", "#3ddc84", "#ffffff", "#ffd166"][k % 4],
          l: 0.9 + Math.random() * 0.7,
        });
    } else sfx.defeat();
    this.onFinish(win);
  }

  /* ================= آمار ================= */
  count(o: Owner) {
    return this.bs.filter((b) => b.o === o).reduce((a, b) => a + b.tr, 0) + this.sq.filter((s) => s.o === o).reduce((a, s) => a + s.n, 0);
  }
  power(o: Owner) {
    return this.bs.filter((b) => b.o === o).reduce((sum, b) => sum + armyPower(b.army), 0)
      + this.sq.filter((s) => s.o === o).reduce((sum, s) => sum + s.hp, 0);
  }
  opponentCount() {
    return this.bs.filter((b) => b.o > 1).reduce((sum, b) => sum + b.tr, 0)
      + this.sq.filter((s) => s.o > 1).reduce((sum, s) => sum + s.n, 0);
  }
  opponentPower() {
    return this.bs.filter((b) => b.o > 1).reduce((sum, b) => sum + armyPower(b.army), 0)
      + this.sq.filter((s) => s.o > 1).reduce((sum, s) => sum + s.hp, 0);
  }
  castles(o: Owner) {
    return this.bs.filter((b) => b.o === o).length;
  }
  opponentCastles() {
    return this.bs.filter((b) => b.o > 1).length;
  }
}
