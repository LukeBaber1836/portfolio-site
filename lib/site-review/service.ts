import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { UserError } from "@/lib/actions";
import { db } from "@/lib/db";
import { authUsers } from "@/lib/db/auth-schema";
import { clientMembers, clients, projects, siteComments, type Project, type SiteComment } from "@/lib/db/schema";
import { verifyReviewToken } from "@/lib/site-review/token";
import type { NewCommentInput, ReviewComment, ReviewSession, TiptapDoc } from "@/lib/site-review/types";
import { CLOSED_PROJECT_STATUSES } from "@/lib/upload/kinds";

// Data access for the off-site review toolbar. There is no session here: callers authenticate with
// a review token (lib/site-review/token.ts), and every call re-resolves the user and their access.

export type Reviewer = {
  userId: string;
  name: string;
  isAdmin: boolean;
  project: Pick<Project, "id" | "name" | "status" | "productionUrl" | "devUrl">;
};

export async function reviewerFromToken(token: string | null): Promise<Reviewer | null> {
  const claims = token ? verifyReviewToken(token) : null;
  if (!claims) return null;

  const [[user], [project]] = await Promise.all([
    db.select({ name: authUsers.name, role: authUsers.role, banned: authUsers.banned }).from(authUsers).where(eq(authUsers.id, claims.userId)),
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        productionUrl: projects.productionUrl,
        devUrl: projects.devUrl,
        clientId: projects.clientId,
        clientVisible: projects.clientVisible,
      })
      .from(projects)
      .where(eq(projects.id, claims.projectId)),
  ]);
  if (!user || user.banned || !project) return null;

  const isAdmin = user.role === "admin";
  if (!isAdmin) {
    if (!project.clientVisible) return null;
    const [member] = await db
      .select({ userId: clientMembers.userId })
      .from(clientMembers)
      .innerJoin(clients, eq(clients.id, clientMembers.clientId))
      .where(and(eq(clientMembers.userId, claims.userId), eq(clientMembers.clientId, project.clientId), eq(clients.status, "active")));
    if (!member) return null;
  }

  const { clientId: _c, clientVisible: _v, ...rest } = project;
  return { userId: claims.userId, name: user.name, isAdmin, project: rest };
}

/** Origins the toolbar may call from: the project's own domains (www and apex both), plus localhost for local builds. */
export function isAllowedOrigin(origin: string | null, project: Reviewer["project"]) {
  if (!origin) return false;
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.hostname === "localhost" || url.hostname === "127.0.0.1") return true;
  const bare = (h: string) => h.replace(/^www\./, "");
  return [project.productionUrl, project.devUrl].some((site) => {
    if (!site) return false;
    try {
      const s = new URL(site);
      return s.protocol === url.protocol && bare(s.hostname) === bare(url.hostname) && s.port === url.port;
    } catch {
      return false;
    }
  });
}

const canComment = (r: Reviewer) => !(CLOSED_PROJECT_STATUSES as readonly string[]).includes(r.project.status);

