import "server-only";

import { and, asc, desc, eq, gte, isNotNull, lt, ne, notInArray, sql } from "drizzle-orm";

import { UserError } from "@/lib/actions";
import { requireClient } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { businessTzSql } from "@/lib/db/sql";
import {
  clientMembers,
  clientRequests,
  invoiceLineItems,
  invoices,
  milestones,
  projects,
  projectReferences,
  projectUpdates,
  timeEntries,
  type ServiceType,
  type UploadKind,
} from "@/lib/db/schema";
import { env } from "@/lib/env";
import { emails } from "@/lib/email/messages";
import { sendEmail } from "@/lib/email/send";
import { serviceLabel } from "@/lib/status";
import { StorageError, deleteEntry, getOrRotateShare, isStorageEnabled, listFolder, renameEntry } from "@/lib/storage/filebrowser";
import { normalizeStoragePath } from "@/lib/storage/paths";
import { CLOSED_PROJECT_STATUSES, UPLOAD_CHUNK_BYTES, safeFileName } from "@/lib/upload/kinds";

// Every function here derives the client from the session via requireClient().
// No function accepts a client id from the caller.

const visibleProject = (clientId: string) =>
  and(eq(projects.clientId, clientId), eq(projects.clientVisible, true));

/** Client-safe time entry fields (no internal rate or user ids). */
const entryFields = {
  id: timeEntries.id,
  projectId: timeEntries.projectId,
  projectName: projects.name,
  startedAt: timeEntries.startedAt,
  endedAt: timeEntries.endedAt,
  durationSeconds: timeEntries.durationSeconds,
  description: timeEntries.description,
  billable: timeEntries.billable,
  invoiceId: timeEntries.invoiceId,
  invoiceStatus: invoices.status,
};

export async function portalOverview() {
  const { client } = await requireClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [projectRows, hours, openInvoices, nextMilestone] = await Promise.all([
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        progressPct: projects.progressPct,
        serviceType: projects.serviceType,
        dueDate: projects.dueDate,
        budgetHours: projects.budgetHours,
        loggedSeconds: sql<number>`coalesce((select sum(t.duration_seconds)::int from ${timeEntries} t where t.project_id = "projects"."id"), 0)`,
      })
      .from(projects)
      .where(and(visibleProject(client.id), ne(projects.status, "cancelled")))
      .orderBy(sql`case ${projects.status} when 'review' then 0 when 'in_progress' then 1 when 'planned' then 2 when 'on_hold' then 3 else 4 end`, desc(projects.updatedAt)),
    db
      .select({ seconds: sql<number>`coalesce(sum(${timeEntries.durationSeconds}), 0)::int` })
      .from(timeEntries)
      .innerJoin(projects, eq(projects.id, timeEntries.projectId))
      .where(and(visibleProject(client.id), isNotNull(timeEntries.endedAt), gte(timeEntries.startedAt, monthStart))),
    db
      .select()
      .from(invoices)
      .where(and(eq(invoices.clientId, client.id), eq(invoices.status, "open")))
      .orderBy(asc(invoices.dueDate)),
    db
      .select({ title: milestones.title, dueDate: milestones.dueDate, projectName: projects.name, projectId: projects.id })
      .from(milestones)
      .innerJoin(projects, eq(projects.id, milestones.projectId))
      .where(and(visibleProject(client.id), ne(milestones.status, "done")))
      .orderBy(sql`${milestones.dueDate} asc nulls last`, asc(milestones.sortOrder))
      .limit(1),
  ]);

  return {
    client,
    projects: projectRows,
    hoursThisMonthSeconds: hours[0]?.seconds ?? 0,
    openInvoices,
    outstandingCents: openInvoices.reduce((s, i) => s + i.amountDueCents, 0),
    nextMilestone: nextMilestone[0] ?? null,
  };
}

