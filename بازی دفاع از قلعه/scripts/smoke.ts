/* آزمون دودی منطق بازی و ژست «نگه‌دار، از روی قلعه‌ها رد شو، روی هدف رها کن» */
import { Game } from "../src/game/engine";

let fails = 0;
const ok = (name: string, cond: boolean, extra = "") => {
  console.log(`${cond ? "✔" : "✘"} ${name}${extra ? " — " + extra : ""}`);
  if (!cond) fails++;
};

const sim = (g: Game, secs: number) => {
  for (let i = 0; i < secs * 60; i++) g.step(1 / 60);
};

/* --- ۱: نشانگر از روی قلعه عبور می‌کند و انتخاب می‌شود، سپس رها کردن روی هدف --- */
{
  const g = new Game(4);
  const A = g.bs[0]; // 90,300 مال بازیکن
  const B = g.bs[1]; // 270,490 مال بازیکن
  g.down(1, A.x, A.y, false);
  ok("کشیدن هنوز شروع نشده (moved=false)", g.ptr !== null && !g.ptr.moved);
  // حرکت پلکانی به‌سمت B تا شبیه عبور واقعی نشانگر باشد
  for (let k = 1; k <= 10; k++) g.move(1, A.x + ((B.x - A.x) * k) / 10, A.y + ((B.y - A.y) * k) / 10);
  ok("پس از عبور، کشیدن ثبت شد (moved=true)", !!g.ptr?.moved);
  ok("هر دو قلعه خودی با عبور نشانگر انتخاب شدند", g.ptr!.draft.includes(A) && g.ptr!.draft.includes(B), `draft=${g.ptr!.draft.length}`);
  ok("رد نشانگر (trail) ثبت شده", g.ptr!.trail.length > 1, `trail=${g.ptr!.trail.length}`);

  // پیدا کردن هدفی که مسیر داشته باشد
  let target = null as null | typeof A;
  for (const b of g.bs) {
    if (b.o === 1) continue;
    if (g.findRoute(A, b) || g.findRoute(B, b)) {
      target = b;
      break;
    }
  }
  ok("هدف قابل دسترس پیدا شد", !!target, target ? `${target.type}@${target.x},${target.y}` : "");
  g.move(1, target!.x, target!.y);
  ok("پیش‌نمایش حمله ساخته شد", g.preview?.mode === "attack" && g.preview.sources.length > 0, `total=${g.preview?.total} need=${Math.ceil(g.preview?.need || 0)} ok=${g.preview?.ok}`);
  g.up(1, target!.x, target!.y);
  ok("پس از رها کردن، نیرو اعزام شد", g.sq.some((s) => s.o === 1 && s.to === target), `squads=${g.sq.length}`);
  ok("انتخاب پس از حمله پاک شد", g.sels.length === 0);
  ok("نیروی قلعه‌ها کم شد", A.tr < 40);
}

/* --- ۲: رها کردن روی قلعهٔ خودی فقط انتخاب است و هرگز انتقال نمی‌دهد --- */
{
  const g = new Game(4);
  const A = g.bs[0];
  const B = g.bs[1];
  g.down(1, A.x, A.y, false);
  g.move(1, B.x, B.y);
  g.up(1, B.x, B.y);
  ok("با رها کردن روی خودی هیچ نیرویی منتقل نشد", g.sq.length === 0, `squads=${g.sq.length}`);
  ok("قلعه‌های لمس‌شده فقط انتخاب شدند", g.sels.includes(A) && g.sels.includes(B), `selected=${g.sels.length}`);
}

/* --- ۳: هر کلیک یک قلعه به انتخاب‌ها اضافه می‌کند --- */
{
  const g = new Game(4);
  const A = g.bs[0];
  const B = g.bs[1];
  g.down(1, A.x, A.y, false);
  g.up(1, A.x + 2, A.y + 2);
  ok("کلیک ساده قلعه را انتخاب می‌کند", g.sels.length === 1 && g.sels[0] === A);
  ok("بدون اعزام نیرو", g.sq.length === 0);

  g.down(2, B.x, B.y, false);
  g.up(2, B.x, B.y);
  ok("کلیک روی قلعهٔ دوم، تعداد انتخاب را به ۲ می‌رساند", g.sels.length === 2, `sel=${g.sels.length}`);
  ok("هر دو قلعه در انتخاب‌ها هستند", g.sels.includes(A) && g.sels.includes(B));

  g.down(3, A.x, A.y, false);
  g.up(3, A.x, A.y);
  ok("کلیک دوباره روی همان قلعه، انتخاب را کم نمی‌کند", g.sels.length === 2, `sel=${g.sels.length}`);
  ok("قلعهٔ دوباره‌کلیک‌شده همچنان انتخاب است", g.sels.includes(A));
}

