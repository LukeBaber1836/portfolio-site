import "server-only";

import { TZDate } from "@date-fns/tz";
import { and, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { UserError } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { resolveRateCents } from "@/lib/billing";
import { db } from "@/lib/db";
import { businessTzSql } from "@/lib/db/sql";
import { clients, invoices, projects, timeEntries } from "@/lib/db/schema";
import { BUSINESS_TZ } from "@/lib/format";
import { getSettings } from "@/lib/services/settings";

const entrySelect = {
  entry: timeEntries,
  projectName: projects.name,
  projectId: projects.id,
  clientId: clients.id,
  clientName: clients.name,
  clientCompany: clients.company,
  invoiceStatus: invoices.status,
  invoiceNumber: invoices.number,
};

function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}

async function rateForProject(projectId: string) {
  const [row] = await db
    .select({ projectRate: projects.rateCents, clientRate: clients.defaultRateCents })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, projectId));
  if (!row) throw new UserError("Project not found.");
  const settings = await getSettings();
  return resolveRateCents({
    projectRateCents: row.projectRate,
    clientRateCents: row.clientRate,
    defaultRateCents: settings.defaultRateCents,
  });
}

export async function getRunningTimer() {
  const { user } = await requireAdmin();
  const [row] = await db
    .select(entrySelect)
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(invoices, eq(invoices.id, timeEntries.invoiceId))
    .where(and(eq(timeEntries.userId, user.id), isNull(timeEntries.endedAt)));
  return row ?? null;
}

export async function startTimer(projectId: string, description?: string) {
  const { user } = await requireAdmin();
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId));
  if (!project) throw new UserError("Project not found.");
  try {
    const [entry] = await db
      .insert(timeEntries)
      .values({ projectId, userId: user.id, startedAt: new Date(), description })
      .returning();
    return entry!;
  } catch (err) {
    if (isUniqueViolation(err)) throw new UserError("A timer is already running. Clock out first.");
    throw err;
  }
}

export async function stopTimer(input: { description: string; billable: boolean }) {
  const running = await getRunningTimer();
  if (!running) throw new UserError("No timer is running.");
  const endedAt = new Date();
  if (endedAt.getTime() - running.entry.startedAt.getTime() < 1000) {
    throw new UserError("That was less than a second — discard the timer instead.");
  }
  const rateCents = await rateForProject(running.entry.projectId);
  const [entry] = await db
    .update(timeEntries)
    .set({ endedAt, description: input.description, billable: input.billable, rateCents })
    .where(and(eq(timeEntries.id, running.entry.id), isNull(timeEntries.endedAt)))
    .returning();
  if (!entry) throw new UserError("That timer was already stopped.");
  return entry;
}

export async function discardTimer() {
  const running = await getRunningTimer();
  if (!running) return;
  await db.delete(timeEntries).where(and(eq(timeEntries.id, running.entry.id), isNull(timeEntries.endedAt)));
}

/** Convert a business-timezone date + HH:mm into an absolute Date. */
export function businessDateTime(date: string, time: string) {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(new TZDate(y!, m! - 1, d!, hh!, mm!, 0, BUSINESS_TZ).getTime());
}

export type ManualEntryInput = {
  projectId: string;
  date: string;
  startTime: string;
  endTime: string;
  description: string;
  billable: boolean;
};

function toRange(input: Pick<ManualEntryInput, "date" | "startTime" | "endTime">) {
  const startedAt = businessDateTime(input.date, input.startTime);
  let endedAt = businessDateTime(input.date, input.endTime);
  // An end time before the start means the session ran past midnight.
  if (endedAt <= startedAt) endedAt = new Date(endedAt.getTime() + 86_400_000);
  if (endedAt.getTime() - startedAt.getTime() > 24 * 3600_000) {
    throw new UserError("An entry can't be longer than 24 hours.");
  }
  if (startedAt.getTime() > Date.now()) throw new UserError("Entries can't start in the future.");
  return { startedAt, endedAt };
}

export async function createManualEntry(input: ManualEntryInput) {
  const { user } = await requireAdmin();
  const { startedAt, endedAt } = toRange(input);
  const rateCents = await rateForProject(input.projectId);
  const [entry] = await db
    .insert(timeEntries)
    .values({
      projectId: input.projectId,
      userId: user.id,
      startedAt,
      endedAt,
      description: input.description,
      billable: input.billable,
      rateCents,
    })
    .returning();
  return entry!;
}