export type ActivityItem =
  | { kind: "update"; at: Date; projectId: string; projectName: string; body: string }
  | { kind: "milestone"; at: Date; projectId: string; projectName: string; title: string }
  | { kind: "time"; at: Date; projectId: string; projectName: string; seconds: number; description: string | null }
  | { kind: "invoice"; at: Date; invoiceId: string; number: string | null; status: string; amountCents: number };

export async function portalActivity(limit = 12): Promise<ActivityItem[]> {
  const { client } = await requireClient();
  const [updates, done, entries, invs] = await Promise.all([
    db
      .select({ at: projectUpdates.createdAt, projectId: projects.id, projectName: projects.name, body: projectUpdates.body })
      .from(projectUpdates)
      .innerJoin(projects, eq(projects.id, projectUpdates.projectId))
      .where(visibleProject(client.id))
      .orderBy(desc(projectUpdates.createdAt))
      .limit(limit),
    db
      .select({ at: milestones.completedAt, projectId: projects.id, projectName: projects.name, title: milestones.title })
      .from(milestones)
      .innerJoin(projects, eq(projects.id, milestones.projectId))
      .where(and(visibleProject(client.id), eq(milestones.status, "done"), isNotNull(milestones.completedAt)))
      .orderBy(desc(milestones.completedAt))
      .limit(limit),
    db
      .select({ at: timeEntries.endedAt, projectId: projects.id, projectName: projects.name, seconds: timeEntries.durationSeconds, description: timeEntries.description })
      .from(timeEntries)
      .innerJoin(projects, eq(projects.id, timeEntries.projectId))
      .where(and(visibleProject(client.id), isNotNull(timeEntries.endedAt)))
      .orderBy(desc(timeEntries.endedAt))
      .limit(limit),
    db
      .select()
      .from(invoices)
      .where(and(eq(invoices.clientId, client.id), ne(invoices.status, "draft")))
      .orderBy(desc(invoices.updatedAt))
      .limit(limit),
  ]);

  const items: ActivityItem[] = [
    ...updates.map((u) => ({ kind: "update" as const, ...u })),
    ...done.map((m) => ({ kind: "milestone" as const, ...m, at: m.at! })),
    ...entries.map((e) => ({ kind: "time" as const, ...e, at: e.at!, seconds: e.seconds ?? 0 })),
    ...invs.map((i) => ({
      kind: "invoice" as const,
      at: i.paidAt ?? i.sentAt ?? i.finalizedAt ?? i.createdAt,
      invoiceId: i.id,
      number: i.number,
      status: i.status,
      amountCents: i.status === "paid" ? i.amountPaidCents : i.totalCents,
    })),
  ];
  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

export async function portalProjects() {
  const { client } = await requireClient();
  return db
    .select({
      project: projects,
      loggedSeconds: sql<number>`coalesce((select sum(t.duration_seconds)::int from ${timeEntries} t where t.project_id = "projects"."id"), 0)`,
      milestonesDone: sql<number>`(select count(*)::int from ${milestones} m where m.project_id = "projects"."id" and m.status = 'done')`,
      milestonesTotal: sql<number>`(select count(*)::int from ${milestones} m where m.project_id = "projects"."id")`,
    })
    .from(projects)
    .where(visibleProject(client.id))
    .orderBy(sql`case ${projects.status} when 'review' then 0 when 'in_progress' then 1 when 'planned' then 2 when 'on_hold' then 3 else 4 end`, desc(projects.updatedAt));
}

export async function portalProject(id: string) {
  const { client } = await requireClient();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), visibleProject(client.id)));
  if (!project) return null;

  const [ms, updates, entries, references] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.projectId, id)).orderBy(asc(milestones.sortOrder), asc(milestones.createdAt)),
    db.select().from(projectUpdates).where(eq(projectUpdates.projectId, id)).orderBy(desc(projectUpdates.createdAt)),
    db
      .select(entryFields)
      .from(timeEntries)
      .innerJoin(projects, eq(projects.id, timeEntries.projectId))
      .leftJoin(invoices, eq(invoices.id, timeEntries.invoiceId))
      .where(and(eq(timeEntries.projectId, id), isNotNull(timeEntries.endedAt)))
      .orderBy(desc(timeEntries.startedAt)),
    db
      .select()
      .from(projectReferences)
      .where(eq(projectReferences.projectId, id))
      .orderBy(asc(projectReferences.sortOrder), asc(projectReferences.createdAt)),
  ]);
  const loggedSeconds = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  return { project, milestones: ms, updates, entries, references, loggedSeconds };
}

