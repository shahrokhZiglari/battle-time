import { ReactNode, useRef, useState } from "react";
import {
  ATTACK_DASH_LIMITS,
  DEFAULT_ATTACK_DASH,
  DEFAULT_HALO_SPIN,
  DEFAULT_UNIT_TUNING,
  fa,
  HALO_SPIN_LIMITS,
  LEVELS,
  TROOP_TYPES,
  UNIT_LIMITS,
} from "../game/config";
import { MAX_BOATS, MAX_LAKES, MAX_SHIPS } from "../game/map";
import {
  copyTextToClipboard,
  DEFAULT_GLOBAL_SETTINGS,
  downloadJsonFile,
  exportSettingsJson,
  importSettingsJson,
  Save,
  SETTINGS_FILE_NAME,
} from "../game/save";
import { DEFAULT_SFX_VOLUMES, SFX_KEYS, SFX_FULL_NAMES, SFX_LABELS, type SfxKey } from "../game/sound";
import GestureDemo from "./GestureDemo";
import { RotateRow } from "./RotateControl";
import type { Rotation } from "../game/view";

export function Modal({
  children,
  wide,
  onScrim,
}: {
  children: ReactNode;
  wide?: boolean;
  onScrim?: () => void;
}) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-abyss/72 backdrop-blur-[2px]" onClick={onScrim} />
      <div
        className={`plate anim-rise relative max-h-full w-full overflow-y-auto thin-scroll ${wide ? "max-w-4xl" : "max-w-lg"}`}
      >
        {children}
      </div>
    </div>
  );
}

const Kicker = ({ children }: { children: ReactNode }) => (
  <div className="mb-2 flex items-center gap-2 text-[11px] font-bold tracking-[0.25em] text-brass/80">
    <span className="h-px w-8 bg-brass/60" />
    {children}
  </div>
);

