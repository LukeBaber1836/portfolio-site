"use client";

import { useEffect } from "react";

const SELECTOR = '[class*="gold-brushed"], [class*="gold-ring"], [class*="gold-outline"], [class*="gold-bar"]';
// Time constants (ms) for the exponential ease: frame-rate independent, so it feels
// the same at 60Hz and 144Hz. The rim angle is deliberately slower than the glare.
const TAU_POS = 140;
const TAU_ANGLE = 320;
// Within this normalised radius of an element's centre the pointer gives no reliable
// direction (it flips 180deg as you cross), so the rim holds its last heading.
const DEAD_ZONE = 0.22;
const NEAR_PX = 320; // glare brightens within this distance of an element's edge
const REACH_PX = 160; // beyond the element's half-size, offset saturates to ±1
const SETTLE = 0.0015;
const SETTLE_DEG = 0.2;
// Resting light (no pointer): from the top-left. Matches the CSS var fallbacks.
const REST = { x: -0.35, y: -0.3, px: 0.25, py: 0.5 };

// x/y: normalised offset of the pointer from the centre (−1..1); px/py: pointer position
// in the element's own box (0..1 inside it) for gold-bar's spotlight; n: proximity.
type S = { x: number; y: number; px: number; py: number; n: number; a: number; ta: number };

const angleOf = (x: number, y: number) => (((Math.atan2(x, -y) * 180) / Math.PI) + 360) % 360;
const REST_ANGLE = angleOf(REST.x, REST.y);

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
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const state = new WeakMap<HTMLElement, S>();
    let px: number | null = null;
    let py: number | null = null;
    let raf = 0;
    let last = 0;

    const clamp = (v: number) => Math.max(-1, Math.min(1, v));

    const frame = (now: number) => {
      raf = 0;
      // Cap dt so a long idle gap (or a hidden tab) doesn't snap everything at once.
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      const kPos = instant ? 1 : 1 - Math.exp(-dt / TAU_POS);
      const kAng = instant ? 1 : 1 - Math.exp(-dt / TAU_ANGLE);
      const els = document.querySelectorAll<HTMLElement>(SELECTOR);
      const vh = window.innerHeight;
      // Read all rects first, then write — no layout thrash.
      const work: { el: HTMLElement; tx: number; ty: number; tpx: number; tpy: number; tn: number }[] = [];
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh || r.width === 0) return;
        if (px === null || py === null) return work.push({ el, tx: REST.x, ty: REST.y, tpx: REST.px, tpy: REST.py, tn: 0 });
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // Distance from the element's edge (0 when the pointer is on it).
        const gap = Math.hypot(Math.max(0, Math.abs(px - cx) - r.width / 2), Math.max(0, Math.abs(py - cy) - r.height / 2));
        work.push({
          el,
          tx: clamp((px - cx) / (r.width / 2 + REACH_PX)),
          ty: clamp((py - cy) / (r.height / 2 + REACH_PX)),
          tpx: (px - r.left) / r.width,
          tpy: (py - r.top) / r.height,
          tn: Math.max(0, 1 - gap / NEAR_PX),
        });
      });
      let moving = false;
      for (const { el, tx, ty, tpx, tpy, tn } of work) {
        const s = state.get(el) ?? { x: REST.x, y: REST.y, px: REST.px, py: REST.py, n: 0, a: REST_ANGLE, ta: REST_ANGLE };
        s.x += (tx - s.x) * kPos;
        s.y += (ty - s.y) * kPos;
        s.px += (tpx - s.px) * kPos;
        s.py += (tpy - s.py) * kPos;
        s.n += (tn - s.n) * kPos;
        // Rim heading (0deg = top, clockwise): only retarget when the pointer gives a
        // clear direction, then ease along the shortest arc so it never spins.
        if (Math.hypot(tx, ty) > DEAD_ZONE) s.ta = angleOf(tx, ty);
        const dA = ((s.ta - s.a + 540) % 360) - 180;
        s.a = (s.a + dA * kAng + 360) % 360;
        state.set(el, s);
        if (
          Math.abs(tx - s.x) > SETTLE ||
          Math.abs(ty - s.y) > SETTLE ||
          Math.abs(tpx - s.px) > SETTLE ||
          Math.abs(tpy - s.py) > SETTLE ||
          Math.abs(tn - s.n) > SETTLE ||
          Math.abs(dA) > SETTLE_DEG
        )
          moving = true;
        el.style.setProperty("--gx", s.x.toFixed(4));
        el.style.setProperty("--gy", s.y.toFixed(4));
        el.style.setProperty("--gpx", s.px.toFixed(4));
        el.style.setProperty("--gpy", s.py.toFixed(4));
        el.style.setProperty("--gnear", s.n.toFixed(4));
        el.style.setProperty("--ga", s.a.toFixed(2));
      }
      if (moving && !document.hidden) raf = requestAnimationFrame(frame);
      else last = 0;
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
