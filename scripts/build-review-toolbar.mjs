// Bundles review-toolbar/ into public/review/toolbar.js — the on-site comment toolbar that
// public/review/loader.js pulls in during a review session. Runs before `next dev`/`next build`;
// pass --watch to rebuild on change while working on the toolbar.
/* global process */
import { build, context } from "esbuild";

const options = {
  entryPoints: ["review-toolbar/index.tsx"],
  outfile: "public/review/toolbar.js",
  bundle: true,
  format: "iife",
  target: ["es2020", "safari15"],
  jsx: "automatic",
  loader: { ".css": "text" },
  define: { "process.env.NODE_ENV": '"production"' },
  minify: true,
  legalComments: "none",
  logLevel: "info",
};

if (process.argv.includes("--watch")) {
  const ctx = await context({ ...options, minify: false, sourcemap: "inline" });
  await ctx.watch();
} else {
  await build(options);
}
