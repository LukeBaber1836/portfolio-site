import "server-only";

import { and, eq, isNotNull, sql } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/auth-schema";
import {
  clientMembers,
  clients,
  invoiceLineItems,
  invoices,
  stripeEvents,
  timeEntries,
  type Invoice,
  type InvoiceStatus,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { emails } from "@/lib/email/messages";
import { sendEmail } from "@/lib/email/send";
import { formatDate } from "@/lib/format";
import { stripe } from "@/lib/stripe/client";

const toDate = (unix: number | null | undefined) => (unix ? new Date(unix * 1000) : null);

const MIRRORED_STATUSES: InvoiceStatus[] = ["open", "paid", "void", "uncollectible"];

function mapStatus(status: Stripe.Invoice.Status | null): InvoiceStatus {
  return MIRRORED_STATUSES.includes(status as InvoiceStatus) ? (status as InvoiceStatus) : "draft";
}

/** Contacts on a client's account (all of them get invoice emails). */
export async function clientContacts(clientId: string) {
  return db
    .select({ name: authUsers.name, email: authUsers.email })
    .from(clientMembers)
    .innerJoin(authUsers, eq(authUsers.id, clientMembers.userId))
    .where(eq(clientMembers.clientId, clientId));
}

/**
 * Mirror a Stripe invoice into our table. Stripe is the source of truth; we
 * re-fetch rather than trusting event payload ordering. Side effects (releasing
 * hours on void, thank-you emails on paid) fire only on the status transition.
 */
export async function syncInvoiceFromStripe(stripeInvoiceId: string): Promise<Invoice | null> {
  let inv: Stripe.Invoice;
  try {
    inv = await stripe().invoices.retrieve(stripeInvoiceId);
  } catch (err) {
    // Deleted in Stripe (e.g. a discarded draft): mirror the deletion instead of failing the webhook.
    if ((err as { code?: string }).code === "resource_missing") {
      const [gone] = await db.select().from(invoices).where(eq(invoices.stripeInvoiceId, stripeInvoiceId));
      if (gone) await deleteInvoiceRow(gone.id);
      return null;
    }
    throw err;
  }
  const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id;

  const [existing] = await db.select().from(invoices).where(eq(invoices.stripeInvoiceId, inv.id));
  let clientId = existing?.clientId;
  if (!clientId && customerId) {
    const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.stripeCustomerId, customerId));
    clientId = client?.id;
  }
  // Invoices for customers that aren't portal clients (e.g. other Stripe usage) are ignored.
  if (!clientId) return null;

  const status = mapStatus(inv.status);
  const t = inv.status_transitions;
  const values = {
    clientId,
    stripeInvoiceId: inv.id,
    number: inv.number,
    status,
    currency: inv.currency,
    subtotalCents: inv.subtotal,
    totalCents: inv.total,
    amountPaidCents: inv.amount_paid,
    amountDueCents: status === "paid" || status === "void" ? 0 : inv.amount_remaining ?? inv.amount_due,
    dueDate: inv.due_date ? formatDate(toDate(inv.due_date), "yyyy-MM-dd") : null,
    hostedInvoiceUrl: inv.hosted_invoice_url ?? null,
    invoicePdfUrl: inv.invoice_pdf ?? null,
    memo: inv.description,
    finalizedAt: toDate(t?.finalized_at),
    paidAt: toDate(t?.paid_at),
    voidedAt: toDate(t?.voided_at),
  };

  // Use the portal id from metadata so a webhook racing createDraftInvoice writes the same row.
  const portalId = inv.metadata?.portal_invoice_id;
  const [row] = await db
    .insert(invoices)
    .values(existing || !portalId ? values : { ...values, id: portalId })
    .onConflictDoUpdate({ target: invoices.stripeInvoiceId, set: values })
    .returning();

  const before = existing?.status;
  if (row && before !== status) {
    if (status === "void" || status === "uncollectible") {
      // Voided work returns to the unbilled pool so it can be re-invoiced.
      if (status === "void") await releaseInvoiceItems(row.id);
    }
    if (status === "paid" && before !== undefined) await notifyPaid(row);
  }
  return row ?? null;
}

/** Voided work returns to the unbilled pool (line items stay attached to the void invoice for the record). */
export async function releaseInvoiceItems(invoiceId: string) {
  await db.update(timeEntries).set({ invoiceId: null }).where(eq(timeEntries.invoiceId, invoiceId));
}

/** Remove a deleted draft: hours go back to unbilled, its ad-hoc line items and mirror row are removed. */
export async function deleteInvoiceRow(invoiceId: string) {
  await db.transaction(async (tx) => {
    await tx.update(timeEntries).set({ invoiceId: null }).where(eq(timeEntries.invoiceId, invoiceId));
    await tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, invoiceId));
    await tx.delete(invoices).where(eq(invoices.id, invoiceId));
  });
}

async function notifyPaid(invoice: Invoice) {
  const [client] = await db.select().from(clients).where(eq(clients.id, invoice.clientId));
  const contacts = await clientContacts(invoice.clientId);
  await Promise.all([
    ...contacts.map((c) =>
      sendEmail({
        to: c.email,
        content: emails.paymentThanks({ name: c.name, number: invoice.number, amountCents: invoice.amountPaidCents, invoiceId: invoice.id }),
        idempotencyKey: `paid-${invoice.id}-${c.email}`,
      }),
    ),
    sendEmail({
      to: env.ADMIN_EMAIL,
      content: emails.paymentReceivedAdmin({
        client: client?.company || client?.name || "A client",
        number: invoice.number,
        amountCents: invoice.amountPaidCents,
        invoiceId: invoice.id,
      }),
      idempotencyKey: `paid-admin-${invoice.id}`,
    }),
  ]);
}

const INVOICE_EVENTS = new Set([
  "invoice.created",
  "invoice.finalized",
  "invoice.sent",
  "invoice.updated",
  "invoice.paid",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "invoice.overdue",
  "invoice.voided",
  "invoice.marked_uncollectible",
  "invoice.deleted",
]);

/** Idempotent webhook processing. Returns false if the event was already handled. */
export async function handleStripeEvent(event: Stripe.Event) {
  const inserted = await db
    .insert(stripeEvents)
    .values({ id: event.id, type: event.type })
    .onConflictDoNothing()
    .returning({ id: stripeEvents.id });
  if (!inserted.length) {
    const [prior] = await db.select().from(stripeEvents).where(eq(stripeEvents.id, event.id));
    if (prior?.processedAt) return false;
  }

  try {
    if (INVOICE_EVENTS.has(event.type)) {
      const inv = event.data.object as Stripe.Invoice;
      if (event.type === "invoice.deleted") {
        const [row] = await db.select().from(invoices).where(eq(invoices.stripeInvoiceId, inv.id));
        if (row) await deleteInvoiceRow(row.id);
      } else {
        await syncInvoiceFromStripe(inv.id);
      }
    }
    await db.update(stripeEvents).set({ processedAt: new Date() }).where(eq(stripeEvents.id, event.id));
    return true;
  } catch (err) {
    // Leave processed_at null so Stripe's retry reprocesses it.
    console.error("[stripe] webhook processing failed", event.type, event.id, err);
    throw err;
  }
}

/** Open invoices whose due date has passed (for cron reminders). */
export async function listOverdueInvoices() {
  return db
    .select({ invoice: invoices, clientName: clients.name })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(and(eq(invoices.status, "open"), isNotNull(invoices.dueDate), sql`${invoices.dueDate} < (now() at time zone 'America/Chicago')::date`));
}
