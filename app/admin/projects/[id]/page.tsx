import Link from "next/link";
import { notFound } from "next/navigation";
import { EyeOff, MessageSquare, Trash2 } from "lucide-react";

import { deleteUpdateAction } from "@/app/admin/_actions/projects";
import { MilestoneDialog } from "@/components/admin/MilestoneDialog";
import { MilestonesPanel } from "@/components/admin/MilestonesPanel";
import { ProjectQuickControls } from "@/components/admin/ProjectQuickControls";
import { ReferenceDialog } from "@/components/admin/ReferenceDialog";
import { ReferencesPanel } from "@/components/admin/ReferencesPanel";
import { TimeEntriesTable } from "@/components/admin/TimeEntriesTable";
import { UpdateDialog } from "@/components/admin/UpdateDialog";
import { ActionButton } from "@/components/shared/ActionButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { statusBadgeFor } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { resolveRateCents } from "@/lib/billing";
import { listClientOptions } from "@/lib/dal/admin/clients";
import { getProject } from "@/lib/dal/admin/projects";
import { listEntries } from "@/lib/dal/admin/time";
import { formatDate, formatDateTime, formatHours, formatMoney } from "@/lib/format";
import { getSettings } from "@/lib/services/settings";
import { PROJECT_STATUS, serviceLabel } from "@/lib/status";

const isUuid = (s: string) => /^[0-9a-f-]{36}$/.test(s);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = isUuid(id) ? await getProject(id) : null;
  return { title: data?.project.name ?? "Project" };
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await getProject(id);
  if (!data) notFound();
  const { project, client, loggedSeconds, milestones, updates, references } = data;

  const [entries, clients, settings] = await Promise.all([listEntries({ projectId: id, limit: 100 }), listClientOptions(), getSettings()]);
  const rate = resolveRateCents({ projectRateCents: project.rateCents, clientRateCents: client.defaultRateCents, defaultRateCents: settings.defaultRateCents });
  const unbilled = entries.filter((e) => e.entry.billable && !e.entry.invoiceId);
  const unbilledSeconds = unbilled.reduce((s, e) => s + (e.entry.durationSeconds ?? 0), 0);
  const budgetPct = project.budgetHours ? Math.round((loggedSeconds / 3600 / project.budgetHours) * 100) : null;

  return (
    <>
      <PageHeader
        back={{ href: `/admin/clients/${client.id}?tab=projects`, label: client.company || client.name }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {project.name}
            {statusBadgeFor(PROJECT_STATUS, project.status)}
            {!project.clientVisible && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-white/40">
                <EyeOff className="size-3.5" /> Hidden from client
              </span>
            )}
          </span>
        }
        description={project.description ?? serviceLabel(project.serviceType)}
        actions={<ProjectQuickControls key={project.updatedAt.toISOString()} project={project} clients={clients} defaultRateCents={settings.defaultRateCents} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>Updates</CardTitle>
                <CardDescription>Shown on the client&apos;s project page, newest first.</CardDescription>
              </div>
              <CardAction>
                <UpdateDialog projectId={id} clientVisible={project.clientVisible} />
              </CardAction>
            </CardHeader>
            <CardContent>
            <div>
              {updates.length === 0 ? (
                <EmptyState compact icon={MessageSquare} title="No updates yet" description="Share progress so your client always knows where things stand." />
              ) : (
                <ul className="divide-y divide-white/5">
                  {updates.map(({ update, authorName }) => (
                    <li key={update.id} className="group py-4">
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-white/40">
                        <span>
                          {authorName ?? "You"} · {formatDateTime(update.createdAt)}
                          {update.emailedAt && <span className="ml-2 text-success/80">· emailed</span>}
                        </span>
                        <ActionButton
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete update"
                          className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:text-danger"
                          action={deleteUpdateAction.bind(null, id, update.id)}
                          confirm={{ title: "Delete this update?", description: "It will disappear from the client's portal. Emails already sent can't be recalled.", confirmLabel: "Delete", destructive: true }}
                        >
                          <Trash2 />
                        </ActionButton>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-white/85">{update.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle>Time log</CardTitle>
                <CardDescription>{`${formatHours(loggedSeconds, 1)} total · ${formatHours(unbilledSeconds, 1)} unbilled`}</CardDescription>
              </div>
              <CardAction>
                {unbilledSeconds > 0 && (
                  <Link href={`/admin/invoices/new?client=${client.id}`} className="text-xs text-accent hover:underline">
                    Invoice unbilled time
                  </Link>
                )}
              </CardAction>
            </CardHeader>
            <CardContent className="p-0">
              <TimeEntriesTable entries={entries.map((e) => ({ ...e.entry, projectName: e.projectName, invoiceStatus: e.invoiceStatus }))} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Milestones</CardTitle>
              <CardAction>
                <MilestoneDialog projectId={id} />
              </CardAction>
            </CardHeader>
            <CardContent>
              <MilestonesPanel
                projectId={id}
                milestones={milestones.map((m) => ({
                  id: m.id,
                  title: m.title,
                  status: m.status,
                  dueDate: m.dueDate,
                  dueLabel: m.dueDate ? formatDate(m.dueDate, "MMM d") : null,
                }))}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>References</CardTitle>
              <CardAction>
                <ReferenceDialog projectId={id} />
              </CardAction>
            </CardHeader>
            <CardContent>
              <ReferencesPanel projectId={id} references={references} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4 text-sm">
              <div>
                <dt className="mb-2 flex justify-between text-xs uppercase tracking-wider text-white/40">
                  Progress <span className="tabular-nums text-white/70">{project.progressPct}%</span>
                </dt>
                <dd>
                  <Progress value={project.progressPct} className="h-2 bg-white/10" aria-label="Progress" />
                </dd>
              </div>
              {budgetPct !== null && (
                <div>
                  <dt className="mb-2 flex justify-between text-xs uppercase tracking-wider text-white/40">
                    Budget
                    <span className={`tabular-nums ${budgetPct > 100 ? "text-danger" : budgetPct >= 80 ? "text-accent" : "text-white/70"}`}>
                      {formatHours(loggedSeconds, 1)} / {project.budgetHours}h
                    </span>
                  </dt>
                  <dd>
                    <Progress
                      value={Math.min(100, budgetPct)}
                      className={`h-2 bg-white/10 ${budgetPct > 100 ? "[&>div]:bg-danger" : ""}`}
                      aria-label="Budget used"
                    />
                  </dd>
                </div>
              )}
              <Row label="Billing" value={project.billingType === "fixed" ? `Fixed · ${formatMoney(project.fixedPriceCents ?? 0)}` : `${formatMoney(rate)}/h${project.rateCents != null ? " (override)" : ""}`} />
              <Row label="Service" value={serviceLabel(project.serviceType)} />
              <Row label="Start" value={formatDate(project.startDate)} />
              <Row label="Due" value={formatDate(project.dueDate)} />
            </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-t border-white/5 pt-3">
      <dt className="text-white/40">{label}</dt>
      <dd className="text-right text-white/80">{value}</dd>
    </div>
  );
}