async function assertEditable(id: string) {
  const [entry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
  if (!entry) throw new UserError("Time entry not found.");
  if (entry.invoiceId) throw new UserError("This entry is on an invoice and can't be changed. Void the invoice first.");
  if (!entry.endedAt) throw new UserError("Stop the running timer before editing it.");
  return entry;
}

export async function updateEntry(id: string, input: ManualEntryInput) {
  await requireAdmin();
  const existing = await assertEditable(id);
  const { startedAt, endedAt } = toRange(input);
  const rateCents =
    existing.projectId === input.projectId ? existing.rateCents ?? (await rateForProject(input.projectId)) : await rateForProject(input.projectId);
  await db
    .update(timeEntries)
    .set({ projectId: input.projectId, startedAt, endedAt, description: input.description, billable: input.billable, rateCents })
    .where(eq(timeEntries.id, id));
}

export async function deleteEntry(id: string) {
  await requireAdmin();
  await assertEditable(id);
  await db.delete(timeEntries).where(and(eq(timeEntries.id, id), isNull(timeEntries.invoiceId)));
}

export async function setEntriesBillable(ids: string[], billable: boolean) {
  await requireAdmin();
  if (!ids.length) return 0;
  const updated = await db
    .update(timeEntries)
    .set({ billable })
    .where(and(inArray(timeEntries.id, ids), isNull(timeEntries.invoiceId), isNotNull(timeEntries.endedAt)))
    .returning({ id: timeEntries.id });
  return updated.length;
}

export type EntryFilter = {
  clientId?: string;
  projectId?: string;
  from?: Date;
  to?: Date;
  status?: "unbilled" | "invoiced" | "no_charge";
  limit?: number;
};

export async function listEntries(filter: EntryFilter = {}) {
  const { user } = await requireAdmin();
  const conditions = [eq(timeEntries.userId, user.id), isNotNull(timeEntries.endedAt)];
  if (filter.clientId) conditions.push(eq(clients.id, filter.clientId));
  if (filter.projectId) conditions.push(eq(projects.id, filter.projectId));
  if (filter.from) conditions.push(gte(timeEntries.startedAt, filter.from));
  if (filter.to) conditions.push(lt(timeEntries.startedAt, filter.to));
  if (filter.status === "unbilled") conditions.push(isNull(timeEntries.invoiceId), eq(timeEntries.billable, true));
  if (filter.status === "invoiced") conditions.push(isNotNull(timeEntries.invoiceId));
  if (filter.status === "no_charge") conditions.push(eq(timeEntries.billable, false));

  return db
    .select(entrySelect)
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(invoices, eq(invoices.id, timeEntries.invoiceId))
    .where(and(...conditions))
    .orderBy(desc(timeEntries.startedAt))
    .limit(filter.limit ?? 500);
}

/** Billable, completed, not-yet-invoiced entries for a client (invoice builder). */
export async function listUnbilledForClient(clientId: string, range: { from?: Date; to?: Date } = {}) {
  await requireAdmin();
  const conditions = [
    eq(projects.clientId, clientId),
    isNotNull(timeEntries.endedAt),
    isNull(timeEntries.invoiceId),
    eq(timeEntries.billable, true),
  ];
  if (range.from) conditions.push(gte(timeEntries.startedAt, range.from));
  if (range.to) conditions.push(lt(timeEntries.startedAt, range.to));
  return db
    .select({ entry: timeEntries, projectName: projects.name })
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .where(and(...conditions))
    .orderBy(projects.name, timeEntries.startedAt);
}

/** Per-day, per-project seconds for a week grid starting at `weekStart` (business TZ). */
export async function weekGrid(weekStart: Date) {
  const { user } = await requireAdmin();
  const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000);
  const day = sql<string>`to_char(${timeEntries.startedAt} at time zone ${businessTzSql}, 'YYYY-MM-DD')`;
  return db
    .select({
      day,
      projectId: projects.id,
      projectName: projects.name,
      clientName: sql<string>`coalesce(${clients.company}, ${clients.name})`,
      seconds: sql<number>`sum(${timeEntries.durationSeconds})::int`,
      billableSeconds: sql<number>`sum(case when ${timeEntries.billable} then ${timeEntries.durationSeconds} else 0 end)::int`,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(
      and(
        eq(timeEntries.userId, user.id),
        isNotNull(timeEntries.endedAt),
        gte(timeEntries.startedAt, weekStart),
        lt(timeEntries.startedAt, weekEnd),
      ),
    )
    .groupBy(day, projects.id, projects.name, clients.company, clients.name);
}
