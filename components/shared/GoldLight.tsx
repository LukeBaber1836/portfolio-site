"use client";

import { useEffect } from "react";

const SELECTOR = '[class*="gold-brushed"], [class*="gold-ring"]';
const EASE = 0.12; // per frame; lower = lazier, more "liquid" catch-up
const NEAR_PX = 320; // glare brightens within this distance of an element's edge
const REACH_PX = 160; // beyond the element's half-size, offset saturates to ±1
const SETTLE = 0.0015;
// Resting light (no pointer): from the top-left. Matches the CSS var fallbacks.
const REST = { x: -0.35, y: -0.3 };

type S = { x: number; y: number; n: number };

/**
 * One shared light source for every `.gold-brushed` surface (styles.md §2).
 * Writes eased --gx/--gy/--gnear/--ga onto each on-screen gold element: the glare
 * leans toward the pointer, the metal band shifts away from it, and the rim's
 * highlight (`gold-ring`) turns to face it. Runs only while values are moving;
 * sleeps when the pointer is still, the tab is hidden, and on touch-only devices.
 */
export function GoldLight() {
  useEffect(() => {
    if (!window.matchMedia("(any-hover: hover)").matches) return;
    // Pointer-driven light isn't autonomous motion, so it stays on under reduced
    // motion — it just tracks instantly instead of easing.
    const ease = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : EASE;

    const state = new WeakMap<HTMLElement, S>();
    let px: number | null = null;
    let py: number | null = null;
    let raf = 0;

    const clamp = (v: number) => Math.max(-1, Math.min(1, v));

    const frame = () => {
      raf = 0;
      const els = document.querySelectorAll<HTMLElement>(SELECTOR);
      const vh = window.innerHeight;
      // Read all rects first, then write — no layout thrash.
      const work: { el: HTMLElement; tx: number; ty: number; tn: number }[] = [];
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh || r.width === 0) return;
        if (px === null || py === null) return work.push({ el, tx: REST.x, ty: REST.y, tn: 0 });
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // Distance from the element's edge (0 when the pointer is on it).
        const gap = Math.hypot(Math.max(0, Math.abs(px - cx) - r.width / 2), Math.max(0, Math.abs(py - cy) - r.height / 2));
        work.push({
          el,
          tx: clamp((px - cx) / (r.width / 2 + REACH_PX)),
          ty: clamp((py - cy) / (r.height / 2 + REACH_PX)),
          tn: Math.max(0, 1 - gap / NEAR_PX),
        });
      });
      let moving = false;
      for (const { el, tx, ty, tn } of work) {
        const s = state.get(el) ?? { x: REST.x, y: REST.y, n: 0 };
        s.x += (tx - s.x) * ease;
        s.y += (ty - s.y) * ease;
        s.n += (tn - s.n) * ease;
        state.set(el, s);
        if (Math.abs(tx - s.x) > SETTLE || Math.abs(ty - s.y) > SETTLE || Math.abs(tn - s.n) > SETTLE) moving = true;
        el.style.setProperty("--gx", s.x.toFixed(4));
        el.style.setProperty("--gy", s.y.toFixed(4));
        el.style.setProperty("--gnear", s.n.toFixed(4));
        // Direction of the light for the rim highlight: 0deg = top, clockwise.
        el.style.setProperty("--ga", (((Math.atan2(s.x, -s.y) * 180) / Math.PI + 360) % 360).toFixed(1));
      }
      if (moving && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
    };

    const onMove = (e: PointerEvent) => {
      px = e.clientX;
      py = e.clientY;
      wake();
    };
    const onLeave = () => {
      px = py = null;
      wake();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", wake, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", wake);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", wake);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  return null;
}
