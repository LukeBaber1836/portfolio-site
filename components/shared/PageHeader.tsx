import Link from "next/link";
import { ChevronLeft } from "lucide-react";

/**
 * Page title block. Keep it to one line of metadata: `meta` renders as a
 * secondary " · "-joined line under the title (client · started Mar 4 · 42.5h).
 */
export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
  meta,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  eyebrow?: React.ReactNode;
  meta?: React.ReactNode[];
}) {
  const metaItems = meta?.filter(Boolean);
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-1.5">
        {back && (
          <Link
            href={back.href}
            className="-ml-1 inline-flex items-center gap-0.5 rounded-md px-1 text-[13px] text-fg-3 transition-colors hover:text-white"
          >
            <ChevronLeft className="size-3.5" aria-hidden />
            {back.label}
          </Link>
        )}
        {eyebrow && <div className="text-[13px] text-fg-3">{eyebrow}</div>}
        <h1 className="text-xl font-semibold leading-tight tracking-[-0.01em] text-white">{title}</h1>
        {metaItems && metaItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-2">
            {metaItems.map((m, i) => (
              <span key={i} className="inline-flex items-center gap-2">
                {i > 0 && <span aria-hidden className="text-fg-3">·</span>}
                {m}
              </span>
            ))}
          </div>
        )}
        {description && <div className="max-w-2xl text-[13px] leading-5 text-fg-2">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