export async function portalHours(range: { from: Date; to: Date }) {
  const { client } = await requireClient();
  return db
    .select(entryFields)
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(invoices, eq(invoices.id, timeEntries.invoiceId))
    .where(
      and(
        visibleProject(client.id),
        isNotNull(timeEntries.endedAt),
        gte(timeEntries.startedAt, range.from),
        lt(timeEntries.startedAt, range.to),
      ),
    )
    .orderBy(desc(timeEntries.startedAt));
}

/** Months (YYYY-MM, business TZ) that have any logged time, newest first. */
export async function portalHourMonths() {
  const { client } = await requireClient();
  const month = sql<string>`to_char(${timeEntries.startedAt} at time zone ${businessTzSql}, 'YYYY-MM')`;
  const rows = await db
    .selectDistinct({ month })
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .where(and(visibleProject(client.id), isNotNull(timeEntries.endedAt)))
    .orderBy(desc(month));
  return rows.map((r) => r.month);
}

export async function portalInvoices() {
  const { client } = await requireClient();
  return db
    .select()
    .from(invoices)
    .where(and(eq(invoices.clientId, client.id), ne(invoices.status, "draft")))
    .orderBy(sql`case ${invoices.status} when 'open' then 0 else 1 end`, desc(invoices.createdAt));
}

export async function portalInvoice(id: string) {
  const { client } = await requireClient();
  const [invoice] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.clientId, client.id), ne(invoices.status, "draft")));
  if (!invoice) return null;
  const [entries, items] = await Promise.all([
    db
      .select(entryFields)
      .from(timeEntries)
      .innerJoin(projects, eq(projects.id, timeEntries.projectId))
      .leftJoin(invoices, eq(invoices.id, timeEntries.invoiceId))
      .where(eq(timeEntries.invoiceId, id))
      .orderBy(asc(projects.name), asc(timeEntries.startedAt)),
    db
      .select({ id: invoiceLineItems.id, description: invoiceLineItems.description, quantity: invoiceLineItems.quantity, unitAmountCents: invoiceLineItems.unitAmountCents })
      .from(invoiceLineItems)
      .where(eq(invoiceLineItems.invoiceId, id)),
  ]);
  return { invoice, entries, items };
}

export async function portalOpenInvoiceCount() {
  const { client } = await requireClient();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(invoices)
    .where(and(eq(invoices.clientId, client.id), eq(invoices.status, "open")));
  return row?.n ?? 0;
}

export async function portalRequests() {
  const { client } = await requireClient();
  return db.select().from(clientRequests).where(eq(clientRequests.clientId, client.id)).orderBy(desc(clientRequests.createdAt));
}

export async function submitRequest(input: { title: string; body: string; serviceType?: ServiceType }) {
  const { client, user } = await requireClient();
  const [request] = await db
    .insert(clientRequests)
    .values({ clientId: client.id, userId: user.id, title: input.title, body: input.body, serviceType: input.serviceType })
    .returning();
  await sendEmail({
    to: env.ADMIN_EMAIL,
    replyTo: user.email,
    content: emails.clientRequest({
      client: client.company || client.name,
      from: user.name,
      title: input.title,
      body: input.body,
      service: serviceLabel(input.serviceType),
    }),
  });
  return request!;
}

/**
 * Approve or decline a reference. Scoped through the client's visible
 * projects, so one client's ids never resolve another client's rows.
 * Clients may change their mind — every response re-timestamps.
 */
