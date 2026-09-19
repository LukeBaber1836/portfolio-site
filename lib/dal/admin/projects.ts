import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";

import { UserError } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/auth-schema";
import {
  clientMembers,
  clients,
  milestones,
  projects,
  projectReferences,
  projectUpdates,
  timeEntries,
  type MilestoneStatus,
  type ProjectStatus,
  type ServiceType,
} from "@/lib/db/schema";
import { emails } from "@/lib/email/messages";
import { emailRedirectNotice, sendEmail } from "@/lib/email/send";
import { hostOf, normalizeUrl, resolveLinkPreview } from "@/lib/references/preview";
import { audit } from "@/lib/services/audit";
import { provisionStorage, revokeUploadShares } from "@/lib/storage/filebrowser";
import { projectAcceptsUploads } from "@/lib/upload/kinds";

// Correlated subqueries reference the outer table by fully-qualified name: Drizzle renders
// columns unqualified on single-table selects, which would bind to the subquery alias.
const lastLoggedAt = sql<string | null>`(select max(t.started_at) from ${timeEntries} t where t.project_id = "projects"."id")`;
const loggedSeconds = sql<number>`coalesce((select sum(t.duration_seconds)::int from ${timeEntries} t where t.project_id = "projects"."id"), 0)`;

export async function listProjects(filter: { clientId?: string } = {}) {
  await requireAdmin();
  return db
    .select({
      project: projects,
      clientName: clients.name,
      clientCompany: clients.company,
      loggedSeconds,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(filter.clientId ? eq(projects.clientId, filter.clientId) : undefined)
    .orderBy(
      sql`case ${projects.status} when 'in_progress' then 0 when 'review' then 1 when 'planned' then 2 when 'on_hold' then 3 else 4 end`,
      desc(projects.updatedAt),
    );
}

/** Active projects grouped for the timer / invoice pickers. */
export async function listProjectOptions() {
  await requireAdmin();
  return db
    .select({
      id: projects.id,
      name: projects.name,
      clientId: clients.id,
      clientName: clients.name,
      clientCompany: clients.company,
      status: projects.status,
      lastLoggedAt,
    })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(and(eq(clients.status, "active"), sql`${projects.status} not in ('completed','cancelled')`))
    .orderBy(sql`${lastLoggedAt} desc nulls last`, asc(projects.name));
}

export async function getProject(id: string) {
  await requireAdmin();
  const [row] = await db
    .select({ project: projects, client: clients, loggedSeconds })
    .from(projects)
    .innerJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, id));
  if (!row) return null;

  const [ms, updates, references] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.projectId, id)).orderBy(asc(milestones.sortOrder), asc(milestones.createdAt)),
    db
      .select({ update: projectUpdates, authorName: authUsers.name })
      .from(projectUpdates)
      .leftJoin(authUsers, eq(authUsers.id, projectUpdates.authorUserId))
      .where(eq(projectUpdates.projectId, id))
      .orderBy(desc(projectUpdates.createdAt)),
    db
      .select()
      .from(projectReferences)
      .where(eq(projectReferences.projectId, id))
      .orderBy(asc(projectReferences.sortOrder), asc(projectReferences.createdAt)),
  ]);
  return { ...row, milestones: ms, updates, references };
}

export type ProjectInput = {
  clientId: string;
  name: string;
  description?: string;
  serviceType: ServiceType;
  status: ProjectStatus;
  billingType: "hourly" | "fixed";
  rateCents?: number;
  fixedPriceCents?: number;
  budgetHours?: number;
  progressPct: number;
  startDate?: string;
  dueDate?: string;
  clientVisible: boolean;
};

export async function createProject(input: ProjectInput) {
  const { user } = await requireAdmin();
  const [client] = await db.select().from(clients).where(eq(clients.id, input.clientId));
  if (!client) throw new UserError("Client not found.");
  const [project] = await db.insert(projects).values(input).returning();
  await audit({ actorUserId: user.id, action: "project.created", entityType: "project", entityId: project!.id });
  const storageNotice = await provisionStorage({ client, project: project! }, user.id);
  return { ...project!, storageNotice };
}

export async function updateProject(id: string, input: Omit<ProjectInput, "clientId">) {
  const { user } = await requireAdmin();
  const [before] = await db.select().from(projects).where(eq(projects.id, id));
  if (!before) throw new UserError("Project not found.");
  const [project] = await db
    .update(projects)
    .set({
      ...input,
      description: input.description ?? null,
      rateCents: input.rateCents ?? null,
      fixedPriceCents: input.fixedPriceCents ?? null,
      budgetHours: input.budgetHours ?? null,
      startDate: input.startDate ?? null,
      dueDate: input.dueDate ?? null,
    })
    .where(eq(projects.id, id))
    .returning();
  if (projectAcceptsUploads(before) && !projectAcceptsUploads(project!)) {
    await revokeUploadShares({ projectIds: [id] }, "project_closed_or_hidden", user.id);
  }
  if (before.rateCents !== project!.rateCents || before.status !== project!.status) {
    await audit({
      actorUserId: user.id,
      action: "project.updated",
      entityType: "project",
      entityId: id,
      metadata: { status: [before.status, project!.status], rateCents: [before.rateCents, project!.rateCents] },
    });
  }
  return project!;
}

export async function quickUpdateProject(id: string, patch: { status?: ProjectStatus; progressPct?: number }) {
  const { user } = await requireAdmin();
  const [before] = await db.select().from(projects).where(eq(projects.id, id));
  const [after] = await db.update(projects).set(patch).where(eq(projects.id, id)).returning();
  if (before && after && projectAcceptsUploads(before) && !projectAcceptsUploads(after)) {
    await revokeUploadShares({ projectIds: [id] }, "project_closed_or_hidden", user.id);
  }
}

