import type { CSSProperties } from "react";

/**
 * چرخشِ نمایشِ بازی — برای وقتی که با گوشی کار می‌کنیم و می‌خواهیم صفحه
 * عمودی/افقیِ برخلافِ جهتِ دستگاه دیده شود.
 *
 * کلِ صحنه (بوم + نوارِ بالا + پنل‌ها) با CSS می‌چرخد، ولی مختصاتِ لمس و
 * ماوس همیشه در فضای خودِ صحنه لازم است؛ پس اینجا هم تبدیلِ معکوس را
 * داریم تا لمس دقیقاً روی همان قلعه‌ای بنشیند که کاربر می‌بیند.
 */

/**
 * چرخشِ نمایش فقط دو حالت دارد: ۰ = عادی، ۱ = ۹۰ درجه.
 *
 * ۱۸۰ و ۲۷۰ درجه حذف شدند: روی گوشی بازی وارونه می‌شد و هیچ کاربردی نداشت.
 * نوع همچنان ۰..۳ را می‌پذیرد تا داده‌های قدیمیِ ذخیره‌شده بی‌خطر خوانده شوند،
 * ولی stepRotation هرگز از این دو حالت بیرون نمی‌رود.
 */
export type Rotation = 0 | 1 | 2 | 3;

const KEY = "bt_view_v1";

export function loadRotation(): Rotation {
  try {
    const raw = Number(localStorage.getItem(KEY));
    // فقط دو حالت مجاز است؛ مقدارِ قدیمیِ ۲ یا ۳ (۱۸۰/۲۷۰) به حالتِ عادی برمی‌گردد
    if (raw === 1) return 1;
  } catch {
    /* ignore */
  }
  return 0;
}

export function saveRotation(r: Rotation) {
  try {
    localStorage.setItem(KEY, String(r));
  } catch {
    /* ignore */
  }
}

/**
 * یک ضربه: بین «عادی» و «۹۰ درجه» جابه‌جا می‌شود (رفت‌وبرگشتِ دو حالته).
 * هر مقدارِ نامعتبر (مثلاً ۲ از حافظهٔ قدیمی) به ۰ برمی‌گردد.
 */
export const stepRotation = (r: Rotation): Rotation => (r === 0 ? 1 : 0);

/** اندازهٔ کادرِ صحنه پیش از چرخش (۹۰/۲۷۰ عرض و ارتفاع را جابجا می‌کنند) */
export function stageSize(r: Rotation, vw: number, vh: number) {
  const swapped = r % 2 === 1;
  return { w: swapped ? vh : vw, h: swapped ? vw : vh };
}

/** استایلِ کادرِ چرخیده، وسط‌چین روی صفحه */
export function stageStyle(r: Rotation, vw: number, vh: number): CSSProperties {
  const { w, h } = stageSize(r, vw, vh);
  // چرخش حولِ مرکزِ خودِ کادر؛ برای اینکه کادرِ چرخیده دقیقاً وسطِ صفحه بیفتد
  // افستِ چپ/بالا را دستی حساب می‌کنیم (ترکیبِ translate درصدی با rotate اشتباه جابه‌جا می‌کند).
  return {
    position: "absolute",
    // right/bottom باید صریحاً auto باشند، وگرنه inset:0 کلاسِ .app-bg در حالتِ RTL
    // بر left غلبه می‌کند و کادر به لبهٔ راست می‌چسبد.
    right: "auto",
    bottom: "auto",
    left: Math.round((vw - w) / 2),
    top: Math.round((vh - h) / 2),
    width: w,
    height: h,
    transform: r === 0 ? undefined : `rotate(${r * 90}deg)`,
    transformOrigin: "50% 50%",
  };
}

/**
 * تبدیلِ نقطهٔ صفحه (clientX/clientY) به مختصاتِ داخلیِ صحنه.
 * rect همان getBoundingClientRect خودِ کادرِ چرخیده است.
 */
export function toStagePoint(cx: number, cy: number, r: Rotation, rect: DOMRect) {
  if (r === 0) return { x: cx - rect.left, y: cy - rect.top };
  const w = r % 2 === 1 ? rect.height : rect.width;
  const h = r % 2 === 1 ? rect.width : rect.height;
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const dx = cx - centerX;
  const dy = cy - centerY;
  const a = (r * Math.PI) / 2;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  // چرخشِ معکوس، سپس جابه‌جایی به مبدأِ صحنه
  return { x: dx * cos + dy * sin + w / 2, y: -dx * sin + dy * cos + h / 2 };
}
