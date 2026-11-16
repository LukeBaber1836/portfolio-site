import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import type { Tone } from "@/lib/status";
import { cn } from "@/lib/utils";

export type AttentionItem = {
  key: string;
  tone: Tone;
  /** One sentence; bold the subject with <strong>. */
  text: React.ReactNode;
  meta?: React.ReactNode;
  href: string;
  /** Short verb shown on the right ("Review", "Pay"). Defaults to an arrow. */
  cta?: string;
  /** Promote this row's CTA to the gold primary button (use for at most one row). */
  primary?: boolean;
};

const DOT: Record<Tone, string> = {
  info: "bg-info",
  attention: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
  neutral: "bg-fg-3",
};

/** "Needs attention" rows: status dot + sentence + action. Collapses to one line when empty. */
export function AttentionList({ items, emptyText = "All caught up." }: { items: AttentionItem[]; emptyText?: string }) {
  if (!items.length) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-fg-2">
        <Check className="size-4 text-success" aria-hidden />
        {emptyText}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
      {items.map((it) => (
        <li key={it.key}>
          <Link
            href={it.href}
            className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025] focus-visible:bg-white/[0.03] focus-visible:outline-none"
          >
            <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", DOT[it.tone])} />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] leading-5 text-fg-2 [&_strong]:font-medium [&_strong]:text-white">{it.text}</span>
              {it.meta && <span className="block truncate text-xs text-fg-3">{it.meta}</span>}
            </span>
            {it.cta ? (
              <span
                className={cn(
                  "inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-medium transition-colors",
                  it.primary ? "gold-brushed gold-ring text-background group-hover:brightness-[1.04]" : "text-fg-2 group-hover:bg-white/[0.06] group-hover:text-white",
                )}
              >
                {it.cta}
              </span>
            ) : (
              <ArrowRight className="size-4 shrink-0 text-fg-3 transition-colors group-hover:text-white" aria-hidden />
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