/** Contacts who opted in to project emails for a project's client. */
async function projectEmailRecipients(projectId: string) {
  return db
    .select({ name: authUsers.name, email: authUsers.email, projectName: projects.name })
    .from(projects)
    .innerJoin(clientMembers, eq(clientMembers.clientId, projects.clientId))
    .innerJoin(authUsers, eq(authUsers.id, clientMembers.userId))
    .where(and(eq(projects.id, projectId), eq(clientMembers.emailUpdates, true), eq(projects.clientVisible, true)));
}

export async function postProjectUpdate(projectId: string, body: string, notify: boolean) {
  const { user } = await requireAdmin();
  const [update] = await db
    .insert(projectUpdates)
    .values({ projectId, authorUserId: user.id, body })
    .returning();

  let emailNotice = "";
  if (notify) {
    const recipients = await projectEmailRecipients(projectId);
    const results = await Promise.all(
      recipients.map((r) =>
        sendEmail({
          to: r.email,
          content: emails.projectUpdate({ name: r.name, projectName: r.projectName, body, projectId }),
          idempotencyKey: `update-${update!.id}-${r.email}`,
        }),
      ),
    );
    if (recipients.length) {
      await db.update(projectUpdates).set({ emailedAt: new Date() }).where(eq(projectUpdates.id, update!.id));
    }
    emailNotice = emailRedirectNotice(results);
  }
  return { ...update!, emailNotice };
}

export async function deleteProjectUpdate(id: string) {
  await requireAdmin();
  await db.delete(projectUpdates).where(eq(projectUpdates.id, id));
}

export async function addMilestone(projectId: string, input: { title: string; dueDate?: string; description?: string }) {
  await requireAdmin();
  const [{ max } = { max: -1 }] = await db
    .select({ max: sql<number>`coalesce(max(${milestones.sortOrder}), -1)::int` })
    .from(milestones)
    .where(eq(milestones.projectId, projectId));
  const [m] = await db
    .insert(milestones)
    .values({ projectId, ...input, sortOrder: max + 1 })
    .returning();
  return m!;
}

export async function setMilestoneStatus(id: string, status: MilestoneStatus) {
  await requireAdmin();
  const [m] = await db
    .update(milestones)
    .set({ status, completedAt: status === "done" ? new Date() : null })
    .where(eq(milestones.id, id))
    .returning();
  if (!m) throw new UserError("Milestone not found.");
  return m;
}

export async function updateMilestone(id: string, input: { title: string; dueDate?: string; description?: string }) {
  await requireAdmin();
  await db
    .update(milestones)
    .set({ title: input.title, dueDate: input.dueDate ?? null, description: input.description ?? null })
    .where(eq(milestones.id, id));
}

/** Persist an explicit milestone order (drag and drop). Ids not in the list keep their relative order after. */
export async function reorderMilestones(projectId: string, orderedIds: string[]) {
  await requireAdmin();
  const siblings = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(asc(milestones.sortOrder), asc(milestones.createdAt));
  const known = new Set(siblings.map((s) => s.id));
  const ordered = orderedIds.filter((id) => known.has(id));
  const rest = siblings.map((s) => s.id).filter((id) => !ordered.includes(id));
  const final = [...ordered, ...rest];
  await db.transaction(async (tx) => {
    for (const [i, id] of final.entries()) {
      await tx.update(milestones).set({ sortOrder: i }).where(eq(milestones.id, id));
    }
  });
}

export async function deleteMilestone(id: string) {
  await requireAdmin();
  await db.delete(milestones).where(eq(milestones.id, id));
}

export type ReferenceInput = {
  url?: string;
  title?: string;
  note?: string;
};

/**
 * Share a link (with resolved preview) or a plain text note with the client.
 * Preview resolution never fails the share — a null screenshot just means
 * the card falls back to favicon + domain.
 */
export async function createReference(projectId: string, input: ReferenceInput) {
  const { user } = await requireAdmin();
  const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId));
  if (!project) throw new UserError("Project not found.");

  const url = input.url?.trim() ? normalizeUrl(input.url) : null;
  if (input.url?.trim() && !url) throw new UserError("That link doesn't look valid.");
  const note = input.note?.trim() || null;
  if (!url && !note) throw new UserError("Add a link or a note.");
  const title = input.title?.trim() || null;

  const preview = url ? await resolveLinkPreview(url) : null;
  const [{ max } = { max: -1 }] = await db
    .select({ max: sql<number>`coalesce(max(${projectReferences.sortOrder}), -1)::int` })
    .from(projectReferences)
    .where(eq(projectReferences.projectId, projectId));
  const [reference] = await db
    .insert(projectReferences)
    .values({
      projectId,
      kind: url ? "link" : "note",
      url,
      title: title ?? preview?.title ?? (url ? (hostOf(url) ?? url) : "Note"),
      note,
      screenshotUrl: preview?.screenshotUrl,
      faviconUrl: preview?.faviconUrl,
      sortOrder: max + 1,
      createdBy: user.id,
    })
    .returning();

  await audit({
    actorUserId: user.id,
    action: "reference.shared",
    entityType: "project",
    entityId: projectId,
    metadata: { referenceId: reference!.id, kind: reference!.kind },
  });
  return reference!;
}

export async function deleteReference(id: string) {
  const { user } = await requireAdmin();
  const [reference] = await db.select().from(projectReferences).where(eq(projectReferences.id, id));
  if (!reference) throw new UserError("Reference not found.");
  await db.delete(projectReferences).where(eq(projectReferences.id, id));
  await audit({
    actorUserId: user.id,
    action: "reference.deleted",
    entityType: "project",
    entityId: reference.projectId,
    metadata: { referenceId: id },
  });
  return reference.projectId;
}
