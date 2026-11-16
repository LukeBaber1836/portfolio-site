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
        className="size-full object-cover object-top"
      />
    );
  }
  return (
    <div className="flex size-full flex-col items-center justify-center gap-2 bg-surface-2">
      {reference.kind === "link" ? (
        reference.faviconUrl ? (
          <img src={reference.faviconUrl} alt="" loading="lazy" className="size-8 rounded-md" />
        ) : (
          <Link2 className="size-6 text-fg-3" aria-hidden />
        )
      ) : (
        <StickyNote className="size-6 text-fg-3" aria-hidden />
      )}
      {reference.url && <span className="max-w-[85%] truncate text-xs text-fg-3">{hostOf(reference.url)}</span>}
    </div>
  );
}

/** Screenshot with the title/note captioned over it; `children` are overlaid controls (e.g. top-right actions). */
export function ReferencePreview({ reference, children }: { reference: ProjectReference; children?: React.ReactNode }) {
  return (
    <div className="relative aspect-video w-full shrink-0 overflow-hidden border-b border-line bg-surface-2">
      {reference.url ? (
        <a href={reference.url} target="_blank" rel="noopener noreferrer" aria-label={reference.title} className="absolute inset-0">
          <Thumbnail reference={reference} />
        </a>
      ) : (
        <Thumbnail reference={reference} />
      )}
      {/* Fades to black exactly where the caption sits, so the title reads over any screenshot. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      {/* Caption lives inside the picture; pointer-events pass through to the image link except on the title. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-3">
        {reference.url ? (
          <a
            href={reference.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pointer-events-auto line-clamp-2 text-[13px] font-medium text-white hover:underline"
          >
            {reference.title}
          </a>
        ) : (
          <p className="line-clamp-2 text-[13px] font-medium text-white">{reference.title}</p>
        )}
        {reference.note && <p className="line-clamp-2 text-xs leading-5 text-white/65">{reference.note}</p>}
      </div>

      {children}
    </div>
  );
}
