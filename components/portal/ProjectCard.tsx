import Link from "next/link";

import { statusBadgeFor } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatHours } from "@/lib/format";
import { PROJECT_STATUS, serviceLabel } from "@/lib/status";

/** Client-facing project summary: name, stage, progress, and the one or two facts that matter. */
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
  const facts = [
    p.milestonesTotal ? `${p.milestonesDone}/${p.milestonesTotal} milestones` : null,
    showBudget && p.budgetHours ? `${formatHours(p.loggedSeconds, 1)} of ${p.budgetHours}h` : `${formatHours(p.loggedSeconds, 1)} logged`,
    p.dueDate ? `Target ${formatDate(p.dueDate, "MMM d")}` : null,
  ].filter(Boolean);
  return (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-lg border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-fg-3">{eyebrow ?? serviceLabel(p.serviceType)}</p>
          <p className="mt-0.5 truncate text-[15px] font-medium text-white">{p.name}</p>
        </div>
        {statusBadgeFor(PROJECT_STATUS, p.status)}
      </div>
      <div className="mt-5 flex items-center gap-3">
        <Progress value={p.progressPct} className="flex-1" aria-label={`${p.progressPct}% complete`} />
        <span className="text-xs tabular-nums text-fg-2">{p.progressPct}%</span>
      </div>
      <p className="mt-3 text-xs text-fg-3">{facts.join(" · ")}</p>
    </Link>
  );
}
