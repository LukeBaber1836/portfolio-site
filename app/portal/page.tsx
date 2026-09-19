import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, Flag, FolderKanban, MessageSquare, Receipt, Wallet } from "lucide-react";

import { ProjectCard } from "@/components/portal/ProjectCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { KpiTile } from "@/components/shared/KpiTile";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireClient } from "@/lib/auth/guards";
import { isOverdue } from "@/lib/billing";
import { portalActivity, portalOverview } from "@/lib/dal/portal";
import { formatDate, formatDuration, formatHours, formatMoney, formatRelative } from "@/lib/format";

export const metadata = { title: "Overview" };

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Chicago" }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export default async function PortalOverview() {
  const { user } = await requireClient();
  const [overview, activity] = await Promise.all([portalOverview(), portalActivity(10)]);
  const { client, projects, openInvoices, outstandingCents, hoursThisMonthSeconds, nextMilestone } = overview;
  const active = projects.filter((p) => ["planned", "in_progress", "review"].includes(p.status));
  const needsReview = projects.filter((p) => p.status === "review");
  const firstOpen = openInvoices[0];
  const overdue = openInvoices.some((i) => isOverdue(i.status, i.dueDate));

  return (
    <>
      <PageHeader
        eyebrow={client.company ?? undefined}
        title={`${greeting()}, ${user.name.split(" ")[0]}`}
        description="Here's where your projects stand."
      />

      {needsReview.length > 0 && (
        <div className="app-enter mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent/30 bg-accent/[0.07] px-5 py-4">
          <p className="text-sm text-white">
            <span className="font-semibold text-accent">Your review is needed</span> on {needsReview.map((p) => p.name).join(", ")}.
          </p>
          <Button asChild size="sm" variant="goldOutline">
            <Link href={`/portal/projects/${needsReview[0]!.id}`}>Take a look</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile label="Active projects" value={String(active.length)} icon={FolderKanban} href="/portal/projects" />
        <KpiTile label="Hours this month" value={formatHours(hoursThisMonthSeconds, 1)} icon={Clock} href="/portal/hours" />
        <KpiTile
          label={overdue ? "Past due" : "Balance due"}
          value={formatMoney(outstandingCents)}
          icon={Wallet}
          tone={overdue ? "danger" : outstandingCents ? "gold" : "success"}
          hint={outstandingCents ? `${openInvoices.length} open ${openInvoices.length === 1 ? "invoice" : "invoices"}` : undefined}
          action={
            firstOpen && (
              <Button asChild size="sm" className="h-8 px-3 text-xs">
                <Link href={`/portal/invoices/${firstOpen.id}`}>
                  <CreditCard /> Pay
                </Link>
              </Button>
            )
          }
        />
        <KpiTile
          label="Next milestone"
          value={
            nextMilestone?.dueDate
              ? formatDate(nextMilestone.dueDate, "MMM d")
              : nextMilestone
                ? `${nextMilestone.title} · ${nextMilestone.projectName}`
                : "—"
          }
          icon={Flag}
          hint={
            !nextMilestone
              ? "No upcoming milestones"
              : nextMilestone.dueDate
                ? `${nextMilestone.title} · ${nextMilestone.projectName}`
                : undefined
          }
          href={nextMilestone ? `/portal/projects/${nextMilestone.projectId}` : undefined}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-4 flex w-full items-center rounded-full clay bg-card px-5 py-2.5 text-sm font-semibold text-white">
            Your projects
          </div>
          {projects.length === 0 ? (
            <EmptyState icon={FolderKanban} title="No projects yet" description="Once we kick things off, your projects and progress will show up here." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {projects.slice(0, 4).map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )}
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="p-2">
          {activity.length === 0 ? (
            <EmptyState compact icon={MessageSquare} title="Nothing yet" />
          ) : (
            <ol className="space-y-1">
              {activity.map((a, i) => {
                const icon =
                  a.kind === "update" ? (
                    <MessageSquare className="size-4 text-accent" />
                  ) : a.kind === "milestone" ? (
                    <CheckCircle2 className="size-4 text-success" />
                  ) : a.kind === "time" ? (
                    <Clock className="size-4 text-info" />
                  ) : (
                    <Receipt className="size-4 text-white/60" />
                  );
                const href = a.kind === "invoice" ? `/portal/invoices/${a.invoiceId}` : `/portal/projects/${a.projectId}`;
                return (
                  <li key={i}>
                    <Link href={href} className="flex gap-3 rounded-xl p-3 transition-colors hover:bg-white/[0.03]">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5">{icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-6 text-white/85">
                          {a.kind === "update" && (
                            <>
                              Update on <strong className="font-medium text-white">{a.projectName}</strong>
                            </>
                          )}
                          {a.kind === "milestone" && (
                            <>
                              Milestone done: <strong className="font-medium text-white">{a.title}</strong>
                            </>
                          )}
                          {a.kind === "time" && (
                            <>
                              {formatDuration(a.seconds)} on <strong className="font-medium text-white">{a.projectName}</strong>
                            </>
                          )}
                          {a.kind === "invoice" && (
                            <>
                              Invoice {a.number} {a.status === "paid" ? "paid" : a.status === "void" ? "voided" : "sent"} ·{" "}
                              <strong className="font-medium text-white">{formatMoney(a.amountCents)}</strong>
                            </>
                          )}
                        </span>
                        {(a.kind === "update" || a.kind === "time") && (
                          <span className="line-clamp-2 block text-xs leading-5 text-white/45">{a.kind === "update" ? a.body : a.description}</span>
                        )}
                        <span className="block text-xs text-white/30">{formatRelative(a.at)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
