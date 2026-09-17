import Link from "next/link";
import { AlertTriangle, DollarSign, Receipt } from "lucide-react";

import { InvoicesTable } from "@/components/admin/InvoicesTable";
import { KpiTile } from "@/components/shared/KpiTile";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SlidingTabs } from "@/components/shared/SlidingTabs";
import { Button } from "@/components/ui/button";
import type { AgingBucket } from "@/lib/billing";
import { listInvoices, receivablesSummary } from "@/lib/dal/admin/invoices";
import type { InvoiceStatus } from "@/lib/db/schema";
import { formatMoney } from "@/lib/format";

export const metadata = { title: "Invoices" };

const FILTERS = ["all", "open", "overdue", "draft", "paid", "void"] as const;
type Filter = (typeof FILTERS)[number];

const AGING: { key: AgingBucket; label: string }[] = [
  { key: "current", label: "Not yet due" },
  { key: "1-30", label: "1–30 days late" },
  { key: "31-60", label: "31–60 days late" },
  { key: "60+", label: "60+ days late" },
];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status: raw } = await searchParams;
  const filter: Filter = FILTERS.includes(raw as Filter) ? (raw as Filter) : "all";
  const [ar, rows] = await Promise.all([
    receivablesSummary(),
    listInvoices({ status: filter === "all" ? undefined : (filter as InvoiceStatus | "overdue") }),
  ]);
  const agingMax = Math.max(1, ...Object.values(ar.aging));

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiTile label="Outstanding" value={formatMoney(ar.outstandingCents)} icon={DollarSign} href="/admin/invoices?status=open" />
        <KpiTile
          label="Overdue"
          value={formatMoney(ar.overdueCents)}
          icon={AlertTriangle}
          tone={ar.overdueCount ? "danger" : "default"}
          href="/admin/invoices?status=overdue"
        />
        <KpiTile label="Paid this month" value={formatMoney(ar.paidThisMonthCents)} icon={Receipt} tone="success" href="/admin/invoices?status=paid" />
      </div>

      {ar.outstandingCents > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <div className="min-w-0">
              <CardTitle>Receivables aging</CardTitle>
              <CardDescription>Open balances by how late they are.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3">
            {AGING.map(({ key, label }) => {
              const cents = ar.aging[key];
              const pct = (cents / agingMax) * 100;
              return (
                <div key={key} className="grid grid-cols-[9rem_1fr_6rem] items-center gap-3 text-sm">
                  <dt className="text-white/60">{label}</dt>
                  <dd className="h-2.5 rounded-full bg-white/[0.06]" aria-hidden>
                    {cents > 0 && (
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(2, pct)}%`, background: key === "current" ? "var(--color-chart-2)" : "var(--color-chart-1)" }}
                      />
                    )}
                  </dd>
                  <dd className="text-right tabular-nums text-white">{formatMoney(cents)}</dd>
                </div>
              );
            })}
            </dl>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 mt-8 overflow-x-auto scrollbar-hide">
        <SlidingTabs
          value={filter}
          items={FILTERS.map((f) => ({
            value: f,
            label: f === "all" ? "All" : f === "open" ? "Due" : f[0]!.toUpperCase() + f.slice(1),
            href: f === "all" ? "/admin/invoices" : `/admin/invoices?status=${f}`,
          }))}
        />
      </div>
      <Card>
        <CardContent className="p-0">
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
        </CardContent>
      </Card>
    </>
  );
}
