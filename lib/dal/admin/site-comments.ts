import "server-only";

import { and, asc, desc, eq } from "drizzle-orm";

import { UserError } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth/guards";
import { db } from "@/lib/db";
import { projects, siteComments } from "@/lib/db/schema";

export async function getProjectSites(id: string) {
  await requireAdmin();
  const [row] = await db
    .select({ id: projects.id, productionUrl: projects.productionUrl, devUrl: projects.devUrl, featuredSite: projects.featuredSite })
    .from(projects)
    .where(eq(projects.id, id));
  return row ?? null;
}

/** Open comments first, then by page and order of creation (matches pin numbering on the site). */
export async function listSiteComments(projectId: string) {
  await requireAdmin();
  return db
    .select({
      id: siteComments.id,
      authorName: siteComments.authorName,
      fromAdmin: siteComments.fromAdmin,
      pagePath: siteComments.pagePath,
      viewport: siteComments.viewport,
      bodyText: siteComments.bodyText,
      status: siteComments.status,
      createdAt: siteComments.createdAt,
      updatedAt: siteComments.updatedAt,
    })
    .from(siteComments)
    .where(eq(siteComments.projectId, projectId))
    .orderBy(asc(siteComments.status), asc(siteComments.pagePath), asc(siteComments.createdAt), desc(siteComments.id));
}

export async function setSiteCommentStatus(projectId: string, id: string, status: "open" | "resolved") {
  await requireAdmin();
  const updated = await db
    .update(siteComments)
    .set({ status, resolvedAt: status === "resolved" ? new Date() : null })
    .where(and(eq(siteComments.id, id), eq(siteComments.projectId, projectId)))
    .returning({ id: siteComments.id });
  if (!updated.length) throw new UserError("That comment no longer exists.");
}

export async function deleteSiteComment(projectId: string, id: string) {
  await requireAdmin();
  await db.delete(siteComments).where(and(eq(siteComments.id, id), eq(siteComments.projectId, projectId)));
}
