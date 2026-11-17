"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Globe } from "lucide-react";

import { statusBadgeFor } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { faviconForUrl, hostOf } from "@/lib/references/preview";
import { PROJECT_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

/**
 * Overview hero: a framed preview of the site being built. The whole card opens the
 * project page; the "View website →" control (layered above the card link) opens the
 * site itself in a new tab. Two sibling links, never nested.
 */
export function FeaturedSiteCard({
  project,
  site,
}: {
  project: { id: string; name: string; status: string; progressPct: number; siteScreenshotUrl: string | null };
  site: { url: string; label: string };
}) {
  const [broken, setBroken] = useState(false);
  const host = hostOf(site.url) ?? site.url;
  const favicon = faviconForUrl(site.url);

  return (
    <article className="group relative overflow-hidden rounded-xl border border-line bg-surface transition-colors hover:border-line-strong">
      {/* Browser frame */}
      <div className="flex h-9 items-center gap-3 border-b border-line bg-sunken px-3">
        <span aria-hidden className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/10" />
          <span className="size-2.5 rounded-full bg-white/10" />
        </span>
        <span className="mx-auto flex h-6 min-w-0 max-w-sm flex-1 items-center justify-center gap-1.5 rounded-md bg-white/[0.04] px-3 text-xs text-fg-3">
          {favicon && <img src={favicon} alt="" className="size-3.5 shrink-0 rounded-sm" />}
          <span className="truncate">{host}</span>
        </span>
        <span aria-hidden className="w-[42px]" />
      </div>

      {/* Screenshot */}
      <div className="aspect-[16/9] w-full overflow-hidden bg-surface-2 sm:aspect-[21/9]">
        {project.siteScreenshotUrl && !broken ? (
          <img
            src={project.siteScreenshotUrl}
            alt=""
            onError={() => setBroken(true)}
            className="size-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.015] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-3">
            {favicon ? <img src={favicon} alt="" className="size-10 rounded-md" /> : <Globe className="size-8 text-fg-3" aria-hidden />}
            <span className="text-xs text-fg-3">Preview coming soon</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-line px-4 py-3.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            {/* Stretched link: the whole card opens the project. */}
            <Link
              href={`/portal/projects/${project.id}`}
              className="truncate text-[15px] font-medium text-white outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-accent/50"
            >
              {project.name}
            </Link>
            {statusBadgeFor(PROJECT_STATUS, project.status)}
          </div>
          <div className="mt-2 flex max-w-xs items-center gap-2.5">
            <Progress value={project.progressPct} className="flex-1" aria-label={`${project.progressPct}% complete`} />
            <span className="text-xs tabular-nums text-fg-2">{project.progressPct}%</span>
          </div>
        </div>

        <a
          href={site.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View website: ${host} (opens in a new tab)`}
          className={cn(buttonVariants({ variant: "outlineGold" }), "relative z-10 shrink-0 text-[13px] [&:hover>svg]:translate-x-0.5")}
        >
          View website
          <ArrowRight className="size-4 transition-transform duration-150" aria-hidden />
        </a>
      </div>
    </article>
  );
}
