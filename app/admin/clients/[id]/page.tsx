import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, ExternalLink } from "lucide-react";

import { setClientStatusAction } from "@/app/admin/_actions/clients";
import { ClientForm } from "@/components/admin/ClientForm";
import { ClientSocialsList } from "@/components/admin/ClientSocialsCard";
import { ContactsPanel } from "@/components/admin/ContactsPanel";
import { InvoicesTable } from "@/components/admin/InvoicesTable";
import { ProjectsList } from "@/components/admin/ProjectsList";
import { TimeEntriesTable } from "@/components/admin/TimeEntriesTable";
import { ActionButton } from "@/components/shared/ActionButton";
import { PageHeader } from "@/components/shared/PageHeader";
import { PageTabs } from "@/components/shared/PageTabs";
import { Property, PropertyList, RailSection } from "@/components/shared/PropertyList";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { Stat, StatStrip } from "@/components/shared/StatStrip";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getClient, listClientMembers } from "@/lib/dal/admin/clients";
import { listInvoices } from "@/lib/dal/admin/invoices";
import { listProjects } from "@/lib/dal/admin/projects";
import { listEntries } from "@/lib/dal/admin/time";
import { env } from "@/lib/env";
import { formatMoney, formatRelative } from "@/lib/format";
import { getSettings } from "@/lib/services/settings";

const TABS = ["overview", "projects", "time", "invoices", "contacts", "edit"] as const;
type Tab = (typeof TABS)[number];

