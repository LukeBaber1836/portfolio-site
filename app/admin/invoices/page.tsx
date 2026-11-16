import Link from "next/link";

import { InvoicesTable } from "@/components/admin/InvoicesTable";
import { PageHeader } from "@/components/shared/PageHeader";
import { SlidingTabs } from "@/components/shared/SlidingTabs";
import { Stat, StatStrip } from "@/components/shared/StatStrip";
import { Button } from "@/components/ui/button";
import type { AgingBucket } from "@/lib/billing";
import { listInvoices, receivablesSummary } from "@/lib/dal/admin/invoices";
import type { InvoiceStatus } from "@/lib/db/schema";
import { formatHours, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata = { title: "Invoices" };

const FILTERS = ["all", "open", "overdue", "draft", "paid", "void"] as const;
type Filter = (typeof FILTERS)[number];

const AGING: { key: AgingBucket; label: string; className: string }[] = [
  { key: "current", label: "Not yet due", className: "bg-fg-3" },
  { key: "1-30", label: "1–30 days late", className: "bg-danger/50" },
  { key: "31-60", label: "31–60 days late", className: "bg-danger/75" },
  { key: "60+", label: "60+ days late", className: "bg-danger" },
];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const filter: Filter = FILTERS.includes(raw as Filter) ? (raw as Filter) : "all";
  const [ar, rows] = await Promise.all([
    receivablesSummary(),
    listInvoices({ status: filter === "all" ? undefined : (filter as InvoiceStatus | "overdue") }),
  ]);
  const late = ar.outstandingCents - ar.aging.current;

  return (
    <>
      <PageHeader
        title="Invoices"
        actions={
          <Button asChild size="sm">
            <Link href="/admin/invoices/new">New invoice</Link>
          </Button>
        }
      />

      <StatStrip>
        <Stat label="Outstanding" value={formatMoney(ar.outstandingCents)} hint={`${ar.openCount} open`} href="/admin/invoices?status=open" />
        <Stat
          label="Overdue"
          value={formatMoney(ar.overdueCents)}
          tone={ar.overdueCount ? "danger" : "default"}
          hint={ar.overdueCount ? `${ar.overdueCount} ${ar.overdueCount === 1 ? "invoice" : "invoices"}` : "None"}
          href="/admin/invoices?status=overdue"
        />
        <Stat label="Paid this month" value={formatMoney(ar.paidThisMonthCents)} href="/admin/invoices?status=paid" />
        <Stat label="Unbilled" value={formatMoney(ar.unbilledCents)} hint={formatHours(ar.unbilledSeconds, 1)} href="/admin/invoices/new" />
      </StatStrip>

      {/* Aging: one stacked bar + legend, only when something is late. */}
      {late > 0 && (
        <div className="mt-3 rounded-lg border border-line bg-surface px-4 py-3">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
            {AGING.map(({ key, className }) =>
              ar.aging[key] > 0 ? <div key={key} className={className} style={{ width: `${(ar.aging[key] / ar.outstandingCents) * 100}%` }} /> : null,
            )}
          </div>
          <dl className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1 text-xs">
            {AGING.map(({ key, label, className }) => (
              <div key={key} className="flex items-center gap-2">
                <span aria-hidden className={cn("size-1.5 rounded-full", className)} />
                <dt className="text-fg-3">{label}</dt>
                <dd className="tabular-nums text-fg-2">{formatMoney(ar.aging[key])}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="mb-3 mt-8 overflow-x-auto scrollbar-hide">
        <SlidingTabs
          size="sm"
          value={filter}
          items={FILTERS.map((f) => ({
            value: f,
            label: f === "all" ? "All" : f === "open" ? "Due" : f[0]!.toUpperCase() + f.slice(1),
            href: f === "all" ? "/admin/invoices" : `/admin/invoices?status=${f}`,
          }))}
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <InvoicesTable
          rows={rows}
          hrefBase="/admin/invoices"
          showClient
          emptyAction={
            filter === "all" && (
              <Button asChild size="sm">
                <Link href="/admin/invoices/new">Create your first invoice</Link>
              </Button>
            )
          }
        />
      </div>
    </>
  );
}
