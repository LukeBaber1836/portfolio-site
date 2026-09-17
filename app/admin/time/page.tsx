import Link from "next/link";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Timesheet, type TimesheetRow } from "@/components/admin/Timesheet";
import { timeStatusKey } from "@/components/admin/TimeEntriesTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidingTabs } from "@/components/shared/SlidingTabs";
import { Button } from "@/components/ui/button";
import { listProjectOptions } from "@/lib/dal/admin/projects";
import { listEntries, weekGrid } from "@/lib/dal/admin/time";
import { formatDate, formatDuration, formatHours, formatMoney, formatTime, inBusinessTz, todayIso } from "@/lib/format";
import { weekRange } from "@/lib/portal-months";
import { cn } from "@/lib/utils";

export const metadata = { title: "Time" };

export default async function TimePage({ searchParams }: { searchParams: Promise<{ week?: string; status?: string }> }) {
  const { week, status: rawStatus } = await searchParams;
  const status = (["unbilled", "invoiced", "no_charge"].includes(rawStatus ?? "") ? rawStatus : "all") as "all" | "unbilled" | "invoiced" | "no_charge";

  // Weeks run Monday–Sunday in the business timezone.
  const { startIso: weekStartIso, currentMondayIso, start: weekStart, end: weekEnd, days, prevIso: prevWeek, nextIso: nextWeek } = weekRange(week);
  const today = todayIso();
  const isCurrentWeek = days.includes(today);

  const [grid, entries, projects] = await Promise.all([
    weekGrid(weekStart),
    listEntries({ from: weekStart, to: weekEnd, status: status === "all" ? undefined : status }),
    listProjectOptions(),
  ]);

  // Pivot the grid: one row per project, one column per day.
  const byProject = new Map<string, { name: string; client: string; days: Record<string, number>; total: number }>();
  for (const cell of grid) {
    const row = byProject.get(cell.projectId) ?? { name: cell.projectName, client: cell.clientName, days: {}, total: 0 };
    row.days[cell.day] = (row.days[cell.day] ?? 0) + cell.seconds;
    row.total += cell.seconds;
    byProject.set(cell.projectId, row);
  }
  const dayTotals = days.map((d) => grid.filter((c) => c.day === d).reduce((s, c) => s + c.seconds, 0));
  const weekTotal = dayTotals.reduce((a, b) => a + b, 0);

  const rows: TimesheetRow[] = entries.map(({ entry, projectName, clientName, clientCompany, invoiceStatus }) => {
    const seconds = entry.durationSeconds ?? 0;
    const start = inBusinessTz(entry.startedAt);
    const end = entry.endedAt ? inBusinessTz(entry.endedAt) : start;
    return {
      id: entry.id,
      projectId: entry.projectId,
      date: format(start, "yyyy-MM-dd"),
      startTime: format(start, "HH:mm"),
      endTime: format(end, "HH:mm"),
      description: entry.description ?? "",
      billable: entry.billable,
      dateLabel: formatDate(entry.startedAt, "EEE, MMM d"),
      timeLabel: `${formatTime(entry.startedAt)}–${formatTime(entry.endedAt)}`,
      durationLabel: formatDuration(seconds),
      amountLabel: entry.billable && entry.rateCents != null ? formatMoney(Math.round((seconds / 3600) * entry.rateCents)) : "—",
      projectName,
      clientName: clientCompany || clientName,
      status: timeStatusKey({ ...entry, invoiceStatus }) as TimesheetRow["status"],
      editable: !entry.invoiceId,
    };
  });

  const href = (params: { week?: string; status?: string }) => {
    const sp = new URLSearchParams();
    const w = params.week ?? weekStartIso;
    const s = params.status ?? status;
    if (w !== currentMondayIso) sp.set("week", w);
    if (s !== "all") sp.set("status", s);
    return `/admin/time${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Time"
        actions={
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon-sm" aria-label="Previous week">
              <Link href={href({ week: prevWeek })}>
                <ChevronLeft />
              </Link>
            </Button>
            <span className="min-w-44 text-center text-sm text-white">
              {formatDate(days[0]!, "MMM d")} – {formatDate(days[6]!, "MMM d, yyyy")}
            </span>
            <Button asChild variant="ghost" size="icon-sm" aria-label="Next week">
              <Link href={href({ week: nextWeek })}>
                <ChevronRight />
              </Link>
            </Button>
            {!isCurrentWeek && (
              <Button asChild variant="outline" size="sm" className="ml-2">
                <Link href="/admin/time">This week</Link>
              </Button>
            )}
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Week at a glance</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-white/5 text-[11px] uppercase tracking-wider text-white/40">
              <th className="px-5 py-3 text-left font-medium">Project</th>
              {days.map((d) => (
                <th key={d} className={cn("px-2 py-3 text-center font-medium", d === today && "text-accent")}>
                  <span className="block">{formatDate(d, "EEE")}</span>
                  <span className="block text-white/30">{formatDate(d, "d")}</span>
                </th>
              ))}
              <th className="px-5 py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {byProject.size === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-8 text-center text-sm text-white/40">
                  Nothing logged this week yet.
                </td>
              </tr>
            ) : (
              [...byProject.entries()].map(([id, row]) => (
                <tr key={id} className="border-b border-white/5">
                  <td className="px-5 py-3">
                    <Link href={`/admin/projects/${id}`} className="block text-white hover:text-accent">
                      {row.name}
                    </Link>
                    <span className="text-xs text-white/40">{row.client}</span>
                  </td>
                  {days.map((d) => (
                    <td key={d} className="px-2 py-3 text-center tabular-nums">
                      {row.days[d] ? <span className="text-white/85">{(row.days[d]! / 3600).toFixed(1)}</span> : <span className="text-white/15">·</span>}
                    </td>
                  ))}
                  <td className="px-5 py-3 text-right font-medium tabular-nums text-white">{formatHours(row.total, 1)}</td>
                </tr>
              ))
            )}
          </tbody>
          {byProject.size > 0 && (
            <tfoot>
              <tr className="text-white/60">
                <td className="px-5 py-3 text-xs uppercase tracking-wider">Daily total</td>
                {dayTotals.map((s, i) => (
                  <td key={days[i]} className="px-2 py-3 text-center tabular-nums">
                    {s ? (s / 3600).toFixed(1) : ""}
                  </td>
                ))}
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-accent">{formatHours(weekTotal, 1)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        </CardContent>
      </Card>

      <div className="mb-4 mt-8">
        <SlidingTabs
          value={status}
          items={[
            { value: "all", label: "All", href: href({ status: "all" }) },
            { value: "unbilled", label: "Unbilled", href: href({ status: "unbilled" }) },
            { value: "invoiced", label: "Invoiced", href: href({ status: "invoiced" }) },
            { value: "no_charge", label: "No charge", href: href({ status: "no_charge" }) },
          ]}
        />
      </div>
      <Card>
        <CardContent className="overflow-hidden p-0">
          <Timesheet rows={rows} projects={projects} today={today} />
        </CardContent>
      </Card>
    </>
  );
}