const panel = "overflow-hidden rounded-lg border border-line bg-surface";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const client = /^[0-9a-f-]{36}$/.test(id) ? await getClient(id) : null;
  return { title: client ? client.company || client.name : "Client" };
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab: Tab = TABS.includes(rawTab as Tab) ? (rawTab as Tab) : "overview";
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const client = await getClient(id);
  if (!client) notFound();

  const [projects, invoices, entries, members, settings] = await Promise.all([
    listProjects({ clientId: id }),
    listInvoices({ clientId: id }),
    listEntries({ clientId: id, limit: 200 }),
    listClientMembers(id),
    getSettings(),
  ]);

  const unbilled = entries.filter((e) => e.entry.billable && !e.entry.invoiceId);
  const unbilledCents = unbilled.reduce((s, e) => s + Math.round(((e.entry.durationSeconds ?? 0) / 3600) * (e.entry.rateCents ?? 0)), 0);
  const openInvoices = invoices.filter((i) => i.invoice.status === "open");
  const outstanding = openInvoices.reduce((s, i) => s + i.invoice.amountDueCents, 0);
  const lifetime = invoices.filter((i) => i.invoice.status === "paid").reduce((s, i) => s + i.invoice.amountPaidCents, 0);
  const activeProjects = projects.filter((p) => ["planned", "in_progress", "review"].includes(p.project.status));
  const rate = client.defaultRateCents ?? settings.defaultRateCents;

  const entryRows = entries.map((e) => ({ ...e.entry, projectName: e.projectName, invoiceStatus: e.invoiceStatus }));
  const href = (t: Tab) => `/admin/clients/${id}${t === "overview" ? "" : `?tab=${t}`}`;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/clients", label: "Clients" }}
        title={
          <span className="flex flex-wrap items-center gap-2.5">
            {client.company || client.name}
            {client.status === "archived" && <StatusBadge tone="neutral" label="Archived" />}
          </span>
        }
        meta={[
          client.company ? client.name : null,
          <a key="email" href={`mailto:${client.email}`} className="hover:text-white hover:underline">
            {client.email}
          </a>,
          client.phone ? (
            <a key="phone" href={`tel:${client.phone}`} className="hover:text-white hover:underline">
              {client.phone}
            </a>
          ) : null,
          `${formatMoney(rate)}/h`,
          `Net ${client.termsDays ?? settings.defaultTermsDays}`,
        ]}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/projects?new=1&client=${id}`}>
                New project
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/admin/invoices/new?client=${id}`}>
                New invoice
              </Link>
            </Button>
          </>
        }
      />

      <PageTabs
        value={tab}
        tabs={[
          { value: "overview", label: "Overview", href: href("overview") },
          { value: "projects", label: "Projects", href: href("projects"), count: projects.length },
          { value: "time", label: "Time", href: href("time") },
          { value: "invoices", label: "Invoices", href: href("invoices"), count: invoices.length },
          { value: "contacts", label: "Contacts", href: href("contacts"), count: members.length },
          { value: "edit", label: "Edit", href: href("edit") },
        ]}
      />

      {tab === "overview" && (
        <div className="space-y-8">
          <StatStrip>
            <Stat
              label="Unbilled"
              value={formatMoney(unbilledCents)}
              hint={unbilled.length ? `${unbilled.length} ${unbilled.length === 1 ? "entry" : "entries"}` : "Nothing to bill"}
              href={`/admin/invoices/new?client=${id}`}
            />
            <Stat
              label="Outstanding"
              value={formatMoney(outstanding)}
              hint={`${openInvoices.length} open ${openInvoices.length === 1 ? "invoice" : "invoices"}`}
              href={href("invoices")}
            />
            <Stat label="Active projects" value={String(activeProjects.length)} hint={`${projects.length} total`} href={href("projects")} />
            <Stat label="Lifetime paid" value={formatMoney(lifetime)} />
          </StatStrip>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            <section className="min-w-0">
              <SectionHeader title="Active projects" count={activeProjects.length || undefined} />
              <ProjectsList
                rows={activeProjects}
                emptyTitle="No active projects"
                emptyAction={
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/admin/projects?new=1&client=${id}`}>New project</Link>
                  </Button>
                }
              />
            </section>

            <aside className="lg:border-l lg:border-line lg:pl-6">
              <RailSection title="Details">
                <PropertyList>
                  <Property label="File storage">
                    {client.storageUsername ? (
                      <a
                        href={`${env.STORAGE_URL}${client.storagePath ? `/files/${client.storagePath}` : ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-full items-center gap-1 hover:underline"
                      >
                        <span className="truncate">{client.storageUsername}</span>
                        <ExternalLink className="size-3 shrink-0 text-fg-3" aria-hidden />
                      </a>
                    ) : (
                      <span className="text-fg-3">Not set up</span>
                    )}
                  </Property>
                  <Property label="Stripe">
                    <span className="block truncate text-xs text-fg-2">{client.stripeCustomerId ?? "—"}</span>
                  </Property>
                </PropertyList>
              </RailSection>

              <RailSection title="Private notes">
                <p className="whitespace-pre-wrap text-[13px] leading-5 text-fg-2">
                  {client.notesInternal || <span className="text-fg-3">None</span>}
                </p>
              </RailSection>

              <RailSection title="Socials">
                <ClientSocialsList links={client.socialLinks} />
              </RailSection>

              <RailSection>
                {client.status === "active" ? (
                  <ActionButton
                    variant="ghost"
                    size="sm"
                    className="-ml-2 text-fg-3 hover:bg-danger/10 hover:text-danger"
                    action={setClientStatusAction.bind(null, id, "archived")}
                    confirm={{
                      title: "Archive this client?",
                      description: "They'll lose portal access and disappear from pickers. Invoices and history are kept, and you can restore them anytime.",
                      confirmLabel: "Archive",
                      destructive: true,
                    }}
                  >
                    <Archive /> Archive client
                  </ActionButton>
                ) : (
                  <ActionButton variant="outline" size="sm" action={setClientStatusAction.bind(null, id, "active")}>
                    <ArchiveRestore /> Restore client
                  </ActionButton>
                )}
              </RailSection>
            </aside>
          </div>
        </div>
      )}

      {tab === "projects" && (
        <ProjectsList
          rows={projects}
          emptyAction={
            <Button asChild size="sm" variant="outline">
              <Link href={`/admin/projects?new=1&client=${id}`}>New project</Link>
            </Button>
          }
        />
      )}

      {tab === "time" && (
        <section>
          <SectionHeader title="Time log" action={<span className="text-xs text-fg-3">Latest 200 entries</span>} />
          <div className={panel}>
            <TimeEntriesTable entries={entryRows} />
          </div>
        </section>
      )}

      {tab === "invoices" && (
        <div className={panel}>
          <InvoicesTable
            rows={invoices}
            hrefBase="/admin/invoices"
            emptyAction={
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/invoices/new?client=${id}`}>Create invoice</Link>
              </Button>
            }
          />
        </div>
      )}

      {tab === "contacts" && (
        <section className="max-w-3xl">
          <p className="mb-4 text-[13px] text-fg-2">Everyone here can sign in and see this client&apos;s projects, hours, and invoices.</p>
          <ContactsPanel
            clientId={id}
            members={members.map((m) => ({
              userId: m.userId,
              name: m.name,
              email: m.email,
              role: m.role,
              joinedAt: m.joinedAt?.toISOString() ?? null,
              statusLabel: m.joinedAt ? `Joined ${formatRelative(m.joinedAt)}` : `Invited ${formatRelative(m.invitedAt)}`,
            }))}
          />
        </section>
      )}

      {tab === "edit" && (
        <div className="max-w-3xl">
          <ClientForm client={client} defaults={{ rateCents: settings.defaultRateCents, termsDays: settings.defaultTermsDays, storageUrl: env.STORAGE_URL }} />
        </div>
      )}
    </>
  );
}