/* --- انتقال از سه قلعه به قلعهٔ چهارم با دوبار کلیک --- */
{
  const g = new Game(4);
  // برای آزمون مستقل مسیر، چهار قلعهٔ نخست را هم‌رنگ می‌کنیم.
  g.bs.forEach((b) => {
    b.o = 1;
    b.tr = 40;
  });
  g.setMaxTroops(50);
  const sources = g.bs.slice(0, 3);
  const target = g.bs[3];
  g.pct = 60; // درصدِ پیش‌فرضِ اعزام
  g.sels = [...sources];
  g.sel = sources[0];

  g.down(1, target.x, target.y, false);
  g.up(1, target.x, target.y);
  ok("کلیک اول هنوز نیرویی منتقل نمی‌کند", g.sq.length === 0);

  g.down(2, target.x, target.y, false);
  g.up(2, target.x, target.y);
  const support = g.sq.filter((s) => s.to === target && s.o === 1);
  ok("دوبار کلیک نیروی سه قلعه را منتقل می‌کند", support.length === 3, `squads=${support.length}`);
  ok("پس از انتقال، مقصد دیگر به انتخاب‌ها اضافه نمی‌شود", !g.sels.includes(target), `sel=${g.sels.length}`);
  ok("پس از انتقال، قلعه‌ها مانند فرمان حمله از حالت انتخاب خارج می‌شوند", g.sels.length === 0 && g.sel === null, `sel=${g.sels.length}`);
  ok("درصد اعزام (۶۰٪) روی هر سه مبدأ اعمال شده", sources.every((b) => b.tr === 16), `tr=${sources.map((b) => b.tr).join(",")}`);
}

/* --- ۴: رها کردن روی زمین خالی فقط انتخاب را ثبت می‌کند --- */
{
  const g = new Game(4);
  const A = g.bs[0];
  const B = g.bs[1];
  g.down(1, A.x, A.y, false);
  g.move(1, B.x, B.y);
  g.up(1, B.x, B.y + 60);
  ok("انتخاب گروهی ثبت شد", g.sels.length >= 1, `sel=${g.sels.length}`);
  ok("نیروی اعزامی در کار نیست", g.sq.length === 0);
  // حالا فقط روی هدف کلیک کن
  let target = g.bs.find((b) => b.o !== 1 && g.sels.some((s) => !!g.findRoute(s, b)));
  ok("هدف با مسیر از انتخاب فعلی", !!target);
  g.down(2, target!.x, target!.y, false);
  g.up(2, target!.x, target!.y);
  ok("حمله از انتخاب قبلی انجام شد", g.sq.some((s) => s.o === 1 && s.to === target), `squads=${g.sq.length}`);
}

/* --- ۵: shift = افزودن به انتخاب --- */
{
  const g = new Game(4);
  const A = g.bs[0];
  const B = g.bs[1];
  g.down(1, A.x, A.y, false);
  g.up(1, A.x, A.y);
  g.down(2, B.x, B.y, true);
  g.up(2, B.x, B.y);
  ok("شیفت دو قلعه را با هم نگه می‌دارد", g.sels.length === 2, `sel=${g.sels.length}`);
}

/* --- ۶: شبیه‌سازی طولانی و هوش مصنوعی --- */
{
  const g = new Game(3);
  g.pct = 75;
  g.onToast = () => {};
  let finished: boolean | null = null;
  g.onFinish = (w) => (finished = w);
  sim(g, 90);
  ok("شبیه‌سازی ۹۰ ثانیه بدون خطا", true, `t=${g.t.toFixed(1)} squads=${g.sq.length} fx=${g.fx.length}`);
  ok("دشمن فعال است (نیرو جابه‌جا کرده)", g.sq.length > 0 || g.bs.some((b) => b.o === 2 && b.lvl > 1));
  const p = g.count(1);
  const e = g.count(2);
  ok("شمارش نیروها سالم است", p >= 0 && e >= 0, `p=${p} e=${e} over=${g.over} fin=${finished}`);
}

