import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, FileDown } from "lucide-react";

import { InvoiceActions } from "@/components/admin/InvoiceActions";
import { InvoiceStatusBadge } from "@/components/admin/InvoicesTable";
import { Disclosure } from "@/components/shared/Disclosure";
import { PageHeader } from "@/components/shared/PageHeader";
import { Property, PropertyList, RailSection } from "@/components/shared/PropertyList";
import { getInvoice } from "@/lib/dal/admin/invoices";
import { formatDate, formatDateTime, formatDuration, formatHours, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

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
  const clientLabel = client.company || client.name;

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

  const dueAmount =
    invoice.status === "paid" ? invoice.amountPaidCents : invoice.status === "draft" ? invoice.totalCents : invoice.amountDueCents;

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
        meta={[
          <Link key="c" href={`/admin/clients/${client.id}`} className="hover:text-white">
            {clientLabel}
          </Link>,
          invoice.finalizedAt ? `Issued ${formatDate(invoice.finalizedAt, "MMM d")}` : `Created ${formatDate(invoice.createdAt, "MMM d")}`,
          invoice.dueDate ? `Due ${formatDate(invoice.dueDate, "MMM d, yyyy")}` : null,
        ]}
        actions={
          <InvoiceActions
            id={invoice.id}
            status={invoice.status}
            hostedUrl={invoice.hostedInvoiceUrl}
            stripeUrl={stripeUrl}
            clientLabel={clientLabel}
            amountLabel={formatMoney(invoice.totalCents)}
          />
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        {/* The invoice itself */}
        <article className="min-w-0 rounded-lg border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5 text-xs text-fg-3">
            <span>Description</span>
            <span>Amount</span>
          </div>
          <div className="divide-y divide-line">
            {[...groups.entries()].map(([projectName, g]) => (
              <Disclosure
                key={projectName}
                className="px-4"
                title={
                  <span className="block min-w-0">
                    <span className="block truncate font-medium">{projectName}</span>
                    <span className="block text-xs font-normal text-fg-3">
                      {g.entries.length} {g.entries.length === 1 ? "entry" : "entries"} · {formatHours(g.seconds)} logged
                    </span>
                  </span>
                }
              >
                <ul className="mb-3">
                  {g.entries.map(({ entry }) => (
                    <li key={entry.id} className="flex min-h-9 items-center gap-3 rounded-md px-2 text-[13px] hover:bg-white/[0.03]">
                      <span className="w-14 shrink-0 text-xs text-fg-3">{formatDate(entry.startedAt, "MMM d")}</span>
                      <span className="min-w-0 flex-1 text-fg-2">{entry.description}</span>
                      <span className="shrink-0 text-xs tabular-nums text-fg-2">{formatDuration(entry.durationSeconds)}</span>
                    </li>
                  ))}
                </ul>
              </Disclosure>
            ))}
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                <span className="text-white">
                  {item.description}
                  {item.quantity > 1 && <span className="text-fg-3"> ×{item.quantity}</span>}
                </span>
                <span className="tabular-nums text-white">{formatMoney(item.quantity * item.unitAmountCents)}</span>
              </div>
            ))}
          </div>

          {invoice.memo && <p className="border-t border-line px-4 py-3 text-[13px] leading-5 text-fg-2">{invoice.memo}</p>}

          <dl className="space-y-1.5 border-t border-line px-4 py-4 text-[13px]">
            <div className="flex justify-between text-fg-2">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatMoney(invoice.subtotalCents)}</dd>
            </div>
            {invoice.amountPaidCents > 0 && invoice.status !== "paid" && (
              <div className="flex justify-between text-fg-2">
                <dt>Paid</dt>
                <dd className="tabular-nums">−{formatMoney(invoice.amountPaidCents)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between pt-2">
              <dt className="text-white">{invoice.status === "paid" ? "Total paid" : "Amount due"}</dt>
              <dd className="text-xl font-semibold tabular-nums text-white">{formatMoney(dueAmount)}</dd>
            </div>
          </dl>
        </article>

        {/* Right rail */}
        <aside>
          <RailSection title="Details">
            <PropertyList>
              <Property label="Status">
                <InvoiceStatusBadge invoice={invoice} />
              </Property>
              <Property label="Client">
                <Link href={`/admin/clients/${client.id}`} className="block truncate hover:underline">
                  {clientLabel}
                </Link>
              </Property>
              <Property label="Total">
                <span className="tabular-nums">{formatMoney(invoice.totalCents)}</span>
              </Property>
              {invoice.amountPaidCents > 0 && (
                <Property label="Paid">
                  <span className="tabular-nums">{formatMoney(invoice.amountPaidCents)}</span>
                </Property>
              )}
              <Property label="Due">{invoice.dueDate ? formatDate(invoice.dueDate) : <span className="text-fg-3">—</span>}</Property>
              <Property label="Stripe">
                <a href={stripeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-fg-2 hover:text-white">
                  Open <ExternalLink className="size-3" aria-hidden />
                </a>
              </Property>
              {invoice.invoicePdfUrl && (
                <Property label="PDF">
                  <a href={invoice.invoicePdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-fg-2 hover:text-white">
                    <FileDown className="size-3.5" aria-hidden /> Download
                  </a>
                </Property>
              )}
            </PropertyList>
          </RailSection>

          <RailSection title="Timeline">
            <ol className="space-y-3">
              {timeline.map((t) => (
                <li key={t.label} className="flex gap-3">
                  <span
                    aria-hidden
                    className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", t.done ? (t.label === "Voided" ? "bg-fg-3" : "bg-success") : "bg-white/15")}
                  />
                  <div className="min-w-0">
                    <p className={cn("text-[13px]", t.done ? "text-white" : "text-fg-3")}>{t.label}</p>
                    {t.at && <p className="text-xs text-fg-3">{formatDateTime(t.at)}</p>}
                  </div>
                </li>
              ))}
            </ol>
            {invoice.lastReminderAt && <p className="mt-3 text-xs text-fg-3">Last reminder {formatDateTime(invoice.lastReminderAt)}</p>}
          </RailSection>
        </aside>
      </div>
    </>
  );
}
