"use client";

// transitions.dev "Number pop-in": remounting the group on value change replays
// the digit animation; the last two characters trail via data-stagger.
export function AnimatedNumber({ value, className, tabular }: { value: string; className?: string; tabular?: boolean }) {
  const chars = value.split("");
  return (
    <span key={value} className={`t-digit-group is-animating ${tabular ? "tabular-nums" : ""} ${className ?? ""}`} aria-label={value}>
      {chars.map((ch, i) => (
        <span
          key={i}
          aria-hidden
          className="t-digit"
          data-stagger={i === chars.length - 2 ? "1" : i === chars.length - 1 ? "2" : undefined}
        >
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}
