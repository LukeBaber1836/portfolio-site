import Link from "next/link";

import { cn } from "@/lib/utils";

export type PageTab = { value: string; label: string; href: string; count?: number };

/**
 * Section tabs for detail pages: text tabs with a 2px white underline and a
 * tertiary count. (Use `SlidingTabs` for small filter toggles instead.)
 */
export function PageTabs({ tabs, value, className }: { tabs: PageTab[]; value: string; className?: string }) {
  return (
    <nav
      aria-label="Sections"
      className={cn("scrollbar-hide -mx-4 mb-6 overflow-x-auto border-b border-line px-4 md:mx-0 md:px-0", className)}
    >
      <ul className="flex gap-5">
        {tabs.map((t) => {
          const active = t.value === value;
          return (
            <li key={t.value}>
              <Link
                href={t.href}
                scroll={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex h-10 items-center gap-1.5 whitespace-nowrap text-[13px] transition-colors",
                  "after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors",
                  active ? "font-medium text-white after:bg-white" : "text-fg-3 after:bg-transparent hover:text-white",
                )}
              >
                {t.label}
                {t.count !== undefined && t.count > 0 && <span className="text-xs tabular-nums text-fg-3">{t.count}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