/**
 * Records the client's vote and/or written feedback on a reference in one write.
 * `status` and `note` are each left alone when undefined; the admin is only emailed when the vote actually changes.
 */
export async function saveReferenceFeedback(id: string, input: { status?: "approved" | "declined"; note?: string | null }) {
  const { client, user } = await requireClient();
  const [row] = await db
    .select({ reference: projectReferences, project: projects })
    .from(projectReferences)
    .innerJoin(projects, eq(projects.id, projectReferences.projectId))
    .where(and(eq(projectReferences.id, id), visibleProject(client.id)));
  if (!row) throw new UserError("Reference not found.");

  const voteChanged = input.status !== undefined && input.status !== row.reference.status;
  const [updated] = await db
    .update(projectReferences)
    .set({
      ...(input.note !== undefined ? { responseNote: input.note } : {}),
      ...(voteChanged ? { status: input.status, respondedAt: new Date() } : {}),
    })
    .where(eq(projectReferences.id, id))
    .returning();

  if (voteChanged) {
    await sendEmail({
      to: env.ADMIN_EMAIL,
      replyTo: user.email,
      content: emails.referenceResponded({
        from: user.name,
        client: client.company || client.name,
        projectName: row.project.name,
        projectId: row.project.id,
        title: updated!.title,
        approved: input.status === "approved",
      }),
      idempotencyKey: `reference-response-${id}-${input.status}-${updated!.respondedAt!.getTime()}`,
    });
  }
  return updated!;
}

export async function portalPreferences() {
  const { client, user } = await requireClient();
  const [row] = await db
    .select({ emailUpdates: clientMembers.emailUpdates, emailWeeklySummary: clientMembers.emailWeeklySummary })
    .from(clientMembers)
    .where(and(eq(clientMembers.clientId, client.id), eq(clientMembers.userId, user.id)));
  return row ?? { emailUpdates: true, emailWeeklySummary: true };
}

export async function updatePreferences(prefs: { emailUpdates: boolean; emailWeeklySummary: boolean }) {
  const { client, user } = await requireClient();
  await db
    .update(clientMembers)
    .set(prefs)
    .where(and(eq(clientMembers.clientId, client.id), eq(clientMembers.userId, user.id)));
}


const acceptsUploads = (clientId: string) =>
  and(visibleProject(clientId), notInArray(projects.status, [...CLOSED_PROJECT_STATUSES]));

/** Projects the client can pick in the upload dropbox. */
export async function portalUploadProjects() {
  const { client } = await requireClient();
  return db
    .select({ id: projects.id, name: projects.name, status: projects.status })
    .from(projects)
    .where(acceptsUploads(client.id))
    .orderBy(sql`case ${projects.status} when 'review' then 0 when 'in_progress' then 1 when 'planned' then 2 else 3 end`, desc(projects.updatedAt));
}

/**
 * Upload endpoint for one of the client's projects + kind. The browser uploads straight to
 * FileBrowser with this URL; the hash only grants upload access to that one folder.
 */
export async function portalUploadTarget(projectId: string, kind: UploadKind, staleHash?: string) {
  const { client } = await requireClient();
  if (!isStorageEnabled()) throw new UserError("File uploads aren't available right now.");

  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), acceptsUploads(client.id)));
  if (!project) throw new UserError("That project isn't accepting uploads.");

  try {
    const share = await getOrRotateShare(project, client, kind, staleHash);
    return {
      uploadUrl: `${env.STORAGE_URL}/public/api/resources?hash=${encodeURIComponent(share.hash)}`,
      expiresAt: share.expiresAt.toISOString(),
      chunkBytes: UPLOAD_CHUNK_BYTES,
    };
  } catch (err) {
    if (!(err instanceof StorageError)) throw err;
    console.error("[portal] upload target failed", err);
    throw new UserError("Couldn't reach file storage. Please try again in a minute.");
  }
}

