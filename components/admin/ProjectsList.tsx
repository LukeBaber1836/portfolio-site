import Link from "next/link";
import { EyeOff } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { statusBadgeFor } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/lib/db/schema";
import { formatDate, formatHours } from "@/lib/format";
import { PROJECT_STATUS_ADMIN, serviceLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

type Row = {
  project: Pick<Project, "id" | "name" | "status" | "progressPct" | "dueDate" | "budgetHours"> &
    Partial<Pick<Project, "serviceType" | "clientVisible">>;
  clientName?: string;
  clientCompany?: string | null;
  loggedSeconds: number;
};

/** Project rows (Linear-style list): name + context, status, progress, hours, due. Whole row is the link. */
export function ProjectsList({
  rows,
  showClient,
  emptyAction,
  emptyTitle = "No projects yet",
  className,
}: {
  rows: Row[];
  showClient?: boolean;
  emptyAction?: React.ReactNode;
  emptyTitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-surface", className)}>
      {!rows.length ? (
        <EmptyState compact title={emptyTitle} action={emptyAction} />
      ) : (
        <ul className="divide-y divide-line">
          {rows.map(({ project: p, clientName, clientCompany, loggedSeconds }) => {
            const sub = [showClient ? clientCompany || clientName : null, p.serviceType ? serviceLabel(p.serviceType) : null].filter(Boolean).join(" · ");
            return (
              <li key={p.id}>
                <Link
                  href={`/admin/projects/${p.id}`}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-white/[0.025] focus-visible:bg-white/[0.03] focus-visible:outline-none md:grid-cols-[minmax(0,1fr)_150px_120px_110px_64px]"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">{p.name}</span>
                      {p.clientVisible === false && <EyeOff className="size-3.5 shrink-0 text-fg-3" aria-label="Hidden from client" />}
                    </span>
                    {sub && <span className="block truncate text-xs text-fg-3">{sub}</span>}
                  </span>
                  <span className="justify-self-end md:justify-self-start">{statusBadgeFor(PROJECT_STATUS_ADMIN, p.status)}</span>
                  <span className="col-span-2 flex items-center gap-2 md:col-span-1">
                    <Progress value={p.progressPct} className="h-1 flex-1" aria-label={`${p.progressPct}% complete`} />
                    <span className="w-8 text-right text-xs tabular-nums text-fg-2">{p.progressPct}%</span>
                  </span>
                  <span className="hidden text-right text-xs tabular-nums text-fg-2 md:block">
                    {formatHours(loggedSeconds, 1)}
                    {p.budgetHours ? <span className="text-fg-3"> / {p.budgetHours}h</span> : null}
                  </span>
                  <span className="hidden text-right text-xs text-fg-3 md:block">{p.dueDate ? formatDate(p.dueDate, "MMM d") : "—"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
