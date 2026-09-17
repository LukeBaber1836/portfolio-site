import "server-only";

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";

import { UserError } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { agingBucket, groupEntriesForInvoice, invoiceTotalCents, isOverdue, type AgingBucket } from "@/lib/billing";
import { db } from "@/lib/db";
import {
  clients,
  invoiceLineItems,
  invoices,
  projects,
  timeEntries,
  type InvoiceStatus,
} from "@/lib/db/schema";
import { emails } from "@/lib/email/messages";
import { emailRedirectNotice, sendEmail } from "@/lib/email/send";
import { formatDate, formatHours, formatMoney, todayIso } from "@/lib/format";
import { audit } from "@/lib/services/audit";
import { clientContacts, deleteInvoiceRow, syncInvoiceFromStripe } from "@/lib/services/invoice-sync";
import { getSettings } from "@/lib/services/settings";
import { assertStripeAccount, stripe } from "@/lib/stripe/client";

export type InvoiceListFilter = { status?: InvoiceStatus | "overdue"; clientId?: string };

export async function listInvoices(filter: InvoiceListFilter = {}) {
  await requireAdmin();
  const conditions = [];
  if (filter.clientId) conditions.push(eq(invoices.clientId, filter.clientId));
  if (filter.status === "overdue") {
    conditions.push(eq(invoices.status, "open"), sql`${invoices.dueDate} < ${todayIso()}::date`);
  } else if (filter.status) {
    conditions.push(eq(invoices.status, filter.status));
  }
  return db
    .select({ invoice: invoices, clientName: clients.name, clientCompany: clients.company })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      sql`case ${invoices.status} when 'open' then 0 when 'draft' then 1 else 2 end`,
      desc(invoices.createdAt),
    );
}

export async function getInvoice(id: string) {
  await requireAdmin();
  const [row] = await db
    .select({ invoice: invoices, client: clients })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(eq(invoices.id, id));
  if (!row) return null;
  const [entries, items] = await Promise.all([
    db
      .select({ entry: timeEntries, projectName: projects.name })
      .from(timeEntries)
      .innerJoin(projects, eq(projects.id, timeEntries.projectId))
      .where(eq(timeEntries.invoiceId, id))
      .orderBy(asc(projects.name), asc(timeEntries.startedAt)),
    db.select().from(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id)).orderBy(asc(invoiceLineItems.createdAt)),
  ]);
  return { ...row, entries, items };
}

export async function receivablesSummary() {
  await requireAdmin();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [open, paidThisMonth, unbilled] = await Promise.all([
    db
      .select({ id: invoices.id, dueDate: invoices.dueDate, amountDueCents: invoices.amountDueCents })
      .from(invoices)
      .where(eq(invoices.status, "open")),
    db
      .select({ total: sql<number>`coalesce(sum(${invoices.amountPaidCents}), 0)::int` })
      .from(invoices)
      .where(and(eq(invoices.status, "paid"), gte(invoices.paidAt, monthStart))),
    db
      .select({
        seconds: sql<number>`coalesce(sum(${timeEntries.durationSeconds}), 0)::int`,
        cents: sql<number>`coalesce(sum(round(${timeEntries.durationSeconds} / 3600.0 * coalesce(${timeEntries.rateCents}, 0))), 0)::int`,
      })
      .from(timeEntries)
      .where(and(isNull(timeEntries.invoiceId), eq(timeEntries.billable, true), isNotNull(timeEntries.endedAt))),
  ]);

  const aging: Record<AgingBucket, number> = { current: 0, "1-30": 0, "31-60": 0, "60+": 0 };
  let outstanding = 0;
  let overdue = 0;
  let overdueCount = 0;
  for (const inv of open) {
    outstanding += inv.amountDueCents;
    aging[agingBucket(inv.dueDate, today)] += inv.amountDueCents;
    if (isOverdue("open", inv.dueDate, today)) {
      overdue += inv.amountDueCents;
      overdueCount += 1;
    }
  }
  return {
    outstandingCents: outstanding,
    openCount: open.length,
    overdueCents: overdue,
    overdueCount,
    paidThisMonthCents: paidThisMonth[0]?.total ?? 0,
    unbilledSeconds: unbilled[0]?.seconds ?? 0,
    unbilledCents: unbilled[0]?.cents ?? 0,
    aging,
  };
}

export type DraftInvoiceInput = {
  clientId: string;
  entryIds: string[];
  items: { description: string; quantity: number; unitAmountCents: number }[];
  daysUntilDue: number;
  memo?: string;
};

