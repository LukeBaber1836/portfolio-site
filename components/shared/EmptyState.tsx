import type { LucideIcon } from "lucide-react";

/** One quiet line, an optional second line, an optional action. No illustration. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center justify-center px-4 text-center ${compact ? "py-8" : "py-14"}`}>
      {Icon && <Icon className="mb-3 size-5 text-fg-3" aria-hidden />}
      <p className="text-sm text-white">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13px] leading-5 text-fg-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
