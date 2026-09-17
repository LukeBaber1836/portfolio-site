import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

import { Toaster } from "@/components/ui/sonner";

// `crypto.randomUUID()` only exists in "secure contexts" (HTTPS, or the
// browser-special-cased `localhost`/`127.0.0.1`) — per spec, not a bug in any
// browser. Loading the site over plain HTTP from any other hostname (e.g. a
// LAN machine name) makes it `undefined`, and @neondatabase/auth calls it
// eagerly when its client is created, crashing every page (HeaderAuthButton
// is in the root Header, so this ran on load everywhere, not just /login).
// `crypto.getRandomValues()` has no such restriction, so it's used here to
// build an equivalent v4 UUID. Runs via `beforeInteractive` so it's in place
// before any other bundle — including the auth client — evaluates.
const RANDOM_UUID_POLYFILL = `
if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
  crypto.randomUUID = function randomUUID() {
    var bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    var hex = Array.prototype.map.call(bytes, function (b) {
      return b.toString(16).padStart(2, "0");
    });
    return (
      hex.slice(0, 4).join("") + "-" +
      hex.slice(4, 6).join("") + "-" +
      hex.slice(6, 8).join("") + "-" +
      hex.slice(8, 10).join("") + "-" +
      hex.slice(10, 16).join("")
    );
  };
}
`;

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800"],
  variable: "--font-jetbrainsMono",
});

export const metadata: Metadata = {
  title: "Luke Baber",
  description:
    "Web development, UI/UX design, 3D modeling & printing, app development, and automation by Luke Baber.",
  appleWebApp: {
    title: "Luke Baber",
    statusBarStyle: "default",
    capable: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${jetbrainsMono.className} ${jetbrainsMono.variable} antialiased`}
      >
        <Script id="crypto-randomuuid-polyfill" strategy="beforeInteractive">
          {RANDOM_UUID_POLYFILL}
        </Script>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
