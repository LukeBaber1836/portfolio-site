"use client";

import { useState } from "react";
import { ArrowUpRight, Globe } from "lucide-react";

import { faviconForUrl, hostOf } from "@/lib/references/preview";

/** Big clickable preview of the client's site, greeting them at the top of the project page. */
export function SiteHeroCard({ url, label, screenshotUrl }: { url: string; label: string; screenshotUrl: string | null }) {
  const [broken, setBroken] = useState(false);
  const favicon = faviconForUrl(url);
  const host = hostOf(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${label.toLowerCase()}: ${host ?? url}`}
      className="clay group relative mb-6 block aspect-[21/9] w-full overflow-hidden rounded-2xl border bg-white/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40"
    >
      {screenshotUrl && !broken ? (
        <img
          src={screenshotUrl}
          alt=""
          onError={() => setBroken(true)}
          className="size-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-[1.02]"
        />
      ) : (
        <div className="flex size-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-white/[0.07] to-transparent">
          {favicon ? <img src={favicon} alt="" className="size-12 rounded-xl" /> : <Globe className="size-10 text-white/20" aria-hidden />}
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/50 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <p className="text-xs text-white/60">{label}</p>
          <p className="truncate text-lg font-medium text-white drop-shadow-sm group-hover:text-accent sm:text-xl">{host ?? url}</p>
        </div>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-background/85 text-white/70 backdrop-blur-sm transition-colors group-hover:text-accent">
          <ArrowUpRight className="size-5" aria-hidden />
        </span>
      </div>
    </a>
  );
}
