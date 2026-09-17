import Link from "next/link";
import { FolderKanban } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { statusBadgeFor } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/lib/db/schema";
import { formatDate, formatHours } from "@/lib/format";
import { PROJECT_STATUS, serviceLabel } from "@/lib/status";

export function ProjectsList({
  rows,
  showClient,
  emptyAction,
}: {
  rows: { project: Project; clientName?: string; clientCompany?: string | null; loggedSeconds: number }[];
  showClient?: boolean;
  emptyAction?: React.ReactNode;
}) {
  if (!rows.length) {
    return <EmptyState compact icon={FolderKanban} title="No projects yet" action={emptyAction} />;
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {rows.map(({ project: p, clientName, clientCompany, loggedSeconds }) => (
        <li key={p.id}>
          <Link
            href={`/admin/projects/${p.id}`}
            className="group clay block h-full rounded-2xl bg-card p-4 transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-white group-hover:text-accent">{p.name}</p>
                <p className="truncate text-xs text-white/40">
                  {showClient ? `${clientCompany || clientName} · ` : ""}
                  {serviceLabel(p.serviceType)}
                  {!p.clientVisible && " · hidden from client"}
                </p>
              </div>
              {statusBadgeFor(PROJECT_STATUS, p.status)}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Progress value={p.progressPct} className="h-1.5 flex-1 bg-white/10" aria-label={`${p.progressPct}% complete`} />
              <span className="w-10 text-right text-xs tabular-nums text-white/50">{p.progressPct}%</span>
            </div>
            <p className="mt-2 text-xs text-white/40">
              {formatHours(loggedSeconds, 1)} logged
              {p.budgetHours ? ` of ${p.budgetHours}h` : ""}
              {p.dueDate ? ` · due ${formatDate(p.dueDate, "MMM d")}` : ""}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
