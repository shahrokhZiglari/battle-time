interface CastleSpec {
  x: number;
  y: number;
  tone: "ally" | "foe";
  n: string;
  big?: boolean;
  glowClass?: string;
}

const Castle = ({ x, y, tone, n, big, glowClass }: CastleSpec) => {
  const sz = big ? 40 : 32;
  return (
    <div className="absolute" style={{ left: x, top: y, width: sz, height: sz }}>
      {glowClass && (
        <span
          className={`absolute rounded-full ${glowClass}`}
          style={{ inset: -10, background: "radial-gradient(circle,rgba(61,220,132,.55),transparent 70%)" }}
        />
      )}
      <div
        className="absolute inset-x-0 bottom-0 rounded-[3px] border"
        style={{
          height: sz * 0.62,
          background:
            tone === "ally"
              ? "linear-gradient(180deg,#54e79a,#12855a)"
              : "linear-gradient(180deg,#ff8a80,#a52a24)",
          borderColor: tone === "ally" ? "#9ff5c4" : "#ffc0bb",
        }}
      />
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: 0,
          width: 0,
          height: 0,
          borderLeft: `${sz * 0.58}px solid transparent`,
          borderRight: `${sz * 0.58}px solid transparent`,
          borderBottom: `${sz * 0.42}px solid ${tone === "ally" ? "#0d6b48" : "#7d1f1a"}`,
        }}
      />
      <span
        className="absolute left-1/2 -translate-x-1/2 rounded-full px-1 text-[9px] font-black leading-tight text-white"
        style={{ bottom: -9, background: tone === "ally" ? "#0d6b48" : "#7d1f1a" }}
      >
        {n}
      </span>
    </div>
  );
};

/**
 * نمودار زندهٔ شیوهٔ جدید انتخاب: نشانگر را نگه‌دار و روی قلعه‌های خودی رد شو
 * تا انتخاب شوند، سپس روی قلعهٔ هدف رها کن تا حمله انجام شود.
 */
export default function GestureDemo({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border border-brass/25"
      style={{
        width: 288,
        height: compact ? 128 : 150,
        background: "radial-gradient(120% 100% at 20% 0%, #1d5c4a 0%, #123c34 45%, #0a2530 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.12), inset 0 -20px 30px rgba(0,0,0,.4)",
      }}
    >
      {/* map grid */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* رد نورانی عبور نشانگر از روی قلعه‌ها */}
      <svg className="absolute inset-0" width="288" height="150" viewBox="0 0 288 150">
        <path
          d="M46 92 C 70 98, 86 112, 104 112 S 132 76, 148 64 S 196 36, 228 48"
          stroke="rgba(255,255,255,.18)"
          strokeWidth="18"
          fill="none"
          strokeLinecap="round"
        />
        <path
          className="trail-demo"
          pathLength={1}
          d="M46 92 C 70 98, 86 112, 104 112 S 132 76, 148 64 S 196 36, 228 48"
          stroke="#e8b44c"
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
      </svg>

      <Castle x={30} y={76} tone="ally" n="۲۵" glowClass="glow-demo-1" />
      <Castle x={92} y={96} tone="ally" n="۱۸" glowClass="glow-demo-2" />
      <Castle x={136} y={46} tone="ally" n="۳۰" glowClass="glow-demo-3" />
      <Castle x={212} y={28} tone="foe" n="۱۲" big />

      {/* ping ثابت روی هدف برای نشان‌دادن قابل‌حمله بودن */}
      <div
        className="anim-ping-target absolute rounded-full border-2 border-foe"
        style={{ left: 204, top: 20, width: 56, height: 56 }}
      />
      {/* جرقهٔ برخورد لحظهٔ رها کردن */}
      <div className="impact-demo absolute rounded-full" style={{ left: 196, top: 12, width: 72, height: 72 }} />

      {/* نشانگر در حال کشیدن */}
      <div className="cursor-demo2 absolute" style={{ left: 30, top: 80 }}>
        <svg width="22" height="26" viewBox="0 0 22 26">
          <path
            d="M3 1 L3 19 L8 14.5 L11.5 23 L15 21.5 L11.5 13.5 L18 13 Z"
            fill="#fff"
            stroke="#0a2530"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <div className="absolute bottom-1.5 right-2.5 left-2.5 flex items-center justify-between gap-2">
        <span className="rounded bg-abyss/70 px-1.5 py-0.5 text-[10px] font-bold text-brass">نگه‌دار و از روی قلعه‌ها رد شو</span>
        <span className="rounded bg-abyss/70 px-1.5 py-0.5 text-[10px] font-bold text-foe">روی هدف رها کن</span>
      </div>
    </div>
  );
}
