import Link from "next/link";
import { ChevronRight, Receipt } from "lucide-react";

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
    return <EmptyState compact icon={Receipt} title="No invoices" action={emptyAction} />;
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
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ invoice, clientName, clientCompany }) => (
          <TableRow key={invoice.id} className="group relative">
            <TableCell>
              <Link href={`${hrefBase}/${invoice.id}`} className="font-medium text-white after:absolute after:inset-0 group-hover:text-accent">
                {invoice.number ?? "Draft"}
              </Link>
            </TableCell>
            {showClient && <TableCell className="text-white/70">{clientCompany || clientName}</TableCell>}
            <TableCell className="text-white/60">{formatDate(invoice.finalizedAt ?? invoice.createdAt, "MMM d, yyyy")}</TableCell>
            <TableCell className="text-white/60">{invoice.dueDate ? formatDate(invoice.dueDate, "MMM d, yyyy") : "—"}</TableCell>
            <TableCell className="text-right font-medium tabular-nums text-white">
              {formatMoney(invoice.status === "paid" ? invoice.amountPaidCents : invoice.totalCents)}
              {invoice.status === "open" && invoice.amountPaidCents > 0 && (
                <span className="block text-xs font-normal text-white/40">{formatMoney(invoice.amountDueCents)} due</span>
              )}
            </TableCell>
            <TableCell>
              <InvoiceStatusBadge invoice={invoice} />
            </TableCell>
            <TableCell>
              <ChevronRight className="size-4 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
