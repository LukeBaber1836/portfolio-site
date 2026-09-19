import { cn } from "@/lib/utils";

/** A pill-shaped section heading (clay bar) with an optional action on the right, for sections made of separate cards. */
export function SectionBar({ title, action, className }: { title: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("clay flex items-center justify-between gap-3 rounded-full bg-card px-6 py-3", className)}>
      <h2 className="min-w-0 truncate text-base font-semibold text-white">{title}</h2>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