function toDto(row: SiteComment, viewer: Reviewer): ReviewComment {
  return {
    id: row.id,
    authorName: row.authorName,
    fromAdmin: row.fromAdmin,
    mine: row.authorUserId === viewer.userId,
    pagePath: row.pagePath,
    selector: row.selector,
    offsetX: row.offsetX,
    offsetY: row.offsetY,
    docX: row.docX,
    docY: row.docY,
    viewport: row.viewport,
    body: row.body as TiptapDoc,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function reviewSession(r: Reviewer): Promise<ReviewSession> {
  const rows = await db.select().from(siteComments).where(eq(siteComments.projectId, r.project.id)).orderBy(asc(siteComments.createdAt));
  return {
    projectName: r.project.name,
    viewerName: r.name,
    isAdmin: r.isAdmin,
    awaitingReview: r.project.status === "review",
    canComment: canComment(r),
    comments: rows.map((row) => toDto(row, r)),
  };
}

// ---- Rich-text hygiene -------------------------------------------------------------------------
// The body is a Tiptap document. Tiptap only renders nodes its schema knows, but links are the one
// place attacker-controlled data reaches an attribute, so non-http(s)/mailto hrefs are dropped here.

const SAFE_HREF = /^(https?:|mailto:)/i;

function cleanNode(node: unknown, depth = 0): unknown {
  if (!node || typeof node !== "object" || depth > 20) return null;
  const n = node as { type?: unknown; text?: unknown; content?: unknown; marks?: unknown; attrs?: unknown };
  if (typeof n.type !== "string") return null;
  const out: Record<string, unknown> = { type: n.type };
  if (typeof n.text === "string") out.text = n.text;
  if (n.attrs && typeof n.attrs === "object") out.attrs = n.attrs;
  if (Array.isArray(n.marks)) {
    out.marks = n.marks.filter((m) => {
      const mark = m as { type?: string; attrs?: { href?: unknown } };
      return mark?.type !== "link" || (typeof mark.attrs?.href === "string" && SAFE_HREF.test(mark.attrs.href));
    });
  }
  if (Array.isArray(n.content)) out.content = n.content.map((c) => cleanNode(c, depth + 1)).filter(Boolean);
  return out;
}

function plainText(node: unknown): string {
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (!n) return "";
  if (n.type === "text") return n.text ?? "";
  const inner = (n.content ?? []).map(plainText).join(n.type === "doc" || n.type?.endsWith("List") ? "\n" : "");
  return n.type === "paragraph" || n.type === "heading" || n.type === "listItem" ? inner.trim() : inner;
}

const MAX_BODY_BYTES = 20_000;

function prepareBody(body: TiptapDoc) {
  const cleaned = cleanNode(body) as TiptapDoc | null;
  if (!cleaned || cleaned.type !== "doc") throw new UserError("That comment couldn't be read.");
  if (JSON.stringify(cleaned).length > MAX_BODY_BYTES) throw new UserError("That comment is too long.");
  const text = plainText(cleaned).replace(/\n{3,}/g, "\n\n").trim();
  if (!text) throw new UserError("Comments can't be empty.");
  return { body: cleaned as Record<string, unknown>, bodyText: text.slice(0, 5000) };
}

// ---- Writes ------------------------------------------------------------------------------------

function assertCanComment(r: Reviewer) {
  if (!canComment(r)) throw new UserError("This project is closed, so comments are read-only.");
}

export async function createComment(r: Reviewer, input: NewCommentInput) {
  assertCanComment(r);
  const { body, bodyText } = prepareBody(input.body);
  const [row] = await db
    .insert(siteComments)
    .values({
      projectId: r.project.id,
      authorUserId: r.userId,
      authorName: r.name,
      fromAdmin: r.isAdmin,
      pagePath: input.pagePath,
      selector: input.selector,
      offsetX: input.offsetX,
      offsetY: input.offsetY,
      docX: input.docX,
      docY: input.docY,
      viewport: input.viewport,
      body,
      bodyText,
    })
    .returning();
  return toDto(row!, r);
}

async function ownComment(r: Reviewer, id: string) {
  const [row] = await db.select().from(siteComments).where(and(eq(siteComments.id, id), eq(siteComments.projectId, r.project.id)));
  if (!row) throw new UserError("That comment no longer exists.");
  if (row.authorUserId !== r.userId && !r.isAdmin) throw new UserError("You can only change your own comments.");
  return row;
}

export async function updateComment(r: Reviewer, id: string, patch: { body?: TiptapDoc; status?: "open" | "resolved" }) {
  assertCanComment(r);
  await ownComment(r, id);
  if (patch.status && !r.isAdmin) throw new UserError("Only your developer can resolve comments.");
  const [row] = await db
    .update(siteComments)
    .set({
      ...(patch.body ? prepareBody(patch.body) : {}),
      ...(patch.status ? { status: patch.status, resolvedAt: patch.status === "resolved" ? new Date() : null } : {}),
    })
    .where(eq(siteComments.id, id))
    .returning();
  return toDto(row!, r);
}

export async function deleteComment(r: Reviewer, id: string) {
  assertCanComment(r);
  await ownComment(r, id);
  await db.delete(siteComments).where(eq(siteComments.id, id));
}
