"use client";

import { useState } from "react";
import { Link2, StickyNote } from "lucide-react";

import type { ProjectReference } from "@/lib/db/schema";
import { hostOf } from "@/lib/references/preview";

/** The picture: stored screenshot when we have one, otherwise a favicon/host tile so the grid stays uniform. */
function Thumbnail({ reference }: { reference: ProjectReference }) {
  const [broken, setBroken] = useState(false);
  if (reference.screenshotUrl && !broken) {
    return (
      <img
        src={reference.screenshotUrl}
        alt=""
        loading="lazy"
        onError={() => setBroken(true)}
        className="size-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
    );
  }
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-white/[0.07] to-transparent">
      {reference.kind === "link" ? (
        reference.faviconUrl ? (
          <img src={reference.faviconUrl} alt="" loading="lazy" className="size-9 rounded-lg" />
        ) : (
          <Link2 className="size-8 text-white/20" aria-hidden />
        )
      ) : (
        <StickyNote className="size-8 text-white/20" aria-hidden />
      )}
      {reference.url && <span className="max-w-[85%] truncate text-xs text-white/30">{hostOf(reference.url)}</span>}
    </div>
  );
}

/** Screenshot with the title/note captioned over it; `children` are overlaid controls (e.g. top-right actions). */
export function ReferencePreview({ reference, children }: { reference: ProjectReference; children?: React.ReactNode }) {
  return (
    <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-white/5">
      {reference.url ? (
        <a href={reference.url} target="_blank" rel="noopener noreferrer" aria-label={reference.title} className="absolute inset-0">
          <Thumbnail reference={reference} />
        </a>
      ) : (
        <Thumbnail reference={reference} />
      )}
      {/* Fades to black exactly where the caption sits, so the title reads over any screenshot. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black via-black/60 to-transparent" />

      {/* Caption lives inside the picture; pointer-events pass through to the image link except on the title. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4">
        {reference.url ? (
          <a
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto line-clamp-2 font-medium text-white drop-shadow-sm hover:text-accent"
          >
            {reference.title}
          </a>
        ) : (
          <p className="line-clamp-2 font-medium text-white drop-shadow-sm">{reference.title}</p>
        )}
        {reference.note && <p className="line-clamp-2 text-xs leading-5 text-white/70">{reference.note}</p>}
      </div>

      {children}
    </div>
  );
}
