import "server-only";

import { cache } from "react";
import { and, asc, eq, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { clientMembers, clients, type Client } from "@/lib/db/schema";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role?: string | null;
  emailVerified?: boolean;
};

export type ImpersonationInfo = { impersonatedBy: string | null };

/** Deduplicated per request. */
export const getSession = cache(async () => {
  const { data } = await auth.getSession();
  if (!data?.user) return null;
  const session = data.session as { impersonatedBy?: string | null } | null;
  return {
    user: data.user as SessionUser,
    impersonatedBy: session?.impersonatedBy ?? null,
  };
});

export async function requireUser(next?: string) {
  const session = await getSession();
  if (!session) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return session;
}

export function isAdmin(user: SessionUser | null | undefined) {
  return user?.role === "admin";
}

/** Admin-only pages and actions. Non-admins get a 404 rather than a hint that the page exists. */
export async function requireAdmin() {
  const session = await requireUser("/admin");
  if (!isAdmin(session.user)) notFound();
  return session;
}

export type ClientContext = {
  user: SessionUser;
  client: Client;
  impersonatedBy: string | null;
};

/** Portal pages and actions: resolves the client the signed-in user belongs to. */
export const requireClient = cache(async (): Promise<ClientContext> => {
  const session = await requireUser("/portal");
  const rows = await db
    .select({ client: clients, joinedAt: clientMembers.joinedAt })
    .from(clientMembers)
    .innerJoin(clients, eq(clients.id, clientMembers.clientId))
    .where(and(eq(clientMembers.userId, session.user.id), eq(clients.status, "active")))
    .orderBy(asc(clientMembers.invitedAt))
    .limit(1);

  const row = rows[0];
  if (!row) {
    // Admins without a client membership belong in the admin console.
    if (isAdmin(session.user)) redirect("/admin");
    redirect("/unlinked");
  }

  if (!row.joinedAt) {
    await db
      .update(clientMembers)
      .set({ joinedAt: new Date() })
      .where(
        and(
          eq(clientMembers.userId, session.user.id),
          eq(clientMembers.clientId, row.client.id),
          isNull(clientMembers.joinedAt),
        ),
      );
  }

  return { user: session.user, client: row.client, impersonatedBy: session.impersonatedBy };
});
