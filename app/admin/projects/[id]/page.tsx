import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, EyeOff, Trash2 } from "lucide-react";

import { deleteUpdateAction } from "@/app/admin/_actions/projects";
import { ClientSocialsList } from "@/components/admin/ClientSocialsCard";
import { DomainsForm } from "@/components/admin/DomainsForm";
import { MilestoneDialog } from "@/components/admin/MilestoneDialog";
import { MilestonesPanel } from "@/components/admin/MilestonesPanel";
import { ProjectQuickControls } from "@/components/admin/ProjectQuickControls";
import { ReferenceDialog } from "@/components/admin/ReferenceDialog";
import { ReferencesPanel } from "@/components/admin/ReferencesPanel";
import { SiteFeedbackPanel } from "@/components/admin/SiteFeedbackPanel";
import { TimeEntriesTable } from "@/components/admin/TimeEntriesTable";
import { UpdateDialog } from "@/components/admin/UpdateDialog";
import { ActionButton } from "@/components/shared/ActionButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Property, PropertyList, RailSection } from "@/components/shared/PropertyList";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { statusBadgeFor } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { resolveRateCents } from "@/lib/billing";
import { listClientOptions } from "@/lib/dal/admin/clients";
import { getProject } from "@/lib/dal/admin/projects";
import { listSiteComments } from "@/lib/dal/admin/site-comments";
import { listEntries } from "@/lib/dal/admin/time";
import { formatDate, formatDateTime, formatHours, formatMoney } from "@/lib/format";
import { getSettings } from "@/lib/services/settings";
import { PROJECT_STATUS_ADMIN, serviceLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

const isUuid = (s: string) => /^[0-9a-f-]{36}$/.test(s);
const panel = "overflow-hidden rounded-lg border border-line bg-surface";

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

  const [entries, clients, settings, siteFeedback] = await Promise.all([
    listEntries({ projectId: id, limit: 100 }),
    listClientOptions(),
    getSettings(),
    listSiteComments(id),
  ]);
  const openFeedback = siteFeedback.filter((c) => c.status === "open").length;
  const hasSite = !!(project.productionUrl || project.devUrl);
  const rate = resolveRateCents({ projectRateCents: project.rateCents, clientRateCents: client.defaultRateCents, defaultRateCents: settings.defaultRateCents });
  const unbilled = entries.filter((e) => e.entry.billable && !e.entry.invoiceId);
  const unbilledSeconds = unbilled.reduce((s, e) => s + (e.entry.durationSeconds ?? 0), 0);
  const budgetPct = project.budgetHours ? Math.round((loggedSeconds / 3600 / project.budgetHours) * 100) : null;
  const billing = project.billingType === "fixed" ? `Fixed ${formatMoney(project.fixedPriceCents ?? 0)}` : `${formatMoney(rate)}/h${project.rateCents != null ? " (override)" : ""}`;
  const clientLabel = client.company || client.name;

  return (
    <>
      <PageHeader
        back={{ href: `/admin/clients/${client.id}?tab=projects`, label: clientLabel }}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {project.name}
            {statusBadgeFor(PROJECT_STATUS_ADMIN, project.status)}
            {!project.clientVisible && (
              <span className="inline-flex items-center gap-1 text-xs font-normal text-fg-3">
                <EyeOff className="size-3.5" aria-hidden /> Hidden from client
              </span>
            )}
          </span>
        }
        meta={[
          <Link key="client" href={`/admin/clients/${client.id}`} className="hover:text-white hover:underline">
            {clientLabel}
          </Link>,
          serviceLabel(project.serviceType),
          billing,
          project.dueDate ? `Due ${formatDate(project.dueDate, "MMM d")}` : null,
        ]}
        description={project.description}
        actions={<ProjectQuickControls key={project.updatedAt.toISOString()} project={project} clients={clients} defaultRateCents={settings.defaultRateCents} />}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-8">
          <section>
            <SectionHeader title="Updates" count={updates.length || undefined} action={<UpdateDialog projectId={id} clientVisible={project.clientVisible} />} />
            <div className={panel}>
              {updates.length === 0 ? (
                <EmptyState compact title="No updates yet" description="Share progress so your client always knows where things stand." />
              ) : (
                <ul className="scrollbar-subtle max-h-[520px] divide-y divide-line overflow-y-auto">
                  {updates.map(({ update, authorName }) => (
                    <li key={update.id} className="group px-4 py-3">
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs text-fg-3">
                        <span>
                          {authorName ?? "You"} · {formatDateTime(update.createdAt)}
                          {update.emailedAt && " · emailed"}
                        </span>
                        <ActionButton
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete update"
                          className="-my-1 size-7 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 hover:bg-danger/10 hover:text-danger"
                          action={deleteUpdateAction.bind(null, id, update.id)}
                          confirm={{ title: "Delete this update?", description: "It will disappear from the client's portal. Emails already sent can't be recalled.", confirmLabel: "Delete", destructive: true }}
                        >
                          <Trash2 />
                        </ActionButton>
                      </div>
                      <p className="whitespace-pre-wrap text-[13px] leading-6 text-white/85">{update.body}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section>
            <SectionHeader
              title="Site feedback"
              count={openFeedback || undefined}
              action={
                <span className="flex items-center gap-3">
                  {siteFeedback.length > 0 && (
                    <span className="text-xs text-fg-3">
                      {openFeedback} open · {siteFeedback.length - openFeedback} resolved
                    </span>
                  )}
                  {hasSite && (
                    <a
                      href={`/admin/projects/${id}/review`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md text-xs text-fg-2 transition-colors hover:text-white"
                    >
                      Open site review <ExternalLink className="size-3" aria-hidden />
                    </a>
                  )}
                </span>
              }
            />
            <div className={cn(panel, siteFeedback.length && "scrollbar-subtle max-h-[560px] overflow-y-auto")}>
              <SiteFeedbackPanel projectId={id} items={siteFeedback} hasSite={hasSite} />
            </div>
          </section>

          <section>
            <SectionHeader
              title="Time log"
              action={
                <span className="flex items-center gap-3 text-xs text-fg-3">
                  <span className="tabular-nums">
                    {formatHours(loggedSeconds, 1)} total · {formatHours(unbilledSeconds, 1)} unbilled
                  </span>
                  {unbilledSeconds > 0 && (
                    <Link href={`/admin/invoices/new?client=${client.id}`} className="text-fg-2 transition-colors hover:text-white">
                      Invoice it →
                    </Link>
                  )}
                </span>
              }
            />
            <div className={panel}>
              <TimeEntriesTable entries={entries.map((e) => ({ ...e.entry, projectName: e.projectName, invoiceStatus: e.invoiceStatus }))} />
            </div>
          </section>

          <section>
            <SectionHeader title="References" count={references.length || undefined} action={<ReferenceDialog projectId={id} />} />
            <ReferencesPanel projectId={id} references={references} />
          </section>
        </div>

        <aside className="lg:border-l lg:border-line lg:pl-6">
          <RailSection title="Progress">
            <div className="flex items-center gap-3">
              <Progress value={project.progressPct} className="flex-1" aria-label="Progress" />
              <span className="w-9 text-right text-xs tabular-nums text-white">{project.progressPct}%</span>
            </div>
            {budgetPct !== null && (
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-fg-3">Budget</span>
                  <span className={cn("tabular-nums", budgetPct > 100 ? "text-danger" : budgetPct >= 80 ? "text-warning" : "text-fg-2")}>
                    {formatHours(loggedSeconds, 1)} / {project.budgetHours}h
                  </span>
                </div>
                <Progress
                  value={Math.min(100, budgetPct)}
                  indicatorClassName={budgetPct > 100 ? "bg-danger" : budgetPct >= 80 ? "bg-warning" : undefined}
                  aria-label={`Budget used: ${budgetPct}%`}
                />
              </div>
            )}
          </RailSection>

          <RailSection title="Details">
            <PropertyList>
              <Property label="Billing">{billing}</Property>
              <Property label="Service">{serviceLabel(project.serviceType)}</Property>
              <Property label="Start">{formatDate(project.startDate)}</Property>
              <Property label="Due">{formatDate(project.dueDate)}</Property>
            </PropertyList>
          </RailSection>

          <RailSection title="Domains">
            <DomainsForm key={project.updatedAt.toISOString()} projectId={id} productionUrl={project.productionUrl} devUrl={project.devUrl} featuredSite={project.featuredSite} />
          </RailSection>

          <RailSection title="Milestones" action={<MilestoneDialog projectId={id} />}>
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
          </RailSection>

          <RailSection title="Client socials">
            <ClientSocialsList links={client.socialLinks} />
          </RailSection>
        </aside>
      </div>
    </>
  );
}
