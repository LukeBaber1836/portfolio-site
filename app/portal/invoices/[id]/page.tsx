import { notFound } from "next/navigation";
import { CreditCard, FileDown, Landmark, ShieldCheck } from "lucide-react";

import { InvoiceStatusBadge } from "@/components/admin/InvoicesTable";
import { PaidCelebration } from "@/components/portal/PaidCelebration";
import { Disclosure } from "@/components/shared/Disclosure";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        description={`Issued ${formatDate(invoice.finalizedAt ?? invoice.createdAt)}${invoice.dueDate ? ` · due ${formatDate(invoice.dueDate)}` : ""}`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>What this covers</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
          <div className="divide-y divide-white/5">
            {[...groups.entries()].map(([projectName, g]) => (
              <Disclosure
                key={projectName}
                title={
                  <span className="block">
                    <span className="block font-medium">{projectName}</span>
                    <span className="block text-xs text-white/40">
                      {formatHours(g.seconds)} across {g.entries.length} {g.entries.length === 1 ? "session" : "sessions"} — tap to see each one
                    </span>
                  </span>
                }
              >
                <ul className="mb-3 space-y-1 text-sm">
                  {g.entries.map((e) => (
                    <li key={e.id} className="flex gap-3 rounded-lg px-2 py-1.5">
                      <span className="w-16 shrink-0 text-xs leading-5 text-white/40">{formatDate(e.startedAt, "MMM d")}</span>
                      <span className="min-w-0 flex-1 leading-5 text-white/80">{e.description}</span>
                      <span className="shrink-0 text-xs tabular-nums leading-5 text-white/60">{formatDuration(e.durationSeconds)}</span>
                    </li>
                  ))}
                </ul>
              </Disclosure>
            ))}
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 py-3 text-sm">
                <span className="text-white/85">
                  {item.description}
                  {item.quantity > 1 && <span className="text-white/40"> ×{item.quantity}</span>}
                </span>
                <span className="tabular-nums text-white">{formatMoney(item.quantity * item.unitAmountCents)}</span>
              </div>
            ))}
          </div>
          {invoice.memo && <p className="mt-4 rounded-xl bg-white/[0.03] p-3 text-sm text-white/60">“{invoice.memo}”</p>}
          <p className="mt-4 text-xs leading-5 text-white/35">The official invoice (with exact amounts per line) is available as a PDF.</p>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <CardContent>
            {invoice.status === "paid" ? (
              <PaidCelebration amount={formatMoney(invoice.amountPaidCents)} paidOn={invoice.paidAt ? formatDate(invoice.paidAt) : null} />
            ) : (
              <>
                <p className="text-xs uppercase tracking-wider text-white/50">{invoice.status === "void" ? "Voided" : overdue ? "Past due" : "Amount due"}</p>
                <p className={`mt-1 text-4xl font-bold ${overdue ? "text-danger" : "text-accent"}`}>
                  {formatMoney(invoice.status === "void" ? invoice.totalCents : invoice.amountDueCents)}
                </p>
                {invoice.dueDate && invoice.status === "open" && (
                  <p className="mt-1 text-xs text-white/45">
                    {overdue ? "Was due" : "Due"} {formatDate(invoice.dueDate)}
                  </p>
                )}
                {invoice.status === "open" && invoice.hostedInvoiceUrl && (
                  <>
                    <Button asChild className="mt-6 h-12 w-full text-base" effect="shineHover">
                      <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">
                        <CreditCard /> Pay now
                      </a>
                    </Button>
                    <ul className="mt-4 space-y-2 text-xs text-white/45">
                      <li className="flex items-center gap-2">
                        <CreditCard className="size-3.5" /> Card, Apple Pay, or Google Pay
                      </li>
                      <li className="flex items-center gap-2">
                        <Landmark className="size-3.5" /> Bank transfer (ACH)
                      </li>
                      <li className="flex items-center gap-2">
                        <ShieldCheck className="size-3.5" /> Secure checkout by Stripe
                      </li>
                    </ul>
                  </>
                )}
              </>
            )}
            </CardContent>
          </Card>
          {invoice.invoicePdfUrl && (
            <Button asChild variant="outline" className="w-full">
              <a href={invoice.invoicePdfUrl} target="_blank" rel="noopener noreferrer">
                <FileDown /> Download PDF
              </a>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
