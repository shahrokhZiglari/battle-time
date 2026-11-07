import { useEffect, useRef } from "react";
import { fa } from "../game/config";

export interface HudData {
  num: number;
  name: string;
  custom: boolean;
  largeMap: boolean;
  zoom: number;
  factions: { id: number; name: string; troops: number; power: number; castles: number; color: string }[];
  /** castles currently selected by the player */
  selCount: number;
  /** troops ready to dispatch from the selected castles */
  selTroops: number;
  pct: number;
  time: number;
}

/** ارتفاع نوارِ بالا؛ نقشه در همین فاصله از بالای صفحه جا می‌گیرد. */
export const HUD_BAR_HEIGHT = 40;

const iconBtn =
  "grid h-7 w-7 shrink-0 place-items-center rounded-md border border-white/12 bg-white/[0.06] text-[13px] leading-none text-bone transition-colors hover:bg-white/[0.14] active:scale-95 sm:h-7 sm:w-7 sm:text-[13px]";
const minBtn =
  "grid h-5 w-5 shrink-0 place-items-center rounded border border-white/12 bg-white/[0.06] text-[12px] leading-none text-bone transition-colors hover:bg-white/[0.14] disabled:opacity-40 sm:h-6 sm:w-6 sm:text-[13px]";

/**
 * نوارِ بالای نقشه — همهٔ اطلاعات و فرمان‌ها در یک کادرِ باریکِ تک‌ردیفه،
 * تا کمترین جای نقشه را بگیرد.
 */
