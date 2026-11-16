import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

/** Plain section heading: 14px title (+ optional count), action on the right. No container. */
export function SectionHeader({
  title,
  count,
  action,
  className,
}: {
  title: string;
  count?: number;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 flex min-h-8 items-center justify-between gap-3", className)}>
      <h2 className="flex min-w-0 items-baseline gap-2 truncate text-sm font-semibold text-white">
        {title}
        {count !== undefined && <span className="text-xs font-normal tabular-nums text-fg-3">{count}</span>}
      </h2>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

/** Quiet "View all →" style link for section/card headers. */
export function SectionLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 rounded-md text-xs text-fg-3 transition-colors hover:text-white">
      {children} <ArrowRight className="size-3" aria-hidden />
    </Link>
  );
}
