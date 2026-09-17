"use client";

import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";

export type TabItem = { value: string; label: React.ReactNode; href?: string };

/** transitions.dev "Tabs sliding": a gold pill glides between segments. */
export function SlidingTabs({
  items,
  value,
  onChange,
  className,
  size = "md",
}: {
  items: TabItem[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const firstPaint = useRef(true);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    const place = (animate: boolean) => {
      const active = bar.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!active) {
        pill.style.width = "0px";
        return;
      }
      if (!animate) pill.style.transition = "none";
      // Recessed pill: 3px moat on all sides so x/y padding match.
      pill.style.transform = `translateX(${active.offsetLeft + 3}px)`;
      pill.style.width = `${active.offsetWidth - 6}px`;
      pill.style.height = `${active.offsetHeight - 6}px`;
      pill.style.top = `${active.offsetTop + 3}px`;
      if (!animate) {
        void pill.offsetHeight;
        pill.style.transition = "";
      }
    };
    place(!firstPaint.current);
    firstPaint.current = false;
    const onResize = () => place(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [value, items.length]);

  const tabClass = cn("t-tab inline-flex items-center gap-1.5 font-medium whitespace-nowrap", size === "sm" ? "!h-8 text-xs" : "!h-9 text-sm");

  return (
    <div ref={barRef} role="tablist" className={cn("t-tabs clay max-w-full overflow-x-auto scrollbar-hide", className)}>
      <span ref={pillRef} className="t-tabs-pill" style={{ top: 3 }} aria-hidden />
      {items.map((item) => {
        const selected = item.value === value;
        return item.href ? (
          <Link
            key={item.value}
            href={item.href}
            role="tab"
            aria-selected={selected}
            className={cn(tabClass, selected && "font-semibold")}
            scroll={false}
          >
            {item.label}
          </Link>
        ) : (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(tabClass, selected && "font-semibold")}
            onClick={() => onChange?.(item.value)}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
