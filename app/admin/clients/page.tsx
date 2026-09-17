import Link from "next/link";
import { ChevronRight, UserPlus, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { SlidingTabs } from "@/components/shared/SlidingTabs";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listClients } from "@/lib/dal/admin/clients";
import { formatHours, formatMoney } from "@/lib/format";

export const metadata = { title: "Clients" };

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "active" } = await searchParams;
  const all = await listClients();
  const rows = all.filter((r) => r.client.status === (status === "archived" ? "archived" : "active"));
  const archivedCount = all.filter((r) => r.client.status === "archived").length;

  return (
    <>
      <PageHeader
        title="Clients"
        actions={
          <Button asChild size="sm">
            <Link href="/admin/clients/new">
              <UserPlus /> New client
            </Link>
          </Button>
        }
      />

      <div className="mb-4">
        <SlidingTabs
          value={status === "archived" ? "archived" : "active"}
          items={[
            { value: "active", label: `Active (${all.length - archivedCount})`, href: "/admin/clients" },
            { value: "archived", label: `Archived (${archivedCount})`, href: "/admin/clients?status=archived" },
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title={status === "archived" ? "No archived clients" : "No clients yet"}
            description={status === "archived" ? undefined : "Add your first client to start tracking work and sending invoices."}
            action={
              status !== "archived" && (
                <Button asChild size="sm">
                  <Link href="/admin/clients/new">
                    <UserPlus /> New client
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
                <TableHead>Active projects</TableHead>
                <TableHead className="text-right">Unbilled</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ client, activeProjects, unbilledSeconds, outstandingCents }) => (
                <TableRow key={client.id} className="group relative">
                  <TableCell>
                    <Link href={`/admin/clients/${client.id}`} className="after:absolute after:inset-0">
                      <span className="block font-medium text-white group-hover:text-accent">{client.company || client.name}</span>
                      <span className="block text-xs text-white/40">
                        {client.company ? `${client.name} · ` : ""}
                        {client.email}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums text-white/70">{activeProjects}</TableCell>
                  <TableCell className="text-right tabular-nums text-white/70">
                    {unbilledSeconds ? formatHours(unbilledSeconds, 1) : <span className="text-white/25">—</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {outstandingCents ? (
                      <StatusBadge tone="attention" label={formatMoney(outstandingCents)} />
                    ) : (
                      <span className="text-white/25">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        </CardContent>
      </Card>
    </>
  );
}