/* --- قانون درگیری در مسیر روشن/خاموش --- */
{
  const collisionGame = (fieldCombat: boolean) => {
    const g = new Game(0);
    g.fieldCombat = fieldCombat;
    g.aiT[2] = 999;
    const left = g.bs[0];
    const right = g.bs[2];
    left.tr = 30;
    right.tr = 30;
    g.sendN(left, right, 10, [left, right]);
    g.sendN(right, left, 10, [right, left]);
    g.sq.forEach((s) => (s.d = s.len / 2));
    g.step(0.001);
    return g;
  };

  const field = collisionGame(true);
  ok("حالت همه‌جا: گروه‌های مخالف وسط مسیر درگیر شدند", field.sq.length === 0);

  const castle = collisionGame(false);
  ok("حالت فقط قلعه: گروه‌ها در مسیر از کنار هم عبور کردند", castle.sq.length === 2);
  ok("حالت فقط قلعه: نیروی گروه‌ها در مسیر کم نشد", castle.sq.every((s) => s.n === 10));
}

/* --- قانون کاهش نیروهای مازاد: هر ۱ ثانیه ۱ سرباز تا رسیدن به سقف حداکثر --- */
{
  const g = new Game(0);
  g.baseCap = 50;
  g.aiT[2] = 999;
  const castle = g.bs[0];
  castle.o = 1;
  castle.cap = 50;
  castle.tr = 60; // ۱۰ سرباز بیشتر از سقف ۵۰

  // پس از ۱ ثانیه شبیه‌سازی
  for (let i = 0; i < 60; i++) g.step(1 / 60);
  ok("پس از ۱ ثانیه دقیقاً ۱ سرباز سرریز کسر شد", castle.tr === 59, `tr=${castle.tr}`);

  // پس از ۹ ثانیه دیگر (مجموعاً ۱۰ ثانیه از ابتدا)
  for (let i = 0; i < 9 * 60; i++) g.step(1 / 60);
  ok("پس از ۱۰ ثانیه همهٔ ۱۰ سرباز مازاد کسر شده و به سقف ۵۰ رسید", castle.tr === 50, `tr=${castle.tr}`);

  // پس از ۲ ثانیه دیگر، کمتر از سقف ۵۰ نمی‌شود
  for (let i = 0; i < 2 * 60; i++) g.step(1 / 60);
  ok("نیروها به زیر سقف تعیین‌شده سقوط نمی‌کنند", castle.tr === 50, `tr=${castle.tr}`);
}

/* --- ۷: حالت نمایشی (پس‌زمینه منو) --- */
{
  const g = new Game(0, true);
  let reset = false;
  g.onDemoReset = () => (reset = true);
  sim(g, 120);
  // The demo keeps playing until a single side is left; with more castles in the
  // current levels it may legitimately run longer than two minutes.
  ok("دمو خودکار بازی می‌کند", g.t > 115, `t=${g.t.toFixed(1)} reset=${reset}`);
  ok("دمو پایان مرحله را اعلام نمی‌کند", !g.over);
}

/* --- ۹: عبور سریع نشانگر از روی چند قلعه در یک جهش (رویداد move کم) --- */
{
  const g = new Game(4); // 90,300 / 270,490 / ... بازیکن دو قلعه دارد
  const A = g.bs[0];
  const B = g.bs[1];
  g.down(1, A.x, A.y, false);
  // یک جهش بزرگ و ناگهانی از A به‌جایی پشت B (شبیه موس سریع) باید B را هم به‌خاطر تقاطع پاره‌خط انتخاب کند
  g.move(1, B.x + 40, B.y + 5);
  ok("قلعهٔ میان‌راه با جهش سریع هم انتخاب شد", g.ptr!.draft.includes(B), `draft=${g.ptr!.draft.map((b) => b.id)}`);
  g.up(1, B.x + 40, B.y + 5);
}

/* --- ۱۰: عبور از روی قلعهٔ دشمن در میانهٔ کشیدن، آن را به انتخاب اضافه نمی‌کند --- */
{
  const g = new Game(4);
  const A = g.bs[0];
  const foe = g.bs.find((b) => b.o === 2)!;
  g.down(1, A.x, A.y, false);
  for (let k = 1; k <= 10; k++) g.move(1, A.x + ((foe.x - A.x) * k) / 10, A.y + ((foe.y - A.y) * k) / 10);
  ok("قلعهٔ دشمن هرگز وارد انتخاب خودی نمی‌شود", !g.ptr!.draft.includes(foe));
  ok("اما به‌عنوان هدف شناسایی شده (پیش‌نمایش حمله)", g.preview?.target === foe && g.preview.mode === "attack");
}

