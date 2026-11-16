import { notFound } from "next/navigation";
import { FileDown, Lock } from "lucide-react";

import { InvoiceStatusBadge } from "@/components/admin/InvoicesTable";
import { PaidCelebration } from "@/components/portal/PaidCelebration";
import { Disclosure } from "@/components/shared/Disclosure";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { isOverdue } from "@/lib/billing";
import { portalInvoice } from "@/lib/dal/portal";
import { formatDate, formatDuration, formatHours, formatMoney } from "@/lib/format";

const isUuid = (s: string) => /^[0-9a-f-]{36}$/.test(s);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = isUuid(id) ? await portalInvoice(id) : null;
  return { title: data?.invoice.number ?? "Invoice" };
}

export default async function PortalInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await portalInvoice(id);
  if (!data) notFound();
  const { invoice, entries, items } = data;
  const overdue = isOverdue(invoice.status, invoice.dueDate);

  const groups = new Map<string, { entries: typeof entries; seconds: number }>();
  for (const e of entries) {
    const g = groups.get(e.projectName) ?? { entries: [], seconds: 0 };
    g.entries.push(e);
    g.seconds += e.durationSeconds ?? 0;
    groups.set(e.projectName, g);
  }

  return (
    <>
      <PageHeader
        back={{ href: "/portal/invoices", label: "Invoices" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            Invoice {invoice.number} <InvoiceStatusBadge invoice={invoice} />
          </span>
        }
        meta={[`Issued ${formatDate(invoice.finalizedAt ?? invoice.createdAt)}`, invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : null]}
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Payment summary first on mobile — it's what the client came for. */}
        <aside className="space-y-3 lg:order-2 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-line bg-surface p-5">
            {invoice.status === "paid" ? (
              <PaidCelebration amount={formatMoney(invoice.amountPaidCents)} paidOn={invoice.paidAt ? formatDate(invoice.paidAt) : null} />
            ) : (
              <>
                <p className="text-[13px] text-fg-2">{invoice.status === "void" ? "Voided" : overdue ? "Past due" : "Amount due"}</p>
                <p className="mt-1 text-3xl font-medium tabular-nums tracking-[-0.01em] text-white">
                  {formatMoney(invoice.status === "void" ? invoice.totalCents : invoice.amountDueCents)}
                </p>
                {invoice.dueDate && invoice.status === "open" && (
                  <p className={`mt-1 text-[13px] ${overdue ? "text-danger" : "text-fg-3"}`}>
                    {overdue ? "Was due" : "Due"} {formatDate(invoice.dueDate)}
                  </p>
                )}
                {invoice.status === "open" && invoice.hostedInvoiceUrl && (
                  <>
                    <Button asChild size="lg" className="mt-5 w-full">
                      <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                        Pay {formatMoney(invoice.amountDueCents)}
                      </a>
                    </Button>
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-fg-3">
                      <Lock className="size-3" aria-hidden /> Card, Apple Pay, Google Pay, or bank transfer · Secure checkout by Stripe
                    </p>
                  </>
                )}
              </>
            )}
          </div>
          {invoice.invoicePdfUrl && (
            <Button asChild variant="ghost" size="sm" className="w-full">
              <a href={invoice.invoicePdfUrl} target="_blank" rel="noopener noreferrer">
                <FileDown /> Download PDF
              </a>
            </Button>
          )}
        </aside>

        <section className="min-w-0 lg:order-1">
          <h2 className="mb-3 text-sm font-semibold text-white">What this covers</h2>
          <div className="divide-y divide-line rounded-lg border border-line bg-surface">
            {[...groups.entries()].map(([projectName, g]) => (
              <Disclosure
                key={projectName}
                headClassName="px-4"
                title={
                  <span className="flex items-baseline justify-between gap-4">
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{projectName}</span>
                      <span className="block text-xs text-fg-3">
                        {g.entries.length} {g.entries.length === 1 ? "session" : "sessions"} · tap to see each one
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] tabular-nums text-fg-2">{formatHours(g.seconds)}</span>
                  </span>
                }
              >
                <ul className="divide-y divide-line border-t border-line">
                  {g.entries.map((e) => (
                    <li key={e.id} className="flex gap-3 px-4 py-2 text-[13px]">
                      <span className="w-14 shrink-0 text-xs leading-5 text-fg-3">{formatDate(e.startedAt, "MMM d")}</span>
                      <span className="min-w-0 flex-1 leading-5 text-fg-2">{e.description}</span>
                      <span className="shrink-0 text-xs tabular-nums leading-5 text-fg-3">{formatDuration(e.durationSeconds)}</span>
                    </li>
                  ))}
                </ul>
              </Disclosure>
            ))}
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 px-4 py-3 text-[13px]">
                <span className="text-white">
                  {item.description}
                  {item.quantity > 1 && <span className="text-fg-3"> ×{item.quantity}</span>}
                </span>
                <span className="tabular-nums text-white">{formatMoney(item.quantity * item.unitAmountCents)}</span>
              </div>
            ))}
            <div className="flex justify-between gap-3 px-4 py-3 text-[13px]">
              <span className="font-medium text-white">Total</span>
              <span className="font-medium tabular-nums text-white">{formatMoney(invoice.totalCents)}</span>
            </div>
          </div>
          {invoice.memo && <p className="mt-4 text-[13px] leading-5 whitespace-pre-wrap text-fg-2">{invoice.memo}</p>}
          {invoice.invoicePdfUrl && <p className="mt-3 text-xs text-fg-3">Exact amounts per line are on the PDF.</p>}
        </section>
      </div>
    </>
  );
}