/** The project's own storage folder, or null when it hasn't been provisioned yet. */
async function projectStorageRoot(projectId: string) {
  const { client } = await requireClient();
  const [project] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), visibleProject(client.id)));
  if (!project?.storageFolder) return null;
  const root = normalizeStoragePath(client.storagePath);
  if (!root) return null;
  return `/${root}/${project.storageFolder}`;
}

/** Subfolders inside a project's storage folder — whatever exists, not a fixed list. */
export async function portalProjectFolders(projectId: string) {
  if (!isStorageEnabled()) return [];
  const base = await projectStorageRoot(projectId);
  if (!base) return [];
  try {
    const { folders } = await listFolder(base);
    return folders.map((f) => f.name).sort((a, b) => a.localeCompare(b));
  } catch (err) {
    if (!(err instanceof StorageError)) throw err;
    console.error("[portal] list project folders failed", err);
    throw new UserError("Couldn't reach file storage. Please try again in a minute.");
  }
}

/** Files inside one subfolder. The folder name is matched against what actually exists. */
export async function portalFolderFiles(projectId: string, folder: string) {
  if (!isStorageEnabled()) throw new UserError("File storage isn't available right now.");
  const base = await projectStorageRoot(projectId);
  if (!base) return [];
  try {
    const { folders } = await listFolder(base);
    if (!folders.some((f) => f.name === folder)) throw new UserError("That folder doesn't exist.");
    const { files } = await listFolder(`${base}/${folder}`);
    // Chunked uploads in flight (and abandoned ones) sit in the folder as *.uploading.tmp.
    return files.filter((f) => !f.name.endsWith(".uploading.tmp")).sort((a, b) => b.modified.localeCompare(a.modified));
  } catch (err) {
    if (err instanceof UserError) throw err;
    if (!(err instanceof StorageError)) throw err;
    console.error("[portal] list folder files failed", err);
    throw new UserError("Couldn't reach file storage. Please try again in a minute.");
  }
}

/** Resolves and validates "this client's project / folder / file", or throws a user-facing error. */
async function resolveClientFile(projectId: string, folder: string, name: string) {
  if (!isStorageEnabled()) throw new UserError("File storage isn't available right now.");
  const base = await projectStorageRoot(projectId);
  if (!base) throw new UserError("That project has no files yet.");
  const { folders } = await listFolder(base);
  if (!folders.some((f) => f.name === folder)) throw new UserError("That folder doesn't exist.");
  const { files } = await listFolder(`${base}/${folder}`);
  if (!files.some((f) => f.name === name)) throw new UserError("That file no longer exists.");
  return { dir: `${base}/${folder}`, files };
}

function storageFailure(err: unknown): never {
  if (err instanceof UserError) throw err;
  if (!(err instanceof StorageError)) throw err;
  console.error("[portal] storage operation failed", err);
  if (err.status === 403) throw new UserError("File storage refused that change. The storage account needs modify and delete permission.");
  throw new UserError("Couldn't reach file storage. Please try again in a minute.");
}

export async function portalRenameFile(projectId: string, folder: string, name: string, rawNewName: string) {
  try {
    const newName = safeFileName(rawNewName.trim());
    if (!newName || newName === "upload") throw new UserError("Give the file a name.");
    const { dir, files } = await resolveClientFile(projectId, folder, name);
    if (newName === name) return newName;
    // FileBrowser overwrites silently on a name clash, so refuse it here.
    if (files.some((f) => f.name.toLowerCase() === newName.toLowerCase())) throw new UserError("A file with that name already exists.");
    await renameEntry(`${dir}/${name}`, `${dir}/${newName}`);
    return newName;
  } catch (err) {
    storageFailure(err);
  }
}

export async function portalDeleteFile(projectId: string, folder: string, name: string) {
  try {
    const { dir } = await resolveClientFile(projectId, folder, name);
    await deleteEntry(`${dir}/${name}`);
  } catch (err) {
    storageFailure(err);
  }
}
