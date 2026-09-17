import { Clock, Download } from "lucide-react";

import { PortalTimeTable } from "@/components/portal/PortalTimeTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{range.label}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
          {entries.length === 0 ? (
            <EmptyState icon={Clock} title="No hours this month" description="Time I log on your projects will appear here." />
          ) : (
            <PortalTimeTable entries={entries} showProject />
          )}
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
          <p className="text-4xl font-bold text-white">{formatHours(total, 1)}</p>
          <p className="mt-1 text-xs text-white/45">
            logged in {range.label}
            {noCharge > 0 && ` · ${formatHours(noCharge, 1)} at no charge`}
          </p>
          {byProject.size > 0 && (
            <ul className="mt-6 space-y-3 border-t border-white/5 pt-4">
              {[...byProject.entries()].map(([name, seconds]) => (
                <li key={name}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="truncate text-white/80">{name}</span>
                    <span className="tabular-nums text-white">{formatHours(seconds, 1)}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06]" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${Math.max(3, (seconds / total) * 100)}%`, background: "var(--color-chart-1)" }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
