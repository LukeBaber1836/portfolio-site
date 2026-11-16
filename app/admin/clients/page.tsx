import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { SlidingTabs } from "@/components/shared/SlidingTabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listClients } from "@/lib/dal/admin/clients";
import { formatHours, formatMoney } from "@/lib/format";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "active" } = await searchParams;
  const archived = status === "archived";
  const all = await listClients();
  const rows = all.filter((r) => r.client.status === (archived ? "archived" : "active"));
  const archivedCount = all.filter((r) => r.client.status === "archived").length;

  return (
    <>
      <PageHeader
        title="Clients"
        actions={
          <Button asChild size="sm">
            <Link href="/admin/clients/new">
              New client
            </Link>
          </Button>
        }
      />

      <SlidingTabs
        className="mb-4"
        size="sm"
        value={archived ? "archived" : "active"}
        items={[
          { value: "active", label: `Active ${all.length - archivedCount}`, href: "/admin/clients" },
          { value: "archived", label: `Archived ${archivedCount}`, href: "/admin/clients?status=archived" },
        ]}
      />

      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {rows.length === 0 ? (
          <EmptyState
            compact
            title={archived ? "No archived clients" : "No clients yet"}
            description={archived ? undefined : "Add a client to start tracking work and sending invoices."}
            action={
              !archived && (
                <Button asChild size="sm" variant="outline">
                  <Link href="/admin/clients/new">
                    New client
                  </Link>
                </Button>
              )
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Active projects</TableHead>
                <TableHead className="text-right">Unbilled</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ client, activeProjects, unbilledSeconds, outstandingCents }) => (
                <TableRow key={client.id} className="relative">
                  <TableCell className="py-2.5">
                    {/* Stretched link: the whole row navigates. */}
                    <Link href={`/admin/clients/${client.id}`} className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:bg-white/[0.03]">
                      <span className="block text-sm font-medium text-white">{client.company || client.name}</span>
                      <span className="block text-xs text-fg-3">
                        {client.company ? `${client.name} · ` : ""}
                        {client.email}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-fg-2">{activeProjects || <span className="text-fg-3">—</span>}</TableCell>
                  <TableCell className="text-right tabular-nums text-fg-2">
                    {unbilledSeconds ? formatHours(unbilledSeconds, 1) : <span className="text-fg-3">—</span>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {outstandingCents ? <span className="text-white">{formatMoney(outstandingCents)}</span> : <span className="text-fg-3">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