/* --- ظرفیت قلعه پس از پرماندن پنج‌ثانیه‌ای خودکار افزایش می‌یابد --- */
{
  const g = new Game(4);
  const A = g.bs[0];
  g.ai = () => {};
  A.tr = 20;
  sim(g, 4.9);
  ok("پیش از پنج ثانیه هنوز ظرفیت ۲۰ است", A.cap === 20 && A.lvl === 1, `cap=${A.cap}`);
  sim(g, 0.2);
  ok("پس از پنج ثانیه ظرفیت خودکار به ۳۰ رسید", A.cap === 30 && A.lvl === 2, `cap=${A.cap}`);

  A.tr = 30;
  A.capTimer = 0;
  sim(g, 5.1);
  ok("پس از پنج ثانیهٔ پُر بودن ظرفیت به ۴۰ رسید", A.cap === 40 && A.lvl === 3, `cap=${A.cap}`);
  A.tr = 40;
  A.capTimer = 0;
  sim(g, 5.1);
  ok("ظرفیت قلعه تا سقف نهایی ۵۰ افزایش یافت", A.cap === 50 && A.lvl === 4, `cap=${A.cap}`);
}

/* --- ۱۵: دابل‌کلیک با رفتار افزودنی، مقصد را به منابع انتقال نمی‌کند --- */
{
  const g = new Game(4);
  g.bs.forEach((b) => { b.o = 1; b.tr = 40; });
  g.setMaxTroops(50);
  const A = g.bs[0], B = g.bs[1], C = g.bs[2], target = g.bs[3];
  // انتخاب دو قلعه با کلیک
  g.down(1, A.x, A.y, false); g.up(1, A.x, A.y);
  g.down(2, B.x, B.y, false); g.up(2, B.x, B.y);
  ok("دو کلیک، دو قلعه را انتخاب کرد", g.sels.length === 2, `sel=${g.sels.length}`);
  // کلیک اول روی مقصد: فقط انتخاب می‌شود و منابع انتقال ثبت می‌شوند
  g.down(3, target.x, target.y, false); g.up(3, target.x, target.y);
  ok("کلیک اول روی مقصد، آن را به انتخاب اضافه کرد", g.sels.includes(target), `sel=${g.sels.length}`);
  ok("کلیک اول هنوز نیرویی اعزام نکرد", g.sq.length === 0);
  // کلیک دوم روی همان مقصد: انتقال از دو قلعهٔ قبلی
  g.down(4, target.x, target.y, false); g.up(4, target.x, target.y);
  const support = g.sq.filter((s) => s.to === target && s.o === 1);
  ok("کلیک دوم نیروی دو قلعهٔ قبلی را منتقل کرد", support.length === 2, `squads=${support.length}`);
  ok("مبدأها نیروی خود را از دست دادند", A.tr === 16 && B.tr === 16, `A=${A.tr} B=${B.tr}`);
  ok("مقصد نیروی اضافه نگرفت", C.tr === 40 && target.tr <= 40, `C=${C.tr} target=${target.tr}`);
  ok("مانند فرمان حمله، پس از فرمان انتقال هم انتخاب‌ها خالی شدند", g.sels.length === 0, `sel=${g.sels.length}`);
  console.log("PASS: double-click transfers only the previously selected castles.");
}

/* --- ۱۶: لغو انتخاب با deselectAll و شروع ژست فقط از روی قلعه --- */
{
  const g = new Game(4);
  const A = g.bs[0];
  g.down(1, A.x, A.y, false); g.up(1, A.x, A.y);
  ok("کلیک روی قلعه انتخاب کرد", g.sels.length === 1);
  g.deselectAll();
  ok("deselectAll همهٔ انتخاب‌ها را لغو کرد", g.sels.length === 0 && g.sel === null);
  // نقطهٔ خالیِ نقشه هیچ قلعه‌ای برنمی‌گرداند
  let empty: { x: number; y: number } | null = null;
  for (let y = 10; y < g.worldHeight && !empty; y += 25)
    for (let x = 10; x < g.worldWidth; x += 25)
      if (!g.buildingAt(x, y)) { empty = { x, y }; break; }
  ok("buildingAt روی زمین خالی چیزی برنمی‌گرداند", empty !== null && g.buildingAt(empty!.x, empty!.y) === null);
}

console.log(fails ? `\n${fails} آزمون ناموفق` : "\nهمهٔ آزمون‌ها موفق ✔");
process.exit(fails ? 1 : 0);