/** Preview used by the invoice builder; the same math createDraftInvoice uses. */
export async function previewInvoice(clientId: string, entryIds: string[]) {
  await requireAdmin();
  const settings = await getSettings();
  const rows = entryIds.length
    ? await db
        .select({ entry: timeEntries, projectName: projects.name })
        .from(timeEntries)
        .innerJoin(projects, eq(projects.id, timeEntries.projectId))
        .where(
          and(
            inArray(timeEntries.id, entryIds),
            eq(projects.clientId, clientId),
            isNull(timeEntries.invoiceId),
            eq(timeEntries.billable, true),
            isNotNull(timeEntries.endedAt),
          ),
        )
    : [];
  const groups = groupEntriesForInvoice(
    rows.map((r) => ({
      id: r.entry.id,
      projectId: r.entry.projectId,
      projectName: r.projectName,
      durationSeconds: r.entry.durationSeconds ?? 0,
      rateCents: r.entry.rateCents ?? settings.defaultRateCents,
      startedAt: r.entry.startedAt,
    })),
    settings.roundingMinutes,
  );
  return { groups, validEntryIds: rows.map((r) => r.entry.id), roundingMinutes: settings.roundingMinutes };
}

function groupDescription(g: { projectName: string; billedSeconds: number; rateCents: number; periodStart: Date; periodEnd: Date }) {
  const start = formatDate(g.periodStart, "MMM d");
  const end = formatDate(g.periodEnd, "MMM d");
  const period = start === end ? start : `${start}–${end}`;
  return `${g.projectName} — ${formatHours(g.billedSeconds)} @ ${formatMoney(g.rateCents)}/h (${period})`;
}

export async function createDraftInvoice(input: DraftInvoiceInput) {
  const { user } = await requireAdmin();
  await assertStripeAccount();

  const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId));
  if (!client) throw new UserError("Client not found.");

  const { groups, validEntryIds } = await previewInvoice(input.clientId, input.entryIds);
  if (validEntryIds.length !== input.entryIds.length) {
    throw new UserError("Some selected hours were already invoiced or changed. Refresh and try again.");
  }
  if (!groups.length && !input.items.length) throw new UserError("Add hours or a line item first.");
  if (invoiceTotalCents(groups, input.items) <= 0) throw new UserError("Invoice total must be greater than $0.");

  let customerId = client.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe().customers.create({
      name: client.company || client.name,
      email: client.email,
      metadata: { client_id: client.id },
    });
    customerId = customer.id;
    await db.update(clients).set({ stripeCustomerId: customerId }).where(eq(clients.id, client.id));
  }

  const localId = randomUUID();
  const draft = await stripe().invoices.create(
    {
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: input.daysUntilDue,
      auto_advance: false,
      pending_invoice_items_behavior: "exclude",
      description: input.memo,
      footer: "Thank you for your business — Luke Baber, Tyler TX",
      metadata: { portal_invoice_id: localId, client_id: client.id },
    },
    { idempotencyKey: `invoice-${localId}` },
  );

  try {
    for (const g of groups) {
      await stripe().invoiceItems.create(
        {
          customer: customerId,
          invoice: draft.id,
          currency: "usd",
          amount: g.amountCents,
          description: groupDescription(g),
          metadata: { project_id: g.projectId, entries: String(g.entryIds.length) },
        },
        { idempotencyKey: `invoice-${localId}-group-${g.key}` },
      );
    }
    for (const [i, item] of input.items.entries()) {
      await stripe().invoiceItems.create(
        {
          customer: customerId,
          invoice: draft.id,
          currency: "usd",
          amount: item.quantity * item.unitAmountCents,
          description:
            item.quantity > 1 ? `${item.description} (${item.quantity} × ${formatMoney(item.unitAmountCents)})` : item.description,
        },
        { idempotencyKey: `invoice-${localId}-item-${i}` },
      );
    }

    const fresh = await stripe().invoices.retrieve(draft.id);
    await db.transaction(async (tx) => {
      const draftValues = {
        clientId: client.id,
        status: "draft" as const,
        subtotalCents: fresh.subtotal,
        totalCents: fresh.total,
        amountDueCents: fresh.amount_due,
        memo: input.memo,
        periodStart: groups.length
          ? formatDate(new Date(Math.min(...groups.map((g) => g.periodStart.getTime()))), "yyyy-MM-dd")
          : null,
        periodEnd: groups.length
          ? formatDate(new Date(Math.max(...groups.map((g) => g.periodEnd.getTime()))), "yyyy-MM-dd")
          : null,
      };
      // Upsert: the invoice.created webhook may already have mirrored this draft (same id via metadata).
      await tx
        .insert(invoices)
        .values({ id: localId, stripeInvoiceId: fresh.id, ...draftValues })
        .onConflictDoUpdate({ target: invoices.stripeInvoiceId, set: draftValues });
      if (validEntryIds.length) {
        const locked = await tx
          .update(timeEntries)
          .set({ invoiceId: localId })
          .where(and(inArray(timeEntries.id, validEntryIds), isNull(timeEntries.invoiceId)))
          .returning({ id: timeEntries.id });
        if (locked.length !== validEntryIds.length) {
          throw new UserError("Some hours were invoiced by another request. Nothing was saved.");
        }
      }
      if (input.items.length) {
        await tx.insert(invoiceLineItems).values(
          input.items.map((item) => ({ ...item, clientId: client.id, invoiceId: localId })),
        );
      }
    });
  } catch (err) {
    // Compensate: don't leave an orphaned draft in Stripe.
    await stripe().invoices.del(draft.id).catch((e) => console.error("[invoices] failed to delete draft", e));
    throw err;
  }

  await audit({
    actorUserId: user.id,
    action: "invoice.draft_created",
    entityType: "invoice",
    entityId: localId,
    metadata: { stripeInvoiceId: draft.id, entries: validEntryIds.length, items: input.items.length },
  });
  return localId;
}

