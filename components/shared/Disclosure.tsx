"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/utils";

/** transitions.dev "Accordion expand" (grid-rows 0fr ↔ 1fr + chevron flip). */
export function Disclosure({
  title,
  children,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  className,
  headClassName,
  leading,
  onOpen,
}: {
  title: React.ReactNode;
  /** Interactive content (e.g. a checkbox) placed before the toggle — kept outside the <button>. */
  leading?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  /** Pass to drive the panel from outside; leave it off to let the panel manage its own state. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  headClassName?: string;
  /** Fires when the panel expands — handy for loading contents on first open. */
  onOpen?: () => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const id = useId();
  return (
    <div className={cn("t-acc", className)} data-open={open}>
      <div className="flex items-center gap-3">
        {leading}
        <button
          type="button"
          className={cn(
            "t-acc-head flex w-full min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 py-3 text-left text-sm text-white transition-colors hover:text-accent",
            headClassName,
          )}
          aria-expanded={open}
          aria-controls={id}
          onClick={() => {
            const next = !open;
            if (controlledOpen === undefined) setUncontrolledOpen(next);
            if (next) onOpen?.();
            onOpenChange?.(next);
          }}
        >
          <span className="min-w-0 flex-1">{title}</span>
          <span className="t-acc-chevron text-white/50">
            <svg viewBox="0 0 16 16" className="size-4" fill="none">
              <path d="M4 6.5L8 10.5L12 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      </div>
      <div id={id} className="t-acc-panel" role="region">
        <div className="t-acc-panel-inner">{children}</div>
      </div>
    </div>
  );
}
