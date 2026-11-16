import Link from "next/link";

import { InvoiceStatusBadge, invoiceStatusKey } from "@/components/admin/InvoicesTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { portalInvoices } from "@/lib/dal/portal";
import { formatDate, formatMoney } from "@/lib/format";

export const metadata = { title: "Invoices" };

export default async function PortalInvoicesPage() {
  const invoices = await portalInvoices();
  const open = invoices.filter((i) => i.status === "open");
  const balance = open.reduce((s, i) => s + i.amountDueCents, 0);
  // Gold goes on the oldest-due open invoice only; the rest get a quiet "Pay".
  const firstDue = [...open].sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""))[0];

  return (
    <>
      <PageHeader
        title="Invoices"
        meta={open.length ? [`${formatMoney(balance)} due across ${open.length} ${open.length === 1 ? "invoice" : "invoices"}`] : invoices.length ? ["All paid up"] : undefined}
      />
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {invoices.length === 0 ? (
          <EmptyState title="No invoices yet" description="When I send you an invoice, it'll show up here." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Invoice</TableHead>
                <TableHead className="hidden sm:table-cell">Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const payable = invoice.status === "open";
                const overdue = invoiceStatusKey(invoice) === "overdue";
                return (
                  <TableRow key={invoice.id} className="group relative has-[a:focus-visible]:bg-white/[0.03]">
                    <TableCell>
                      <Link
                        href={`/portal/invoices/${invoice.id}`}
                        className="font-medium text-white after:absolute after:inset-0 focus-visible:outline-none"
                      >
                        {invoice.number ?? "Invoice"}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden text-fg-3 sm:table-cell">{formatDate(invoice.finalizedAt ?? invoice.createdAt, "MMM d, yyyy")}</TableCell>
                    <TableCell className={overdue ? "text-danger" : "text-fg-3"}>{invoice.dueDate ? formatDate(invoice.dueDate, "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-white">
                      {formatMoney(payable ? invoice.amountDueCents : invoice.status === "paid" ? invoice.amountPaidCents : invoice.totalCents)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge invoice={invoice} />
                    </TableCell>
                    <TableCell className="text-right">
                      {payable && (
                        // Sits above the row's stretched link so it's independently clickable.
                        <Button asChild size="sm" variant={invoice.id === firstDue?.id ? "default" : "ghost"} className="relative z-10 h-7">
                          <Link href={`/portal/invoices/${invoice.id}`}>Pay</Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </>
  );
}
