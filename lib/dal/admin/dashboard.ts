import "server-only";

import { and, desc, eq, gte, isNotNull, sql } from "drizzle-orm";

import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { businessTzSql } from "@/lib/db/sql";
import { authUsers } from "@/lib/db/auth-schema";
import { clientRequests, clients, invoices, projects, timeEntries, type RequestStatus } from "@/lib/db/schema";
import { audit } from "@/lib/services/audit";

/** Seconds logged per ISO week for the last `weeks` weeks (business TZ). */
export async function weeklyHours(weeks = 8) {
  const { user } = await requireAdmin();
  const since = new Date(Date.now() - weeks * 7 * 86_400_000);
  const week = sql<string>`to_char(date_trunc('week', ${timeEntries.startedAt} at time zone ${businessTzSql}), 'YYYY-MM-DD')`;
  return db
    .select({
      week,
      billable: sql<number>`coalesce(sum(case when ${timeEntries.billable} then ${timeEntries.durationSeconds} end), 0)::int`,
      nonBillable: sql<number>`coalesce(sum(case when not ${timeEntries.billable} then ${timeEntries.durationSeconds} end), 0)::int`,
    })
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, user.id), isNotNull(timeEntries.endedAt), gte(timeEntries.startedAt, since)))
    .groupBy(week)
    .orderBy(week);
}

export async function activeProjectsSummary(limit = 6) {
  await requireAdmin();
  return db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      progressPct: projects.progressPct,
      dueDate: projects.dueDate,
      clientName: clients.name,
      budgetHours: projects.budgetHours,
      loggedSeconds: sql<number>`coalesce((select sum(t.duration_seconds)::int from ${timeEntries} t where t.project_id = "projects"."id"), 0)`,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(sql`${projects.status} in ('in_progress','review','planned')`)
    .orderBy(sql`case ${projects.status} when 'in_progress' then 0 when 'review' then 1 else 2 end`, desc(projects.updatedAt))
    .limit(limit);
}

export async function recentPayments(limit = 5) {
  await requireAdmin();
  return db
    .select({ invoice: invoices, clientName: clients.name })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(eq(invoices.status, "paid"))
    .orderBy(desc(invoices.paidAt))
    .limit(limit);
}

export async function listRequests(status?: RequestStatus) {
  await requireAdmin();
  return db
    .select({
      request: clientRequests,
      clientName: clients.name,
      clientId: clients.id,
      fromName: authUsers.name,
      fromEmail: authUsers.email,
    })
    .from(clientRequests)
    .innerJoin(clients, eq(clients.id, clientRequests.clientId))
    .leftJoin(authUsers, eq(authUsers.id, clientRequests.userId))
    .where(status ? eq(clientRequests.status, status) : undefined)
    .orderBy(sql`case ${clientRequests.status} when 'new' then 0 when 'in_review' then 1 else 2 end`, desc(clientRequests.createdAt));
}

export async function newRequestCount() {
  await requireAdmin();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(clientRequests)
    .where(eq(clientRequests.status, "new"));
  return row?.n ?? 0;
}

export async function setRequestStatus(id: string, status: RequestStatus) {
  const { user } = await requireAdmin();
  await db.update(clientRequests).set({ status }).where(eq(clientRequests.id, id));
  await audit({ actorUserId: user.id, action: `request.${status}`, entityType: "request", entityId: id });
}

export async function getRequest(id: string) {
  await requireAdmin();
  const [row] = await db.select().from(clientRequests).where(eq(clientRequests.id, id));
  return row ?? null;
}
