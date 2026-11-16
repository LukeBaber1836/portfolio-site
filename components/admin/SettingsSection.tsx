import { cn } from "@/lib/utils";

/** Vercel-style settings row: title + one-line description on the left, controls on the right. */
export function SettingsSection({
  id,
  title,
  description,
  children,
  className,
}: {
  id?: string;
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("grid scroll-mt-20 gap-4 border-t border-line py-8 first:border-t-0 first:pt-0 md:grid-cols-[240px_minmax(0,1fr)] md:gap-10", className)}>
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description && <p className="mt-1 text-[13px] leading-5 text-fg-3">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