export function Btn({
  children,
  onClick,
  tone = "steel",
  className = "",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "brass" | "steel" | "ally" | "ghost";
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  const t =
    tone === "brass"
      ? "btn-brass"
      : tone === "ally"
        ? "btn-ally"
        : tone === "ghost"
          ? "btn-steel !bg-transparent !border-white/15"
          : "btn-steel";
  return (
    <button title={title} disabled={disabled} onClick={onClick} className={`btn ${t} ${className}`}>
      {children}
    </button>
  );
}

/* ================================ منو ================================ */
export function MenuPanel({
  save,
  battle,
  onPlay,
  onRandomMap,
  onLevels,
  onHelp,
  onSettings,
}: {
  save: Save;
  /** نبردِ واقعی و ناتمامی که پشتِ منو متوقف شده */
  battle?: { name: string } | null;
  onPlay: () => void;
  onRandomMap: () => void;
  onLevels: () => void;
  onHelp: () => void;
  onSettings: () => void;
}) {
  const done = save.done.filter(Boolean).length;
  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute inset-0 bg-gradient-to-l from-abyss via-abyss/75 to-abyss/5" />
      <div className="pointer-events-auto relative flex h-full w-full items-center justify-start overflow-y-auto thin-scroll p-5 sm:p-10">
        <div className="anim-rise w-full max-w-xl">
          <Kicker>سرزمین قلعه‌ها · نبرد راهبردی</Kicker>
          <h1
            className="font-display text-6xl font-black leading-[1.6] text-bone sm:text-7xl"
            style={{ textShadow: "0 3px 0 #7d5a17, 0 8px 26px rgba(0,0,0,.65)" }}
          >
            نبردِ قلعه‌ها
          </h1>
          <p className="mt-2 max-w-md text-[15px] leading-8 text-ash">
            از پل‌ها عبور کن، قلعه‌ها را فتح کن و فرمانروای جزیره‌ها شو. لشکرکشی ۳۰ مرحله‌ای یا یک میدان نبرد تازه، به انتخاب تو.
          </p>

          {/* کارتِ «نبردِ متوقف‌شده» لازم نیست: دکمهٔ «بازگشت به بازی» گوشهٔ پایینِ
              صفحه همیشه در دید است. فقط نامِ مرحله کنارِ آن دکمه نشان داده می‌شود. */}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Btn tone={battle ? "steel" : "brass"} onClick={onPlay} className="px-7 py-3.5 text-lg font-black">
              {battle ? "شروع مرحله‌ای تازه" : "شروع مرحله‌ای"}
            </Btn>
            <Btn tone="ally" onClick={onRandomMap} className="px-5 py-3.5 font-black">
              نقشهٔ رندوم
            </Btn>
          </div>
          <div className="mt-5 flex items-center gap-6 text-[13px] font-bold text-ash">
            <button onClick={onLevels} className="transition-colors hover:text-brass">
              فهرست مراحل
            </button>
            <button onClick={onHelp} className="transition-colors hover:text-brass">
              راهنما
            </button>
            <button onClick={onSettings} className="transition-colors hover:text-brass" title="تنظیمات">
              تنظیمات
            </button>
          </div>

          <a
            href="./downloads/castle-blazor-net9.zip"
            download="castle-blazor-net9.zip"
            className="mt-5 inline-flex items-center gap-2 border-b border-brass/40 pb-1 text-[13px] font-bold text-brass transition-colors hover:border-brass hover:text-bone"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
              <path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            دانلود پروژه Blazor Server (.NET 9)
          </a>

          <div className="mt-8 flex items-center gap-3 text-[11px] text-ash">
            <span className="h-px w-8 bg-brass/50" />
            <span>{fa(done)} از {fa(LEVELS.length)} مرحله فتح شده</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================ مراحل ================================ */
export function LevelsPanel({
  save,
  onPick,
  onBack,
  fromGame = false,
}: {
  save: Save;
  onPick: (i: number) => void;
  onBack: () => void;
  /** اگر از داخلِ نبرد باز شده، دکمهٔ بازگشت باید صریحاً «بازگشت به بازی» باشد */
  fromGame?: boolean;
}) {
  return (
    <Modal wide onScrim={onBack}>
      {/* سرصفحه چسبیده: با ۳۰ کارتِ مرحله، دکمهٔ بازگشت هرگز از دید خارج نمی‌شود */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-brass/20 bg-[#0c2b37]/95 px-6 py-4 backdrop-blur-sm">
        <div>
          <Kicker>لشکرکشی</Kicker>
          <h2 className="font-display text-3xl text-bone">مراحل نبرد</h2>
        </div>
        <Btn tone={fromGame ? "brass" : "ghost"} onClick={onBack} className="shrink-0 px-4 py-2 font-bold">
          {fromGame ? "بازگشت به بازی ▸" : "بازگشت ✕"}
        </Btn>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {LEVELS.map((L, i) => {
          const open = i < save.unlocked;
          const isDone = !!save.done[i];
          return (
            <button
              key={L.name}
              disabled={!open}
              onClick={() => onPick(i)}
              className={`tile plate plate-tight group p-4 text-right ${open ? "" : "opacity-45"}`}
              style={{
                borderColor: isDone ? "rgba(232,180,76,.55)" : undefined,
                boxShadow: isDone ? "inset 0 0 0 1px rgba(232,180,76,.2), 0 18px 40px -18px rgba(0,0,0,.9)" : undefined,
              }}
            >
              <div className="flex items-start justify-between">
                <span
                  className="num font-display text-5xl leading-none"
                  style={{ color: open ? "#e8b44c" : "#6d8794", textShadow: "0 3px 0 rgba(0,0,0,.4)" }}
                >
                  {open ? fa(i + 1) : "🔒"}
                </span>
                {isDone && (
                  <span className="rounded bg-brass/20 px-2 py-1 text-[11px] font-black text-brass">
                    ✔ تمام شد
                  </span>
                )}
              </div>
              <div className="mt-3 font-display text-2xl text-bone">{L.name}</div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[11px] font-bold text-ash">سختی هوش مصنوعی</span>
                <span className="flex gap-1">
                  {[0.2, 0.4, 0.6, 0.8, 1].map((v, k) => (
                    <span
                      key={k}
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: L.ai >= v ? "#ff5f57" : "rgba(255,255,255,.14)" }}
                    />
                  ))}
                </span>
              </div>
              <div className="mt-3 line-clamp-2 text-[12px] leading-6 text-ash/80">{L.hint}</div>
              <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-brass to-ally transition-all duration-500"
                  style={{ width: open ? "100%" : "0%" }}
                />
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

/* ================================ راهنما ================================ */
const BuildCard = ({ icon, title, body, tone }: { icon: string; title: string; body: string; tone: string }) => (
  <div className="plate plate-tight flex gap-3 p-3">
    <div
      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-xl"
      style={{ background: tone, boxShadow: "inset 0 1px 0 rgba(255,255,255,.35)" }}
    >
      {icon}
    </div>
    <div>
      <div className="font-display text-lg text-bone">{title}</div>
      <div className="text-[12px] leading-6 text-ash">{body}</div>
    </div>
  </div>
);

export function HelpPanel({ onBack, fromGame = false }: { onBack: () => void; fromGame?: boolean }) {
  return (
    <Modal wide onScrim={onBack}>
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-brass/20 bg-[#0c2b37]/95 px-6 py-4 backdrop-blur-sm">
        <div>
          <Kicker>دفترچهٔ فرماندهی</Kicker>
          <h2 className="font-display text-3xl text-bone">راهنمای نبرد</h2>
        </div>
        <Btn tone={fromGame ? "brass" : "ghost"} onClick={onBack} className="shrink-0 px-4 py-2 font-bold">
          {fromGame ? "بازگشت به بازی ▸" : "بازگشت ✕"}
        </Btn>
      </div>
      <div className="grid gap-6 p-6 md:grid-cols-2">
        <div>
          <h3 className="mb-3 font-display text-xl text-brass">کنترل‌ها</h3>
          <GestureDemo compact />
          <ul className="mt-4 space-y-2 text-[13px] leading-7 text-ash">
            <li>
              <b className="text-bone">نگه‌داشتن و کشیدن:</b> کلیک چپ را روی یک قلعهٔ خودی نگه دار؛ هر
              قلعهٔ سبزِ دیگری که نشانگر از رویش عبور کند، بی‌درنگ به انتخاب اضافه می‌شود — بدون نیاز به
              کادر یا محدودهٔ خاص.
            </li>
            <li>
              <b className="text-bone">رها کردن روی هدف:</b> اگر نشانگر را روی قلعهٔ دشمن/خنثی رها کنی،
              حمله انجام می‌شود. رها کردن روی قلعهٔ خودی فقط انتخاب را ثبت می‌کند و نیرویی نمی‌فرستد.
            </li>
            <li>
              <b className="text-bone">رها کردن روی زمین خالی:</b> فقط انتخاب ثبت می‌شود؛ بعد می‌توانی
              هدف را جداگانه لمس/کلیک کنی.
            </li>
            <li>
              <b className="text-bone">انتقال به هم‌تیمی:</b> چند قلعه را انتخاب کن و روی یک قلعهٔ
              هم‌رنگ دوبار کلیک کن؛ این تنها روش انتقال نیروی کمکی است و درصد تعیین‌شده از نیروی همهٔ
              قلعه‌های انتخاب‌شده به مقصد فرستاده می‌شود.
            </li>
            <li>
              <b className="text-bone">Shift:</b> افزودن به انتخاب فعلی · <b className="text-bone">A</b>
              انتخاب همه · <b className="text-bone">Space</b> توقف.
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 font-display text-xl text-brass">قلعه‌ها و برج</h3>
          <div className="space-y-3">
            <BuildCard
              icon="🏰"
              title="قلعهٔ عادی"
              body="سرباز عادی با قدرت ۱ و سرعت پیش‌فرض ۰٫۹؛ هر ۲ ثانیه یک سرباز تولید می‌کند."
              tone="linear-gradient(180deg,#3ddc84,#12855a)"
            />
            <BuildCard
              icon="🗼"
              title="برج دفاعی"
              body="زاد و ولد ندارد؛ ضریب دفاعی ۱٫۵ دارد و به مهاجمان نزدیک شلیک می‌کند."
              tone="linear-gradient(180deg,#e8b44c,#a4731f)"
            />
            <BuildCard
              icon="⚡"
              title="قلعهٔ سریع"
              body="سرباز سریع: قدرت ۱ و سرعت پیش‌فرض ۱٫۳؛ هر ۳ ثانیه یک سرباز تولید می‌کند."
              tone="linear-gradient(180deg,#7ad7ff,#1b6f9c)"
            />
            <BuildCard
              icon="🛡"
              title="قلعهٔ سنگین"
              body="سرباز سنگین: قدرت پیش‌فرض ۱٫۵ و سرعت ۰٫۷؛ هر ۳ ثانیه یک سرباز تولید می‌کند."
              tone="linear-gradient(180deg,#e0c28d,#755831)"
            />
          </div>
          <h3 className="mt-5 mb-2 font-display text-xl text-brass">قوانین</h3>
          <ul className="space-y-1.5 text-[13px] leading-7 text-ash">
            <li>• قلعه‌های تیمی از ظرفیت ۲۰ شروع می‌کنند؛ اگر ۵ ثانیه پُر بمانند، ظرفیتشان خودکار ۱۰ نفر بیشتر می‌شود تا به سقف تنظیمات برسد.</li>
            <li>• نیروها پس از انتقال یا تصرف، نوع، قدرت و سرعت خود را حفظ می‌کنند؛ تعداد نفرات با توان رزمی یکسان نیست.</li>
            <li>• قلعه‌های خاکستری هم نیرو تولید می‌کنند، اما فقط تا ۱۰ نفر؛ پس از تصرف، سقف تنظیمات برای آن‌ها اعمال می‌شود.</li>
            <li>• اگر نیروی قلعه با انتقال یا اعزام از سقف بیشتر شود، هر ۱ ثانیه ۱ سرباز کم می‌شود تا به سقف برسد.</li>
            <li>• برای تصرف، نیروی مهاجم باید از «نیروی مدافع × ضریب دفاعی» بیشتر باشد.</li>
            <li>• مسیر حمله از جاده‌ها و قلعه‌های هم‌تیمی می‌گذرد؛ قلعهٔ منزوی مسیر ندارد.</li>
            <li>• درصد اعزام (۲۵/۵۰/۷۵/۱۰۰) مشخص می‌کند از هر قلعه چقدر نیرو حرکت کند.</li>
            <li>• از تنظیمات می‌توانی درگیری نیروها در مسیر را فعال کنی یا نبرد را فقط به قلعه‌ها محدود کنی.</li>
            <li>• پل‌های سنگی همان مسیرهای حمله‌اند؛ نمای صخره‌ای و ارتفاع ساختمان‌ها فقط ظاهر نقشه را تغییر می‌دهند.</li>
          </ul>
        </div>
      </div>
    </Modal>
  );
}

/* ================================ تنظیمات ================================ */
/*
 * دورِ ۱۹ — همهٔ تنظیم‌ها با دکمهٔ + و − کار می‌کنند (هیچ اسلایدری نمانده)،
 * قلم یک پله بزرگ‌تر شده و هیچ متنی بریده/پنهان نمی‌شود. چیدمان همان شبکهٔ
 * فشردهٔ دورِ ۱۸ است تا پنل روی گوشی اسکرول نخورد.
 */

/** دکمهٔ کوچکِ +/− — نه عنصر را از DOM جدا می‌کند، نه ضربه را می‌بلعد */
function StepBtn({
  dir,
  label,
  disabled,
  onClick,
}: {
  dir: -1 | 1;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${dir > 0 ? "افزایش" : "کاهش"} ${label}`}
      className="grid h-5 w-5 shrink-0 place-items-center rounded border border-white/15 bg-white/[0.06] text-[13px] font-black leading-none text-bone transition-colors hover:bg-white/[0.18] active:bg-brass/30 disabled:opacity-30 disabled:hover:bg-white/[0.06]"
    >
      {dir > 0 ? "+" : "−"}
    </button>
  );
}

/**
 * ردیفِ تنظیم با دکمهٔ + و −.
 * `value` عددِ خام است، `display` متنِ آمادهٔ نمایش و `onDelta` یک واحد جابه‌جا می‌کند.
 */
function StepRow({
  label,
  ariaLabel,
  value,
  display,
  min,
  max,
  step,
  onChange,
  dataValue,
  compact,
}: {
  label: string;
  /** نامِ کاملِ تنظیم برای دکمه‌های + و − (متنِ روی صفحه عمداً کوتاه است) */
  ariaLabel?: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (next: number) => void;
  /** صفتِ data برای آزمون‌ها (مثلاً data-dash) */
  dataValue?: { name: string; value: number };
  compact?: boolean;
}) {
  const round = (n: number) => Math.round(n * 1000) / 1000;
  const clamp = (n: number) => round(Math.max(min, Math.min(max, n)));
  const dataProps = dataValue ? { [`data-${dataValue.name}`]: dataValue.value } : {};
  const key = ariaLabel ?? label;
  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-1 rounded border border-white/10 bg-white/[0.03] px-1 ${compact ? "py-0" : "py-[1px]"}`}
      {...dataProps}
    >
      <span className="min-w-0 flex-1 text-[11.5px] leading-[1.3] text-ash">{label}</span>
      <span className="flex shrink-0 items-center gap-[2px]">
        <StepBtn dir={-1} label={key} disabled={value <= min + 1e-9} onClick={() => onChange(clamp(value - step))} />
        <span className="min-w-[42px] text-center font-display text-[12.5px] leading-none text-bone">{display}</span>
        <StepBtn dir={1} label={key} disabled={value >= max - 1e-9} onClick={() => onChange(clamp(value + step))} />
      </span>
    </div>
  );
}

/** کارتِ تنظیمات: سرِ یک‌خطی و تنگ */
function SettingCard({ title, right, children }: { title: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-brass/20 px-2 py-[3px]">
      <div className="mb-[3px] flex items-center justify-between gap-2">
        <span className="min-w-0 text-[12.5px] leading-tight font-black text-bone">{title}</span>
        {right}
      </div>
      {children}
    </section>
  );
}

/** کلیدِ ریزِ روشن/خاموش با متنِ کامل (نه فقط آیکن) */
function MiniToggle({
  label,
  icon,
  checked,
  onChange,
  title,
  ariaLabel,
}: {
  label: string;
  icon?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  title?: string;
  /** نامِ کامل برای screen-reader و آزمون‌ها */
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      aria-label={ariaLabel ?? title ?? label}
      title={title}
      className={`flex min-w-0 items-center justify-center gap-1 rounded border px-1.5 py-[3px] text-[12px] font-bold leading-none transition-colors ${
        checked ? "border-brass/60 bg-brass/15 text-bone" : "border-white/12 bg-white/[0.04] text-ash hover:bg-white/[0.1]"
      }`}
    >
      {icon ? <span className="text-[11px] leading-none opacity-85">{icon}</span> : null}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function SettingsPanel({
  save,
  onChange,
  onReset,
  onBack,
  fromGame = false,
}: {
  save: Save;
  /** فقط فیلدهای تغییرکرده را می‌فرستد تا هیچ نسخهٔ کهنه‌ای پخش نشود */
  onChange: (patch: Partial<Save> | ((prev: Save) => Save)) => void;
  onReset: () => void;
  onBack: () => void;
  /** اگر از داخلِ نبرد باز شده، دکمهٔ پایان باید «بازگشت به بازی» باشد */
  fromGame?: boolean;
}) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferText, setTransferText] = useState("");
  const [transferMsg, setTransferMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);

  const openTransfer = () => {
    setTransferText(exportSettingsJson(save));
    setTransferMsg(null);
    setTransferOpen(true);
  };

  const handleCopySettings = async () => {
    const json = exportSettingsJson(save);
    setTransferText(json);
    const copied = await copyTextToClipboard(json);
    if (copied) {
      setTransferMsg({ ok: true, text: "کد تنظیمات در حافظه کپی شد ✓" });
    } else {
      textAreaRef.current?.focus();
      textAreaRef.current?.select();
      setTransferMsg({ ok: true, text: "متن در کادر انتخاب شد؛ با Ctrl+C یا کپی مرورگر بردارید." });
    }
  };

  const handleDownloadSettings = () => {
    const json = exportSettingsJson(save);
    setTransferText(json);
    const ok = downloadJsonFile(json, SETTINGS_FILE_NAME);
    setTransferMsg(
      ok
        ? { ok: true, text: `فایل ${SETTINGS_FILE_NAME} دانلود شد ✓` }
        : { ok: false, text: "مرورگر اجازهٔ دانلود مستقیم نداد؛ از «کپی کد تنظیمات» استفاده کنید." },
    );
  };

  const applyImportedText = (rawText: string, sourceLabel: string) => {
    const result = importSettingsJson(rawText, save);
    if (!result.ok) {
      setTransferMsg({ ok: false, text: result.error });
      return;
    }
    onChange(() => result.save);
    setTransferText(exportSettingsJson(result.save));
    setTransferMsg({ ok: true, text: `${sourceLabel} با موفقیت اعمال و ذخیره شد ✓` });
  };

  const handleFilePicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const content = await file.text();
      setTransferText(content);
      applyImportedText(content, `تنظیمات فایل «${file.name}»`);
    } catch {
      setTransferMsg({ ok: false, text: "خواندن فایل انجام نشد؛ دوباره تلاش کنید." });
    }
  };

  /** بلندیِ یک صدا (۰..۱) — هر ردیف فقط کلیدِ خودش را دست می‌زند */
  const setVol = (key: SfxKey) => (value: number) =>
    onChange((prev) => ({
      ...prev,
      volumes: { ...prev.volumes, [key]: Math.max(0, Math.min(1, Math.round(value * 100) / 100)) },
    }));

  const pct = (v: number) => `${fa(Math.round(v * 100))}٪`;

  if (transferOpen) {
    return (
      <Modal onScrim={() => setTransferOpen(false)}>
        <div className="flex items-center justify-between gap-2 border-b border-brass/20 px-2.5 py-1.5">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <h2 className="font-display text-[17px] leading-none text-bone">خروجی و ورودی تنظیمات</h2>
            <span className="shrink-0 text-[11px] text-brass/80">وب · آفلاین · Blazor</span>
          </div>
          <Btn
            tone="ghost"
            onClick={() => setTransferOpen(false)}
            className="shrink-0 px-2 py-[3px] text-[12px] font-bold"
          >
            ← تنظیمات
          </Btn>
        </div>

        <div className="space-y-2 p-2.5">
          <p className="text-[12px] leading-relaxed text-ash">
            تنظیمات فعلی (بلندی صداها، قدرت و سرعت نیروها، قوانین بازی و نقشهٔ رندوم) را کپی یا دانلود کنید تا در نسخه‌های دیگر وارد کنید، یا کد نسخهٔ دیگر را در کادر زیر جایگذاری نمایید.
          </p>

          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
            <button
              type="button"
              onClick={handleCopySettings}
              className="btn btn-steel min-h-[34px] px-2.5 py-1.5 text-[12px] font-bold !border-brass/45 text-bone"
            >
              📋 کپی کد تنظیمات
            </button>
            <button
              type="button"
              onClick={handleDownloadSettings}
              className="btn btn-steel min-h-[34px] px-2.5 py-1.5 text-[12px] font-bold"
            >
              ⬇ دانلود فایل JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn btn-steel min-h-[34px] px-2.5 py-1.5 text-[12px] font-bold"
            >
              📂 انتخاب فایل JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json,text/plain"
              onChange={handleFilePicked}
              className="hidden"
            />
          </div>

          <div className="rounded-lg border border-brass/20 bg-white/[0.02] p-2">
            <div className="mb-1.5 flex flex-wrap items-center justify-between gap-1">
              <label htmlFor="bt-settings-json" className="text-[12px] font-bold text-bone">
                کد JSON تنظیمات (قابل ویرایش و جایگذاری)
              </label>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTransferText(exportSettingsJson(save));
                    setTransferMsg(null);
                  }}
                  className="rounded border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[11.5px] text-ash transition-colors hover:bg-white/[0.1] hover:text-bone"
                >
                  تنظیمات فعلی
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTransferText("");
                    setTransferMsg(null);
                    textAreaRef.current?.focus();
                  }}
                  className="rounded border border-white/15 bg-white/[0.04] px-2 py-0.5 text-[11.5px] text-ash transition-colors hover:bg-white/[0.1] hover:text-bone"
                >
                  خالی کردن کادر
                </button>
              </span>
            </div>
            <textarea
              id="bt-settings-json"
              ref={textAreaRef}
              dir="ltr"
              rows={8}
              spellCheck={false}
              value={transferText}
              onChange={(e) => {
                setTransferText(e.target.value);
                if (transferMsg) setTransferMsg(null);
              }}
              placeholder='{ "format": "battle-time-settings", ... }'
              className="w-full resize-y rounded border border-white/15 bg-[#041116] p-2 font-mono text-[12px] leading-snug text-bone outline-none focus:border-brass"
            />
          </div>

          {transferMsg && (
            <div
              role={transferMsg.ok ? "status" : "alert"}
              className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-bold ${
                transferMsg.ok
                  ? "border-ally/45 bg-ally/12 text-ally"
                  : "border-foe/45 bg-foe/12 text-foe"
              }`}
            >
              {transferMsg.text}
            </div>
          )}

          <div className="flex items-center gap-1.5 border-t border-brass/25 pt-2">
            <button
              type="button"
              onClick={() => applyImportedText(transferText, "تنظیمات واردشده")}
              className="btn btn-brass min-h-[38px] flex-1 px-4 text-[14px] font-black"
            >
              ✓ اعمال کد واردشده
            </button>
            <Btn
              tone="ghost"
              onClick={() => setTransferOpen(false)}
              className="min-h-[38px] shrink-0 px-3 text-[12.5px] font-bold"
            >
              بازگشت
            </Btn>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onScrim={onBack}>
      {/* سرِ فشرده — یک ردیفِ کوتاه تا برای محتوا جا بماند */}
      <div className="flex items-center justify-between gap-1.5 border-b border-brass/20 px-2 py-0.5">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <h2 className="font-display text-[18px] leading-none text-bone">تنظیمات</h2>
          <span className="shrink-0 text-[11px] text-ash/70">نسخهٔ ۱۹</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={openTransfer}
            aria-label="خروجی و ورودی تنظیمات"
            title="کپی، دانلود یا وارد کردن تنظیمات بین نسخهٔ وب، آفلاین و Blazor"
            className="btn btn-steel !bg-transparent shrink-0 px-2 py-[3px] text-[11.5px] font-bold !border-brass/45 text-brass hover:!bg-brass/15"
          >
            خروجی / ورودی ⇄
          </button>
          <Btn tone="ghost" onClick={onBack} className="shrink-0 px-2 py-[3px] text-[12px] font-bold">
            بازگشت ✕
          </Btn>
        </div>
      </div>

      <div className="space-y-[3px] p-1.5">
        {/* ---- صدا و افکت‌ها: هر صدا دکمهٔ + و − خودش را دارد ---- */}
        <SettingCard
          title="صدا و افکت‌ها"
          right={
            <span className="flex shrink-0 items-center gap-1">
              <MiniToggle
                label="طبیعت"
                icon="🍃"
                checked={save.ambientSound}
                onChange={(v) => onChange({ ambientSound: v })}
                title="صدای طبیعتِ آرام‌بخش در پس‌زمینه (روشن/خاموش)"
                ariaLabel={`صدای طبیعتِ آرام‌بخش در پس‌زمینه — ${save.ambientSound ? "روشن" : "خاموش"}`}
              />
              <MiniToggle
                label="لشکر"
                icon="🦶"
                checked={save.marchSound}
                onChange={(v) => onChange({ marchSound: v })}
                title="صدای حرکت لشکر هنگام حمله (روشن/خاموش)"
                ariaLabel={`صدای حرکت لشکر هنگام حمله — ${save.marchSound ? "روشن" : "خاموش"}`}
              />
              <button
                type="button"
                onClick={() =>
                  onChange((prev) => ({
                    ...prev,
                    volumes: Object.fromEntries(SFX_KEYS.map((k) => [k, 1])) as Record<SfxKey, number>,
                  }))
                }
                className="rounded border border-white/12 px-1.5 py-[3px] text-[11.5px] leading-none text-ash transition-colors hover:bg-white/10 hover:text-bone"
                aria-label="بازنشانی همهٔ بلندی‌ها"
              >
                همه ۱۰۰٪
              </button>
              <MiniToggle label="صدا" checked={save.snd} onChange={(v) => onChange({ snd: v })} title="صدا و افکت‌ها: روشن/خاموش" />
            </span>
          }
        >
          <div className="grid grid-cols-2 gap-x-1.5 gap-y-0">
            {SFX_KEYS.map((key, index) => {
              const v = Math.max(0, Math.min(1, Number(save.volumes?.[key] ?? DEFAULT_SFX_VOLUMES[key])));
              // ردیفِ آخر (تعدادِ فرد) دو ستون را می‌گیرد تا هیچ خانهٔ خالیِ
              // بی‌دلیلی در پایینِ کارت نماند.
              const span = index === SFX_KEYS.length - 1 && SFX_KEYS.length % 2 === 1;
              return (
                <div
                  key={key}
                  className={`flex h-[20px] min-w-0 items-center justify-between gap-1 rounded bg-white/[0.03] px-1 ${span ? "col-span-2" : ""}`}
                >
                  <span className="min-w-0 flex-1 text-[11.5px] leading-[1.3] text-ash" title={SFX_FULL_NAMES[key]}>
                    {SFX_LABELS[key]}
                  </span>
                  <span className="flex shrink-0 items-center gap-[2px]">
                    <StepBtn
                      dir={-1}
                      label={`بلندی صدای ${SFX_LABELS[key]}`}
                      disabled={v <= 0.001}
                      onClick={() => setVol(key)(v - 0.1)}
                    />
                    <span
                      className={`w-[36px] text-center font-display text-[12px] leading-none ${v <= 0.001 ? "text-foe" : "text-bone"}`}
                    >
                      {v <= 0.001 ? "خاموش" : pct(v)}
                    </span>
                    <StepBtn
                      dir={1}
                      label={`بلندی صدای ${SFX_LABELS[key]}`}
                      disabled={v >= 0.999}
                      onClick={() => setVol(key)(v + 0.1)}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        </SettingCard>

        {/* ---- بازی: سرعت، محلِ درگیری و سقفِ تولید (هر کدام یک ردیف) ---- */}
        <SettingCard title="بازی">
          <div className="grid gap-[3px]">
            <div className="flex items-center justify-between gap-1 rounded border border-white/10 bg-white/[0.03] px-1 py-[1px]">
              <span className="shrink-0 text-[11.5px] text-ash">سرعت بازی</span>
              <span className="flex gap-[2px]">
                {[1, 2, 3].map((v) => (
                  <button
                    key={v}
                    onClick={() => onChange({ speed: v })}
                    aria-pressed={save.speed === v}
                    aria-label={`سرعت بازی ${fa(v)} برابر`}
                    className={`min-w-[34px] rounded px-2 py-0 font-display text-[12.5px] leading-tight transition-colors ${
                      save.speed === v ? "bg-brass text-abyss" : "border border-white/12 bg-white/[0.05] text-bone hover:bg-white/[0.12]"
                    }`}
                  >
                    {fa(v)}×
                  </button>
                ))}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1 rounded border border-white/10 bg-white/[0.03] px-1 py-[1px]">
              <span className="shrink-0 text-[11.5px] text-ash">محل درگیری</span>
              <span className="flex gap-[2px]">
                {(["field", "castle"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => onChange({ battleMode: mode })}
                    aria-pressed={save.battleMode === mode}
                    aria-label={mode === "field" ? "نبرد در همه‌جا" : "نبرد فقط در قلعه"}
                    className={`rounded px-2 py-0 text-[11.5px] font-bold leading-tight transition-colors ${
                      save.battleMode === mode ? "bg-brass text-abyss" : "border border-white/12 bg-white/[0.05] text-bone hover:bg-white/[0.12]"
                    }`}
                  >
                    {mode === "field" ? "همه‌جا" : "فقط قلعه"}
                  </button>
                ))}
              </span>
            </div>
            <div className="flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1 py-[1px]">
              <span className="shrink-0 text-[11.5px] text-ash" title="سقف تولید تمام قلعه‌ها (خودی و دشمن)">
                {[30, 40, 50, 60, 80, 100].includes(save.maxTroops) ? "سقف تولید" : `سقف تولید (${fa(save.maxTroops)})`}
              </span>
              <span className="flex flex-1 justify-end gap-[2px]">
                {[30, 40, 50, 60, 80, 100].map((cap) => (
                  <button
                    key={cap}
                    onClick={() => onChange({ maxTroops: cap })}
                    aria-pressed={save.maxTroops === cap}
                    className={`min-w-[30px] flex-1 rounded py-0 font-display text-[12px] leading-tight transition-colors ${
                      save.maxTroops === cap ? "bg-brass text-abyss" : "border border-white/12 bg-white/[0.05] text-bone hover:bg-white/[0.12]"
                    }`}
                  >
                    {fa(cap)}
                  </button>
                ))}
              </span>
            </div>
          </div>
        </SettingCard>

        {/* ---- نیروها: قدرت و سرعتِ هر نوع با + و − ---- */}
        <SettingCard
          title="نیروها — قدرت و سرعتِ هر سرباز"
          right={
            <button
              type="button"
              onClick={() =>
                onChange((prev) => ({
                  ...prev,
                  ...DEFAULT_GLOBAL_SETTINGS,
                  unlocked: prev.unlocked,
                  done: [...prev.done],
                  unitTuning: {
                    normal: { ...DEFAULT_UNIT_TUNING.normal },
                    fast: { ...DEFAULT_UNIT_TUNING.fast },
                    heavy: { ...DEFAULT_UNIT_TUNING.heavy },
                  },
                  haloSpin: DEFAULT_HALO_SPIN,
                  attackDash: DEFAULT_ATTACK_DASH,
                  volumes: { ...DEFAULT_GLOBAL_SETTINGS.volumes },
                }))
              }
              title="بازگردانی همهٔ تنظیمات به مقادیر پیش‌فرض (بدون پاک شدن مراحل)"
              aria-label="بازنشانی تنظیمات به پیش‌فرض"
              className="rounded border border-white/12 px-1.5 py-[2px] text-[11.5px] leading-none text-ash transition-colors hover:bg-white/10 hover:text-bone"
            >
              پیش‌فرض‌ها
            </button>
          }
        >
          <div className="grid gap-[3px]">
            {TROOP_TYPES.map((type) => {
              const unit = save.unitTuning[type];
              const label = type === "normal" ? "عادی" : type === "fast" ? "سریع" : "سنگین";
              const tint = type === "normal" ? "#9fd8a0" : type === "fast" ? "#7fd0f0" : "#e8b44c";
              // تابعی: چند تغییرِ پشتِ‌سرِهم هرگز روی نسخهٔ کهنه اعمال نمی‌شود
              const set = (patch: { power?: number; speed?: number }) =>
                onChange((prev) => ({
                  ...prev,
                  unitTuning: { ...prev.unitTuning, [type]: { ...prev.unitTuning[type], ...patch } },
                }));
              const clampNum = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n * 100) / 100));
              return (
                <div
                  key={type}
                  className="flex min-w-0 items-center gap-x-1.5 gap-y-0 rounded border border-white/10 bg-white/[0.03] px-1 py-[1px]"
                >
                  <span className="flex w-[46px] shrink-0 items-center gap-1 text-[12px] font-bold leading-none" style={{ color: tint }}>
                    <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: tint }} />
                    <span className="whitespace-nowrap">{label}</span>
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-1">
                    <span className="shrink-0 text-[11.5px] text-ash">قدرت</span>
                    <span className="flex items-center gap-[3px]">
                      <StepBtn
                        dir={-1}
                        label={`قدرتِ سرباز ${label}`}
                        disabled={unit.power <= UNIT_LIMITS.power[0] + 1e-9}
                        onClick={() => set({ power: clampNum(unit.power - 0.1, UNIT_LIMITS.power[0], UNIT_LIMITS.power[1]) })}
                      />
                      <span className="w-[32px] text-center font-display text-[12.5px] leading-none text-bone">
                        {fa(Math.round(unit.power * 100) / 100)}
                      </span>
                      <StepBtn
                        dir={1}
                        label={`قدرتِ سرباز ${label}`}
                        disabled={unit.power >= UNIT_LIMITS.power[1] - 1e-9}
                        onClick={() => set({ power: clampNum(unit.power + 0.1, UNIT_LIMITS.power[0], UNIT_LIMITS.power[1]) })}
                      />
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-1">
                    <span className="shrink-0 text-[11.5px] text-ash">سرعت</span>
                    <span className="flex items-center gap-[3px]">
                      <StepBtn
                        dir={-1}
                        label={`سرعتِ سرباز ${label}`}
                        disabled={unit.speed <= UNIT_LIMITS.speed[0] + 1e-9}
                        onClick={() => set({ speed: clampNum(unit.speed - 0.1, UNIT_LIMITS.speed[0], UNIT_LIMITS.speed[1]) })}
                      />
                      <span className="w-[38px] text-center font-display text-[12.5px] leading-none text-bone">
                        ×{fa(Math.round(unit.speed * 100) / 100)}
                      </span>
                      <StepBtn
                        dir={1}
                        label={`سرعتِ سرباز ${label}`}
                        disabled={unit.speed >= UNIT_LIMITS.speed[1] - 1e-9}
                        onClick={() => set({ speed: clampNum(unit.speed + 0.1, UNIT_LIMITS.speed[0], UNIT_LIMITS.speed[1]) })}
                      />
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </SettingCard>

        {/* ---- نقشه، مسیرها و نمایش: یک کارتِ دو‌ستونی ---- */}
        <SettingCard title="نقشه و نمایش">
          <div className="grid grid-cols-2 gap-[3px]">
            <div className="flex items-center rounded border border-white/10 bg-white/[0.03] px-1 py-0">
              <MiniToggle
                label="عبور از همهٔ قلعه‌ها"
                icon="🛤"
                checked={save.openRoads}
                onChange={(v) => onChange({ openRoads: v })}
                title="نیروها از کنار همهٔ قلعه‌ها عبور کنند"
              />
            </div>
            <StepRow
              label="فاصلهٔ قلعه‌ها"
              ariaLabel="حداقل فاصلهٔ دو قلعهٔ همسایه"
              value={save.minCastleDistance}
              display={`${fa(save.minCastleDistance)} م`}
              min={0}
              max={120}
              step={5}
              onChange={(v) => onChange({ minCastleDistance: v })}
            />
            <StepRow
              label="چرخش نورها"
              ariaLabel="سرعت چرخش نورها"
              value={save.haloSpin}
              display={save.haloSpin <= 0.001 ? "ثابت" : "×" + fa(Math.round(save.haloSpin * 100) / 100)}
              min={HALO_SPIN_LIMITS[0]}
              max={HALO_SPIN_LIMITS[1]}
              step={0.1}
              onChange={(v) => onChange({ haloSpin: v })}
            />
            <StepRow
              label="خط حمله"
              ariaLabel="شفافیت نقطه‌چین مسیر حمله"
              value={save.attackDash}
              display={pct(save.attackDash)}
              min={ATTACK_DASH_LIMITS[0]}
              max={ATTACK_DASH_LIMITS[1]}
              step={0.1}
              onChange={(v) => onChange({ attackDash: v })}
            />
          </div>
        </SettingCard>

        {/* نوارِ پایانِ چسبیده: روی گوشی همیشه دیده می‌شود و برای رسیدن به آن
            لازم نیست پنل را اسکرول کرد (ضربه پس از اسکرولِ لمسی گاهی اولین
            ضربه را می‌بلعد و کاربر فکر می‌کند دکمه کار نمی‌کند). */}
        <div className="sticky bottom-0 z-10 -mx-1.5 -mb-1.5 flex items-center gap-1.5 border-t border-brass/30 bg-[#071a20]/97 px-1.5 py-1 backdrop-blur-sm">
          {/* عملِ خطرناک کوچک و دور از دکمهٔ اصلی است تا اشتباهی زده نشود */}
          <Btn tone="ghost" onClick={onReset} className="shrink-0 px-2 py-1 text-[11.5px] font-bold !border-foe/40 !text-foe">
            پاک کردن پیشرفت‌ها
          </Btn>
          <button
            type="button"
            onClick={onBack}
            className="btn btn-brass min-h-[38px] flex-1 px-4 text-[15.5px] font-black"
          >
            {fromGame ? "بازگشت به بازی ▸" : "ذخیره و بازگشت"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- اجزای کوچکِ پنلِ نقشهٔ تازه (بیرون از کامپوننت تا هر رندر دوباره ساخته نشوند) ---------- */
type StepperProps = {
  label: string; icon: string; value: number; min: number; max: number;
  onDelta: (delta: number) => void; hint?: string;
};

function Stepper({ label, icon, value, min, max, onDelta, hint }: StepperProps) {
  const btn =
    "grid h-6 w-6 shrink-0 place-items-center rounded border border-white/12 bg-white/[0.05] text-[13px] leading-none text-bone transition-colors hover:bg-white/[0.16] active:bg-brass/25 disabled:opacity-30 disabled:hover:bg-white/[0.05]";
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-bold text-bone" title={hint}>
        <span className="text-[14px] leading-none opacity-80">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button type="button" onClick={() => onDelta(-1)} disabled={value <= min} className={btn} aria-label={`کاهش ${label}`}>−</button>
        <span className="min-w-7 text-center font-display text-[16px] leading-none text-brass">{fa(value)}</span>
        <button type="button" onClick={() => onDelta(1)} disabled={value >= max} className={btn} aria-label={`افزایش ${label}`}>+</button>
      </span>
    </div>
  );
}

function Toggle({ label, checked, onChange, icon }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; icon: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-[13px] font-bold transition-colors ${
        checked ? "border-brass/60 bg-brass/15 text-bone" : "border-white/10 bg-white/[0.03] text-ash hover:bg-white/[0.07]"
      }`}
    >
      <span className="flex items-center gap-1.5"><span className="opacity-80">{icon}</span>{label}</span>
      <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${checked ? "bg-brass" : "bg-white/20"}`}>
        <span className="absolute top-0.5 h-3 w-3 rounded-full bg-abyss transition-all" style={{ right: checked ? 2 : 10 }} />
      </span>
    </button>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-black tracking-wide text-brass">
        <span className="opacity-90">{icon}</span>
        <span>{title}</span>
        <span className="h-px flex-1 bg-gradient-to-l from-brass/40 to-transparent" />
      </div>
      <div className="grid gap-1.5">{children}</div>
    </div>
  );
}

/* ================================ ساخت نقشهٔ تصادفی ================================ */
export function RandomMapPanel({
  save,
  onChange,
  onGenerate,
  onBack,
}: {
  save: Save;
  onChange: (next: Partial<Save> | ((prev: Save) => Save)) => void;
  onGenerate: (settings: Save["customMap"]) => void;
  onBack: () => void;
}) {
  const settings = save.customMap;
  // به‌روزرسانیِ تابعی: چند ضربهٔ پشتِ‌سرِهم (+ + +) هرگز مقدارِ کهنه نمی‌خوانَد
  const set = (patch: Partial<Save["customMap"]> | ((prev: Save["customMap"]) => Partial<Save["customMap"]>)) =>
    onChange((prev) => ({
      ...prev,
      customMap: { ...prev.customMap, ...(typeof patch === "function" ? patch(prev.customMap) : patch) },
    }));
  const step = (key: "normal" | "fast" | "heavy" | "towers" | "lakes" | "ships" | "boats", min: number, max: number) =>
    (delta: number) =>
      set((prev) => ({ [key]: Math.max(min, Math.min(max, (Number(prev[key]) || 0) + delta)) } as Partial<Save["customMap"]>));
  const total = settings.normal + settings.fast + settings.heavy + settings.towers;
  const castles = settings.normal + settings.fast + settings.heavy;
  const playersOk = settings.players >= 2 && settings.players <= 4;
  const castlesOk = castles >= settings.players;
  const totalsOk = total > 0 && total <= 50;
  const invalid = !playersOk || !castlesOk || !totalsOk;
  const reason = !playersOk
    ? "بازیکن باید بین ۲ تا ۴ باشد."
    : !castlesOk
      ? "هر بازیکن یک قلعهٔ شروع لازم دارد؛ برج پایگاه شروع نیست."
      : !totalsOk
        ? "مجموع ساختمان‌ها باید بین ۱ تا ۵۰ باشد."
        : "";

  return (
    <Modal onScrim={onBack} wide>
      <div className="flex items-center justify-between gap-3 border-b border-brass/20 px-4 py-3 sm:px-5">
        <div>
          <Kicker>نقشهٔ تازه</Kicker>
          <h2 className="font-display text-2xl leading-tight text-bone sm:text-3xl">ساخت نقشهٔ تصادفی</h2>
        </div>
        <Btn tone="ghost" onClick={onBack} className="px-3 py-1.5 text-[13px] font-bold">
          بازگشت ✕
        </Btn>
      </div>

      <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-3">
        {/* ستون ۱ — بازیکن و اندازه */}
        <Section title="بازیکن و اندازه" icon="👥">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
            <div className="mb-1.5 text-[12px] text-ash">تعداد بازیکنان</div>
            <div className="grid grid-cols-3 gap-1">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => set({ players: n })}
                  className={`rounded px-1 py-1 text-[13px] font-black transition-colors ${
                    settings.players === n ? "bg-brass text-abyss shadow-[0_0_10px_rgba(232,180,76,.4)]" : "border border-white/12 bg-white/[0.05] text-bone hover:bg-white/[0.12]"
                  }`}
                >
                  {fa(n)}
                </button>
              ))}
            </div>
          </div>
          <Toggle label="نقشهٔ بزرگ (زوم)" icon="🔍" checked={settings.largeMap} onChange={(v) => set({ largeMap: v })} />
          <div className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
            <span className="min-w-0 truncate text-[13px] text-ash">حداقل فاصلهٔ قلعه‌ها</span>
            <span className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, minCastleDistance: Math.max(0, prev.minCastleDistance - 5) }))}
                disabled={save.minCastleDistance <= 0}
                aria-label="کاهش حداقل فاصلهٔ دو قلعهٔ همسایه"
                className="grid h-6 w-6 place-items-center rounded border border-white/15 bg-white/[0.06] text-[13px] font-black leading-none text-bone hover:bg-white/[0.16] active:bg-brass/30 disabled:opacity-30"
              >
                −
              </button>
              <span className="min-w-[56px] text-center font-display text-[14px] leading-none text-bone">{fa(save.minCastleDistance)} متر</span>
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, minCastleDistance: Math.min(120, prev.minCastleDistance + 5) }))}
                disabled={save.minCastleDistance >= 120}
                aria-label="افزایش حداقل فاصلهٔ دو قلعهٔ همسایه"
                className="grid h-6 w-6 place-items-center rounded border border-white/15 bg-white/[0.06] text-[13px] font-black leading-none text-bone hover:bg-white/[0.16] active:bg-brass/30 disabled:opacity-30"
              >
                +
              </button>
            </span>
          </div>
        </Section>

        {/* ستون ۲ — ساختمان‌ها */}
        <Section title="قلعه‌ها و برج‌ها" icon="🏰">
          <Stepper label="قلعهٔ عادی" icon="🏯" value={settings.normal} min={0} max={50} onDelta={step("normal", 0, 50)} />
          <Stepper label="قلعهٔ سریع" icon="⚡" value={settings.fast} min={0} max={50} onDelta={step("fast", 0, 50)} />
          <Stepper label="قلعهٔ سنگین" icon="🛡" value={settings.heavy} min={0} max={50} onDelta={step("heavy", 0, 50)} />
          <Stepper label="برج دفاعی" icon="🏹" value={settings.towers} min={0} max={50} onDelta={step("towers", 0, 50)} hint="برج‌ها در میانهٔ نقشه‌اند و از خودشان دفاع می‌کنند" />
          <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-2.5 py-1.5 text-[12px]">
            <span className="text-ash">مجموع</span>
            <span className={`font-display text-[14px] ${totalsOk ? "text-bone" : "text-foe"}`}>{fa(total)} از ۵۰</span>
          </div>
        </Section>

        {/* ستون ۳ — طبیعت */}
        <Section title="طبیعت و آب" icon="⛰">
          <Stepper label="خلیج در ساحل" icon="🌊" value={settings.lakes} min={0} max={MAX_LAKES} onDelta={step("lakes", 0, MAX_LAKES)} hint="بریدگیِ آب در ساحلِ جزیره‌ها" />
          <Stepper label="کشتی در دریا" icon="⛵" value={settings.ships} min={0} max={MAX_SHIPS} onDelta={step("ships", 0, MAX_SHIPS)} hint="بخشی از کشتی‌ها آرام روی آب حرکت می‌کنند" />
          <Stepper label="قایق در دریا" icon="🛶" value={settings.boats} min={0} max={MAX_BOATS} onDelta={step("boats", 0, MAX_BOATS)} hint="قایق‌های پارویی در آبِ آزاد، دور از ساحل و پل" />
          <div className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[12px] leading-relaxed text-ash">
            نقشه هیچ کوهی ندارد؛ فقط جزیره، خلیج و آبِ آزاد. کشتی و قایق هم فقط روی آبِ آزاد می‌نشینند و نبرد را دست نمی‌زنند.
          </div>
        </Section>
      </div>

      {invalid && <p role="alert" className="px-4 pb-1 text-[12px] font-bold text-foe sm:px-5">{reason}</p>}

      <div className="flex items-center justify-between gap-3 border-t border-brass/20 px-4 py-3 sm:px-5">
        <span className="text-[12px] text-ash">
          {fa(settings.players)} بازیکن · {fa(total)} ساختمان · {fa(settings.lakes)} خلیج · {fa(settings.ships)} کشتی · {fa(settings.boats)} قایق
        </span>
        <Btn tone="brass" onClick={() => onGenerate(settings)} disabled={invalid} className="px-6 py-2 font-black">
          ساخت نقشه
        </Btn>
      </div>
    </Modal>
  );
}

/* ================================ توقف / پایان ================================ */
export function PausePanel({
  onResume,
  onRestart,
  onNewRandomMap,
  onLevels,
  onSettings,
  onMenu,
  name,
  onRotate,
  rotation,
  snd,
  onSnd,
}: {
  onResume: () => void;
  onRestart: () => void;
  onNewRandomMap: () => void;
  onLevels: () => void;
  onSettings: () => void;
  onMenu: () => void;
  name: string;
  onRotate: () => void;
  rotation: Rotation;
  /** صدا — از نوارِ بالا برداشته شد تا نوار فقط یک دکمه داشته باشد */
  snd: boolean;
  onSnd: () => void;
}) {
  return (
    <Modal onScrim={onResume}>
      <div className="px-6 pb-0 pt-6 text-center">
        <Kicker>
          <span className="mx-auto">میدان نبرد متوقف شد</span>
        </Kicker>
        <h2 className="font-display text-5xl text-bone">توقف</h2>
        <div className="mt-1 text-sm text-ash">{name}</div>
      </div>
      <div className="grid gap-2.5 px-6 py-4">
        <Btn tone="ally" onClick={onNewRandomMap} className="w-full py-3 font-black">
          🎲 ساخت نقشهٔ رندوم جدید
        </Btn>
        <div className="grid grid-cols-2 gap-2.5">
          <Btn tone="steel" onClick={onRestart} className="py-3 font-bold">
            شروع دوباره
          </Btn>
          <Btn tone="steel" onClick={onLevels} className="py-3 font-bold">
            مراحل
          </Btn>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Btn tone="ghost" onClick={onSettings} className="py-2.5 font-bold">
            تنظیمات
          </Btn>
          <Btn tone="ghost" onClick={onMenu} className="py-2.5 font-bold">
            منوی اصلی
          </Btn>
        </div>
        <button
          type="button"
          onClick={onSnd}
          aria-pressed={snd}
          aria-label="صدا"
          title={snd ? "صدا روشن است — برای خاموش کردن بزن" : "صدا خاموش است — برای روشن کردن بزن"}
          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[12px] font-bold transition-colors ${
            snd ? "border-ally/55 bg-ally/12 text-bone" : "border-white/12 bg-white/[0.03] text-ash hover:bg-white/[0.07]"
          }`}
        >
          <span className="flex items-center gap-2">
            {/* آیکنِ خطی (نه اموجی) تا شکلش همیشه با وضعیتِ روشن/خاموش بخواند */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M4 9v6h3.5L13 19V5L7.5 9H4z" strokeLinecap="round" strokeLinejoin="round" />
              {snd ? (
                <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" strokeLinecap="round" />
              ) : (
                <path d="M16.5 9.5l5 5m0-5l-5 5" strokeLinecap="round" />
              )}
            </svg>
            <span>صدا {snd ? "روشن" : "خاموش"}</span>
          </span>
          <span className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${snd ? "bg-ally" : "bg-white/20"}`}>
            <span className="absolute top-0.5 h-3 w-3 rounded-full bg-abyss transition-all" style={{ right: snd ? 2 : 10 }} />
          </span>
        </button>
        <div className="mx-auto w-full max-w-xs">
          <RotateRow rotation={rotation} onRotate={onRotate} />
        </div>
      </div>
      {/* نوارِ چسبیدهٔ پایین: «ادامه» همیشه در دید است، هرچقدر پنل بلند شود */}
      <div className="sticky bottom-0 border-t border-brass/25 bg-[#0b2530]/95 p-3 backdrop-blur-sm">
        <Btn tone="brass" onClick={onResume} className="min-h-[52px] w-full py-3.5 text-lg font-black">
          ▶ ادامهٔ نبرد
        </Btn>
      </div>
    </Modal>
  );
}

export function EndPanel({
  win,
  index,
  custom = false,
  pCount,
  eCount,
  pCastles,
  onNext,
  onRestart,
  onNewRandomMap,
  onLevels,
}: {
  win: boolean;
  index: number;
  custom?: boolean;
  pCount: number;
  eCount: number;
  pCastles: number;
  onNext: () => void;
  onRestart: () => void;
  onNewRandomMap: () => void;
  onLevels: () => void;
}) {
  const last = custom || index >= LEVELS.length - 1;
  return (
    <Modal onScrim={win && !last ? onNext : onRestart}>
      <div className="relative overflow-hidden p-8 text-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background: win
              ? "radial-gradient(70% 60% at 50% 0%, rgba(232,180,76,.35), transparent 70%)"
              : "radial-gradient(70% 60% at 50% 0%, rgba(255,95,87,.3), transparent 70%)",
          }}
        />
        <div className="relative">
          <div className="font-display text-7xl" style={{ color: win ? "#e8b44c" : "#ff5f57" }}>
            {win ? "پیروزی!" : "شکست"}
          </div>
          <div className="mt-1 text-sm text-ash">
            {win
              ? custom
                ? "نقشهٔ رندوم را تمام کردی."
                : last
                  ? "تبریک! همهٔ مراحل لشکرکشی را تمام کردی."
                  : "مرحلهٔ بعد باز شد — آماده‌ای؟"
              : "پایگاه‌هایت را از دست دادی. دوباره امتحان کن."}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { k: "قلعه‌های تو", v: fa(pCastles), c: "#3ddc84" },
              { k: "نیروی تو", v: fa(pCount), c: "#9ff5c4" },
              { k: "نیروی دشمن", v: fa(eCount), c: "#ff8a80" },
            ].map((s) => (
              <div key={s.k} className="plate plate-tight p-3">
                <div className="text-[10px] font-bold tracking-wide text-ash">{s.k}</div>
                <div className="font-display text-2xl" style={{ color: s.c }}>
                  {s.v}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-2.5">
            {win && !last && (
              <Btn tone="brass" onClick={onNext} className="py-3.5 text-lg font-black pulse-ring">
                مرحلهٔ بعد ←
              </Btn>
            )}
            <Btn tone="ally" onClick={onNewRandomMap} className="py-3 font-black">
              🎲 ساخت نقشهٔ رندوم جدید
            </Btn>
            <Btn tone={win && !last ? "steel" : "brass"} onClick={onRestart} className="py-3 font-bold">
              {win ? "بازی دوبارهٔ همین نقشه" : "تلاش دوباره"}
            </Btn>
            <Btn tone="ghost" onClick={onLevels} className="py-2.5 font-bold">
              فهرست مراحل
            </Btn>
          </div>
        </div>
      </div>
    </Modal>
  );
}
