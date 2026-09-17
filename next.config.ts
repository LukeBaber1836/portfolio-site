import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["framer-motion"],
  // Next.js dev server blocks cross-origin requests for dev-only assets (JS
  // chunks, HMR) by default to prevent DNS-rebinding attacks. Without this,
  // loading the site from another machine on the LAN via this hostname gets a
  // 200 for the initial HTML but a 403 for every JS chunk, so React never
  // hydrates: framer-motion elements stay stuck at their `initial` (usually
  // opacity: 0) state — present in the DOM, but invisible. Only affects `next
  // dev`; production builds have no such restriction. Add any other LAN
  // hostname or IP you use to reach the dev server here (matched by hostname
  // only — no scheme or port).
  allowedDevOrigins: ["lukes-desktop"],
  images: {
    // Microlink screenshot CDN for reference link previews (ui/link-preview).
    remotePatterns: [{ protocol: "https", hostname: "api.microlink.io" }],
  },
};

export default nextConfig;
