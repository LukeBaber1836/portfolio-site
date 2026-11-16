import Link from "next/link";

import { ProjectsList } from "@/components/admin/ProjectsList";
import { WeeklyHoursChart } from "@/components/admin/WeeklyHoursChart";
import { AttentionList, type AttentionItem } from "@/components/shared/AttentionList";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionHeader, SectionLink } from "@/components/shared/SectionHeader";
import { Stat, StatStrip } from "@/components/shared/StatStrip";
import { Button } from "@/components/ui/button";
import { fillWeeks } from "@/lib/charts";
import { pendingInviteCount } from "@/lib/dal/admin/clients";
import { activeProjectsSummary, newRequestCount, recentPayments, weeklyHours } from "@/lib/dal/admin/dashboard";
import { receivablesSummary } from "@/lib/dal/admin/invoices";
import { formatDate, formatHours, formatMoney, formatRelative } from "@/lib/format";

export const metadata = { title: "Dashboard" };

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default async function AdminDashboard() {
  const [ar, weeks, projects, payments, pendingInvites, newRequests] = await Promise.all([
    receivablesSummary(),
    weeklyHours(8),
    activeProjectsSummary(),
    recentPayments(),
    pendingInviteCount(),
    newRequestCount(),
  ]);
  const filled = fillWeeks(weeks, 8);
  const thisWeek = filled.at(-1)!;
  const lastWeek = filled.at(-2);
  const thisWeekSeconds = thisWeek.billable + thisWeek.nonBillable;
  const lastWeekSeconds = lastWeek ? lastWeek.billable + lastWeek.nonBillable : 0;
  const inReview = projects.filter((p) => p.status === "review");

  const attention: AttentionItem[] = [
    ar.overdueCount > 0 && {
      key: "overdue",
      tone: "danger" as const,
      text: (
        <>
          <strong>{plural(ar.overdueCount, "invoice")}</strong> overdue · {formatMoney(ar.overdueCents)}
        </>
      ),
      href: "/admin/invoices?status=overdue",
      cta: "Review",
    },
    newRequests > 0 && {
      key: "requests",
      tone: "attention" as const,
      text: (
        <>
          <strong>{plural(newRequests, "new request")}</strong> from clients
        </>
      ),
      href: "/admin/requests",
      cta: "Open",
    },
    ...inReview.map((p) => ({
      key: `review-${p.id}`,
      tone: "attention" as const,
      text: (
        <>
          <strong>{p.name}</strong> is waiting on {p.clientName}&apos;s review
        </>
      ),
      href: `/admin/projects/${p.id}`,
    })),
    ar.unbilledCents > 0 && {
      key: "unbilled",
      tone: "neutral" as const,
      text: (
        <>
          <strong>{formatMoney(ar.unbilledCents)}</strong> of unbilled work · {formatHours(ar.unbilledSeconds, 1)}
        </>
      ),
      href: "/admin/invoices/new",
      cta: "Invoice",
    },
    pendingInvites > 0 && {
      key: "invites",
      tone: "neutral" as const,
      text: <>{plural(pendingInvites, "client invite")} not accepted yet</>,
      href: "/admin/clients",
    },
  ].filter(Boolean) as AttentionItem[];

  return (
    <>
      <PageHeader
        title="Dashboard"
        meta={[formatDate(new Date(), "EEEE, MMMM d")]}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/clients/new">
                New client
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/invoices/new">New invoice</Link>
            </Button>
          </>
        }
      />

      <StatStrip>
        <Stat
          label="Hours this week"
          value={formatHours(thisWeekSeconds, 1)}
          hint={lastWeek ? `${formatHours(lastWeekSeconds, 1)} last week` : undefined}
          href="/admin/time"
        />
        <Stat label="Unbilled" value={formatMoney(ar.unbilledCents)} hint={formatHours(ar.unbilledSeconds, 1)} href="/admin/invoices/new" />
        <Stat label="Outstanding" value={formatMoney(ar.outstandingCents)} hint={plural(ar.openCount, "open invoice")} href="/admin/invoices?status=open" />
        <Stat
          label="Overdue"
          value={formatMoney(ar.overdueCents)}
          tone={ar.overdueCount ? "danger" : "default"}
          hint={ar.overdueCount ? plural(ar.overdueCount, "invoice") : "None"}
          href="/admin/invoices?status=overdue"
        />
      </StatStrip>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHeader title="Needs attention" count={attention.length || undefined} />
          <AttentionList items={attention} />
        </section>

        <section>
          <SectionHeader title="Recent payments" action={<SectionLink href="/admin/invoices?status=paid">All</SectionLink>} />
          {payments.length === 0 ? (
            <p className="rounded-lg border border-line bg-surface px-4 py-3 text-[13px] text-fg-3">No payments yet.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
              {payments.map(({ invoice, clientName }) => (
                <li key={invoice.id}>
                  <Link
                    href={`/admin/invoices/${invoice.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.025]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-white">{clientName}</span>
                      <span className="block text-xs text-fg-3">
                        {invoice.number ?? "Invoice"}
                        {invoice.paidAt ? ` · ${formatRelative(invoice.paidAt)}` : ""}
                      </span>
                    </span>
                    <span className="text-[13px] tabular-nums text-white">{formatMoney(invoice.amountPaidCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionHeader title="Active projects" count={projects.length || undefined} action={<SectionLink href="/admin/projects">All projects</SectionLink>} />
          <ProjectsList
            rows={projects.map((p) => ({ project: p, clientName: p.clientName, loggedSeconds: p.loggedSeconds }))}
            showClient
            emptyTitle={pendingInvites ? `No active projects · ${plural(pendingInvites, "invite")} pending` : "No active projects"}
            emptyAction={
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/projects?new=1">New project</Link>
              </Button>
            }
          />
        </section>

        <section>
          <SectionHeader title="Hours per week" action={<SectionLink href="/admin/time">Timesheet</SectionLink>} />
          <div className="rounded-lg border border-line bg-surface p-4">
            <WeeklyHoursChart weeks={filled} />
          </div>
        </section>
      </div>
    </>
  );
}
