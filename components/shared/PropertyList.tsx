import { cn } from "@/lib/utils";

/**
 * Linear-style property panel: label column + value, 32px rows, no card chrome.
 * Use in a detail page's right rail for ~8 key facts.
 */
export function PropertyList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn("space-y-0.5 text-[13px]", className)}>{children}</dl>;
}

export function Property({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("grid min-h-8 grid-cols-[104px_1fr] items-center gap-3", className)}>
      <dt className="text-xs text-fg-3">{label}</dt>
      <dd className="min-w-0 text-white">{children}</dd>
    </div>
  );
}

/** Titled group inside a right rail; groups are separated by a hairline, not boxed. */
export function RailSection({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-line py-5 first:border-t-0 first:pt-0", className)}>
      {(title || action) && (
        <div className="mb-3 flex min-h-7 items-center justify-between gap-2">
          {title && <h3 className="text-xs font-medium text-fg-2">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
