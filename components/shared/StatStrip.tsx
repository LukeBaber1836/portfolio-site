import Link from "next/link";

import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { cn } from "@/lib/utils";

/**
 * One container split into cells by hairlines (Stripe/Vercel stat strip),
 * instead of a grid of separate cards. Put 2–4 `Stat`s inside.
 */
export function StatStrip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 overflow-hidden rounded-lg border border-line bg-surface lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none",
        // Hairlines between cells (works for 2-up mobile and n-up desktop).
        "[&>*]:border-line [&>*:nth-child(odd)]:border-r [&>*:nth-child(n+3)]:border-t lg:[&>*]:!border-t-0 lg:[&>*:not(:last-child)]:border-r lg:[&>*:last-child]:border-r-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "default",
  href,
  action,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  /** Colour the value only when it signals something (overdue = danger). */
  tone?: "default" | "danger" | "success";
  href?: string;
  action?: React.ReactNode;
}) {
  const long = value.length > 16;
  const body = (
    <div className={cn("flex h-full flex-col gap-1.5 p-4", href && "transition-colors group-hover:bg-white/[0.02]")}>
      <p className="text-xs text-fg-2">{label}</p>
      <p
        className={cn(
          "font-medium tabular-nums tracking-[-0.01em]",
          long ? "text-sm leading-6 text-white" : "text-2xl leading-none text-white",
          tone === "danger" && "text-danger",
          tone === "success" && "text-success",
        )}
      >
        {long ? value : <AnimatedNumber value={value} />}
      </p>
      {(hint || action) && (
        <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-fg-3">
          {hint && <span className="min-w-0 truncate leading-5">{hint}</span>}
          {action}
        </div>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="group block h-full focus-visible:bg-white/[0.03] focus-visible:outline-none">
      {body}
    </Link>
  ) : (
    <div>{body}</div>
  );
}
