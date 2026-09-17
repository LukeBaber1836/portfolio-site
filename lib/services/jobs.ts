import "server-only";

import { TZDate } from "@date-fns/tz";
import { addDays, format, startOfWeek } from "date-fns";
import { and, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { daysOverdue } from "@/lib/billing";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/auth-schema";
import { auditLog, clientMembers, clients, invoices, projects, timeEntries } from "@/lib/db/schema";
import { env } from "@/lib/env";
import { emails } from "@/lib/email/messages";
import { sendEmail } from "@/lib/email/send";
import { BUSINESS_TZ, formatDate } from "@/lib/format";
import { audit } from "@/lib/services/audit";
import { clientContacts, listOverdueInvoices } from "@/lib/services/invoice-sync";
import { getSettings } from "@/lib/services/settings";

const REMINDER_EVERY_DAYS = 7;

/** Daily: nudge clients about overdue invoices, at most once a week per invoice. */
export async function runInvoiceReminders() {
  const overdue = await listOverdueInvoices();
  let sent = 0;
  for (const { invoice } of overdue) {
    const last = invoice.lastReminderAt?.getTime() ?? 0;
    if (Date.now() - last < REMINDER_EVERY_DAYS * 86_400_000) continue;
    const contacts = await clientContacts(invoice.clientId);
    for (const c of contacts) {
      await sendEmail({
        to: c.email,
        content: emails.invoiceReminder({
          name: c.name,
          number: invoice.number,
          amountDueCents: invoice.amountDueCents,
          dueDate: invoice.dueDate,
          overdue: true,
          invoiceId: invoice.id,
        }),
        idempotencyKey: `reminder-${invoice.id}-${format(new Date(), "yyyy-MM-dd")}-${c.email}`,
      });
    }
    await db.update(invoices).set({ lastReminderAt: new Date() }).where(eq(invoices.id, invoice.id));
    await audit({
      action: "invoice.auto_reminder",
      entityType: "invoice",
      entityId: invoice.id,
      metadata: { daysOverdue: invoice.dueDate ? daysOverdue(invoice.dueDate) : null },
    });
    sent++;
  }
  return { checked: overdue.length, sent };
}

/** Hourly: email the admin once per timer that's been running too long. */
export async function runTimerAlerts() {
  const settings = await getSettings();
  const cutoff = new Date(Date.now() - settings.longTimerAlertHours * 3600_000);
  const running = await db
    .select({ id: timeEntries.id, startedAt: timeEntries.startedAt, projectName: projects.name, clientName: sql<string>`coalesce(${clients.company}, ${clients.name})` })
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(and(isNull(timeEntries.endedAt), lt(timeEntries.startedAt, cutoff)));
  if (!running.length) return { alerted: 0 };

  const already = await db
    .select({ entityId: auditLog.entityId })
    .from(auditLog)
    .where(and(eq(auditLog.action, "timer.long_alert"), inArray(auditLog.entityId, running.map((r) => r.id))));
  const alertedIds = new Set(already.map((a) => a.entityId));

  let alerted = 0;
  for (const r of running) {
    if (alertedIds.has(r.id)) continue;
    await sendEmail({
      to: env.ADMIN_EMAIL,
      content: emails.timerAlert({ projectName: r.projectName, clientName: r.clientName, hours: (Date.now() - r.startedAt.getTime()) / 3600_000 }),
      idempotencyKey: `timer-alert-${r.id}`,
    });
    await audit({ action: "timer.long_alert", entityType: "time_entry", entityId: r.id });
    alerted++;
  }
  return { alerted };
}

/** Mondays: recap of last week's hours for each contact who opted in. */
export async function runWeeklySummaries(now = new Date()) {
  const thisMonday = startOfWeek(new TZDate(now, BUSINESS_TZ), { weekStartsOn: 1 });
  const lastMonday = addDays(thisMonday, -7);
  const from = new Date(new TZDate(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate(), BUSINESS_TZ).getTime());
  const to = new Date(new TZDate(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate(), BUSINESS_TZ).getTime());
  const weekKey = format(lastMonday, "yyyy-MM-dd");
  const weekLabel = `last week (${formatDate(weekKey, "MMM d")}–${formatDate(format(addDays(lastMonday, 6), "yyyy-MM-dd"), "MMM d")})`;

  const totals = await db
    .select({
      clientId: projects.clientId,
      projectName: projects.name,
      seconds: sql<number>`sum(${timeEntries.durationSeconds})::int`,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(
      and(
        isNotNull(timeEntries.endedAt),
        gte(timeEntries.startedAt, from),
        lt(timeEntries.startedAt, to),
        eq(projects.clientVisible, true),
        eq(clients.status, "active"),
      ),
    )
    .groupBy(projects.clientId, projects.name);

  const byClient = new Map<string, { project: string; seconds: number }[]>();
  for (const t of totals) {
    if (!t.seconds) continue;
    byClient.set(t.clientId, [...(byClient.get(t.clientId) ?? []), { project: t.projectName, seconds: t.seconds }]);
  }
  if (!byClient.size) return { clients: 0, sent: 0 };

  const recipients = await db
    .select({ clientId: clientMembers.clientId, name: authUsers.name, email: authUsers.email })
    .from(clientMembers)
    .innerJoin(authUsers, eq(authUsers.id, clientMembers.userId))
    .where(and(inArray(clientMembers.clientId, [...byClient.keys()]), eq(clientMembers.emailWeeklySummary, true)));

  let sent = 0;
  for (const r of recipients) {
    const rows = byClient.get(r.clientId)!;
    await sendEmail({
      to: r.email,
      content: emails.weeklySummary({ name: r.name, weekLabel, rows, totalSeconds: rows.reduce((s, x) => s + x.seconds, 0) }),
      idempotencyKey: `weekly-${r.clientId}-${weekKey}-${r.email}`,
    });
    sent++;
  }
  return { clients: byClient.size, sent };
}
