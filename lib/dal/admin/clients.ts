import "server-only";

import { randomBytes, randomUUID } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { auth } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/auth-schema";
import { clientMembers, clients, invoices, projects, timeEntries } from "@/lib/db/schema";
import { UserError } from "@/lib/actions";
import { emails } from "@/lib/email/messages";
import { emailRedirectNotice, sendEmail } from "@/lib/email/send";
import { audit } from "@/lib/services/audit";
import { provisionStorage, revokeUploadShares } from "@/lib/storage/filebrowser";
import { normalizeStoragePath } from "@/lib/storage/paths";
import { assertStripeAccount, stripe } from "@/lib/stripe/client";

export async function listClients() {
  await requireAdmin();
  const rows = await db
    .select({
      client: clients,
      activeProjects: sql<number>`(select count(*)::int from ${projects} p where p.client_id = "clients"."id" and p.status in ('planned','in_progress','review'))`,
      outstandingCents: sql<number>`coalesce((select sum(i.amount_due_cents)::int from ${invoices} i where i.client_id = "clients"."id" and i.status = 'open'), 0)`,
      unbilledSeconds: sql<number>`coalesce((select sum(t.duration_seconds)::int from ${timeEntries} t join ${projects} p on p.id = t.project_id where p.client_id = "clients"."id" and t.billable and t.invoice_id is null and t.ended_at is not null), 0)`,
    })
    .from(clients)
    .orderBy(asc(clients.status), asc(clients.name));
  return rows;
}

export async function getClient(id: string) {
  await requireAdmin();
  const [client] = await db.select().from(clients).where(eq(clients.id, id));
  return client ?? null;
}

export async function listClientMembers(clientId: string) {
  await requireAdmin();
  return db
    .select({
      userId: clientMembers.userId,
      role: clientMembers.role,
      invitedAt: clientMembers.invitedAt,
      joinedAt: clientMembers.joinedAt,
      name: authUsers.name,
      email: authUsers.email,
      image: authUsers.image,
    })
    .from(clientMembers)
    .innerJoin(authUsers, eq(authUsers.id, clientMembers.userId))
    .where(eq(clientMembers.clientId, clientId))
    .orderBy(asc(clientMembers.invitedAt));
}

/** Lightweight list for pickers (timer, invoice builder). */
export async function listClientOptions() {
  await requireAdmin();
  return db
    .select({ id: clients.id, name: clients.name, company: clients.company })
    .from(clients)
    .where(eq(clients.status, "active"))
    .orderBy(asc(clients.name));
}

function throwawayPassword() {
  // Never shown or used — the contact sets their own password via emailed code.
  return `${randomBytes(36).toString("base64url")}Aa1!`;
}

/** Find or create the Neon Auth user for a contact email. */
async function ensureAuthUser(email: string, name: string) {
  const [existing] = await db
    .select({ id: authUsers.id, name: authUsers.name })
    .from(authUsers)
    .where(eq(sql`lower(${authUsers.email})`, email.toLowerCase()));
  if (existing) return { id: existing.id, created: false };

  const { data, error } = await auth.admin.createUser({
    email,
    name,
    password: throwawayPassword(),
    role: "user",
  });
  if (error || !data?.user) {
    console.error("[clients] createUser failed", error);
    throw new UserError(`Couldn't create a login for ${email}: ${error?.message ?? "unknown error"}`);
  }
  return { id: data.user.id, created: true };
}

export type CreateClientInput = {
  name: string;
  company?: string;
  email: string;
  phone?: string;
  defaultRateCents?: number;
  termsDays?: number;
  storageUsername?: string;
  storagePath?: string;
  notesInternal?: string;
  sendInvite: boolean;
};

export async function createClient(input: CreateClientInput) {
  const { user: admin } = await requireAdmin();
  await assertStripeAccount();

  const authUser = await ensureAuthUser(input.email, input.name);

  // Generated up front so the Stripe idempotency key is unique per *client* (company)
  // being created, not per contact email. A contact's login can legitimately be
  // shared across two different client accounts (e.g. one person runs two
  // businesses you both work with) — keying on email+authUser.id would make the
  // second creation reuse the first client's Stripe customer, which then fails
  // the `clients.stripe_customer_id` unique constraint below with an opaque error.
  // Retries of *this same* call (e.g. a network blip) still dedupe correctly
  // because the key is derived from a value we only generate once per attempt
  // and reuse for every retry inside this function invocation.
  const clientId = randomUUID();

  const customer = await stripe().customers.create(
    {
      name: input.company || input.name,
      email: input.email,
      phone: input.phone,
      metadata: { portal_contact_name: input.name },
    },
    { idempotencyKey: `client-${clientId}` },
  );

  const client = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(clients)
      .values({
        id: clientId,
        name: input.name,
        company: input.company,
        email: input.email,
        phone: input.phone,
        defaultRateCents: input.defaultRateCents,
        termsDays: input.termsDays,
        storageUsername: input.storageUsername,
        storagePath: input.storagePath,
        notesInternal: input.notesInternal,
        stripeCustomerId: customer.id,
      })
      .returning();
    await tx.insert(clientMembers).values({ clientId: created!.id, userId: authUser.id, role: "owner" });
    return created!;
  });

  await stripe().customers.update(customer.id, { metadata: { client_id: client.id } });

  let emailNotice = "";
  if (input.sendInvite) {
    const result = await sendEmail({ to: input.email, content: emails.invite({ name: input.name, email: input.email, company: input.company }) });
    emailNotice = emailRedirectNotice([result]);
  }

  await audit({
    actorUserId: admin.id,
    action: "client.created",
    entityType: "client",
    entityId: client.id,
    metadata: { stripeCustomerId: customer.id, invited: input.sendInvite },
  });
  const storageNotice = await provisionStorage({ client }, admin.id);
  return { ...client, emailNotice: emailNotice + storageNotice };
}

