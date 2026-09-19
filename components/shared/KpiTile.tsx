import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { AnimatedNumber } from "@/components/shared/AnimatedNumber";
import { cn } from "@/lib/utils";

export function KpiTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  href,
  action,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "gold" | "danger" | "success";
  href?: string;
  action?: React.ReactNode;
}) {
  const body = (
    <div
      className={cn(
        "clay group relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl bg-card p-5 transition-all duration-300",
        href && "hover:-translate-y-0.5 hover:bg-[#2c2c32]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-white/50">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full bg-white/5",
              tone === "gold" && "text-accent",
              tone === "danger" && "text-danger",
              tone === "success" && "text-success",
              tone === "default" && "text-white/60",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </span>
        )}
      </div>
      <p
        className={cn(
          "font-bold",
          value.length > 20 ? "text-sm leading-6 font-medium" : "text-3xl leading-none",
          tone === "gold" && "text-accent",
          tone === "danger" && "text-danger",
        )}
      >
        {value.length > 20 ? <span>{value}</span> : <AnimatedNumber value={value} />}
      </p>
      {(hint || action) && (
        <div className="mt-auto flex items-end justify-between gap-2 text-xs text-white/50">
          {hint && <span className="leading-5">{hint}</span>}
          {action}
        </div>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60">
      {body}
    </Link>
  ) : (
    body
  );
}
