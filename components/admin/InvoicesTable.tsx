import Link from "next/link";

import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { daysOverdue, isOverdue } from "@/lib/billing";
import type { Invoice } from "@/lib/db/schema";
import { formatDate, formatMoney } from "@/lib/format";
import { INVOICE_STATUS } from "@/lib/status";

export function invoiceStatusKey(invoice: Pick<Invoice, "status" | "dueDate">) {
  return isOverdue(invoice.status, invoice.dueDate) ? "overdue" : invoice.status;
}

export function InvoiceStatusBadge({ invoice }: { invoice: Pick<Invoice, "status" | "dueDate"> }) {
  const key = invoiceStatusKey(invoice);
  const def = INVOICE_STATUS[key]!;
  const label = key === "overdue" && invoice.dueDate ? `Overdue ${daysOverdue(invoice.dueDate)}d` : def.label;
  return <StatusBadge tone={def.tone} label={label} />;
}

export function InvoicesTable({
  rows,
  hrefBase,
  showClient,
  emptyAction,
}: {
  rows: { invoice: Invoice; clientName?: string; clientCompany?: string | null }[];
  hrefBase: string;
  showClient?: boolean;
  emptyAction?: React.ReactNode;
}) {
  if (!rows.length) {
    return <EmptyState compact title="No invoices" action={emptyAction} />;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Invoice</TableHead>
          {showClient && <TableHead>Client</TableHead>}
          <TableHead>Issued</TableHead>
          <TableHead>Due</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ invoice, clientName, clientCompany }) => (
          <TableRow key={invoice.id} className="group relative has-[a:focus-visible]:bg-white/[0.03]">
            <TableCell>
              <Link href={`${hrefBase}/${invoice.id}`} className="font-medium text-white after:absolute after:inset-0 focus-visible:outline-none">
                {invoice.number ?? "Draft"}
              </Link>
            </TableCell>
            {showClient && <TableCell className="text-fg-2">{clientCompany || clientName}</TableCell>}
            <TableCell className="text-fg-3">{formatDate(invoice.finalizedAt ?? invoice.createdAt, "MMM d, yyyy")}</TableCell>
            <TableCell className="text-fg-3">{invoice.dueDate ? formatDate(invoice.dueDate, "MMM d, yyyy") : "—"}</TableCell>
            <TableCell className="text-right tabular-nums text-white">
              {formatMoney(invoice.status === "paid" ? invoice.amountPaidCents : invoice.totalCents)}
              {invoice.status === "open" && invoice.amountPaidCents > 0 && (
                <span className="block text-xs font-normal text-fg-3">{formatMoney(invoice.amountDueCents)} due</span>
              )}
            </TableCell>
            <TableCell>
              <InvoiceStatusBadge invoice={invoice} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
