import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="app-enter mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 space-y-2">
        {back && (
          <Link
            href={back.href}
            className="inline-flex items-center gap-1 text-sm text-white/50 transition-colors hover:text-accent"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {back.label}
          </Link>
        )}
        {eyebrow && <div className="text-sm text-white/50">{eyebrow}</div>}
        <h1 className="text-2xl font-semibold leading-tight text-white xl:text-3xl">{title}</h1>
        {description && <div className="max-w-2xl text-sm leading-6 text-white/60">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
