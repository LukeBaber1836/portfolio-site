"use client";

import { useState } from "react";
import { ArrowUpRight, Globe, MessageSquarePlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { faviconForUrl, hostOf } from "@/lib/references/preview";

/**
 * Big preview of the client's site at the top of the project page. Below the image:
 * the address, an "Open" link, and (for open projects) "Leave feedback", which opens
 * the site with the review toolbar so they can pin comments on it. In the "Your review"
 * stage that button becomes the page's primary action.
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
    <section className="mb-8 overflow-hidden rounded-lg border border-line bg-surface">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${label.toLowerCase()}: ${host ?? url}`}
        className="group block aspect-[21/9] w-full overflow-hidden border-b border-line bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
      >
        {screenshotUrl && !broken ? (
          <img
            src={screenshotUrl}
            alt=""
            onError={() => setBroken(true)}
            className="size-full object-cover object-top transition-opacity duration-150 group-hover:opacity-90"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            {favicon ? <img src={favicon} alt="" className="size-10 rounded-md" /> : <Globe className="size-8 text-fg-3" aria-hidden />}
          </div>
        )}
      </a>

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs text-fg-3">{label}</p>
          <p className="truncate text-sm text-white">{host ?? url}</p>
        </div>
        <div className="flex items-center gap-2">
          {awaitingReview && reviewHref && <span className="hidden text-[13px] text-fg-2 md:inline">Ready for your review</span>}
          <Button asChild variant="ghost" size="sm">
            <a href={url} target="_blank" rel="noopener noreferrer">
              Open <ArrowUpRight />
            </a>
          </Button>
          {reviewHref && (
            <Button asChild size="sm" variant={awaitingReview ? "default" : "outline"}>
              <a href={reviewHref} target="_blank" rel="noopener noreferrer" title="Opens your site — click anywhere on it to leave a comment">
                <MessageSquarePlus /> Leave feedback
              </a>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
