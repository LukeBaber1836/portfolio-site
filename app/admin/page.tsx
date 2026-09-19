import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock, DollarSign, FolderKanban, UserPlus, Wallet } from "lucide-react";

import { WeeklyHoursChart } from "@/components/admin/WeeklyHoursChart";
import { ProjectCard } from "@/components/portal/ProjectCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiTile } from "@/components/shared/KpiTile";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionBar } from "@/components/shared/SectionBar";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/guards";
import { fillWeeks } from "@/lib/charts";
import { pendingInviteCount } from "@/lib/dal/admin/clients";
import { activeProjectsSummary, recentPayments, weeklyHours } from "@/lib/dal/admin/dashboard";
import { receivablesSummary } from "@/lib/dal/admin/invoices";
import { formatDate, formatHours, formatMoney, formatRelative } from "@/lib/format";

export const metadata = { title: "Dashboard" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Chicago" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function AdminDashboard() {
  const { user } = await requireAdmin();
  const [ar, weeks, projects, payments, pendingInvites] = await Promise.all([
    receivablesSummary(),
    weeklyHours(8),
    activeProjectsSummary(),
    recentPayments(),
    pendingInviteCount(),
  ]);
  const filled = fillWeeks(weeks, 8);
  const thisWeek = filled.at(-1)!;
  const thisWeekSeconds = thisWeek.billable + thisWeek.nonBillable;

  return (
    <>
      <PageHeader
        eyebrow={formatDate(new Date(), "EEEE, MMMM d")}
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/clients/new">
                <UserPlus /> New client
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/invoices/new">New invoice</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Hours this week" value={formatHours(thisWeekSeconds, 1)} icon={Clock} href="/admin/time" />
        <KpiTile
          label="Unbilled work"
          value={formatMoney(ar.unbilledCents)}
          icon={Wallet}
          tone="gold"
          href="/admin/invoices/new"
        />
        <KpiTile
          label="Outstanding"
          value={formatMoney(ar.outstandingCents)}
          icon={DollarSign}
          href="/admin/invoices?status=open"
        />
        <KpiTile
          label="Overdue"
          value={formatMoney(ar.overdueCents)}
          icon={AlertTriangle}
          tone={ar.overdueCount ? "danger" : "default"}
          href="/admin/invoices?status=overdue"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Hours per week</CardTitle>
              <CardDescription>Last 8 weeks</CardDescription>
            </div>
            <CardAction>
              <Link href="/admin/time" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-accent">
                Timesheet <ArrowRight className="size-3" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent>
            <WeeklyHoursChart weeks={filled} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
          {payments.length === 0 ? (
            <EmptyState compact icon={DollarSign} title="No payments yet" description="Paid invoices will show up here." />
          ) : (
            <ul className="divide-y divide-white/5">
              {payments.map(({ invoice, clientName }) => (
                <li key={invoice.id}>
                  <Link href={`/admin/invoices/${invoice.id}`} className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/[0.03]">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-white">{clientName}</span>
                      <span className="block text-xs text-white/40">
                        {invoice.number ?? "Invoice"} · {invoice.paidAt ? formatRelative(invoice.paidAt) : ""}
                      </span>
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-success">{formatMoney(invoice.amountPaidCents)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          </CardContent>
        </Card>
      </div>

      <section className="mt-6 space-y-4">
        <SectionBar
          title="Active projects"
          action={
            <Link href="/admin/projects" className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-accent">
              All projects <ArrowRight className="size-3" />
            </Link>
          }
        />
        {projects.length === 0 ? (
          <Card>
            <CardContent>
              <EmptyState
                icon={FolderKanban}
                title="No active projects"
                description={pendingInvites ? `${pendingInvites} client ${pendingInvites === 1 ? "invite is" : "invites are"} still pending.` : "Create a client, then add their first project."}
                action={
                  <Button asChild size="sm">
                    <Link href="/admin/projects?new=1">New project</Link>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                href={`/admin/projects/${p.id}`}
                eyebrow={p.clientName}
                showBudget
              />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