export type UpdateClientInput = Partial<Omit<CreateClientInput, "sendInvite" | "email">> & { email?: string };

export async function updateClient(id: string, input: UpdateClientInput) {
  const { user: admin } = await requireAdmin();
  const [before] = await db.select().from(clients).where(eq(clients.id, id));
  if (!before) throw new UserError("Client not found.");

  const [updated] = await db
    .update(clients)
    .set({
      name: input.name,
      company: input.company ?? null,
      email: input.email,
      phone: input.phone ?? null,
      defaultRateCents: input.defaultRateCents ?? null,
      termsDays: input.termsDays ?? null,
      storageUsername: input.storageUsername ?? null,
      storagePath: input.storagePath ?? null,
      notesInternal: input.notesInternal ?? null,
    })
    .where(eq(clients.id, id))
    .returning();

  if (before.stripeCustomerId) {
    await stripe().customers.update(before.stripeCustomerId, {
      name: updated!.company || updated!.name,
      email: updated!.email,
      phone: updated!.phone ?? "",
    });
  }

  if (normalizeStoragePath(before.storagePath) !== normalizeStoragePath(updated!.storagePath)) {
    // Old links point at the previous folder; new ones are minted under the new path on demand.
    await revokeUploadShares({ clientId: id }, "storage_path_changed", admin.id);
  }

  if (before.defaultRateCents !== updated!.defaultRateCents) {
    await audit({
      actorUserId: admin.id,
      action: "client.rate_changed",
      entityType: "client",
      entityId: id,
      metadata: { from: before.defaultRateCents, to: updated!.defaultRateCents },
    });
  }
  return updated!;
}

export async function setClientStatus(id: string, status: "active" | "archived") {
  const { user: admin } = await requireAdmin();
  await db.update(clients).set({ status }).where(eq(clients.id, id));
  if (status === "archived") await revokeUploadShares({ clientId: id }, "client_archived", admin.id);
  await audit({ actorUserId: admin.id, action: `client.${status}`, entityType: "client", entityId: id });
}

export async function addClientContact(clientId: string, input: { name: string; email: string; sendInvite: boolean }) {
  const { user: admin } = await requireAdmin();
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) throw new UserError("Client not found.");

  const authUser = await ensureAuthUser(input.email, input.name);
  await db
    .insert(clientMembers)
    .values({ clientId, userId: authUser.id, role: "member" })
    .onConflictDoNothing();

  let emailNotice = "";
  if (input.sendInvite) {
    const result = await sendEmail({ to: input.email, content: emails.invite({ name: input.name, email: input.email, company: client.company }) });
    emailNotice = emailRedirectNotice([result]);
  }
  await audit({ actorUserId: admin.id, action: "client.contact_added", entityType: "client", entityId: clientId, metadata: { email: input.email } });
  return { emailNotice };
}

export async function resendInvite(clientId: string, userId: string) {
  const { user: admin } = await requireAdmin();
  const [row] = await db
    .select({ name: authUsers.name, email: authUsers.email, company: clients.company })
    .from(clientMembers)
    .innerJoin(authUsers, eq(authUsers.id, clientMembers.userId))
    .innerJoin(clients, eq(clients.id, clientMembers.clientId))
    .where(and(eq(clientMembers.clientId, clientId), eq(clientMembers.userId, userId)));
  if (!row) throw new UserError("Contact not found.");
  const result = await sendEmail({ to: row.email, content: emails.invite(row) });
  await db
    .update(clientMembers)
    .set({ invitedAt: new Date() })
    .where(and(eq(clientMembers.clientId, clientId), eq(clientMembers.userId, userId)));
  await audit({ actorUserId: admin.id, action: "client.invite_resent", entityType: "client", entityId: clientId, metadata: { email: row.email } });
  return { emailNotice: emailRedirectNotice([result]) };
}

export async function removeClientContact(clientId: string, userId: string) {
  const { user: admin } = await requireAdmin();
  const remaining = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(clientMembers)
    .where(eq(clientMembers.clientId, clientId));
  if ((remaining[0]?.n ?? 0) <= 1) throw new UserError("A client needs at least one contact.");
  await db.delete(clientMembers).where(and(eq(clientMembers.clientId, clientId), eq(clientMembers.userId, userId)));
  // Sign them out everywhere so access ends immediately.
  await auth.admin.revokeUserSessions({ userId });
  // Upload links are shared per client; rotate them so the removed contact's copies stop working.
  await revokeUploadShares({ clientId }, "contact_removed", admin.id);
  await audit({ actorUserId: admin.id, action: "client.contact_removed", entityType: "client", entityId: clientId, metadata: { userId } });
}

/** Contacts across clients who have logged in vs. still pending, for dashboard hints. */
export async function pendingInviteCount() {
  await requireAdmin();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(clientMembers)
    .innerJoin(clients, eq(clients.id, clientMembers.clientId))
    .where(and(isNull(clientMembers.joinedAt), eq(clients.status, "active")));
  return row?.n ?? 0;
}

