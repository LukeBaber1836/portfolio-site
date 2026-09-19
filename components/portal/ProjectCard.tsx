import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { statusBadgeFor } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatHours } from "@/lib/format";
import { PROJECT_STATUS, serviceLabel } from "@/lib/status";

export function ProjectCard({
  project,
  href = `/portal/projects/${project.id}`,
  eyebrow,
  showBudget = false,
}: {
  project: {
    id: string;
    name: string;
    status: string;
    progressPct: number;
    serviceType?: string;
    dueDate: string | null;
    budgetHours: number | null;
    loggedSeconds: number;
    milestonesDone?: number;
    milestonesTotal?: number;
  };
  /** Where the card links. Defaults to the client portal project page. */
  href?: string;
  /** Small line above the name. Defaults to the service type. */
  eyebrow?: string;
  /** Show hours against budget (admin only — clients don't see budgets). */
  showBudget?: boolean;
}) {
  const p = project;
  const budgetPct = showBudget && p.budgetHours ? Math.min(100, Math.round((p.loggedSeconds / 3600 / p.budgetHours) * 100)) : null;
  return (
    <Link
      href={href}
      className="clay group relative block h-full rounded-2xl bg-card p-5 transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-white/40">{eyebrow ?? serviceLabel(p.serviceType)}</p>
          <p className="mt-1 truncate text-lg font-semibold text-white transition-colors group-hover:text-accent">{p.name}</p>
        </div>
        <ArrowUpRight className="size-5 shrink-0 text-white/25 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <div className="mt-3">{statusBadgeFor(PROJECT_STATUS, p.status)}</div>
      <div className="mt-5 flex items-center gap-3">
        <Progress value={p.progressPct} className="h-2 flex-1 bg-white/10" aria-label={`${p.progressPct}% complete`} />
        <span className="w-10 text-right text-sm font-semibold tabular-nums text-white">{p.progressPct}%</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/45">
        <span>{formatHours(p.loggedSeconds, 1)} logged</span>
        {budgetPct !== null && (
          <span>
            {budgetPct}% of {p.budgetHours}h budget
          </span>
        )}
        {p.milestonesTotal ? (
          <span>
            {p.milestonesDone}/{p.milestonesTotal} milestones
          </span>
        ) : null}
        {p.dueDate && <span>Target {formatDate(p.dueDate, "MMM d")}</span>}
      </div>
    </Link>
  );
}
