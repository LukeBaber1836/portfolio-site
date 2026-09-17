import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? "py-8" : "py-14"}`}>
      <span className="clay mb-4 flex size-12 items-center justify-center rounded-full bg-background text-accent">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="font-medium text-white">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm leading-6 text-white/50">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