async function loadForAction(id: string) {
  const [row] = await db
    .select({ invoice: invoices, client: clients })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(eq(invoices.id, id));
  if (!row) throw new UserError("Invoice not found.");
  return row;
}

export async function finalizeAndSendInvoice(id: string) {
  const { user } = await requireAdmin();
  await assertStripeAccount();
  const { invoice } = await loadForAction(id);
  if (invoice.status !== "draft") throw new UserError("Only draft invoices can be sent.");

  await stripe().invoices.finalizeInvoice(invoice.stripeInvoiceId, { auto_advance: true });
  await stripe().invoices.sendInvoice(invoice.stripeInvoiceId);
  const synced = await syncInvoiceFromStripe(invoice.stripeInvoiceId);
  await db.update(invoices).set({ sentAt: new Date() }).where(eq(invoices.id, id));

  const contacts = await clientContacts(invoice.clientId);
  const results = await Promise.all(
    contacts.map((c) =>
      sendEmail({
        to: c.email,
        content: emails.invoiceSent({
          name: c.name,
          number: synced?.number ?? null,
          totalCents: synced?.amountDueCents ?? invoice.totalCents,
          dueDate: synced?.dueDate ?? null,
          invoiceId: id,
          hostedUrl: synced?.hostedInvoiceUrl ?? null,
        }),
        idempotencyKey: `invoice-sent-${id}-${c.email}`,
      }),
    ),
  );
  await audit({ actorUserId: user.id, action: "invoice.sent", entityType: "invoice", entityId: id });
  return { emailNotice: emailRedirectNotice(results) };
}

export async function voidInvoice(id: string) {
  const { user } = await requireAdmin();
  const { invoice } = await loadForAction(id);
  if (invoice.status === "draft") {
    await stripe().invoices.del(invoice.stripeInvoiceId);
    await deleteInvoiceRow(id);
    await audit({ actorUserId: user.id, action: "invoice.draft_deleted", entityType: "invoice", entityId: id });
    return "deleted" as const;
  }
  if (invoice.status !== "open") throw new UserError("Only open invoices can be voided.");
  await stripe().invoices.voidInvoice(invoice.stripeInvoiceId);
  await syncInvoiceFromStripe(invoice.stripeInvoiceId);
  await audit({ actorUserId: user.id, action: "invoice.voided", entityType: "invoice", entityId: id });
  return "voided" as const;
}

export async function markInvoicePaidOutOfBand(id: string) {
  const { user } = await requireAdmin();
  const { invoice } = await loadForAction(id);
  if (invoice.status !== "open") throw new UserError("Only open invoices can be marked paid.");
  await stripe().invoices.pay(invoice.stripeInvoiceId, { paid_out_of_band: true });
  await syncInvoiceFromStripe(invoice.stripeInvoiceId);
  await audit({ actorUserId: user.id, action: "invoice.marked_paid", entityType: "invoice", entityId: id });
}

const REMINDER_COOLDOWN_MS = 3 * 86_400_000;

export async function sendInvoiceReminder(id: string) {
  const { user } = await requireAdmin();
  const { invoice } = await loadForAction(id);
  if (invoice.status !== "open") throw new UserError("Only open invoices need reminders.");
  if (invoice.lastReminderAt && Date.now() - invoice.lastReminderAt.getTime() < REMINDER_COOLDOWN_MS) {
    throw new UserError(`A reminder was already sent ${formatDate(invoice.lastReminderAt)}. Wait a few days before sending another.`);
  }
  const contacts = await clientContacts(invoice.clientId);
  const overdue = isOverdue(invoice.status, invoice.dueDate);
  const results = await Promise.all(
    contacts.map((c) =>
      sendEmail({
        to: c.email,
        content: emails.invoiceReminder({
          name: c.name,
          number: invoice.number,
          amountDueCents: invoice.amountDueCents,
          dueDate: invoice.dueDate,
          overdue,
          invoiceId: id,
        }),
      }),
    ),
  );
  await db.update(invoices).set({ lastReminderAt: new Date() }).where(eq(invoices.id, id));
  await audit({ actorUserId: user.id, action: "invoice.reminder_sent", entityType: "invoice", entityId: id });
  return { emailNotice: emailRedirectNotice(results) };
}

export async function resyncInvoice(id: string) {
  await requireAdmin();
  const { invoice } = await loadForAction(id);
  await syncInvoiceFromStripe(invoice.stripeInvoiceId);
}
