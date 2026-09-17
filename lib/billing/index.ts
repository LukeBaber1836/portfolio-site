// Pure billing math — no I/O. Covered by lib/billing/billing.test.ts.

export type RateSources = {
  projectRateCents?: number | null;
  clientRateCents?: number | null;
  defaultRateCents: number;
};

/** Project override → client default → business default. */
export function resolveRateCents({ projectRateCents, clientRateCents, defaultRateCents }: RateSources) {
  return projectRateCents ?? clientRateCents ?? defaultRateCents;
}

/**
 * Round a duration to the billing increment. 0 = bill exact seconds.
 * Otherwise round to the nearest increment, with a minimum of one increment
 * for any non-zero duration (so a 2-minute fix isn't billed as nothing).
 */
export function roundSeconds(seconds: number, roundingMinutes: number) {
  if (seconds <= 0) return 0;
  if (!roundingMinutes) return Math.round(seconds);
  const step = roundingMinutes * 60;
  return Math.max(step, Math.round(seconds / step) * step);
}

export function amountForSeconds(seconds: number, rateCents: number) {
  return Math.round((seconds / 3600) * rateCents);
}

export type BillableEntry = {
  id: string;
  projectId: string;
  projectName: string;
  durationSeconds: number;
  rateCents: number;
  startedAt: Date;
};

export type InvoiceGroup = {
  key: string;
  projectId: string;
  projectName: string;
  rateCents: number;
  entryIds: string[];
  loggedSeconds: number;
  billedSeconds: number;
  amountCents: number;
  periodStart: Date;
  periodEnd: Date;
};

/**
 * Group entries into invoice lines by project + rate. Rounding is applied to
 * each group's total rather than per entry, which avoids compounding rounding.
 */
export function groupEntriesForInvoice(entries: BillableEntry[], roundingMinutes: number): InvoiceGroup[] {
  const groups = new Map<string, InvoiceGroup>();
  for (const e of entries) {
    const key = `${e.projectId}:${e.rateCents}`;
    const g = groups.get(key);
    if (g) {
      g.entryIds.push(e.id);
      g.loggedSeconds += e.durationSeconds;
      if (e.startedAt < g.periodStart) g.periodStart = e.startedAt;
      if (e.startedAt > g.periodEnd) g.periodEnd = e.startedAt;
    } else {
      groups.set(key, {
        key,
        projectId: e.projectId,
        projectName: e.projectName,
        rateCents: e.rateCents,
        entryIds: [e.id],
        loggedSeconds: e.durationSeconds,
        billedSeconds: 0,
        amountCents: 0,
        periodStart: e.startedAt,
        periodEnd: e.startedAt,
      });
    }
  }
  return [...groups.values()].map((g) => {
    const billedSeconds = roundSeconds(g.loggedSeconds, roundingMinutes);
    return { ...g, billedSeconds, amountCents: amountForSeconds(billedSeconds, g.rateCents) };
  });
}

export type LineItem = { quantity: number; unitAmountCents: number };

export function invoiceTotalCents(groups: Pick<InvoiceGroup, "amountCents">[], items: LineItem[] = []) {
  return (
    groups.reduce((sum, g) => sum + g.amountCents, 0) +
    items.reduce((sum, i) => sum + i.quantity * i.unitAmountCents, 0)
  );
}

/** Derived client-facing state: an open invoice past its due date is overdue. */
export function isOverdue(status: string, dueDate: string | Date | null, today = new Date()) {
  if (status !== "open" || !dueDate) return false;
  const due = typeof dueDate === "string" ? new Date(`${dueDate}T23:59:59`) : dueDate;
  return due.getTime() < today.getTime();
}

export function daysOverdue(dueDate: string | Date, today = new Date()) {
  const due = typeof dueDate === "string" ? new Date(`${dueDate}T23:59:59`) : dueDate;
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / 86_400_000) + 1);
}

export type AgingBucket = "current" | "1-30" | "31-60" | "60+";

export function agingBucket(dueDate: string | Date | null, today = new Date()): AgingBucket {
  if (!dueDate || !isOverdue("open", dueDate, today)) return "current";
  const d = daysOverdue(dueDate, today);
  if (d <= 30) return "1-30";
  if (d <= 60) return "31-60";
  return "60+";
}
