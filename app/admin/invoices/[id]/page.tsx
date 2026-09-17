import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, FileDown } from "lucide-react";

import { InvoiceActions } from "@/components/admin/InvoiceActions";
import { InvoiceStatusBadge } from "@/components/admin/InvoicesTable";
import { Disclosure } from "@/components/shared/Disclosure";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getInvoice } from "@/lib/dal/admin/invoices";
import { formatDate, formatDateTime, formatDuration, formatHours, formatMoney } from "@/lib/format";

const isUuid = (s: string) => /^[0-9a-f-]{36}$/.test(s);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = isUuid(id) ? await getInvoice(id) : null;
  return { title: data?.invoice.number ?? "Draft invoice" };
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await getInvoice(id);
  if (!data) notFound();
  const { invoice, client, entries, items } = data;

  const testMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_");
  const stripeUrl = `https://dashboard.stripe.com/${testMode ? "test/" : ""}invoices/${invoice.stripeInvoiceId}`;

  const groups = new Map<string, { entries: typeof entries; seconds: number }>();
  for (const e of entries) {
    const g = groups.get(e.projectName) ?? { entries: [], seconds: 0 };
    g.entries.push(e);
    g.seconds += e.entry.durationSeconds ?? 0;
    groups.set(e.projectName, g);
  }

  const timeline = [
    { label: "Draft created", at: invoice.createdAt, done: true },
    { label: "Finalized", at: invoice.finalizedAt, done: !!invoice.finalizedAt },
    { label: "Sent to client", at: invoice.sentAt, done: !!invoice.sentAt },
    invoice.status === "void"
      ? { label: "Voided", at: invoice.voidedAt, done: true }
      : { label: "Paid", at: invoice.paidAt, done: !!invoice.paidAt },
  ];

  return (
    <>
      <PageHeader
        back={{ href: "/admin/invoices", label: "Invoices" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {invoice.number ?? "Draft invoice"}
            <InvoiceStatusBadge invoice={invoice} />
          </span>
        }
        description={
          <>
            <Link href={`/admin/clients/${client.id}`} className="hover:text-accent">
              {client.company || client.name}
            </Link>
            {invoice.dueDate && ` · due ${formatDate(invoice.dueDate)}`}
          </>
        }
        actions={
          <InvoiceActions
            id={invoice.id}
            status={invoice.status}
            hostedUrl={invoice.hostedInvoiceUrl}
            stripeUrl={stripeUrl}
            clientLabel={client.company || client.name}
            amountLabel={formatMoney(invoice.totalCents)}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
          <div className="divide-y divide-white/5">
            {[...groups.entries()].map(([projectName, g]) => (
              <Disclosure
                key={projectName}
                title={
                  <span className="flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{projectName}</span>
                      <span className="block text-xs text-white/40">
                        {g.entries.length} {g.entries.length === 1 ? "entry" : "entries"} · {formatHours(g.seconds)} logged
                      </span>
                    </span>
                  </span>
                }
              >
                <ul className="mb-3 space-y-1 text-sm">
                  {g.entries.map(({ entry }) => (
                    <li key={entry.id} className="flex gap-3 rounded-lg px-2 py-1.5 hover:bg-white/[0.03]">
                      <span className="w-16 shrink-0 text-xs leading-5 text-white/40">{formatDate(entry.startedAt, "MMM d")}</span>
                      <span className="min-w-0 flex-1 leading-5 text-white/80">{entry.description}</span>
                      <span className="shrink-0 text-xs tabular-nums leading-5 text-white/60">{formatDuration(entry.durationSeconds)}</span>
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
          <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm">
            <div className="flex justify-between text-white/60">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(invoice.subtotalCents)}</dd>
            </div>
            {invoice.amountPaidCents > 0 && (
              <div className="flex justify-between text-success">
                <dt>Paid</dt>
                <dd className="tabular-nums">−{formatMoney(invoice.amountPaidCents)}</dd>
              </div>
            )}
            <div className="flex items-end justify-between pt-2">
              <dt className="text-xs uppercase tracking-wider text-white/50">{invoice.status === "paid" ? "Total paid" : "Amount due"}</dt>
              <dd className="text-2xl font-bold tabular-nums text-accent">
                {formatMoney(invoice.status === "paid" ? invoice.amountPaidCents : invoice.status === "draft" ? invoice.totalCents : invoice.amountDueCents)}
              </dd>
            </div>
          </dl>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
              {timeline.map((t) => (
                <li key={t.label} className="flex gap-3">
                  {t.done ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" /> : <Circle className="mt-0.5 size-4 shrink-0 text-white/20" />}
                  <div>
                    <p className={t.done ? "text-sm text-white" : "text-sm text-white/40"}>{t.label}</p>
                    {t.at && <p className="text-xs text-white/40">{formatDateTime(t.at)}</p>}
                  </div>
                </li>
              ))}
              {invoice.lastReminderAt && (
                <li className="text-xs text-white/40">Last reminder sent {formatDateTime(invoice.lastReminderAt)}</li>
              )}
            </ol>
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