export default function Hud({
  d,
  onPct,
  onPause,
  onZoom,
  onHeight,
}: {
  d: HudData;
  onPct: (p: number) => void;
  onPause: () => void;
  onZoom: (delta: number) => void;
  /** ارتفاعِ واقعیِ نوار (برای کنار گذاشتنِ همین فضا از نقشه) */
  onHeight?: (h: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !onHeight) return;
    const report = () => onHeight(el.getBoundingClientRect().height);
    report();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", report);
      return () => window.removeEventListener("resize", report);
    }
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onHeight]);

  // فوکوس بعد از کلیک روی دکمه‌های نوار نماند؛ وگرنه Space/کلیدهای میان‌بر به دکمه می‌روند
  const blur = (e: { currentTarget: EventTarget & Element }) => {
    const el = e.currentTarget as HTMLElement;
    if (el && typeof el.blur === "function") el.blur();
  };

  const totalPower = Math.max(1, d.factions.reduce((sum, faction) => sum + faction.power, 0));
  const mm = Math.floor(d.time / 60);
  const ss = Math.floor(d.time % 60);
  const title = d.custom ? d.name : "مرحلهٔ " + fa(d.num) + " · " + d.name;

  return (
    <div onMouseDown={blur} onTouchEnd={blur}>
      {/* کادرِ یکتای بالا — slim, single row, no wrapping */}
      <div ref={wrapRef} className="pointer-events-none absolute inset-x-0 top-0 z-20 px-1.5 pt-1.5 sm:px-2 sm:pt-2">
        <div
          className="pointer-events-auto hud-bar flex h-8 w-full items-center gap-1 overflow-x-auto overflow-y-hidden rounded-lg border border-brass/25 px-1.5 sm:h-9 sm:gap-1.5 sm:px-2"
          style={{
            background: "linear-gradient(180deg, rgba(10,32,38,.94), rgba(6,22,28,.9))",
            boxShadow: "0 4px 14px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.06)",
            scrollbarWidth: "none",
          }}
        >
          {/* عنوانِ مرحله */}
          <span
            className="hidden min-w-0 shrink items-center gap-1 whitespace-nowrap text-[11px] font-bold text-bone sm:flex sm:text-[12px]"
            title={title}
            style={{ maxWidth: 190 }}
          >
            <span className="truncate">{title}</span>
          </span>

          <span className="h-4 w-px shrink-0 bg-white/15" />

          {/* انتخاب */}
          <span id="castle-selection" className="flex shrink-0 items-center gap-1 whitespace-nowrap text-[10px] sm:text-[11px]" title="قلعه‌های انتخاب‌شده و نیروی آمادهٔ اعزام">
            <span className="text-ash">انتخاب</span>
            <span className="font-display text-[13px] leading-none text-ally">{fa(d.selCount)}</span>
            <span className="text-[13px] leading-none text-brass">{fa(d.selTroops)}</span>
            <span className="hidden text-ash sm:inline">نفر</span>
          </span>

          <span className="h-4 w-px shrink-0 bg-white/15" />

          {/* توان رزمی — نوارِ توازن با عرض ۲ برابر */}
          <span
            className="flex shrink-0 items-center gap-1.5"
            title={d.factions.map((f) => `${f.name}: ${fa(f.troops)} نفر`).join(" · ")}
            aria-label="توان رزمی بازیکنان"
          >
            <span className="hidden text-[10px] text-ash md:inline">توازن</span>
            <span className="flex h-2.5 w-24 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10 sm:w-48 md:w-56" dir="ltr">
              {d.factions.map((f) => (
                <span
                  key={f.id}
                  className="h-full transition-all duration-500"
                  style={{ width: `${(f.power / totalPower) * 100}%`, backgroundColor: f.color }}
                />
              ))}
            </span>
          </span>

          <span className="hidden h-4 w-px shrink-0 bg-white/15 sm:block" />

          {/* زمان */}
          <span className="hidden shrink-0 whitespace-nowrap font-display text-[12px] leading-none text-ash sm:inline" title="زمان بازی">
            {fa(mm)}:{fa(ss).padStart(2, "۰")}
          </span>

          <span className="min-w-1 flex-1" />

          {/* زوم */}
          {d.largeMap && (
            <span className="flex shrink-0 items-center gap-0.5">
              <button onClick={() => onZoom(-0.15)} disabled={d.zoom <= 1} className={minBtn} title="کوچک‌نمایی" aria-label="کوچک‌نمایی">−</button>
              <button
                onClick={() => onZoom(0)}
                className="hidden min-w-9 shrink-0 rounded border border-white/12 bg-white/[0.06] px-1 text-[10px] font-bold leading-6 text-bone hover:bg-white/[0.14] sm:block"
                title="بازنشانی زوم"
              >
                {fa(Math.round(d.zoom * 100))}٪
              </button>
              <button onClick={() => onZoom(0.15)} disabled={d.zoom >= 3} className={minBtn} title="بزرگ‌نمایی" aria-label="بزرگ‌نمایی">+</button>
              <span className="mx-0.5 h-4 w-px shrink-0 bg-white/15" />
            </span>
          )}

          {/* درصدِ اعزام */}
          <span className="flex shrink-0 items-center gap-0.5" title="درصد نیروی اعزامی">
            {[20, 60, 80].map((p) => (
              <button
                key={p}
                onClick={() => onPct(p)}
                className={`h-6 shrink-0 rounded px-1 text-[11px] font-black leading-6 transition-colors sm:px-1.5 ${
                  d.pct === p
                    ? "bg-brass text-abyss shadow-[0_0_10px_rgba(232,180,76,.45)]"
                    : "border border-white/12 bg-white/[0.06] text-bone hover:bg-white/[0.14]"
                }`}
              >
                {fa(p)}٪
              </button>
            ))}
          </span>

          <span className="mx-0.5 h-4 w-px shrink-0 bg-white/15" />

          {/* تنها دکمهٔ نوار: توقف.
              صدا و چرخش هم از پنلِ توقف در دسترس‌اند تا نوار روی گوشی و دسکتاپ
              فقط یک دکمه داشته باشد؛ پنل هم همیشه «ادامهٔ نبرد» را پایینِ خود دارد. */}
          <span className="flex shrink-0 items-center">
            <button
              onClick={onPause}
              className={`${iconBtn} !border-brass/45 !bg-brass/15 !text-brass hover:!bg-brass/25`}
              title="توقف (Space) — ادامهٔ نبرد از همین پنل"
              aria-label="توقف"
            >
              ⏸
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
