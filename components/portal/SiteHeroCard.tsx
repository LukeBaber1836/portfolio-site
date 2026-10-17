"use client";

import { useState } from "react";
import { ArrowUpRight, Globe, Pencil } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { faviconForUrl, hostOf } from "@/lib/references/preview";
import { cn } from "@/lib/utils";

/**
 * Big clickable preview of the client's site, greeting them at the top of the project page.
 * The pencil (top-right) opens the site with the review toolbar so they can pin comments on it;
 * in the "Your review" stage it turns green and spells out what's being asked of them.
 */
export function SiteHeroCard({
  url,
  label,
  screenshotUrl,
  reviewHref,
  awaitingReview,
}: {
  url: string;
  label: string;
  screenshotUrl: string | null;
  /** Route that opens the site in review mode; omitted for closed projects. */
  reviewHref?: string;
  awaitingReview?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  const favicon = faviconForUrl(url);
  const host = hostOf(url);

  return (
    <div className="relative mb-6">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${label.toLowerCase()}: ${host ?? url}`}
        className="clay group relative block aspect-[21/9] w-full overflow-hidden rounded-2xl border bg-white/5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40"
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

      {/* Sibling of the card link, not inside it — links can't nest. */}
      {reviewHref && (
        <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-5 sm:top-5">
          {awaitingReview && (
            <span className="app-enter hidden rounded-full border border-success/40 bg-background/85 px-3 py-1.5 text-xs text-white backdrop-blur-sm sm:inline">
              <span className="font-semibold text-success">Your review is needed</span> · add the changes you want
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={reviewHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={awaitingReview ? "Review your site and leave comments — your review is needed" : "Comment on your site"}
                className={cn(
                  "relative flex size-10 items-center justify-center rounded-full backdrop-blur-sm transition-all duration-200 hover:scale-105",
                  awaitingReview
                    ? "bg-success text-background shadow-[0_0_18px_rgba(52,211,153,0.45)]"
                    : "bg-background/85 text-white/70 hover:text-accent",
                )}
              >
                {awaitingReview && <span className="absolute inset-0 animate-ping rounded-full bg-success/40 [animation-duration:2s]" aria-hidden />}
                <Pencil className="relative size-4" aria-hidden />
              </a>
            </TooltipTrigger>
            <TooltipContent side="bottom">Open your site and click anywhere to leave a comment</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );
}
