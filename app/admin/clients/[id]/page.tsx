import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Clock, DollarSign, ExternalLink, FolderKanban, FolderPlus, Mail, Phone, Receipt, Wallet } from "lucide-react";

import { setClientStatusAction } from "@/app/admin/_actions/clients";
import { ClientForm } from "@/components/admin/ClientForm";
import { ContactsPanel } from "@/components/admin/ContactsPanel";
import { InvoicesTable } from "@/components/admin/InvoicesTable";
import { ProjectsList } from "@/components/admin/ProjectsList";
import { TimeEntriesTable } from "@/components/admin/TimeEntriesTable";
import { ActionButton } from "@/components/shared/ActionButton";
import { KpiTile } from "@/components/shared/KpiTile";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidingTabs } from "@/components/shared/SlidingTabs";
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
  const outstanding = invoices.filter((i) => i.invoice.status === "open").reduce((s, i) => s + i.invoice.amountDueCents, 0);
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
          <span className="flex flex-wrap items-center gap-3">
            {client.company || client.name}
            {client.status === "archived" && <StatusBadge tone="neutral" label="Archived" />}
          </span>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {client.company && <span>{client.name}</span>}
            <a href={`mailto:${client.email}`} className="inline-flex items-center gap-1.5 hover:text-accent">
              <Mail className="size-3.5" /> {client.email}
            </a>
            {client.phone && (
              <a href={`tel:${client.phone}`} className="inline-flex items-center gap-1.5 hover:text-accent">
                <Phone className="size-3.5" /> {client.phone}
              </a>
            )}
            <span>
              {formatMoney(rate)}/h · Net {client.termsDays ?? settings.defaultTermsDays}
            </span>
          </span>
        }
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/admin/projects?new=1&client=${id}`}>
                <FolderPlus /> New project
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/admin/invoices/new?client=${id}`}>
                <Receipt /> Invoice
              </Link>
            </Button>
          </>
        }
      />

      <div className="mb-6 overflow-x-auto scrollbar-hide">
        <SlidingTabs
          value={tab}
          items={[
            { value: "overview", label: "Overview", href: href("overview") },
            { value: "projects", label: "Projects", href: href("projects") },
            { value: "time", label: "Time", href: href("time") },
            { value: "invoices", label: "Invoices", href: href("invoices") },
            { value: "contacts", label: "Contacts", href: href("contacts") },
            { value: "edit", label: "Edit", href: href("edit") },
          ]}
        />
      </div>

      {tab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label="Unbilled" value={formatMoney(unbilledCents)} icon={Wallet} tone="gold" href={`/admin/invoices/new?client=${id}`} />
            <KpiTile label="Outstanding" value={formatMoney(outstanding)} icon={DollarSign} href={href("invoices")} />
            <KpiTile label="Active projects" value={String(activeProjects.length)} icon={FolderKanban} href={href("projects")} />
            <KpiTile label="Lifetime paid" value={formatMoney(lifetime)} icon={Clock} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-4 flex w-full items-center rounded-full clay bg-card px-5 py-2.5 text-sm font-semibold text-white">
                Active projects
              </div>
              <ProjectsList rows={activeProjects} />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-white/40">File storage</dt>
                  <dd className="mt-1 text-white/80">
                    {client.storageUsername ? (
                      <a
                        href={`${env.STORAGE_URL}${client.storagePath ? `/files/${client.storagePath}` : ""}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-accent"
                      >
                        {client.storageUsername} <ExternalLink className="size-3.5" />
                      </a>
                    ) : (
                      <span className="text-white/35">Not set up</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-white/40">Stripe customer</dt>
                  <dd className="mt-1 font-mono text-xs text-white/60">{client.stripeCustomerId ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-white/40">Private notes</dt>
                  <dd className="mt-1 whitespace-pre-wrap leading-6 text-white/70">{client.notesInternal || <span className="text-white/35">None</span>}</dd>
                </div>
              </dl>
              <div className="mt-6 border-t border-white/5 pt-4">
                {client.status === "active" ? (
                  <ActionButton
                    variant="ghost"
                    size="sm"
                    className="hover:text-danger"
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
              </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {tab === "projects" && (
        <ProjectsList
          rows={projects}
          emptyAction={
            <Button asChild size="sm">
              <Link href={`/admin/projects?new=1&client=${id}`}>New project</Link>
            </Button>
          }
        />
      )}

      {tab === "time" && (
        <Card>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Time log</CardTitle>
              <CardDescription>Most recent 200 entries</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <TimeEntriesTable entries={entryRows} />
          </CardContent>
        </Card>
      )}

      {tab === "invoices" && (
        <Card>
          <CardContent className="p-0">
            <InvoicesTable
              rows={invoices}
              hrefBase="/admin/invoices"
              emptyAction={
                <Button asChild size="sm">
                  <Link href={`/admin/invoices/new?client=${id}`}>Create invoice</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {tab === "contacts" && (
        <Card>
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Portal contacts</CardTitle>
              <CardDescription>Everyone here can sign in and see this client&apos;s projects, hours, and invoices.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      )}

      {tab === "edit" && (
        <Card className="max-w-3xl">
          <CardContent>
            <ClientForm client={client} defaults={{ rateCents: settings.defaultRateCents, termsDays: settings.defaultTermsDays, storageUrl: env.STORAGE_URL }} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
