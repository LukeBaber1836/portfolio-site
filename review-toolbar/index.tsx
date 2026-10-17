import { createRoot } from "react-dom/client";

import { HOST_ID } from "./anchor";
import { createApi } from "./api";
import { App } from "./App";
import css from "./styles.css";

// Entry for public/review/toolbar.js (built by scripts/build-review-toolbar.mjs). Loaded on the
// client's site by public/review/loader.js only when a review token is present, so normal visitors
// never download it. Everything renders inside a shadow root: the site's CSS can't restyle the
// toolbar and the toolbar's CSS can't leak onto the site.

declare global {
  interface Window {
    __lbReview?: { token: string; origin: string; storageKey: string; mounted?: boolean };
  }
}

const FONT_HREF = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap";

function mount() {
  const cfg = window.__lbReview;
  if (!cfg || cfg.mounted || document.getElementById(HOST_ID)) return;
  cfg.mounted = true;

  // @font-face doesn't work inside a shadow root, so the brand font is registered on the page.
  if (!document.querySelector(`link[href="${FONT_HREF}"]`)) {
    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = FONT_HREF;
    document.head.appendChild(font);
  }

  const host = document.createElement("div");
  host.id = HOST_ID;
  // Appended to <html>, not <body>, so body transforms/overflow on the site can't trap fixed children.
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = css;
  shadow.appendChild(style);
  const container = document.createElement("div");
  shadow.appendChild(container);

  // Keystrokes typed in the toolbar shouldn't trigger the site's own keyboard shortcuts.
  for (const type of ["keydown", "keyup", "keypress"]) container.addEventListener(type, (e) => e.stopPropagation());

  const root = createRoot(container);
  const exit = () => {
    try {
      sessionStorage.removeItem(cfg.storageKey);
    } catch {
      /* storage blocked — nothing to clear */
    }
    root.unmount();
    host.remove();
    delete window.__lbReview;
  };
  root.render(<App api={createApi(cfg.origin, cfg.token)} onExit={exit} />);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, { once: true });
else mount();
