"use client";

import { useEffect, useRef, useState } from "react";

// transitions.dev "Success check": fade + rotate + blur + bob, then stroke-draw.
export function SuccessCheck({ className, strokeWidth = 3 }: { className?: string; strokeWidth?: number }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [state, setState] = useState<"out" | "in">("out");

  useEffect(() => {
    const path = pathRef.current;
    if (path) {
      // Match the dash length to the real path so it never pre-reveals or over-draws.
      const len = Math.ceil(path.getTotalLength()) + 1;
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
    }
    const id = requestAnimationFrame(() => setState("in"));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <span className={`t-success-check ${className ?? ""}`} data-state={state} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" className="size-full">
        <path
          ref={pathRef}
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
