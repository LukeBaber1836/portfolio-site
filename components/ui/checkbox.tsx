"use client";

import * as React from "react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "t-check peer flex size-[18px] shrink-0 cursor-pointer items-center justify-center rounded-[5px] border outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=unchecked]:border-white/25 data-[state=unchecked]:bg-transparent hover:data-[state=unchecked]:border-accent",
        "data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-background",
        "data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:text-background",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" className="flex items-center justify-center">
        {props.checked === "indeterminate" ? (
          <span className="h-0.5 w-2 rounded bg-background" />
        ) : (
          // Inline mark (not a lucide icon): pathLength=1 normalizes the draw
          // animation so the t-check stroke-dashoffset recipe always completes.
          <svg viewBox="0 0 12 12" fill="none" aria-hidden className="size-3" style={{ "--check-len": 1 } as React.CSSProperties}>
            <path
              d="M2 6.5 4.8 9.2 10 3.4"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
            />
          </svg>
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
