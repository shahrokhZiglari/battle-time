import type { Rotation } from "../game/view";
import { fa } from "../game/config";

/**
 * کنترلِ چرخشِ ۹۰درجه‌ایِ نمایش — برای بازی با گوشی.
 *
 * دو شکل دارد:
 *   • RotateFab: دکمهٔ شناورِ درشت روی صفحهٔ بازی/منو. داخلِ خودِ کادرِ چرخیده
 *     قرار می‌گیرد تا با بازی بچرخد: وقتی کاربر گوشی را افقی می‌گیرد، نوشتهٔ
 *     دکمه هم صاف و خوانا می‌مانَد (اگر بیرونِ کادر بود، کج دیده می‌شد).
 *   • RotateRow: ردیفِ داخلِ پنلِ توقف، چون دکمهٔ شناور زیرِ پنل‌ها پنهان می‌شود.
 *
 * نکتهٔ گوشی‌های واقعی: با viewport-fit=cover محتوا تا زیرِ نوارِ خانه و لبهٔ
 * گردِ صفحه می‌رود؛ پس فاصلهٔ دکمه از لبه با env(safe-area-inset-*) زیاد می‌شود
 * تا روی iPhone/اندرویدِ بدونِ حاشیه هم کامل دیده و لمس شود.
 */

const stateLabel = (r: Rotation) => (r === 0 ? "بدون چرخش" : `${fa(r * 90)} درجه`);

const SAFE_LEFT = "calc(10px + env(safe-area-inset-left, 0px))";
const SAFE_BOTTOM = "calc(10px + env(safe-area-inset-bottom, 0px))";
/** بالای دکمه (ارتفاعِ دکمهٔ کوچک + فاصله) برای حبابِ راهنما */
const HINT_BOTTOM = "calc(62px + env(safe-area-inset-bottom, 0px))";

export function RotateFab({
  rotation,
  onRotate,
  hint,
}: {
  rotation: Rotation;
  onRotate: () => void;
  /** راهنمای یک‌بارهٔ گوشی: «برای بازی افقی این را بزنید» */
  hint?: boolean;
}) {
  return (
    <>
      {hint && (
        <div
          className="anim-rise pointer-events-none absolute z-40 max-w-[62vw]"
          style={{ left: SAFE_LEFT, bottom: HINT_BOTTOM }}
          aria-hidden
        >
          <div
            className="rounded-xl border border-brass/60 px-3 py-2 text-[11px] font-bold leading-relaxed text-bone shadow-[0_6px_18px_rgba(0,0,0,.55)]"
            style={{ background: "rgba(6,22,28,.94)" }}
          >
            برای دیدِ افقی، این دکمه را بزنید
            <span className="ms-1 text-brass">↙</span>
          </div>
        </div>
      )}

      {/* دکمهٔ کوچکِ فقط-آیکن: علامتِ چرخش کافی است و جای کمتری از نقشه می‌گیرد */}
      <button
        type="button"
        onClick={onRotate}
        aria-label="چرخش بازی"
        title={`چرخش ۹۰ درجه — الان ${stateLabel(rotation)}`}
        className="absolute z-40 grid h-11 w-11 place-items-center rounded-xl border-2 border-brass/70 bg-abyss/95 text-[21px] leading-none text-brass shadow-[0_6px_20px_rgba(0,0,0,.6)] backdrop-blur-sm transition-all hover:border-brass hover:bg-abyss active:scale-95"
        style={{ left: SAFE_LEFT, bottom: SAFE_BOTTOM, touchAction: "manipulation" }}
        data-testid="rotate-fab"
      >
        <span
          aria-hidden
          className="block transition-transform duration-300"
          style={{ transform: `rotate(${rotation * 90}deg)` }}
        >
          ⟳
        </span>
      </button>
    </>
  );
}

export function RotateRow({ rotation, onRotate }: { rotation: Rotation; onRotate: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-brass/20 bg-white/[0.03] px-3 py-2 text-start">
      <div className="min-w-0">
        <div className="text-[12px] font-bold text-bone">چرخشِ صفحه برای گوشی</div>
        <div className="text-[10px] leading-tight text-ash">
          الان {stateLabel(rotation)} — یک ضربه: ۹۰ درجه، ضربهٔ بعد: عادی
        </div>
      </div>
      <button
        type="button"
        onClick={onRotate}
        aria-label="چرخش صفحه"
        className="flex shrink-0 items-center gap-2 rounded-lg border border-brass/50 bg-brass/15 px-3 py-2 font-display text-[12px] font-black text-bone transition-all active:scale-95"
        style={{ touchAction: "manipulation" }}
      >
        <span
          aria-hidden
          className="text-[16px] leading-none text-brass transition-transform duration-300"
          style={{ transform: `rotate(${rotation * 90}deg)` }}
        >
          ⟳
        </span>
        ۹۰°
      </button>
    </div>
  );
}
