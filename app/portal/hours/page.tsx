import { Download } from "lucide-react";

import { PortalTimeTable } from "@/components/portal/PortalTimeTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SlidingTabs } from "@/components/shared/SlidingTabs";
import { Button } from "@/components/ui/button";
import { portalHourMonths, portalHours } from "@/lib/dal/portal";
import { formatDate, formatHours } from "@/lib/format";
import { monthRange } from "@/lib/portal-months";

export const metadata = { title: "Hours" };

export default async function PortalHoursPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams;
  const range = monthRange(month);
  const [entries, months] = await Promise.all([portalHours(range), portalHourMonths()]);

  const tabs = [...new Set([monthRange().key, ...months])].sort().reverse().slice(0, 6);
  if (!tabs.includes(range.key)) tabs.push(range.key);

  const total = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  const noCharge = entries.filter((e) => !e.billable).reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  const byProject = new Map<string, number>();
  for (const e of entries) byProject.set(e.projectName, (byProject.get(e.projectName) ?? 0) + (e.durationSeconds ?? 0));

  return (
    <>
      <PageHeader
        title="Hours"
        actions={
          entries.length > 0 && (
            <Button asChild variant="outline" size="sm">
              <a href={`/portal/hours/export?month=${range.key}`} download>
                <Download /> Export CSV
              </a>
            </Button>
          )
        }
      />

      <div className="mb-6 overflow-x-auto scrollbar-hide">
        <SlidingTabs
          value={range.key}
          items={tabs.map((t) => ({ value: t, label: formatDate(`${t}-01`, "MMM yyyy"), href: `/portal/hours?month=${t}` }))}
        />
      </div>

      {entries.length === 0 ? (
        <div className="rounded-lg border border-line bg-surface">
          <EmptyState title={`No hours in ${range.label}`} description="Time I log on your projects shows up here." />
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_272px]">
          <div className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface">
            <PortalTimeTable entries={entries} showProject />
          </div>

          <aside className="self-start">
            <p className="text-xs text-fg-3">Total for {range.label}</p>
            <p className="mt-1 text-2xl font-medium tabular-nums text-white">{formatHours(total, 1)}</p>
            {noCharge > 0 && <p className="mt-1 text-xs text-fg-3">{formatHours(noCharge, 1)} of that at no charge</p>}
            {byProject.size > 1 && (
              <ul className="mt-6 space-y-3 border-t border-line pt-5">
                {[...byProject.entries()].map(([name, seconds]) => (
                  <li key={name}>
                    <div className="mb-1.5 flex justify-between gap-3 text-[13px]">
                      <span className="truncate text-fg-2">{name}</span>
                      <span className="tabular-nums text-white">{formatHours(seconds, 1)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.06]" aria-hidden>
                      <div className="gold-bar h-full rounded-full" style={{ width: `${Math.max(3, (seconds / total) * 100)}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
