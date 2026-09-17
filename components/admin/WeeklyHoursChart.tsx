"use client";

import { useState } from "react";

import { formatDate, formatHours } from "@/lib/format";

import type { Week } from "@/lib/charts";

const SERIES = [
  { key: "billable", label: "Billable", color: "var(--color-chart-1)" },
  { key: "nonBillable", label: "No charge", color: "var(--color-chart-2)" },
] as const;

function niceMax(maxHours: number) {
  if (maxHours <= 0) return 10;
  const step = maxHours <= 10 ? 2 : maxHours <= 25 ? 5 : 10;
  return Math.ceil(maxHours / step) * step;
}

/**
 * Stacked columns per week (dataviz spec: ≤24px columns, 4px rounded data-end,
 * 2px surface gap between segments, hairline grid, per-column hover/focus tooltip,
 * legend for 2 series, and an equivalent table for screen readers).
 */
export function WeeklyHoursChart({ weeks }: { weeks: Week[] }) {
  const [active, setActive] = useState<number | null>(null);
  const maxHours = niceMax(Math.max(0, ...weeks.map((w) => (w.billable + w.nonBillable) / 3600)));
  const ticks = [0, maxHours / 2, maxHours];
  const height = 180;

  return (
    <figure className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-white/60" aria-hidden>
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-[3px]" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="relative flex gap-3">
        {/* Y axis ticks */}
        <div className="relative w-8 shrink-0 text-right text-[11px] tabular-nums text-white/35" style={{ height }} aria-hidden>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: height - (t / maxHours) * height }}>
              {t}h
            </span>
          ))}
        </div>

        <div className="relative flex-1" style={{ height }}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 h-px bg-white/[0.06]" style={{ top: height - (t / maxHours) * height }} />
          ))}

          <div className="absolute inset-0 flex items-end justify-around">
            {weeks.map((w, i) => {
              const total = w.billable + w.nonBillable;
              const hPx = (s: number) => (s / 3600 / maxHours) * height;
              const billablePx = hPx(w.billable);
              const nonPx = hPx(w.nonBillable);
              const isActive = active === i;
              return (
                <div
                  key={w.week}
                  tabIndex={0}
                  role="img"
                  aria-label={`Week of ${formatDate(w.week)}: ${formatHours(w.billable, 1)} billable, ${formatHours(w.nonBillable, 1)} no charge`}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="group relative flex h-full flex-1 cursor-default flex-col items-center justify-end rounded-lg outline-none focus-visible:bg-white/[0.04]"
                >
                  <div className={`flex w-full max-w-6 flex-col-reverse gap-[2px] transition-[filter] duration-150 ${isActive ? "brightness-125" : ""}`}>
                    {billablePx > 0 && (
                      <div
                        style={{ height: Math.max(2, billablePx), background: SERIES[0].color }}
                        className={nonPx > 0 ? "" : "rounded-t-[4px]"}
                      />
                    )}
                    {nonPx > 0 && (
                      <div style={{ height: Math.max(2, nonPx), background: SERIES[1].color }} className="rounded-t-[4px]" />
                    )}
                  </div>

                  {isActive && (
                    <div className="pointer-events-none absolute bottom-full z-10 mb-2 w-max min-w-36 rounded-xl border border-white/10 bg-popover px-3 py-2 text-xs shadow-xl">
                      <p className="mb-1.5 text-white/50">Week of {formatDate(w.week, "MMM d")}</p>
                      {SERIES.map((s) => (
                        <p key={s.key} className="flex items-center justify-between gap-4">
                          <span className="inline-flex items-center gap-2 text-white/60">
                            <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
                            {s.label}
                          </span>
                          <strong className="tabular-nums text-white">{formatHours(w[s.key], 1)}</strong>
                        </p>
                      ))}
                      <p className="mt-1.5 flex justify-between border-t border-white/10 pt-1.5 text-white/60">
                        Total <strong className="tabular-nums text-white">{formatHours(total, 1)}</strong>
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="ml-11 flex justify-around text-[11px] text-white/35" aria-hidden>
        {weeks.map((w) => (
          <span key={w.week} className="flex-1 text-center">
            {formatDate(w.week, "MMM d")}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Hours logged per week</caption>
        <thead>
          <tr>
            <th>Week of</th>
            <th>Billable</th>
            <th>No charge</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.week}>
              <td>{formatDate(w.week)}</td>
              <td>{formatHours(w.billable, 1)}</td>
              <td>{formatHours(w.nonBillable, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
