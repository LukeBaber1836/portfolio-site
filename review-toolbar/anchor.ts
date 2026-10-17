import { finder } from "@medv/finder";

import type { NewCommentInput, ReviewComment, Viewport } from "@/lib/site-review/types";

// Where pins live on the host page. A comment is anchored to the element that was clicked (unique
// CSS selector + relative offset inside it), so it follows that element through scrolling, resizes
// and layout shifts. If the element can't be found any more, the pin falls back to the stored
// document position.

export const HOST_ID = "lb-review-host";

export function viewportOf(width = window.innerWidth): Viewport {
  return width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";
}

/** Topmost host-page element under a point, skipping the toolbar's own shadow host. */
export function elementAt(x: number, y: number): Element | null {
  for (const el of document.elementsFromPoint(x, y)) {
    if (el.id === HOST_ID || el === document.documentElement) continue;
    return el;
  }
  return null;
}

// Hashed/stateful class names (CSS modules, styled-components, Tailwind variants) make brittle selectors.
const stableClass = (name: string) => !/[:[\]/@]|^(?:css|sc|jsx|svelte)-|__[a-z0-9]{5,}$|\d{3,}/i.test(name);
const stableId = (name: string) => !/^(?:radix|headlessui|react-aria)|:|\d{3,}/i.test(name);

function selectorFor(el: Element) {
  try {
    return finder(el, { className: stableClass, idName: stableId, timeoutMs: 250, seedMinLength: 2 });
  } catch {
    return null;
  }
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export function anchorFromClick(el: Element, x: number, y: number): Omit<NewCommentInput, "body"> {
  const rect = el.getBoundingClientRect();
  const selector = selectorFor(el);
  return {
    pagePath: location.pathname,
    selector,
    offsetX: selector && rect.width ? clamp01((x - rect.left) / rect.width) : null,
    offsetY: selector && rect.height ? clamp01((y - rect.top) / rect.height) : null,
    docX: clamp01(x / window.innerWidth),
    docY: Math.max(0, y + window.scrollY),
    viewport: viewportOf(),
  };
}

const elementCache = new Map<string, Element | null>();

function resolve(selector: string) {
  const cached = elementCache.get(selector);
  if (cached?.isConnected) return cached;
  let el: Element | null = null;
  try {
    el = document.querySelector(selector);
  } catch {
    el = null;
  }
  elementCache.set(selector, el);
  return el;
}

export type PinPoint = { x: number; y: number; anchored: boolean };

type Anchor = Pick<ReviewComment, "selector" | "offsetX" | "offsetY" | "docX" | "docY">;

/** Viewport coordinates of a pin right now. */
export function pinPoint(c: Anchor): PinPoint {
  if (c.selector) {
    const el = resolve(c.selector);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) {
        return { x: r.left + (c.offsetX ?? 0.5) * r.width, y: r.top + (c.offsetY ?? 0.5) * r.height, anchored: true };
      }
    }
  }
  return { x: c.docX * window.innerWidth, y: c.docY - window.scrollY, anchored: false };
}

/** Scroll the page so a pin sits in the middle of the viewport. */
export function scrollToPin(c: Anchor) {
  const p = pinPoint(c);
  window.scrollTo({ top: Math.max(0, window.scrollY + p.y - window.innerHeight / 2), behavior: "smooth" });
}
