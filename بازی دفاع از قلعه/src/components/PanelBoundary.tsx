import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * سپرِ خطا برای پنل‌ها.
 *
 * اگر رندرِ پنلی (تنظیمات/مراحل/راهنما/نقشهٔ رندوم) به هر دلیلی خطا بدهد،
 * React کلِ درخت را پایین می‌آورد و کاربر با صفحهٔ مرده روبه‌رو می‌شود —
 * دقیقاً همان حالتی که «هیچ دکمه‌ای کار نمی‌کند». اینجا به‌جای آن، یک کارتِ
 * کوچکِ بازیابی نشان می‌دهیم که با یک دکمه به نبرد برمی‌گردد.
 *
 * (خطاهای داخلِ event handler را React اصلاً بالا نمی‌برد و درخت را خراب
 * نمی‌کنند؛ این سپر برای خطاهای رندر/اثر است.)
 */
export class PanelBoundary extends Component<
  { children: ReactNode; onRecover: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // پیام در کنسول می‌مانَد تا اگر باز هم چیزی خراب شد، ردیفش پیدا شود
    console.error("panel-crash:", error?.message, info?.componentStack);
  }

  recover = () => {
    this.setState({ failed: false });
    this.props.onRecover();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center p-4" role="alertdialog">
        <div className="plate w-full max-w-sm p-6 text-center">
          <div className="font-display text-xl text-bone">این پنل باز نشد</div>
          <p className="mt-2 text-[12px] leading-relaxed text-ash">
            نبردِ تو از بین نرفته است. با دکمهٔ زیر به همان‌جا برگرد.
          </p>
          <button
            type="button"
            onClick={this.recover}
            className="btn btn-brass mt-4 min-h-[46px] w-full px-4 text-[15px] font-black"
          >
            بازگشت به بازی ▸
          </button>
        </div>
      </div>
    );
  }
}
